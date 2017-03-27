var calculateCutOffPoint = function(targetTemp, initialTemp, volume) {
  return targetTemp - Math.max(2, 8 - volume);
};

var getRunningForMinutes = function(schedule) {
  if (!schedule || !schedule.startTime) {
    return -1;
  }
  var millis = Date.now() - schedule.startTime;
  var seconds = millis / 1000;
  var minutes = Math.floor(seconds/60);
  return minutes;
};

var calculateStepTime = function(step) {
  return (step.riseTime + step.time) * 60 * 1000;
};

module.exports = {
  getRunningForMinutes: getRunningForMinutes,
  calculateCutOffPoint: calculateCutOffPoint,
  calculateStepTime: calculateStepTime
};