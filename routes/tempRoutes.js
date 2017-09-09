var tempSensor = require('mc-tempsensor');
var scheduleRunner = require('../runner/scheduleRunner');

module.exports = function (app, winston) {
  app.get('/temp/current', function(req, res) {
    //winston.info('Temp requested');
    tempSensor.readTemp(function(error, data) {
      if (!error) {
        var tempData = tempSensor.parseTemp(data);
        tempData.minute = scheduleRunner.getRunningForMinutes();
        res.status(200).send(tempData);
      } else {
        switch (error.code) {
          case 'ENOENT':
            winston.error("Could not fetch temperature. Probe unavailable.");
            break;
          default:
            winston.error("Could not fetch temperature.", error);
        }

        res.status(503).send(error);
      }
    });
  });
};