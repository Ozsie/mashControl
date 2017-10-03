var heatControl = require('../components/heatControl');
var util = require('../util');
var boil = require('./boil');
var sparge = require('./sparge');
var mash = require('./mash');
var pump = require('../components/pump');
var tempSensor = require('mc-tempsensor');
var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
var winston = require('winston');
winston.add(winston.transports.File, { name:"scheduleRunner", filename: settings.logs.directory + '/scheduleRunner.log', 'timestamp':true });

var schedule;
var previousTemp;
var status = {};

var clear = function() {
  schedule = undefined;
  previousTemp = undefined;
  status = {};
  schedule = undefined;
};

var getTempLog = function() {
  if (schedule) {
    return schedule.tempLog;
  } else {
    return [];
  }
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
        pump.stop(function(err, status) {
          winston.info("It's time for the next step");
          boil.boil(status, schedule);
          nexInMs = (schedule.boilTime + schedule.boilRiseTime) * 60 * 1000;
          boilDone = true;
          doStep();
        });
      } else {
      console.log("DONE--------------");
        heatControl.heaterOnSwitch(callback);
      }
    }, nexInMs);
  };
  doStep();
};

var startSchedule = function(newSchedule, callback) {
  if (newSchedule) {
    if (status.status === 'running') {
      stopSchedule(function(err, data) {
        if (err) {
          callback(err);
        }
      });
    } else {
      heatControl.turnOn(function(err) {
        callback(err);
        if (err) {
          status.motor = false;
        } else {
          pump.start(function(err, pumpStatus) {
            status.motor = true;
            status.thermometer = true;
            status.pump = pumpStatus;
            winston.info(JSON.stringify(schedule));
            schedule = newSchedule;
            schedule.startTime = Date.now();
            schedule.tempLog = [];
            status.status = schedule.status = 'running';
            winston.info('Status is now ' + status.status + ' ' + schedule.status);
            status.onTime = Date.now();
            runSchedule(function() {
              schedule.endTime = Date.now();
              winston.info("Mash done after " + (schedule.endTime - schedule.startTime) + " ms");
              status.status = schedule.status = 'done';
            });
          });
        }
      });
    }
  } else {
    callback(new Error('No schedule specified'));
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
  getTempLog: getTempLog,
  clear: clear
};