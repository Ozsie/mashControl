module.exports = function (app, hwi) {
  app.get('/temp/current', function(req, res) {
    //winston.info('Temp requested');
    hwi.getCurrentTemperature(function(err, temp) {
      if (err) {
        res.status(500).send();
      } else {
        res.status(200).send({temperature: temp});
      }
    });
  });
};