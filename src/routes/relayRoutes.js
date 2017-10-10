module.exports = function (app, rc, winston) {
  app.post('/relay', function(req, res) {
    winston.info('Switch relay');
    var setting = req.body;
    winston.info('Setting relay ' + setting.index + ' to ' + setting.state);
    rc.setRelay(setting, function(err, relay) {
      res.status(200).send(relay);
      if (err) {
        winston.error('Error while switching relay', err);
      }
    });
  });

  app.get('/relay/status', function(req, res) {
    res.status(200).send(rc.getRelayStatus());
  });
};