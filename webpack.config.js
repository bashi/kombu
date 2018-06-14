module.exports = {
  mode: 'production',
  entry: {
    app: './dist/bundle.js'
  },
  output: {
    path: __dirname + '/public',
    filename: 'bundle.js'
  },
  node: {
    fs: 'empty'
  }
};
