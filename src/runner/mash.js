var util = require('../util');
var scheduleHandler = require('../scheduleHandler');
var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
var winston = require('winston');

module.exports = function(hwi) {
  var mash = {};
  var previousTemp;
  var timeout;

  var stopSchedule = function(schedule, status, callback) {
    winston.info('Turn off due to overheating');
    if (schedule) {
      hwi.turnOff(callback);
    } else {
      callback("No schedule available");
    }
  };

  mash.adjustTemperature = function(step, volume, status, schedule) {
    if (hwi.temperature) {
      var currentTemp = hwi.temperature;
      if (currentTemp > 90 || currentTemp > settings.heatCutOff) {
        winston.warn("Temperature passed cut off. Stopping.");
        stopSchedule(schedule, status, function(err, stopped) {
          if (err) {
            winston.error('Error while stopping: ' + err);
          } else {
            status.status = 'stopped';
            winston.info('Mash stopped due to overheating.');
          }
        });
        return;
      }

      var initialDegreesToIncrease = step.temperature - step.initialTemp;
      var heatCutOff = util.calculateCutOffPoint(step.temperature, step.initialTemp, volume);
      if (previousTemp === undefined) {
        previousTemp = currentTemp;
      }
      var diff = parseFloat(currentTemp - previousTemp);
      var degreesToIncrease = Math.abs(currentTemp - step.temperature);
      status.timeRemaining = (step.stepTime - (Date.now() - step.startTime));
      status.temperature = currentTemp;
      status.minutes = scheduleHandler.getRunningForMinutes();

      winston.info("Increase from last: " + diff + "C. Degrees left: " + degreesToIncrease + "C of " +
      initialDegreesToIncrease + "C. Cut off at: " + heatCutOff + "C. " +
      "Target: " + step.temperature + "C" +
      "Time left: " + status.timeRemaining + " ms ");

      if (currentTemp < heatCutOff) {
        winston.info("Under, increasing");
        hwi.maxEffect();
      } else if (currentTemp >= heatCutOff) {
        if (diff < 0 && currentTemp < step.temperature) {
          winston.info("Sank below target, increasing");
          hwi.maxEffect();
        } else {
          winston.info("Reached heat cut off point, fast decrease");
          hwi.minEffect();
        }
      } else {
        winston.info("On mark " + currentTemp + " = " + step.temperature + " holding.");
      }
      previousTemp = currentTemp;
    } else {
      status.thermometer = false;
      winston.error("Could not read temperature");
      throw new Error("Could not read temperature");
    }
  };

  mash.nextMashStep = function(status, schedule, index) {
    if (hwi.temperature) {
      var step = schedule.steps[index];
      status.step = index + 1;
      status.stepName = step.name;
      status.initialTemp = step.initialTemp = hwi.temperature;
      status.startTime = step.startTime = Date.now();
      status.timeRemaining = step.stepTime = scheduleHandler.calculateStepTime(step);
      status.heatCutOff = step.heatCutOff = util.calculateCutOffPoint(step.temperature, step.initialTemp, schedule.volume);
      winston.info("######################################################################################");
      winston.info("#                                                                                    #");
      winston.info("    Starting step " + (index + 1) + ", " + step.name + " at " + step.startTime);
      winston.info("    Will run for " + step.stepTime + " ms");
      winston.info("    Temperature at start " + step.initialTemp + " C");
      winston.info("    Heat cut-off point " + step.heatCutOff + " C");
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
        }
        timeout = setTimeout(function() {
          if (Date.now() - step.startTime < step.stepTime) {
            mash.adjustTemperature(step, schedule.volume, status, schedule);
            run();
          } else {
            winston.info("## Step " + step.name + " ran for " + (Date.now() - step.startTime) + " ms. ##");
          }
        }, 12000);
      };

      run();
      return step.stepTime;
    } else {
      status.thermometer = false;
      winston.error("Could not read temperature");
      throw new Error("Could not read temperature");
    }
  };

  mash.stop = function() {
    winston.info('Stop mash called');
    clearTimeout(timeout);
    previousTemp = undefined;
  };

  return mash;
};