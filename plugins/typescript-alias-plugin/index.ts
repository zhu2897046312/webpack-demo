/// <reference types="node" />
import path from 'path';
import fs from 'fs';

/** 插件配置项 */
export interface TypeScriptAliasPluginOptions {
  /** Monorepo 根目录，默认 process.cwd() */
  rootPath?: string;
  /** 根 tsconfig 路径，仅优先数据源时生效，默认 rootPath/tsconfig.base.json */
  tsconfigPath?: string;
  /** true 指向 src 源码，false 指向 dist 产物，默认 true */
  sourceMode?: boolean;
}

/** tsconfig 中 compilerOptions.paths 的类型（key 为模式，value 为路径或路径数组） */
interface TsconfigPaths {
  [key: string]: string[];
}

/**
 * 从 tsconfig 读取 paths，注入到 Webpack resolve.alias，实现短路径统一管理。
 * 优先使用根 tsconfig.base.json（与 TypeScript/IDE 一致）；
 * 若不存在或无 paths，则回退到 packages/sdk/tsconfig.json。
 */
export class TypeScriptAliasPlugin {
  private rootPath: string;
  private tsconfigPath: string;
  private sourceMode: boolean;

  constructor(options: TypeScriptAliasPluginOptions = {}) {
    this.rootPath = options.rootPath || process.cwd();
    this.tsconfigPath =
      options.tsconfigPath || path.join(this.rootPath, 'tsconfig.base.json');
    this.sourceMode = options.sourceMode !== false;
  }

  apply(compiler: any): void {
    const alias = this.collectAlias();
    if (Object.keys(alias).length === 0) return;
    const resolve = compiler.options.resolve || (compiler.options.resolve = {} as any);
    resolve.alias = { ...(resolve.alias || {}), ...alias };
  }

  /**
   * 汇总 alias：优先根 base，无结果时回退到 sdk 的 tsconfig。
   */
  collectAlias(): Record<string, string> {
    const fromBase = this.collectAliasFromBase();
    if (Object.keys(fromBase).length > 0) return fromBase;
    return this.collectAliasFromSdk();
  }

  /**
   * 静态方法：直接获取 alias 对象，供 webpack 配置中 resolve.alias 预填使用。
   */
  static getAlias(
    options: TypeScriptAliasPluginOptions = {}
  ): Record<string, string> {
    const p = new TypeScriptAliasPlugin(options);
    return p.collectAlias();
  }

  /**
   * 从根 tsconfig.base.json 读取 paths，按 rootPath 解析为绝对路径。
   * 文件不存在或无 paths 时返回空对象；JSON 解析失败时降级为空 alias，避免整次构建因配置错误直接崩溃。
   */
  private collectAliasFromBase(): Record<string, string> {
    if (!fs.existsSync(this.tsconfigPath)) return {};

    let config: { compilerOptions?: { paths?: TsconfigPaths } };
    try {
      config = JSON.parse(fs.readFileSync(this.tsconfigPath, 'utf8'));
    } catch (e) {
      // 仅对 tsconfig 格式错误做降级，其它错误继续抛出便于排查
      if (e instanceof SyntaxError) return {};
      throw e;
    }

    const paths = config.compilerOptions?.paths ?? {};
    if (Object.keys(paths).length === 0) return {};

    const alias: Record<string, string> = {};
    for (const [key, values] of Object.entries(paths)) {
      const pattern = normalizePattern(key);
      const target = getFirstPath(values);
      if (!pattern || !target) continue;

      let resolved = target;
      if (!this.sourceMode && resolved.includes('packages/sdk/src/')) {
        resolved = resolved.replace('packages/sdk/src/', 'packages/sdk/dist/');
      }
      alias[pattern] = path.resolve(this.rootPath, resolved);
    }
    return alias;
  }

  /**
   * 回退数据源：从 packages/sdk/tsconfig.json 读取 paths，按 SDK 目录的 baseUrl 解析。
   * 同样在 JSON 解析失败时降级为空对象，避免构建直接崩溃。
   */
  private collectAliasFromSdk(): Record<string, string> {
    const sdkPath = path.resolve(this.rootPath, 'packages/sdk');
    const tsconfigPath = path.join(sdkPath, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) return {};

    let config: { compilerOptions?: { baseUrl?: string; paths?: TsconfigPaths } };
    try {
      config = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    } catch (e) {
      if (e instanceof SyntaxError) return {};
      throw e;
    }

    const baseUrl = path.resolve(
      sdkPath,
      config.compilerOptions?.baseUrl ?? '.'
    );
    const paths = config.compilerOptions?.paths ?? {};
    const alias: Record<string, string> = {};

    for (const [key, values] of Object.entries(paths)) {
      const pattern = normalizePattern(key);
      const target = getFirstPath(values);
      if (!pattern || !target) continue;

      let resolved = target;
      if (!this.sourceMode && resolved.startsWith('./src/')) {
        resolved = './dist/' + resolved.slice(6);
      }
      alias[pattern] = path.resolve(baseUrl, resolved);
    }
    return alias;
  }
}

/**
 * tsconfig paths 的 value 是字符串数组，可配置多条回退路径；
 * Webpack alias 只需一个目标路径，这里取第一条有效项（非空字符串）。
 */
function getFirstPath(values: string[] | undefined): string | null {
  if (!Array.isArray(values)) return null;
  const first = values.find((v) => typeof v === 'string' && v.length > 0);
  return first != null ? first.replace(/\*$/, '') : null;
}

/** 将 paths 的 key 规范为无尾随 * 或 / 的别名名 */
function normalizePattern(key: string): string {
  return key.replace(/\*$/, '').replace(/\/$/, '') || '';
}
