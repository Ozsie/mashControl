module.exports = function (app, hwi, winston) {
  app.get('/heater/direction', function(req, res) {
    var dir = {
      direction: hwi.getCurrentDirection()
    };
    res.status(200).send(dir);
  });
};