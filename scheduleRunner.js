var heatControl = require('./heatControl');
var tempSensor = require('./tempSensor');
var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

var schedule;

var previousTemp = undefined;

var adjustTemperature = function(targetTemp) {
  tempSensor.readTemp(function(error, data) {
    if (!error) {
      var currentTemp = tempSensor.parseTemp(data);
      if (previousTemp === undefined) {
        previousTemp = currentTemp.temperature.celcius;
      }
      var diff = parseFloat(currentTemp.temperature.celcius - previousTemp);
      console.log("Current diff: " + currentTemp.temperature.celcius + " - " + previousTemp + " = " + diff);
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
      var offMark = Math.abs(currentTemp.temperature.celcius - targetTemp);
      console.log("Off by " + offMark + "C");

      if (currentTemp.temperature.celcius < targetTemp) {
        if (offMark < (settings.tolerance + settings.overshoot)) {
          console.log("Closing in, fast decrease");
          heatControl.fastDecrease();
        }
        else if (offMark > (settings.tolerance + (settings.offMarkBreak * 2)) && diff < 20) {
          console.log("Much under, double increase");
          heatControl.fastIncrease();
        }
        else if (offMark > (settings.tolerance + settings.offMarkBreak) && diff < 10) {
          console.log("A little under, increase");
          heatControl.increase();
        }
      } else if (currentTemp.temperature.celcius > targetTemp) {
        console.log("Overshoot, fast decrease");
        heatControl.fastDecrease();
      } else {
        console.log("On mark " + currentTemp.temperature.celcius + " = " + targetTemp + " holding.");
      }
      previousTemp = currentTemp.temperature.celcius;
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
          //console.log("Time left: " + (stepTime - (Date.now() - step.startTime)));
          adjustTemperature(step.temperature);
          run();
        }
      }, 20000);
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
    //heatControl.turnOn();
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