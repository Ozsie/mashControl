var heatControl = require('./heatControl');
var util = require('./util');
var tempSensor = require('mc-tempsensor');
var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
var winston = require('winston');
winston.add(winston.transports.File, { name:"boil", filename: settings.logs.directory + '/boil.log' });

var previousTemp;

var adjustTemperatureForBoil = function(status, schedule) {
  tempSensor.readAndParse(function(err, data) {
    if (!err) {
      var currentTemp = data.temperature.celcius;
      var initialDegreesToIncrease = 100 - status.initialTemp;
      if (previousTemp === undefined) {
        previousTemp = currentTemp;
      }
      var diff = parseFloat(currentTemp - previousTemp);
      var degreesToIncrease = Math.abs(currentTemp - 100);
      status.temperature = currentTemp;
      status.minutes = util.getRunningForMinutes(schedule);

      winston.info("Increase from last: " + diff + "C. Degrees left: " + degreesToIncrease + "C of " +
      initialDegreesToIncrease + "C. " +
      "Target: " + 100 + "C");

      if (currentTemp < 100) {
        winston.info("Under, double increase");
        heatControl.fastIncrease();
      } else {
        winston.info("On mark " + currentTemp + " >= 100 holding.");
      }
      previousTemp = currentTemp;
    } else {
      status.thermometer = false;
      winston.error(err);
      callback(err);
    }
  });
};

var boil = function(status, schedule) {
  tempSensor.readAndParse(function(err, data) {
    if (!err) {
      status.step = schedule.steps.length + 2;
      status.stepName = "Boil";
      status.initialTemp = data.temperature.celcius;
      status.startTime = Date.now();
      status.timeRemaining = (schedule.boilTime + schedule.boilRiseTime) * 60 * 1000;
      winston.info("######################################################################################");
      winston.info("#                                                                                    #");
      winston.info("    Starting Boil at " + status.startTime);
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
            adjustTemperatureForBoil(status, schedule);
            run();
          } else {
            winston.info("## Step Boil ran for " + (Date.now() - status.startTime) + " ms. ##");
          }
        }, 12000);
      };

      run();
      return status.timeRemaining;
    } else {
      status.thermometer = false;
      winston.error("Could not read temperature", err);
      throw new Error(err);
    }
  });
};

module.exports = {
  boil: boil
};