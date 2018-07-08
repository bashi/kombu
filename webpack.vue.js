const WorkboxPlugin = require('workbox-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    app: './src/app-vue.ts',
    worker: './src/worker.ts'
  },
  output: {
    path: __dirname + '/public_vue',
    filename: '[name].js'
  },
  resolve: {
    extensions: ['.ts', 'js'],
    alias: {
      vue$: 'vue/dist/vue.esm.js'
    }
  },
  module: {
    rules: [{ test: /\.ts$/, loader: 'ts-loader' }]
  },
  node: {
    fs: 'empty'
  }
};
