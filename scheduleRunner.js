var heatControl = require('./heatControl');
var util = require('./util');
var boil = require('./boil');
var sparge = require('./sparge');
var mash = require('./mash');
var tempSensor = require('mc-tempsensor');
var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
var winston = require('winston');
winston.add(winston.transports.File, { name:"scheduleRunner", filename: settings.logs.directory + '/scheduleRunner.log' });

var schedule;
var previousTemp;
var status = {};

var getTempLog = function() {
  return schedule.tempLog;
};

var logTemperature = function() {
  schedule.tempLog = [];
  var m = 0;
  var readTemp = function() {
    if (status.status === 'stopped' || status.status === 'done') {
      winston.info("Running schedule stopped");
      return;
    }
    setTimeout(function() {
      tempSensor.readAndParse(function(err, data) {
        if (!err) {
          var entry = {
            minute: m,
            temperature: data.temperature.celcius
          };
          schedule.tempLog.push(entry);
          console.log(JSON.stringify(schedule.tempLog));
          m++;
        } else {
          status.thermometer = false;
        }
      });
      readTemp();
    }, 60000);
  };
  readTemp();
};

var runSchedule = function(callback) {
  winston.info("Schedule: " + JSON.stringify(schedule));
  var mashStepIndex = 0;
  var spargePauseRun = false;
  var boilDone = false;

  winston.info("Schedule has " + schedule.steps ? 0 : schedule.steps.length + " mash steps, Sparge pause of " + schedule.spargePause + " m and boil time" + (schedule.boilRiseTime + schedule.boilTime) + " m");

  logTemperature();

  var nexInMs = 0;
  var doStep = function() {
    if (status.status === 'stopped' || status.status === 'done') {
      winston.info("Running schedule stopped");
      return;
    }
    winston.info("Next step in " + nexInMs + " ms");
    setTimeout(function() {
      if (mashStepIndex < schedule.steps.length) {
        winston.info("It's time for the next step");
        mash.nextMashStep(status, schedule, mashStepIndex);
        nexInMs = util.calculateStepTime(schedule.steps[mashStepIndex]);
        doStep();
        mashStepIndex++;
      } else if (schedule.spargePause && !spargePauseRun) {
        winston.info("It's time for the next step");
        sparge.spargePause(status, schedule);
        nexInMs = schedule.spargePause * 60 * 1000;
        spargePauseRun = true;
        doStep();
      } else if (schedule.boilTime && (spargePauseRun || !schedule.spargePause) && !boilDone) {
        winston.info("It's time for the next step");
        boil.boil(status, schedule);
        nexInMs = (schedule.boilTime + schedule.boilRiseTime) * 60 * 1000;
        boilDone = true;
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
    if (status.status === 'running') {
      stopSchedule(function(err, data) {
        if (err) {
          throw new Error(err);
        }
      });
    }
    heatControl.turnOn(function() {
      status.motor = false;
    });
    status.motor = true;
    status.thermometer = true;
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
  calculateCutOffPoint: util.calculateCutOffPoint,
  getRunningForMinutes: util.getRunningForMinutes,
  getTempLog: getTempLog
};