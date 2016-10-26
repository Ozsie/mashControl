var heatControl = require('./heatControl');
var tempSensor = require('./tempSensor');
var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

var schedule;

var adjustTemperature = function(targetTemp) {
  tempSensor.readTemp(function(error, data) {
    if (!error) {
      currentTemp = tempSensor.parseTemp(data);
      if (currentTemp > 90) {
        console.error("Temperature passed hard heat cut off @ 90C");
        stopSchedule();
        return;
      }
      if (currentTemp > settings.heatCutOff) {
        console.error("Temperature passed heat cut off @ " + settings.heatCutOff + "C");
        stopSchedule();
        return;
      }
      if (currentTemp.temperature.celcius < targetTemp) {
        heatControl.increase(currentTemp.temperature.celcius, targetTemp);
      } else if (currentTemp.temperature.celcius > targetTemp) {
        heatControl.decrease(currentTemp.temperature.celcius, targetTemp);
      } else {
        console.log(currentTemp.temperature.celcius + " = " + targetTemp + " holding.");
      }
    }
  });
}

var runSchedule = function(callback) {
  console.log("Schedule: " + JSON.stringify(schedule));
  var i = 0;

  var nextStep = function(index) {
    console.log("Index: " + index);
    var step = schedule.steps[index];
    step.startTime = Date.now();
    console.log("Starting step " + (index + 1) + ", " + step.name + " at " + step.startTime);
    var stepTime = (step.riseTime + step.time) * 60 * 1000;
    console.log("Will run for " + stepTime + " ms");

    var run = function() {
      setTimeout(function() {
        if (Date.now() - step.startTime < stepTime) {
          console.log("Time left: " + (stepTime - (Date.now() - step.startTime)));
          adjustTemperature(step.temperature);
          run();
        }
      }, 1000);
    };

    run();
    return stepTime;
  };

  var nexInMs = nextStep(i);
  var doStep = function() {
    console.log("Next step in " + nexInMs + " ms");
    setTimeout(function() {
      i++;
      if (i < schedule.steps.length) {
        console.log("It's time for the next step");
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
    console.log(JSON.stringify(schedule));
    schedule = newSchedule;
    schedule.startTime = Date.now();
    schedule.status = 'running';
    heatControl.turnOn();
    runSchedule(function() {
      schedule.endTime = Date.now();
      console.log("Mash done after " + (schedule.endTime - schedule.startTime) + " ms");
      schedule.status = 'done';
    });
    return true;
  } else {
    return false;
  }
};

var stopSchedule = function() {
  if (schedule) {
    console.log(schedule);
    heatControl.turnOff();
    schedule.status = 'stopped';
    return true;
  } else {
    return false;
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