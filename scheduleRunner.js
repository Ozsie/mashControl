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
  return targetTemp - Math.max(2, 8 - volume);
};

var getRunningForMinutes = function() {
  if (!schedule || !schedule.startTime) {
    return -1;
  }
  var millis = Date.now() - schedule.startTime;
  var seconds = millis / 1000;
  var minutes = Math.floor(seconds/60);
  return minutes;
}

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
      status.minutes = getRunningForMinutes();

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

var adjustTemperatureForBoil = function() {
  tempSensor.readAndParse(function(err, data) {
    if (!err) {
      var currentTemp = data.temperature.celcius;
      var initialDegreesToIncrease = 100 - status.initialTemp;
      if (previousTemp === undefined) {
        previousTemp = currentTemp;
      }
      var diff = parseFloat(currentTemp - previousTemp);
      var degreesToIncrease = Math.abs(currentTemp - 100);
      status.temperature = currentTemp;
      status.minutes = getRunningForMinutes();

      winston.info("Increase from last: " + diff + "C. Degrees left: " + degreesToIncrease + "C of " +
      initialDegreesToIncrease + "C. " +
      "Target: " + 100 + "C");

      if (currentTemp < 100) {
        winston.info("Under, double increase");
        heatControl.fastIncrease();
      } else {
        winston.info("On mark " + currentTemp + " >= 100 holding.");
      }
      previousTemp = currentTemp;
    } else {
      winston.error(err);
      callback(err);
    }
  });
};

var nextMashStep = function(index) {
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

var spargePause = function() {
  tempSensor.readAndParse(function(err, data) {
    if (!err) {
      status.step = schedule.steps.length + 1;
      status.stepName = "Sparge Pause";
      status.initialTemp = data.temperature.celcius;
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
        if (status.status === 'stopped') {
          winston.info("Running step stopped");
          return;
        }
        setTimeout(function() {
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
      winston.error("Could not read temperature", err);
      throw new Error(err);
    }
  });
};

var boil = function() {
  tempSensor.readAndParse(function(err, data) {
    if (!err) {
      status.step = schedule.steps.length + 2;
      status.stepName = "Boil";
      status.initialTemp = data.temperature.celcius;
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
        if (status.status === 'stopped') {
          winston.info("Running step stopped");
          return;
        }
        setTimeout(function() {
          if (Date.now() - status.startTime < status.timeRemaining) {
            adjustTemperatureForBoil();
            run();
          } else {
            winston.info("## Step Boil ran for " + (Date.now() - status.startTime) + " ms. ##");
          }
        }, 12000);
      };

      run();
      return status.timeRemaining;
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
  var mashStepIndex = 0;
  var spargePauseRun = false;
  var boilDone = false;

  winston.info("Schedule has " + schedule.steps.length + " mash steps, Sparge pause of " + schedule.spargePause + " m and boil time" + (schedule.boilRiseTime + schedule.boilTime) + " m");

  var nexInMs = 0;
  var doStep = function() {
    if (status.status === 'stopped') {
      winston.info("Running schedule stopped");
      return;
    }
    winston.info("Next step in " + nexInMs + " ms");
    setTimeout(function() {
      if (mashStepIndex < schedule.steps.length) {
        winston.info("It's time for the next step");
        nextMashStep(mashStepIndex);
        nexInMs = calculateStepTime(schedule.steps[mashStepIndex]);
        doStep();
        mashStepIndex++;
      } else if (schedule.spargePause && !spargePauseRun) {
        winston.info("It's time for the next step");
        spargePause();
        nexInMs = schedule.spargePause * 60 * 1000;
        spargePauseRun = true;
        doStep();
      } else if (schedule.boilTime && (spargePauseRun || !schedule.spargePause) && !boilDone) {
        winston.info("It's time for the next step");
        boil();
        nexInMs = (schedule.boilTime + schedule.boilRiseTime) * 60 * 1000;
        boilDone = true
        doStep();
      } else {
      console.log("DONE--------------");
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
    heatControl.fastDecrease();
    heatControl.fastDecrease();
    runSchedule(function() {
      schedule.endTime = Date.now();
      winston.info("Mash done after " + (schedule.endTime - schedule.startTime) + " ms");
      status.status = schedule.status = 'done';
      heatControl.fastDecrease();
      heatControl.fastDecrease();
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
    status.status = 'unavailable';
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
  calculateCutOffPoint: calculateCutOffPoint,
  getRunningForMinutes: getRunningForMinutes
};