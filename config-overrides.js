const webpack = require('webpack')
module.exports = function override(config) {
  config.optimization.concatenateModules = false
  config.ignoreWarnings = (config.ignoreWarnings || []).concat([
    { message: /Critical dependency: the request of a dependency is an expression/ },
    function(warning) {
      return warning && warning.module && /node_modules[\\/]gun/.test(warning.module.resource || '')
    }
  ])
  return config
}
