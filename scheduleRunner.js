var heatControl = require('./heatControl');
var tempSensor = require('mc-tempsensor');
var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
var winston = require('winston');
winston.add(winston.transports.File, { name:"scheduleRunner", filename: settings.logs.directory + '/scheduleRunner.log' });

var schedule;
var previousTemp;

var adjustTemperature = function(targetTemp, initialTemp, volume) {
  tempSensor.readAndParse(function(err, data) {
    if (!err) {
      if (currentTemp > 90 || currentTemp > settings.heatCutOff) {
        winston.warn("Temperature passed cut off. Stopping.");
        stopSchedule();
        return;
      }

      var currentTemp = data.temperature.celcius;
      var initialDegreesToIncrease = targetTemp - initialTemp;
      var heatCutOff = targetTemp - ((initialDegreesToIncrease / 5) * volume);
      if (previousTemp === undefined) {
        previousTemp = currentTemp;
      }
      var diff = parseFloat(currentTemp - previousTemp);
      var degreesToIncrease = Math.abs(currentTemp - targetTemp);

      winston.info("Increase from last: " + diff + "C. Degrees left: " + degreesToIncrease + "C of " + initialDegreesToIncrease + "C. Cut off at: " + heatCutOff + "C.");

      if (currentTemp < heatCutOff) {
        winston.info("Under, double increase");
        heatControl.fastIncrease();
      } else if (currentTemp >= heatCutOff) {
        winston.info("Reached heat cut off point, fast decrease");
        heatControl.fastDecrease();
      } else {
        winston.info("On mark " + currentTemp.temperature.celcius + " = " + targetTemp + " holding.");
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
      step.initialTemp = data.temperature.celcius;
      step.startTime = Date.now();
      step.stepTime = (step.riseTime + step.time) * 60 * 1000;
      winston.info("######################################################################################");
      winston.info("#                                                                                    #");
      winston.info("    Starting step " + (index + 1) + ", " + step.name + " at " + step.startTime);
      winston.info("    Will run for " + step.stepTime + " ms");
      winston.info("    Temperature at start " + step.initialTemp + " C");
      winston.info("    Mash water volume " + schedule.volume + " l");
      winston.info("#                                                                                    #");
      winston.info("######################################################################################");

      var run = function() {
        setTimeout(function() {
          if (Date.now() - step.startTime < step.stepTime) {
            adjustTemperature(step.temperature, step.initialTemp, schedule.volume);
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

var runSchedule = function(callback) {
  winston.info("Schedule: " + JSON.stringify(schedule));
  var i = 0;

  var nexInMs = nextStep(i);
  var doStep = function() {
    winston.info("Next step in " + nexInMs + " ms");
    setTimeout(function() {
      i++;
      if (i < schedule.steps.length) {
        winston.info("It's time for the next step");
        nexInMs = nextStep(i);
        doStep();
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
    schedule.status = 'running';
    //heatControl.turnOn();
    runSchedule(function() {
      schedule.endTime = Date.now();
      winston.info("Mash done after " + (schedule.endTime - schedule.startTime) + " ms");
      schedule.status = 'done';
    });
    return true;
  } else {
    return false;
  }
};

var stopSchedule = function(callback) {
  if (schedule) {
    winston.info(schedule);
    heatControl.turnOff(function(err, data) {
      if (!err) {
        schedule.status = 'stopped';
        callback(undefined, true);
      } else {
        callback(err);
      }
    });
  } else {
    callback("No schedule available");
  }
};

var getStatus = function() {
  if (!schedule) {
    return "unavailable";
  } else {
    return schedule.status;
  }
};

var getSchedule = function() {
  return schedule;
};

module.exports = {
  startSchedule: startSchedule,
  stopSchedule: stopSchedule,
  getStatus: getStatus,
  getSchedule: getSchedule
};