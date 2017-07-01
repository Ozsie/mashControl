var heatControl = require('./heatControl');
var util = require('./util');
var tempSensor = require('mc-tempsensor');
var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
var winston = require('winston');
winston.add(winston.transports.File, { name:"mash", filename: settings.logs.directory + '/mash.log' });

var previousTemp;

var stopSchedule = function(schedule, status, callback) {
  if (schedule) {
    heatControl.turnOff(function(err, data) {
      if (!err) {
        callback(undefined, true);
      } else {
        callback(err, true);
      }
    });
  } else {
    callback("No schedule available");
  }
};

var adjustTemperature = function(step, volume, status, schedule) {
  tempSensor.readAndParse(function(err, data) {
    if (!err) {
      var currentTemp = data.temperature.celcius;
      if (currentTemp > 90 || currentTemp > settings.heatCutOff) {
        winston.warn("Temperature passed cut off. Stopping.");
        stopSchedule(schedule, status, function(err, stopped) {
          if (err) {
            winston.error('Error while stopping: ' + err);
          } else {
            status.status = schedule.status = 'stopped';
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
      status.minutes = util.getRunningForMinutes(schedule);

      winston.info("Increase from last: " + diff + "C. Degrees left: " + degreesToIncrease + "C of " +
      initialDegreesToIncrease + "C. Cut off at: " + heatCutOff + "C. " +
      "Target: " + step.temperature + "C" +
      "Time left: " + status.timeRemaining + " ms ");

      if (currentTemp < heatCutOff) {
        winston.info("Under, increasing");
        heatControl.fastIncrease();
      } else if (currentTemp >= heatCutOff) {
        if (diff < 0 && currentTemp < step.temperature) {
          winston.info("Sank below target, increasing");
          heatControl.fastIncrease();
        } else {
          winston.info("Reached heat cut off point, fast decrease");
          heatControl.fastDecrease();
        }
      } else {
        winston.info("On mark " + currentTemp + " = " + step.temperature + " holding.");
      }
      previousTemp = currentTemp;
    } else {
      status.thermometer = false;
      winston.error(err);
      callback(err);
    }
  });
};

var nextMashStep = function(status, schedule, index) {
  tempSensor.readAndParse(function(err, data) {
    if (!err) {
      var step = schedule.steps[index];
      status.step = index + 1;
      status.stepName = step.name;
      status.initialTemp = step.initialTemp = data.temperature.celcius;
      status.startTime = step.startTime = Date.now();
      status.timeRemaining = step.stepTime = util.calculateStepTime(step);
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
        setTimeout(function() {
          if (Date.now() - step.startTime < step.stepTime) {
            adjustTemperature(step, schedule.volume, status, schedule);
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
      winston.error("Could not read temperature", err);
      throw new Error(err);
    }
  });
};

module.exports = {
  nextMashStep: nextMashStep,
  adjustTemperature: adjustTemperature
};