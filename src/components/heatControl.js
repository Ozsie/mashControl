var fs = require('fs');

var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

var winston = require('winston');

module.exports = function(gpio, rc) {
  var heatControl = {};

  var isOpen = false;
  var stepping = false;
  var turningOff = false;
  var stepTimeout;
  var modeSwitchTimeout;

  var direction;

  heatControl.getCurrentDirection = function() {
    return direction;
  };

  var heaterOnSwitch = function(callback) {
    winston.info('HEATER ON SWITCH');
    rc.setRelay({index: 1, state: "on"}, function() {
      winston.info('Relay switch 1');
      setTimeout(function() {
        winston.info('Relay switch 2');
        rc.setRelay({index: 1, state: "off"}, callback);
      }, 800);
    });
  };

  var heaterModeSwitch = function(callback) {
    if (turningOff) {
      callback();
      return;
    }
    winston.info('HEATER MODE SWITCH');
    rc.setRelay({index: 2, state: "on"}, function() {
      winston.info('M Relay switch 1');
      setTimeout(function() {
        winston.info('M Relay switch 2');
        rc.setRelay({index: 2, state: "off"}, callback);
      }, 800);
    });
  };

  heatControl.turnOn = function(callback) {
    var start = Date.now();
    if (isOpen) {
      winston.info("Motor communication already open.");
      callback();
    }
    winston.info("Turn on. Enable Pin: " + settings.motor.enablePin);
    gpio.openPinOut(settings.motor.enablePin, function() {
      gpio.openPinOut(settings.motor.coilA1Pin, function() {
        gpio.openPinOut(settings.motor.coilA2Pin, function() {
          gpio.openPinOut(settings.motor.coilB1Pin, function() {
            gpio.openPinOut(settings.motor.coilB2Pin, function() {
              gpio.write(settings.motor.enablePin, 1, function() {
                isOpen = true;
                winston.info("Motor communication is open. Waiting for commands.");
                rc.setRelay({index: 0, state: "on"}, function(err, relay) {
                  heaterOnSwitch(function(err) {
                    modeSwitchTimeout = setTimeout(function() {
                      heaterModeSwitch(function(err) {
                        var end = Date.now();
                        winston.info('Time to turn on: ' + (end - start) + ' ms');
                        callback(err, (end - start));
                      });
                    }, 500);
                  });
                });
              });
            });
          });
        });
      });
    });
  };

  var closeAll = function() {
    var close = function(pin) {
      gpio.closePin(pin, function(err) {
        if (err) {
          winston.error("Could not close pin:", + err);
        }
      });
    };
    for (var name in settings.motor) {
      var pin = settings.motor[name];
      close(pin);
    }
  };

  heatControl.turnOff = function(callback) {
    turningOff = true;
    winston.info("Turn off. Enable Pin: " + settings.motor.enablePin);
    direction = undefined;
    stepping = false;
    clearTimeout(stepTimeout);
    clearTimeout(modeSwitchTimeout);
    heaterOnSwitch(function(err) {
      winston.info('Relay switched');
      gpio.write(settings.motor.enablePin, 0, function(err, data) {
        winston.info('Enable pin off');
        if (!err) {
          closeAll();
          callback(undefined, data);
        } else {
          winston.error("Could not turn off heat control", err);
          callback(err, data);
        }
      });
    });
  };

  var setStep = function(w1, w2, w3, w4) {
    try {
      gpio.writeSync(settings.motor.coilA1Pin, w1);
      gpio.writeSync(settings.motor.coilA2Pin, w2);
      gpio.writeSync(settings.motor.coilB1Pin, w3);
      gpio.writeSync(settings.motor.coilB2Pin, w4);
    } catch (error) {
      winston.error('GPIO closed. ' + error);
      return 'break';
    }
  };

  var stepForward = function(steps, callback) {
    var currentStep = 0;
    var doStep = function() {
      stepTimeout = setTimeout(function() {
        setStep(1, 0, 1, 0);
        stepTimeout = setTimeout(function() {
          setStep(0, 1, 1, 0);
          stepTimeout = setTimeout(function() {
            setStep(0, 1, 0, 1);
            stepTimeout = setTimeout(function() {
              setStep(1, 0, 0, 1);
              currentStep++;
              if (currentStep < steps) {
                doStep();
              } else {
                callback(currentStep);
              }
            }, 5);
          }, 5);
        }, 5);
      }, 0);
    };

    doStep();
  };

  var stepBackward = function(steps, callback) {
    var currentStep = 0;
    var doStep = function() {
      stepTimeout = setTimeout(function() {
        setStep(1, 0, 0, 1);
        stepTimeout = setTimeout(function() {
          setStep(0, 1, 0, 1);
          stepTimeout = setTimeout(function() {
            setStep(0, 1, 1, 0);
            stepTimeout = setTimeout(function() {
              setStep(1, 0, 1, 0);
              currentStep++;
              if (currentStep < steps) {
                doStep();
              } else {
                callback(currentStep);
              }
            }, 5);
          }, 5);
        }, 5);
      }, 0);
    };

    doStep();
  };

  heatControl.max = function() {
    if (direction === 'forward') {
      return;
    } else {
      heatControl.stepsTaken = 0;
      direction = 'forward';
      stepping = true;
      stepForward(240, function(stepsTaken) {
        heatControl.stepsTaken = stepsTaken;
        stepping = false;
      });
    }
  };

  heatControl.min = function() {
    if (direction === 'backward') {
      return;
    } else {
      heatControl.stepsTaken = 0;
      direction = 'backward';
      stepping = true;
      stepBackward(240, function(stepsTaken) {
        heatControl.stepsTaken = stepsTaken;
        stepping = false;
      });
    }
  };

  heatControl.isStepping = function() {
    return stepping;
  };

  //catches uncaught exceptions
  process.on('uncaughtException',  (err) => {
    winston.error('Caught exception', err);
  });

  heatControl.gpio = gpio;

  return heatControl;
};
