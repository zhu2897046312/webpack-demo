import path from 'path';
import webpack from 'webpack';

// 直接引用插件源码（.ts），由 ts-node 在运行 webpack 时解析
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TypeScriptAliasPlugin } = require('../../plugins/typescript-alias-plugin');

const monorepoRoot = path.resolve(__dirname, '../..');
const sourceMode = process.env.USE_SOURCE_ALIAS !== 'false';
const alias = TypeScriptAliasPlugin.getAlias({ rootPath: monorepoRoot, sourceMode });

const config: webpack.Configuration & { devServer?: Record<string, unknown> } = {
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias,
  },
  plugins: [
    new TypeScriptAliasPlugin({ rootPath: monorepoRoot, sourceMode }),
    new webpack.DefinePlugin({
      __ALIAS_SOURCE_MODE__: JSON.stringify(sourceMode),
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.webpack.json',
            transpileOnly: true,
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  devServer: {
    static: path.join(__dirname, 'public'),
    port: 3000,
    open: '/index.html',
  },
};

export default config;
