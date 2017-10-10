module.exports = function() {
  var statusObj = { status: {} };

  statusObj.reset = function() {
     statusObj.status = {};
  };

  statusObj.setStatusRunning = function() {
    statusObj.status.status = 'running';
  };

  statusObj.setStatusUnavailable = function() {
    statusObj.reset();
    statusObj.status.status = 'unavailable';
  };

  statusObj.setStatusDone = function() {
    statusObj.status.status = 'done';
  };

  statusObj.setStatusStopped = function() {
    statusObj.reset();
    statusObj.status.status = 'stopped'
  };

  statusObj.isNotRunning = function() {
    return statusObj.status.status === 'stopped' || statusObj.status.status === 'done' || statusObj.status.status === 'unavailable';
  };

  statusObj.isRunning = function() {
    return statusObj.status.status === 'running';
  };

  statusObj.updateOnTime = function() {
    statusObj.status.onTime = Date.now();
  };

  statusObj.setAllOk = function(hwStatus) {
    statusObj.status.motor = hwStatus.motor;
    statusObj.status.thermometer = true;
    statusObj.status.pump = hwStatus.pump;
    statusObj.setStatusRunning();
    statusObj.updateOnTime();
  };

  return statusObj;
};