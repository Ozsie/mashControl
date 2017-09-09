var pump = require('../components/heatControl');

module.exports = function (app, winston) {
  app.get('/heater/on', function(req, res) {
    winston.info('Heater on');
    res.status(200).send(heatControl.heaterOn(function() {
      winston.error("ERROR!");
    }));
  });

  app.get('/heater/direction', function(req, res) {
    var dir = {
      direction: heatControl.getCurrentDirection()
    };
    res.status(200).send(dir);
  });
};