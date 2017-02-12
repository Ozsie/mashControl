var heatControl = require('./heatControl');
var tempSensor = require('./tempSensor');
var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
var winston = require('winston');
winston.add(winston.transports.File, { name:"scheduleRunner", filename: settings.logs.directory + '/scheduleRunner.log' });

var schedule;
var previousTemp;

var temperatureToLow = function(offMark, diff) {
  if (offMark < (settings.tolerance + settings.offMarkBreak)) {
    winston.info("Closing in, fast decrease");
    heatControl.fastDecrease();
  }
  else if (offMark > (settings.tolerance + (settings.offMarkBreak * 2)) && diff < 20) {
    winston.info("Much under, double increase");
    heatControl.fastIncrease();
  }
  else if (offMark > (settings.tolerance + settings.offMarkBreak) && diff < 10) {
    winston.info("A little under, increase");
    heatControl.increase();
  }
};

var adjustTemperature = function(targetTemp) {
  tempSensor.readAndParse(function(err, data) {
    if (!error) {
      var currentTemp = data;
      if (previousTemp === undefined) {
        previousTemp = currentTemp.temperature.celcius;
      }
      var diff = parseFloat(currentTemp.temperature.celcius - previousTemp);
      winston.info("Current diff: " + currentTemp.temperature.celcius + " - " + previousTemp + " = " + diff);
      if (currentTemp > 90) {
        winston.warn("Temperature passed hard heat cut off @ 90C");
        stopSchedule();
        return;
      }
      if (currentTemp > settings.heatCutOff) {
        winston.warn("Temperature passed heat cut off @ " + settings.heatCutOff + " C");
        stopSchedule();
        return;
      }
      var offMark = Math.abs(currentTemp.temperature.celcius - targetTemp);
      winston.info("Off by " + offMark + "C");

      if (currentTemp.temperature.celcius < targetTemp) {
        temperatureToLow(offMark, diff);
      } else if (currentTemp.temperature.celcius > targetTemp) {
        winston.info("Overshoot, fast decrease");
        heatControl.fastDecrease();
      } else {
        winston.info("On mark " + currentTemp.temperature.celcius + " = " + targetTemp + " holding.");
      }
      previousTemp = currentTemp.temperature.celcius;
    } else {
      winston.error(err);
      callback(err);
    }
  });
};

var nextStep = function(index) {
  var step = schedule.steps[index];
  step.startTime = Date.now();
  winston.info("Starting step " + (index + 1) + ", " + step.name + " at " + step.startTime);
  var stepTime = (step.riseTime + step.time) * 60 * 1000;
  winston.info("Will run for " + stepTime + " ms");

  var run = function() {
    setTimeout(function() {
      if (Date.now() - step.startTime < stepTime) {
        //winston.info("Time left: " + (stepTime - (Date.now() - step.startTime)));
        adjustTemperature(step.temperature);
        run();
      }
    }, 12000);
  };

  run();
  return stepTime;
};

var runSchedule = function(callback) {
  winston.info("Schedule: " + JSON.stringify(schedule));
  var i = 0;

  var nexInMs = nextStep(i);
  var doStep = function() {
    winston.info("Next step in " + nexInMs + " ms");
    setTimeout(function() {
      i++;
      if (i < schedule.steps.length) {
        winston.info("It's time for the next step");
        nexInMs = nextStep(i);
        doStep();
      } else {
        callback();
      }
    }, nexInMs);
  };
  doStep();
};

var startSchedule = function(newSchedule) {
  if (newSchedule) {
    winston.info(JSON.stringify(schedule));
    schedule = newSchedule;
    schedule.startTime = Date.now();
    schedule.status = 'running';
    //heatControl.turnOn();
    runSchedule(function() {
      schedule.endTime = Date.now();
      winston.info("Mash done after " + (schedule.endTime - schedule.startTime) + " ms");
      schedule.status = 'done';
    });
    return true;
  } else {
    return false;
  }
};

var stopSchedule = function(callback) {
  if (schedule) {
    winston.info(schedule);
    heatControl.turnOff(function(err, data) {
      if (!err) {
        schedule.status = 'stopped';
        callback(undefined, true);
      } else {
        callback(err);
      }
    });
  } else {
    callback("No schedule available");
  }
};

var getStatus = function() {
  if (!schedule) {
    return "unavailable";
  } else {
    return schedule.status;
  }
};

var getSchedule = function() {
  return schedule;
};

module.exports = {
  startSchedule: startSchedule,
  stopSchedule: stopSchedule,
  getStatus: getStatus,
  getSchedule: getSchedule
};