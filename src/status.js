module.exports = function() {
  var status = { status: {} };

  status.reset = function() {
     status.status = {};
  };

  status.setStatusRunning = function() {
    status.status.status = 'running';
  };

  status.setStatusUnavailable = function() {
    status.reset();
    status.status.status = 'unavailable';
  };

  status.setStatusDone = function() {
    status.status.status = 'done';
  };

  status.setStatusStopped = function() {
    status.reset();
    status.status.status = 'stopped'
  };

  status.isNotRunning = function() {
    return status.status.status === 'stopped' || status.status.status === 'done' || status.status.status === 'unavailable';
  };

  status.isRunning = function() {
    return status.status.status === 'running';
  };

  status.updateOnTime = function() {
    status.status.onTime = Date.now();
  };

  status.setAllOk = function(hwStatus) {
    status.status.motor = hwStatus.motor;
    status.status.thermometer = true;
    status.status.pump = hwStatus.pump;
    status.setStatusRunning();
    status.updateOnTime();
  };

  return status;
};