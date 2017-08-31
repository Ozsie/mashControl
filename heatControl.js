var gpio = require('mc-gpio');
var fs = require('fs');

var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

var winston = require('winston');
winston.add(winston.transports.File, { name: "heatControl", filename: settings.logs.directory + '/heatControl.log' });


var isOpen = false;
var stepping = false;

var relayOpen = [false, false, false, false];

var commands = [];

var getCurrentDirection = function() {
  if (commands.length > 0) {
    return commands[0];
  } else {
    return undefined;
  }
};

var getRelay = function(index) {
  return settings.relay[index];
};

var getRelayStatus = function() {
  var relays = settings.relay;
  for (var index in relays) {
    relays[index].open = relayOpen[index];
  }

  return relays;
};

var setRelay = function(setting, callback) {
  if (setting.state === "on") {
    relayOn(setting.index, callback);
  } else {
    relayOff(setting.index, callback);
  }
};

var relayOn = function(index, callback) {
  var relay = getRelay(index);
  var pin = relay.pin;
  if (!relayOpen[relay.index]) {
    open(pin, function(err, data) {
      if(!err) {
        winston.debug("Relay " + relay.name + " on");
        gpio.writeSync(pin, 1);
        relayOpen[relay.index] = true;
        relay.open = true;
      }
      callback(err, relay);
    });
  } else {
    winston.debug("Relay " + relay.name + " on");
    gpio.writeSync(pin, 1);
    relayOpen[relay.index] = true;
    relay.open = true;
    callback(undefined, relay);
  }
};

var relayOff = function(index, callback) {
  var relay = getRelay(index);
  var pin = relay.pin;
  if (relayOpen[relay.index]) {
    winston.debug("Relay " + relay.name + " off");
    try {
      gpio.writeSync(pin, 0);
      close(pin, function(err) {
        if (!err) {
          relayOpen[relay.index] = false;
          relay.open = false;
        }
        callback(err, relay);
      });
    } catch (error) {
      console.log(JSON.stringify(error));
      callback(error);
    }
  }
};

var heaterOnSwitch = function(callback) {
  setRelay({index: 1, state: "on"}, function() {
    setTimeout(function() {
      setRelay({index: 1, state: "off"}, callback);
    }, 800);
  });
};

var heaterModeSwitch = function(callback) {
  setRelay({index: 2, state: "on"}, function() {
    setTimeout(function() {
      setRelay({index: 2, state: "off"}, callback);
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
  open(settings.motor.enablePin, function() {
    open(settings.motor.coilA1Pin, function() {
      open(settings.motor.coilA2Pin, function() {
        open(settings.motor.coilB1Pin, function() {
          open(settings.motor.coilB2Pin, function() {
            output(settings.motor.enablePin, 1, function() {
              isOpen = true;
              winston.info("Motor communication is open. Waiting for commands.");
              setRelay({index: 0, state: "on"}, function(err, relay) {
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

var turnOff = function(callback) {
  if (!callback || typeof callback !== "function") {
    throw new Error("Callback function required");
  }
  winston.info("Turn off. Enable Pin: " + settings.motor.enablePin);
  commands = [];
  heaterOnSwitch(function(err) {
    output(settings.motor.enablePin, 0, function(err, data) {
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
  commands.push("forward");
  commands.push("forward");
  commands.push("forward");
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
  commands.push("backward");
  commands.push("backward");
  commands.push("backward");
  commands.push("backward");
  commands.push("backward");
  commands.push("backward");
  commands.push("backward");
  commands.push("backward");
  commands.push("backward");
  commands.push("backward");
  commands.push("backward");
  commands.push("backward");
};

var output = function(pin, value, callback) {
  gpio.write(pin, value, callback);
};

var outputSync = function(pin, value) {
  gpio.writeSync(pin, value);
};

var open = function(pin, callback) {
  gpio.openPinOut(pin, callback);
};

var close = function(pin, callback) {
  gpio.closePin(pin, function(err) {
    if (err) {
      winston.error("Could not close pin:", + err);
    }
    callback(err);
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

var setStep = function(w1, w2, w3, w4) {
  try {
    outputSync(settings.motor.coilA1Pin, w1);
    outputSync(settings.motor.coilA2Pin, w2);
    outputSync(settings.motor.coilB1Pin, w3);
    outputSync(settings.motor.coilB2Pin, w4);
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
    if (open && !stepping) {
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
  setRelay: setRelay,
  getRelayStatus: getRelayStatus,
  getCurrentDirection: getCurrentDirection,
  gpio: gpio
};
