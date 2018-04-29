var winston = require('winston');

module.exports = function(hwi) {
  var sparge = {};
  var timeout;

  sparge.spargePause = function(status, schedule) {
    if (hwi.temperature) {
      status.step = schedule.steps.length + 1;
      status.stepName = "Sparge Pause";
      status.initialTemp = hwi.temperature;
      status.startTime = Date.now();
      status.timeRemaining = schedule.spargePause * 60 * 1000;
      winston.info("######################################################################################");
      winston.info("#                                                                                    #");
      winston.info("    Starting Sparge pause at " + status.startTime);
      winston.info("    Will run for " + status.timeRemaining + " ms");
      winston.info("    Temperature at start " + status.initialTemp + " C");
      winston.info("    Mash water volume " + schedule.volume + " l");
      winston.info("#                                                                                    #");
      winston.info("######################################################################################");

      var run = function() {
        if (status.status === 'stopped' || status.status === 'done') {
          winston.info("Running step stopped");
          return;
        }
        if (Date.now() - status.onTime > 7200000) {
          // Two hours, heater has auto power off after two hours, must cycle power and mode
          hwi.cycleHeaterPower();
          status.onTime = Date.now()
        }
        timeout = setTimeout(function() {
          if (Date.now() - status.startTime < status.timeRemaining) {
            run();
          } else {
            winston.info("## Step Sparge Pause ran for " + (Date.now() - status.startTime) + " ms. ##");
          }
        }, 12000);
      };

      run();
      return status.timeRemaining;
    } else {
      status.thermometer = false;
      winston.error("Could not read temperature");
      throw new Error("Could not read temperature");
    }
  };

  sparge.stop = function() {
    winston.info('Stop sparge pause called');
    clearTimeout(timeout);
  };

  return sparge;
};