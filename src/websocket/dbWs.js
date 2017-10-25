var db = require('../db');

module.exports = function(winston, ws, sendJson) {
  var dbWs = {};

  dbWs.retrieveSchedules = function(msg, response) {
    if (msg.params && msg.params.uuid) {
      retrieveSchedule(msg.params.uuid, response);
    } else {
      retrieveAllSchedules(response);
    }
  };

  var retrieveSchedule = function(uuid, response) {
    winston.info('Retrieve schedule ' + uuid);
    db.retrieveSchedule(uuid, function(err, data) {
      if (!err) {
        response.data = data;
      } else {
        response.error = err;
      }
      sendJson(response);
    });
  };

  var retrieveAllSchedules = function(response) {
    winston.info('Retrieve all schedules');
    db.retrieveSchedules(function(err, data) {
      if (!err) {
        response.data = data;
      } else {
        response.error = err;
      }
      winston.info(JSON.stringify(response));
      sendJson(response);
    });
  };

  dbWs.createSchedule = function(msg, response) {
    try {
      winston.info('Create schedule');
      var schedule = msg.params.schedule;
      db.createSchedule(schedule, function(err, data) {
        if (!err) {
          response.data = { uuid: data };
        } else {
          response.error = err;
        }
        sendJson(response);
      });
    } catch (error) {
      response.error = 'Incomplete params';
      response.caught = error;
      sendJson(response);
    }
  };

  dbWs.updateSchedule = function(msg, response) {
    try {
      var schedule = msg.params.schedule;
      var uuid = msg.params.uuid;
      winston.info('Update schedule ' + uuid);
      db.updateSchedule(uuid, schedule, function(err, data) {
        if (!err) {
          response.data = data;
        } else {
          response.error = err;
        }
        sendJson(response);
      });
    } catch (error) {
      response.error = 'Incomplete params';
      response.caught = error;
      sendJson(response);
    }
  };

  dbWs.deleteSchedule = function(msg, response) {
    try {
      var uuid = msg.params.uuid;
      winston.info('Delete schedule ' + uuid);
      db.deleteSchedule(uuid, function(err, data) {
        if (!err) {
          response.data = { uuid: data };
        } else {
          response.error = err;
        }
        sendJson(response);
      });
    } catch (error) {
      response.error = 'Incomplete params';
      response.caught = error;
      sendJson(response);
    }
  };

  return dbWs;
};