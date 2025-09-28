const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    background: './src/background.js',
    content: './src/content.js',
    popup: './src/popup.js',
    sidebar: './src/sidebar/sidebar.jsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/sidebar/sidebar.html',
      filename: 'sidebar/sidebar.html',
      chunks: ['sidebar']
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './src/manifest.json',
          to: 'manifest.json'
        },
        {
          from: './src/popup.html',
          to: 'popup.html'
        }
      ]
    })
  ],
  devtool: 'cheap-module-source-map',
  optimization: {
    splitChunks: {
      chunks: 'all',
      name: false
    }
  }
};