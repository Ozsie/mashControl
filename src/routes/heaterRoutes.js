var heatControl = require('../components/heatControl');

module.exports = function (app, winston) {
  app.get('/heater/direction', function(req, res) {
    var dir = {
      direction: heatControl.getCurrentDirection()
    };
    res.status(200).send(dir);
  });
};