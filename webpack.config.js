module.exports = {
  mode: 'production',
  entry: {
    bundle: './dist/bundle.js',
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
