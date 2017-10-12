var tempSensor = require('mc-tempsensor');
var gpio = require('mc-gpio');
var rc = require('./components/relay')(gpio);
var pump = require('./components/pump')(rc);
var heatControl = require('./components/heatControl')(gpio, rc);
var winston = require('winston');

module.exports = function() {
  var hi = {};
  var updateTempTimeout;

  tempSensor.init('28-800000263717', undefined, function() {
    winston.info('Temp sensor initialized');
  });

  var updateTemp = function(callback) {
    if (!callback) {
      callback = function(err) {
        if (err) {
          winston.error('------------------------------------- ERROR ', err);
        }
      };
    }
    tempSensor.readAndParse(function(err, data) {
      if (data[0].error) {
        callback(data[0].error);
      } else if (!err) {
        hi.temperature = data[0].temperature.celcius;
        if (callback) {
          callback();
        }
      } else {
        callback(err);
      }
      updateTempLoop();
    });
  };

  var updateTempLoop = function(callback) {
    updateTempTimeout = setTimeout(function() {
      updateTemp(callback);
    }, 209);
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
    winston.info('TURN OFF HW');
    heatControl.turnOff(function(err, data) {
      winston.info('Heat control off');

      pump.stop(function(err) {
        winston.info('Pump off');
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