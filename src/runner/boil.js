var scheduleHandler = require('../scheduleHandler');
var winston = require('winston');

module.exports = function(hwi) {
  var boil = {};

  var previousTemp;
  var timeout;

  boil.adjustTemperatureForBoil = function(status) {
    if (hwi.temperature) {
      var currentTemp = hwi.temperature;
      var initialDegreesToIncrease = 100 - status.initialTemp;
      if (previousTemp === undefined) {
        previousTemp = currentTemp;
      }
      var diff = parseFloat(currentTemp - previousTemp);
      var degreesToIncrease = Math.abs(currentTemp - 100);
      status.temperature = currentTemp;
      status.minutes = scheduleHandler.getRunningForMinutes();

      winston.info("Increase from last: " + diff + "C. Degrees left: " + degreesToIncrease + "C of " +
      initialDegreesToIncrease + "C. " +
      "Target: " + 100 + "C");

      if (currentTemp < 100) {
        winston.info("Under, double increase");
        hwi.maxEffect();
      } else {
        winston.info("On mark " + currentTemp + " >= 100 holding.");
      }
      previousTemp = currentTemp;
    } else {
      status.thermometer = false;
      winston.error('Could not get temperature');
    }
  };

  boil.boil = function(status, schedule) {
    if (hwi.temperature) {
      status.step = schedule.steps.length + (schedule.spargePause ? 2 : 1);
      status.stepName = "Boil";
      status.initialTemp = hwi.temperature;
      status.startTime = Date.now();
      status.timeRemaining = (schedule.boilTime + schedule.boilRiseTime) * 60 * 1000;
      winston.info("######################################################################################");
      winston.info("#                                                                                    #");
      winston.info("    Starting Boil at " + status.startTime);
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
        // Two hours, heater has auto power off after two hours, must cycle power and mode
        if (Date.now() - status.onTime > 7200000) {
          hwi.cycleHeaterPower();
          status.onTime = Date.now()
        }
        timeout = setTimeout(function() {
          if (Date.now() - status.startTime < status.timeRemaining) {
            boil.adjustTemperatureForBoil(status);
            run();
          } else {
            winston.info("## Step Boil ran for " + (Date.now() - status.startTime) + " ms. ##");
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

  boil.stop = function() {
    winston.info('Stop boil called');
    clearTimeout(timeout);
    previousTemp = undefined;
  };

  return boil;
};