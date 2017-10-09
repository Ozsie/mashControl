var calculateCutOffPoint = function(targetTemp, initialTemp, volume) {
  return targetTemp - Math.max(2, 8 - volume);
};

module.exports = {
  calculateCutOffPoint: calculateCutOffPoint,
};