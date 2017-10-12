var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
var winston = require('winston');

var schedule;

var setSchedule = function(newSchedule) {
  schedule = newSchedule;
  if (!schedule.startTime) {
    schedule.startTime = Date.now();
  }
  schedule.tempLog = [];
};

var setEndTime = function() {
  if (schedule) {
    schedule.endTime = Date.now();
  }
};

var getRunTime = function() {
  if (schedule) {
    return schedule.endTime - schedule.startTime;
  } else {
    return -1;
  }
};

var getRunningForMinutes = function() {
  if (!schedule || !schedule.startTime) {
    return -1;
  }
  var millis = Date.now() - schedule.startTime;
  var seconds = millis / 1000;
  var minutes = Math.floor(seconds/60);
  return minutes;
};

var calculateStepTime = function(step) {
  return (step.riseTime + step.time) * 60 * 1000;
};

var getTempLog = function() {
  if (schedule && schedule.tempLog) {
    return schedule.tempLog;
  } else {
    return [];
  }
};

var resetTempLog = function() {
  if (schedule) {
    schedule.tempLog = [];
  }
};

var clear = function() {
  schedule = undefined;
}

var addTempToLog = function(temperature, minute) {
  if (!schedule) {
    return;
  }
  if (!schedule.tempLog) {
    schedule.tempLog = [];
  }
  var entry = {
    minute: minute,
    temperature: temperature,
    actualTime: Date.now()
  };
  if (schedule.tempLog.length > 0) {
    entry.timeSinceFirst = entry.actualTime - schedule.tempLog[0].actualTime;
    entry.timeSincePrevious = entry.actualTime - schedule.tempLog[schedule.tempLog.length - 1].actualTime;
  } else {
    entry.timeSinceFirst = 0;
    entry.timeSincePrevious = 0;
  }
  schedule.tempLog.push(entry);
};

var getSchedule = function() {
  return schedule;
};

module.exports = {
  getRunningForMinutes: getRunningForMinutes,
  calculateStepTime: calculateStepTime,
  getTempLog: getTempLog,
  resetTempLog: resetTempLog,
  setSchedule: setSchedule,
  getSchedule: getSchedule,
  addTempToLog: addTempToLog,
  clear: clear,
  setEndTime: setEndTime,
  getRunTime: getRunTime
};