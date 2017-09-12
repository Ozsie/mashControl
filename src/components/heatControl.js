var gpio = require('mc-gpio');
var fs = require('fs');
var rc = require('./relay');

var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

var winston = require('winston');
winston.add(winston.transports.File, { name: "heatControl", filename: settings.logs.directory + '/heatControl.log', 'timestamp':true });

var isOpen = false;
var stepping = false;

var commands = [];

var getCurrentDirection = function() {
  if (commands.length > 0) {
    return commands[0];
  } else {
    return undefined;
  }
};

var heaterOnSwitch = function(callback) {
  rc.setRelay({index: 1, state: "on"}, function() {
    setTimeout(function() {
      rc.setRelay({index: 1, state: "off"}, callback);
    }, 800);
  });
};

var heaterModeSwitch = function(callback) {
  rc.setRelay({index: 2, state: "on"}, function() {
    setTimeout(function() {
      rc.setRelay({index: 2, state: "off"}, callback);
    }, 800);
  });
};

var turnOn = function(callback) {
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
                  setTimeout(function() {
                    heaterModeSwitch(function() {
                      var end = Date.now();
                      console.log('Turn on: ' + (end - start));
                      callback();
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

var turnOff = function(callback) {
  if (!callback || typeof callback !== "function") {
    throw new Error("Callback function required");
  }
  winston.info("Turn off. Enable Pin: " + settings.motor.enablePin);
  commands = [];
  heaterOnSwitch(function(err) {
    gpio.write(settings.motor.enablePin, 0, function(err, data) {
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

var forward = function() {
  if (commands[commands.length - 1] === "backward") {
    commands = [];
  }
  commands.push("forward");
};

var fastForward = function() {
  if (commands[commands.length - 1] === "backward") {
    commands = [];
  }
  for (var i = 0; i < 3; i++) {
    commands.push("forward");
  }
};

var backward = function(steps) {
  if (commands[commands.length - 1] === "forward") {
    commands = [];
  }
  commands.push("backward");
};

var fastBackward = function(steps) {
  if (commands[commands.length - 1] === "forward") {
    commands = [];
  }
  for (var i = 0; i < 12; i++) {
    commands.push("forward");
  }
};

var setStep = function(w1, w2, w3, w4) {
  try {
    gpio.writeSync(settings.motor.coilA1Pin, w1);
    gpio.writeSync(settings.motor.coilA2Pin, w2);
    gpio.writeSync(settings.motor.coilB1Pin, w3);
    gpio.writeSync(settings.motor.coilB2Pin, w4);
  } catch (error) {
    winston.info('GPIO closed.');
    return 'break';
  }
};

var stepForward = function(steps, callback) {
  var currentStep = 0;
  var doStep = function() {
    setTimeout(function() {
      var s1 = setStep(1, 0, 1, 0);
      if (s1 === 'break') {
        callback();
      } else {
        setTimeout(function() {
          var s2 = setStep(0, 1, 1, 0);
          if (s2 === 'break') {
            callback();
          } else {
            setTimeout(function() {
              var s3 = setStep(0, 1, 0, 1);
              if (s3 === 'break') {
                callback();
              } else {
                setTimeout(function() {
                  var s4 = setStep(1, 0, 0, 1);
                  if (s4 === 'break') {
                    callback();
                  } else {
                    currentStep++;
                    if (currentStep < steps) {
                      doStep();
                    } else {
                      if (callback && typeof callback === "function") {
                        callback();
                      } else {
                        console.log("callback error in stepForwards");
                      }
                    }
                  }
                }, 5);
              }
            }, 5);
          }
        }, 5);
      }
    }, 0);
  };

  doStep();
};

var stepBackward = function(steps, callback) {
  var currentStep = 0;
  var doStep = function() {
    setTimeout(function() {
      setStep(1, 0, 0, 1);
      setTimeout(function() {
        setStep(0, 1, 0, 1);
        setTimeout(function() {
          setStep(0, 1, 1, 0);
          setTimeout(function() {
            setStep(1, 0, 1, 0);
            currentStep++;
            if (currentStep < steps) {
              doStep();
            } else {
              if (callback && typeof callback === "function") {
                callback();
              } else {
                console.log("callback error in stepBackwards");
              }
            }
          }, 5);
        }, 5);
      }, 5);
    }, 0);
  };

  doStep();
};

setTimeout(function() {
  setInterval(function () {
    if (isOpen && !stepping) {
      var command = commands.shift();
      if (command) {
        stepping = true;
        if (command === "forward") {
          stepForward(24, function() {
            stepping = false;
          });
        } else {
          stepBackward(24, function() {
            stepping = false;
          });
        }
      }
    }
  },
  200);
  }, 1000);

//catches uncaught exceptions
process.on('uncaughtException',  (err) => {
  winston.error('Caught exception', err);
});

module.exports = {
  increase: forward,
  decrease: backward,
  fastIncrease: fastForward,
  fastDecrease: fastBackward,
  turnOn: turnOn,
  turnOff: turnOff,
  getCurrentDirection: getCurrentDirection,
  gpio: gpio
};
