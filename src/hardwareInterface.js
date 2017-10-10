var tempSensor = require('mc-tempsensor');
var gpio = require('mc-gpio');
var rc = require('./components/relay')(gpio);
var pump = require('./components/pump')(rc);
var heatControl = require('./components/heatControl')(gpio, rc);

module.exports = function() {
  var hi = {};
  var updateTempTimeout;

  tempSensor.init('28-800000263717', undefined, function() {
    console.log('Temp sensor initialized');
  });

  var updateTemp = function(callback) {
    tempSensor.readAndParse(function(err, data) {
      if (!err) {
        hi.temperature = data[0].temperature.celcius;
        updateTempLoop();
        if (callback) {
          callback();
        }
      } else {
        console.log(' ------------ ' + err);
        callback(err);
      }
    });
  };

  var updateTempLoop = function(callback) {
    updateTempTimeout = setTimeout(function() {
      updateTemp(callback);
    }, 200);
  };

  hi.maxEffect = function() {
    return heatControl.max();
  };

  hi.minEffect = function() {
    return heatControl.min();
  };

  hi.getCurrentDirection = function() {
    return heatControl.getCurrentDirection();
  };

  hi.cycleHeaterPower = function() {
    heatControl.heaterOnSwitch(function(err, data) {
      if (!err) {
        heatControl.heaterModeSwitch(function(err, data) {
        });
      }
    });
  };

  hi.heaterOnSwitch = function(callback) {
    heatControl.heaterOnSwitch(callback);
  };

  hi.turnOn = function(callback) {
    hi.initialized = true;
    updateTemp(function(err) {
      if (err) {
        hi.turnOn(callback);
      } else {
        var hwStatus = {motor: false, pump: false};
        heatControl.turnOn(function(mErr) {
          if (!mErr) {
            hwStatus.motor = true;
            pump.start(function(pErr, pumpStatus) {
              hwStatus.pump = pump.isOn();
              callback(pErr, hwStatus)
            });
          } else {
            callback(mErr, hwStatus);
          }
        });
      }
    });
  };

  hi.turnOff = function(callback) {
    clearTimeout(updateTempTimeout);
    hi.initialized = false;
    console.log('TURN OFF HW');
    heatControl.turnOff(function(err, data) {
      console.log('Heat control off');

      pump.stop(function(err) {
        console.log('Pump off');
        callback(err, true);
      });
    });
  };

  hi.stopPump = function(callback) {
    pump.stop(callback);
  };

  hi.getCurrentTemperature = function(callback) {
    if (hi.temperature) {
      callback(undefined, hi.temperature)
    } else {
      tempSensor.readAndParse(function(err, data) {
        if (!err) {
          callback(undefined, data[0].temperature.celcius);
        } else {
          callback(err);
        }
      });
    }
  };

  return hi;
};