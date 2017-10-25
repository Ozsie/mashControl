var fs = require('fs');
var winston = require('winston');
var uuidV4 = require('uuid/v4');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
winston.add(winston.transports.File, { name:"db", filename: settings.logs.directory + '/db.log', 'timestamp':true});

var store = settings.scheduleStore.directory;

if (!fs.existsSync(store)){
    fs.mkdirSync(store);
}

var schedules = {};

var loadSchedules = function(callback) {
  fs.readdir(store, (err, files) => {
    if (err) {
      callback(err);
    } else {
      files.forEach(file => {
        var schedule = JSON.parse(fs.readFileSync(store + '/' + file, 'utf8'));
        schedules[schedule.uuid] = schedule;
      });
      callback();
    }
  });
};

var clearSchedules = function(callback) {
  schedules = {};
  callback();
};

var createSchedule = function(schedule, callback) {
  var uuid = uuidV4();
  schedule.uuid = uuid;
  fs.writeFile(store + '/' + uuid + '.json', JSON.stringify(schedule), 'utf8', function(err) {
    if (!err) {
      schedules[uuid] = schedule;
    }
    callback(err, uuid);
  });
};

var retrieveSchedule = function(uuid, callback) {
  if (schedules[uuid]) {
    callback(undefined, schedules[uuid]);
  } else {
    winston.error("Could not find schedule with UUID " + uuid);
    callback("Could not find schedule with UUID " + uuid);
  }
};

var retrieveSchedules = function(callback) {
  callback(undefined, schedules);
};

var updateSchedule = function(uuid, schedule, callback) {
  if (schedules[uuid]) {
    fs.writeFile(store + '/' + uuid + '.json', JSON.stringify(schedule), 'utf8', function(err) {
      if (!err) {
        schedules[uuid] = schedule;
      }
      callback(err, uuid);
    });
  } else {
    winston.error("Could not find schedule with UUID " + uuid);
    callback("Could not find schedule with UUID " + uuid);
  }
};

var deleteSchedule = function(uuid, callback) {
  if (schedules[uuid]) {
    fs.unlink(store + '/' + uuid + '.json', function(err) {
      if (!err) {
        schedules[uuid] = undefined;
      }
      callback(err, uuid);
    });
  } else {
    winston.error("Could not find schedule with UUID " + uuid);
    callback("Could not find schedule with UUID " + uuid);
  }
};

module.exports = {
  loadSchedules: loadSchedules,
  clearSchedules: clearSchedules,
  createSchedule: createSchedule,
  retrieveSchedule: retrieveSchedule,
  retrieveSchedules: retrieveSchedules,
  updateSchedule: updateSchedule,
  deleteSchedule: deleteSchedule
};