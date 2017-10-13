var util = require('../util');
var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
var winston = require('winston');
var scheduleHandler = require('../scheduleHandler');
winston.add(winston.transports.File, { name:'scheduleRunner', filename: settings.logs.directory + '/scheduleRunner.log', 'timestamp':true });

module.exports = function(hwi, test) {
  var scheduleRunner = {};

  var status = require('../status')();
  var boil = require('./boil')(hwi);
  var sparge = require('./sparge')(hwi);
  var mash = require('./mash')(hwi);

  var logTempTimeout;
  var runScheduleTimeout;

  var nexInMs = 0;
  var mashStepIndex = 0;
  var spargePauseRun = false;
  var boilDone = false;

  var stopAllTimeouts = function() {
    mash.stop();
    sparge.stop();
    boil.stop();
    clearTimeout(logTempTimeout);
    clearTimeout(runScheduleTimeout);
  };

  var logTemperature = function() {
    scheduleHandler.resetTempLog();
    var m = 0;
    var readTemp = function() {
      if (status.status === 'stopped' || status.status === 'done') {
        winston.info('Running schedule stopped');
        return;
      }

      logTempTimeout = setTimeout(function() {
        var tempLog = scheduleHandler.getTempLog();
        if (tempLog.length > 0) {
          var diff = Date.now() - tempLog[tempLog.length - 1].actualTime;
          if (diff >= 60000) {
            scheduleHandler.addTempToLog(hwi.temperature, m);
            m++;
          }
        } else {
          scheduleHandler.addTempToLog(hwi.temperature, m);
          m++;
        }
        readTemp();
      }, 100);
    };
    readTemp();
  };

  var runSchedule = function(callback) {
    var schedule = scheduleHandler.getSchedule();
    winston.info('Schedule: ' + schedule.name + ' has ' +
                 (schedule.steps === undefined) ? 0 : schedule.steps.length +
                 ' mash steps, Sparge pause of ' + schedule.spargePause +
                 ' m and boil time' + (schedule.boilRiseTime + schedule.boilTime) + ' m');

    logTemperature();
    nexInMs = 0;
    doStep(schedule, callback);
  };

  var doStep = function(schedule, callback) {
    if (status.isNotRunning()) {
      winston.info('Running schedule stopped');
      callback('Running schedule stopped');
    } else {
      winston.info('Next step in ' + nexInMs + ' ms');
      runScheduleTimeout = setTimeout(function() {
        runScheduleTimeoutFunction(schedule, callback);
      }, nexInMs);
    }
  };

  var runScheduleTimeoutFunction = function(schedule, callback) {
    if (schedule.steps && mashStepIndex < schedule.steps.length) {
      doMashStep(schedule, callback);
    } else if (schedule.spargePause && !spargePauseRun) {
      doSpargePause(schedule, callback);
    } else if (schedule.boilTime && (spargePauseRun || !schedule.spargePause) && !boilDone) {
      doBoil(schedule, callback);
    } else {
      console.log('-------------- DONE --------------');
      stopAllTimeouts();
      hwi.heaterOnSwitch(callback);
    }
  };

  var doMashStep = function(schedule, callback) {
    winston.info('It is time for the next step');
    mash.nextMashStep(status.status, schedule, mashStepIndex);
    nexInMs = scheduleHandler.calculateStepTime(schedule.steps[mashStepIndex]);
    mashStepIndex++;
    winston.info('Next mash step is ' + mashStepIndex);
    doStep(schedule, callback);
  };

  var doSpargePause = function(schedule, callback) {
    winston.info('It is time for the sparge pause');
    sparge.spargePause(status.status, schedule);
    nexInMs = schedule.spargePause * 60 * 1000;
    spargePauseRun = true;
    doStep(schedule, callback);
  };

  var doBoil = function(schedule, callback) {
    hwi.stopPump(function(err, pumpStatus) {
      if (err) {
        winston.error('Could not stop pump before boil');
        callback(err);
      } else {
        winston.info('It is time for the next boil step');
        boil.boil(status.status, schedule);
        nexInMs = (schedule.boilTime + schedule.boilRiseTime) * 60 * 1000;
        boilDone = true;
        doStep(schedule, callback);
      }
    });
  };

  var runScheduleCallback = function(error, callback) {
    scheduleHandler.setEndTime();
    if (error) {
      winston.error('Mash failure after ' + scheduleHandler.getRunTime() + ' ms');
      status.setStatusStopped();
    } else {
      winston.info('Mash done after ' + scheduleHandler.getRunTime() + ' ms');
      status.setStatusDone();
    }
    if (callback) {
      callback(error);
    }
  };

  scheduleRunner.startSchedule = function(callback) {
    if (!scheduleHandler.getSchedule()) {
      winston.error('No schedule loaded');
      callback('No schedule loaded');
    } else if (status.isRunning()) {
      winston.error('Schedule already running');
      callback('Schedule already running');
    } else {
      winston.info('Starting HW');
      hwi.turnOn(function(err, hwStatus) {
        if (!err) {
          winston.info('Starting schedule');
          status.setAllOk(hwStatus);
          winston.info('Status is now ' + status.status.status);
          runSchedule(function(error) {
            runScheduleCallback(error, callback);
          });
        } else {
          return err;
        }
      });
    }
  };

  scheduleRunner.stopSchedule = function(callback) {
    if (status.isRunning()) {
      winston.info('Schedule stopped');
      status.setStatusStopped();
      stopAllTimeouts();
      hwi.turnOff(callback);
    } else {
      callback('No schedule running');
    }
  };

  scheduleRunner.getStatus = function() {
    if (!scheduleHandler.getSchedule()) {
      status.setStatusUnavailable();
    }
    return status.status;
  };

  scheduleRunner.clear = function() {
    stopAllTimeouts();
    scheduleHandler.clear();
  };

  scheduleRunner.getTempLog = scheduleHandler.getTempLog;

  if (test) {
    scheduleRunner.doMashStep = doMashStep;
    scheduleRunner.doSpargePause = doSpargePause;
    scheduleRunner.doBoil = doBoil;
    scheduleRunner.runScheduleCallback = runScheduleCallback;
    scheduleRunner.runSchedule = runSchedule;
  }

  return scheduleRunner;
};