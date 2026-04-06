module.exports = function override(config) {
  // Désactiver le scope hoisting qui cause les TDZ (variables 'Ze' before init)
  config.optimization.concatenateModules = false
  return config
}
