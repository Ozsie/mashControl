module.exports = function (app, hwi, winston) {
  app.get('/temp/current', function(req, res) {
    //winston.info('Temp requested');
    res.status(200).send({temperature: hwi.temperature});
  });
};