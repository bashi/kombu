module.exports = {
  mode: 'production',
  entry: {
    app: './dist/app.js',
    worker: './dist/worker.js'
  },
  output: {
    path: __dirname + '/public',
    filename: '[name].js'
  },
  node: {
    fs: 'empty'
  }
};
