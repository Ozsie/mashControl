var heatControl = require('./heatControl');
var tempSensor = require('mc-tempsensor');
var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
var winston = require('winston');
winston.add(winston.transports.File, { name:"sparge", filename: settings.logs.directory + '/sparge.log' });


var spargePause = function(status, schedule) {
  console.log("--------------------------------")
  tempSensor.readAndParse(function(err, data) {
    if (!err) {
      status.step = schedule.steps.length + 1;
      status.stepName = "Sparge Pause";
      status.initialTemp = data.temperature.celcius;
      status.startTime = Date.now();
      status.timeRemaining = schedule.spargePause * 60 * 1000;
      winston.info("######################################################################################");
      winston.info("#                                                                                    #");
      winston.info("    Starting Sparge pause at " + status.startTime);
      winston.info("    Will run for " + status.timeRemaining + " ms");
      winston.info("    Temperature at start " + status.initialTemp + " C");
      winston.info("    Mash water volume " + schedule.volume + " l");
      winston.info("#                                                                                    #");
      winston.info("######################################################################################");

      var run = function() {
        if (status.status === 'stopped' || status.status === 'done') {
          winston.info("Running step stopped");
          return;
        }
        setTimeout(function() {
          if (Date.now() - status.startTime < status.timeRemaining) {
            run();
          } else {
            winston.info("## Step Sparge Pause ran for " + (Date.now() - status.startTime) + " ms. ##");
          }
        }, 12000);
      };

      run();
      return status.timeRemaining;
    } else {
      winston.error("Could not read temperature", err);
      throw new Error(err);
    }
  });
};

module.exports = {
  spargePause: spargePause
};