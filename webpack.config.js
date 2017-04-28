const path = require('path');

module.exports = {
  entry: './demo/demo.js',
  output: {
    path: path.resolve(__dirname, 'demo'),
    filename: 'demo.bundle.js'
  }
};
