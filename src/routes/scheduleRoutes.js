var scheduleHandler = require('../scheduleHandler');

module.exports = function (app, hwi, winston) {
  var scheduleRunner = require('../runner/scheduleRunner')(hwi);

  app.post('/schedule/start', function(req, res) {
    winston.info('Start schedule requested');
    scheduleHandler.setSchedule(req.body);
    var err = scheduleRunner.startSchedule();
    if (!err) {
      winston.info('Start ok = ' + true);
      res.status(200).send(true);
    } else {
      winston.info('Start nok = ' + err);
      res.status(200).send(false);
    }
  });

  app.get('/schedule/stop', function(req, res) {
    winston.info('Stop schedule requested');
    scheduleRunner.stopSchedule(function(err, data) {
      if (!err) {
        res.status(200).send(data);
      } else {
        winston.warn("Stopped with error", err);
        res.status(200).send(data);
      }
    });
  });

  app.get('/schedule/status', function(req, res) {
    var status = scheduleRunner.getStatus();
    res.status(200).send(status);
  });

  app.get('/schedule/tempLog', function(req, res) {
    var tempLog = scheduleHandler.getTempLog();
    res.status(200).send({log: tempLog});
  });

  app.get('/schedule', function(req, res) {
    winston.info('Get Schedule');
    res.status(200).send(scheduleHandler.getSchedule());
  });
};