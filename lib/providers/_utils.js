function assignDefaults (strategy, defaults) {
  Object.assign(strategy, Object.assign({}, defaults, strategy))
}

module.exports = {
  assignDefaults
}
