var util = require('../util');
var pump = require('../components/pump');
var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
var winston = require('winston');
var scheduleHandler = require('../scheduleHandler');
winston.add(winston.transports.File, { name:"scheduleRunner", filename: settings.logs.directory + '/scheduleRunner.log', 'timestamp':true });

module.exports = function(hwi) {
  var scheduleRunner = {};

  var status = require('../status')();
  var boil = require('./boil')(hwi);
  var sparge = require('./sparge')(hwi);
  var mash = require('./mash')(hwi);

  var logTempTimeout;
  var runScheduleTimeout;

  var stopAllTimeouts = function() {
    mash.stop();
    sparge.stop();
    boil.stop();
    clearTimeout(logTempTimeout);
    clearTimeout(runScheduleTimeout);
  };

  scheduleRunner.clear = function() {
    stopAllTimeouts();
    scheduleHandler.clear();
    status.clear();
  };

  var logTemperature = function() {
    scheduleHandler.resetTempLog();
    var m = 0;
    var readTemp = function() {
      if (status.status === 'stopped' || status.status === 'done') {
        winston.info("Running schedule stopped");
        return;
      }
      logTempTimeout = setTimeout(function() {
        scheduleHandler.addTempToLog(hwi.temperature, m);
        m++;
        readTemp();
      }, 60000);
    };
    readTemp();
  };

  var runSchedule = function(callback) {
    var schedule = scheduleHandler.getSchedule();
    if (!schedule) {
      callback('No schedule provided');
    } else {
      winston.info("Schedule: " + schedule.name);
      var mashStepIndex = 0;
      var spargePauseRun = false;
      var boilDone = false;

      winston.info("Schedule has " + schedule.steps ? 0 : schedule.steps.length + " mash steps, Sparge pause of " + schedule.spargePause + " m and boil time" + (schedule.boilRiseTime + schedule.boilTime) + " m");

      logTemperature();

      var nexInMs = 0;
      var doStep = function() {
        if (!schedule) {
          winston.error("No schedule loaded.");
          return;
        }
        if (status.isNotRunning()) {
          winston.info("Running schedule stopped");
          return;
        }
        winston.info("Next step in " + nexInMs + " ms");
        runScheduleTimeout = setTimeout(function() {
          if (!schedule) {
            winston.error('No schedule loaded');
            return;
          }
          if (schedule.steps && mashStepIndex < schedule.steps.length) {
            winston.info("It's time for the next step");
            mash.nextMashStep(status.status, schedule, mashStepIndex);
            nexInMs = scheduleHandler.calculateStepTime(schedule.steps[mashStepIndex]);
            doStep();
            mashStepIndex++;
          } else if (schedule.spargePause && !spargePauseRun) {
            winston.info("It's time for the sparge pause");
            sparge.spargePause(status.status, schedule);
            nexInMs = schedule.spargePause * 60 * 1000;
            spargePauseRun = true;
            doStep();
          } else if (schedule.boilTime && (spargePauseRun || !schedule.spargePause) && !boilDone) {
            pump.stop(function(err, pumpStatus) {
              if (err) {
                winston.error('Could not stop pump before boil');
                callback(err);
              } else {
                winston.info("It's time for the next boil step");
                boil.boil(status.status, schedule);
                nexInMs = (schedule.boilTime + schedule.boilRiseTime) * 60 * 1000;
                boilDone = true;
                doStep();
              }
            });
          } else {
            console.log("DONE--------------");
            stopAllTimeouts();
            hwi.heaterOnSwitch(callback);
          }
        }, nexInMs);
      };
      doStep();
    }
  };

  scheduleRunner.startSchedule = function(callback) {
    if (status.isRunning()) {
      stopSchedule(function(err, data) {
        if (err) {
          callback(err);
        }
      });
    } else {
      hwi.turnOn(function(err, hwStatus) {
        if (!err) {
          status.setAllOk(hwStatus);
          winston.info('Status is now ' + status.status);
          runSchedule(runScheduleCallback);
        }
        callback(err);
      });
    }
  };

  var runScheduleCallback = function(error) {
    scheduleHandler.setEndTime();
    if (error) {
      winston.error("Mash failure after " + (schedule.endTime - schedule.startTime) + " ms");
      status.setStatusStopped();
    } else {
      winston.info("Mash done after " + (schedule.endTime - schedule.startTime) + " ms");
      status.setStatusDone();
    }
  };

  scheduleRunner.stopSchedule = function(callback) {
    if (status.isRunning()) {
      winston.info('Schedule stopped');
      status.setStatusStopped();
      stopAllTimeouts();
      hwi.turnOff(callback);
    } else {
      callback("No schedule running");
    }
  };

  scheduleRunner.getStatus = function() {
    if (!scheduleHandler.getSchedule()) {
      console.log(JSON.stringify(status));
      status.setStatusUnavailable();
    }
    return status.status;
  };

  scheduleRunner.getTempLog = scheduleHandler.getTempLog;

  return scheduleRunner;
};