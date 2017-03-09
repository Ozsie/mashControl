var heatControl = require('./heatControl');
var tempSensor = require('mc-tempsensor');
var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
var winston = require('winston');
winston.add(winston.transports.File, { name:"scheduleRunner", filename: settings.logs.directory + '/scheduleRunner.log' });

var schedule;
var previousTemp;
var status = {};

var calculateCutOffPoint = function(targetTemp, initialTemp, volume) {
  return targetTemp - Math.max(3, 9 - volume);
};

var adjustTemperature = function(step, volume) {
  tempSensor.readAndParse(function(err, data) {
    if (!err) {
      if (currentTemp > 90 || currentTemp > settings.heatCutOff) {
        winston.warn("Temperature passed cut off. Stopping.");
        stopSchedule();
        return;
      }

      var currentTemp = data.temperature.celcius;
      var initialDegreesToIncrease = step.temperature - step.initialTemp;
      var heatCutOff = calculateCutOffPoint(step.temperature, step.initialTemp, volume);
      if (previousTemp === undefined) {
        previousTemp = currentTemp;
      }
      var diff = parseFloat(currentTemp - previousTemp);
      var degreesToIncrease = Math.abs(currentTemp - step.temperature);
      status.timeRemaining = (step.stepTime - (Date.now() - step.startTime));
      status.temperature = currentTemp;

      winston.info("Increase from last: " + diff + "C. Degrees left: " + degreesToIncrease + "C of " +
      initialDegreesToIncrease + "C. Cut off at: " + heatCutOff + "C. " +
      "Target: " + step.temperature + "C" +
      "Time left: " + status.timeRemaining + " ms ");

      if (currentTemp < heatCutOff) {
        winston.info("Under, double increase");
        heatControl.fastIncrease();
      } else if (currentTemp >= heatCutOff) {
        winston.info("Reached heat cut off point, fast decrease");
        heatControl.fastDecrease();
      } else {
        winston.info("On mark " + currentTemp + " = " + step.temperature + " holding.");
      }
      previousTemp = currentTemp;
    } else {
      winston.error(err);
      callback(err);
    }
  });
};

var nextStep = function(index) {
  tempSensor.readAndParse(function(err, data) {
    if (!err) {
      var step = schedule.steps[index];
      status.step = index + 1;
      status.stepName = step.name;
      status.initialTemp = step.initialTemp = data.temperature.celcius;
      status.startTime = step.startTime = Date.now();
      status.timeRemaining = step.stepTime = calculateStepTime(step);
      status.heatCutOff = step.heatCutOff = calculateCutOffPoint(step.temperature, step.initialTemp, schedule.volume);
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
        if (status.status === 'stopped') {
          winston.info("Running step stopped");
          return;
        }
        setTimeout(function() {
          if (Date.now() - step.startTime < step.stepTime) {
            adjustTemperature(step, schedule.volume);
            run();
          } else {
            winston.info("## Step " + step.name + " ran for " + (Date.now() - step.startTime) + " ms. ##");
          }
        }, 12000);
      };

      run();
      return step.stepTime;
    } else {
      winston.error("Could not read temperature", err);
      throw new Error(err);
    }
  });
};

var calculateStepTime = function(step) {
  return (step.riseTime + step.time) * 60 * 1000;
};

var runSchedule = function(callback) {
  winston.info("Schedule: " + JSON.stringify(schedule));
  var i = 0;

  var nexInMs = 0;
  var doStep = function() {
    if (status.status === 'stopped') {
      winston.info("Running schedule stopped");
      return;
    }
    winston.info("Next step in " + nexInMs + " ms");
    setTimeout(function() {
      if (i < schedule.steps.length) {
        winston.info("It's time for the next step");
        nextStep(i);
        nexInMs = calculateStepTime(schedule.steps[i]);
        doStep();
        i++;
      } else {
        callback();
      }
    }, nexInMs);
  };
  doStep();
};

var startSchedule = function(newSchedule) {
  if (newSchedule) {
    winston.info(JSON.stringify(schedule));
    schedule = newSchedule;
    schedule.startTime = Date.now();
    status.status = schedule.status = 'running';
    //heatControl.turnOn();
    runSchedule(function() {
      schedule.endTime = Date.now();
      winston.info("Mash done after " + (schedule.endTime - schedule.startTime) + " ms");
      status.status = schedule.status = 'done';
    });
    return true;
  } else {
    return false;
  }
};

var stopSchedule = function(callback) {
  if (schedule) {
    winston.info(schedule);
    status = {};
    status.status = schedule.status = 'stopped';
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

var getStatus = function() {
  if (!schedule) {
    status.status = 'unavailable'
    return status;
  } else {
    return status;
  }
};

var getSchedule = function() {
  return schedule;
};

module.exports = {
  startSchedule: startSchedule,
  stopSchedule: stopSchedule,
  getStatus: getStatus,
  getSchedule: getSchedule,
  calculateCutOffPoint: calculateCutOffPoint
};