const webpack = require('webpack')
module.exports = function override(config) {
  config.optimization.concatenateModules = false
  return config
}
