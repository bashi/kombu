const WorkboxPlugin = require('workbox-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    app: './dist/app.js',
    worker: './dist/worker.js'
  },
  output: {
    path: __dirname + '/public',
    filename: '[name].js'
  },
  plugins: [
    new WorkboxPlugin.GenerateSW({
      swDest: __dirname + '/public/service-worker.js'
    })
  ],
  node: {
    fs: 'empty'
  }
};
