const path = require('path');
const webpack = require('webpack');
const { TypeScriptAliasPlugin } = require('../../plugins/typescript-alias-plugin');

const monorepoRoot = path.resolve(__dirname, '../..');
const sourceMode = process.env.USE_SOURCE_ALIAS !== 'false';
const alias = TypeScriptAliasPlugin.getAlias({ rootPath: monorepoRoot, sourceMode });

module.exports = {
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
