var pump = require('../components/pump');

module.exports = function (app, winston) {
  app.get('/pump/status', function(req, res) {
    res.status(200).send(pump.isRunning());
  });

  app.get('/pump/start', function(req, res) {
    pump.start(function(err, status) {
      res.status(200).send(status);
    });
  });

  app.get('/pump/stop', function(req, res) {
    pump.stop(function(err, status) {
      res.status(200).send(status);
    });
  });
};