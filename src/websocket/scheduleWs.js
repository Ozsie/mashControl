module.exports = function(hwi, winston, ws, sendJson) {
  var scheduleWs = {};

  var scheduleRunner = require('../runner/scheduleRunner')(hwi);
  var scheduleHandler = require('../scheduleHandler');
  var sendUpdatesTimeout;

  var sendUpdates = function() {
    sendUpdatesTimeout = setTimeout(function() {
      var update = {
        tempLog: scheduleHandler.getTempLog(),
        status: scheduleRunner.getStatus(),
        currentTemperature: hwi.temperature,
        direction: hwi.getCurrentDirection()
      };

      var response = {
        request: '/schedule/status',
        data: update
      };

      sendJson(response);
      sendUpdates();
    }, 1000);
  };

  scheduleWs.start = function(msg, response) {
    try {
      winston.info('Start schedule requested');
      scheduleHandler.setSchedule(msg.params.schedule);
      var err = scheduleRunner.startSchedule();
      if (!err) {
        winston.info('Start ok = ' + true);
        response.data = {started: true};
        sendUpdates();
      } else {
        winston.info('Start nok = ' + err);
        response.error = {started: false};
      }
      sendJson(response);
    } catch (error) {
      response.error = 'Incomplete params';
      response.caught = error;
      sendJson(response);
    }
  };

  scheduleWs.stop = function(response) {
    winston.info('Stop schedule requested');
    scheduleRunner.stopSchedule(function(err, data) {
      clearTimeout(sendUpdatesTimeout);
      if (!err) {
        response.data = {stopped: data};
      } else {
        response.error = err;
        winston.warn("Stopped with error", err);
      }
      sendJson(response);
    });
  };

  scheduleWs.getCurrentSchedule = function(response) {
    winston.info('Get Schedule');
    var schedule = scheduleHandler.getSchedule();
    if (schedule) {
      response.data = scheduleHandler.getSchedule();
    } else {
      response.error = 'No schedule loaded';
    }
    sendJson(response);
  };

  scheduleWs.getStatus = function(response) {
    winston.info('Get status');
    response.data = {
      tempLog: scheduleHandler.getTempLog(),
      status: scheduleRunner.getStatus(),
      currentTemperature: hwi.temperature,
      direction: hwi.getCurrentDirection()
    };
    sendJson(response);
  };

  return scheduleWs;
};