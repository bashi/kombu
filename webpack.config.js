const path = require('path');
const WorkboxPlugin = require('workbox-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    app: './src/app.ts',
    worker: './src/worker.ts'
  },
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: '[name].js'
  },
  resolve: {
    extensions: ['.ts', 'js']
  },
  module: {
    rules: [{ test: /\.ts$/, loader: 'ts-loader' }]
  },
  plugins: [
    new WorkboxPlugin.GenerateSW({
      swDest: path.resolve(__dirname, 'public/service-worker.js'),
      runtimeCaching: [
        {
          urlPattern: /\.(?:wasm|js|html|css)$/,
          handler: 'networkOnly'
        }
      ]
    })
  ],
  node: {
    fs: 'empty'
  }
};
