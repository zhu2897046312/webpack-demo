const path = require('path');
const { TypeScriptAliasPlugin } = require('../../plugins/typescript-alias-plugin');

const monorepoRoot = path.resolve(__dirname, '../..');
const alias = TypeScriptAliasPlugin.getAlias({ rootPath: monorepoRoot });

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
    new TypeScriptAliasPlugin({ rootPath: monorepoRoot }),
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
  },
};
