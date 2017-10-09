var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
var winston = require('winston');
winston.add(winston.transports.File, { name:"scheduleHandler", filename: settings.logs.directory + '/scheduleHandler.log', 'timestamp':true });

var schedule;

var setSchedule = function(newSchedule) {
  schedule = newSchedule;
  if (!schedule.startTime) {
    schedule.startTime = Date.now();
  }
  schedule.tempLog = [];
  winston.info(JSON.stringify(schedule));
};

var setEndTime = function() {
  schedule.endTime = Date.now();
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
    temperature: temperature
  };
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
  clear: clear
};