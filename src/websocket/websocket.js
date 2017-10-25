module.exports = function (app, hwi, winston) {

  app.ws('/ws', function(ws) {
    var sendJson = function(msg) {
      ws.send(JSON.stringify(msg));
    };

    var tempWs = require('./dbWs')(hwi, winston, ws, sendJson);
    var dbWs = require('./dbWs')(winston, ws, sendJson);
    var scheduleWs = require('./scheduleWs')(hwi, winston, ws, sendJson);

    ws.on('message', function(msg) {
      var jsonMsg = JSON.parse(msg);
      if (!jsonMsg.request) {
        winston.error('No request specified ' + msg);
        ws.sendJson({
          error: 'No request specified'
        });
      } else {
        winston.info('request: ' + jsonMsg.request);
        winston.info('params: ' + jsonMsg.params);
        var response = {
          request: jsonMsg.request,
          params: jsonMsg.params
        };
        winston.info('Base response: ' + JSON.stringify(response));
        switch (jsonMsg.request) {
          case '/temp/current':
            tempWs.getCurrentTemperature(response);
            break;
          case '/schedule/store/create':
            dbWs.createSchedule(jsonMsg, response);
            break;
          case '/schedule/store/retrieve':
            dbWs.retrieveSchedules(jsonMsg, response);
            break;
          case '/schedule/store/update':
            dbWs.createSchedule(jsonMsg, response);
            break;
          case '/schedule/store/delete':
            dbWs.deleteSchedule(jsonMsg, response);
            break;
          case '/schedule/start':
            scheduleWs.start(jsonMsg, response);
            break;
          case '/schedule/stop':
            scheduleWs.stop(response);
            break;
          case '/schedule':
            scheduleWs.getCurrentSchedule(response);
            break;
          case '/schedule/status':
            scheduleWs.getStatus(response);
            break;
          default:
            response.error = 'Unrecognized request';
            ws.sendJson(response);
        }
      }
    });
  });
};