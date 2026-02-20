const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');

function resolveRoot(...segments) {
  return path.join(ROOT, ...segments);
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function readJson(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : resolveRoot(filePath);
  if (!fileExists(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch {
    return null;
  }
}

function readFile(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : resolveRoot(filePath);
  if (!fileExists(abs)) return '';
  return fs.readFileSync(abs, 'utf8');
}

/** 简单解析 pnpm-workspace.yaml 的 packages 列表（不依赖 yaml 库） */
function readWorkspacePackages() {
  const content = readFile('pnpm-workspace.yaml');
  const match = content.match(/packages:\s*[\r\n]+\s*-\s*['"]?([^'"\r\n]+)['"]?/);
  if (match) return [match[1].trim()];
  const inline = content.match(/packages:\s*\[([^\]]+)\]/);
  if (inline) return inline[1].split(',').map((s) => s.replace(/['"]/g, '').trim());
  return [];
}

function runCommand(command, options = {}) {
  const cwd = options.cwd || ROOT;
  const timeout = options.timeout ?? 60000;
  try {
    execSync(command, {
      cwd,
      encoding: 'utf8',
      timeout,
      stdio: options.silent ? 'pipe' : 'inherit',
    });
    return { ok: true, stdout: '', stderr: '' };
  } catch (e) {
    return {
      ok: false,
      stdout: e.stdout || '',
      stderr: e.stderr || e.message || '',
      code: e.status ?? e.code,
    };
  }
}

function runCommandCapture(command, options = {}) {
  const cwd = options.cwd || ROOT;
  const timeout = options.timeout ?? 60000;
  try {
    const stdout = execSync(command, {
      cwd,
      encoding: 'utf8',
      timeout,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { ok: true, stdout: stdout || '', stderr: '' };
  } catch (e) {
    return {
      ok: false,
      stdout: e.stdout || '',
      stderr: e.stderr || e.message || '',
      code: e.status ?? e.code,
    };
  }
}

module.exports = {
  ROOT,
  resolveRoot,
  fileExists,
  readJson,
  readFile,
  readWorkspacePackages,
  runCommand,
  runCommandCapture,
};
