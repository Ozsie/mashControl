var gpio = require('mc-gpio');
var fs = require('fs');

var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

var winston = require('winston');
winston.add(winston.transports.File, { name: "heatControl", filename: settings.logs.directory + '/heatControl.log' });


var isOpen = false;
var stepping = false;

var errCallback;
var relayOpen = [false, false, false, false];

var commands = [];

var getRelay = function(index) {
  return settings.relay[index];
};

var getRelayStatus = function(index) {
  var relays = settings.relay;
  for (var index in relays) {
    relays[index].open = relayOpen[index];
  }

  return relays;
};

var setRelay = function(setting, errorCallback) {
  if (setting.state === "on") {
    return relayOn(setting.index, errorCallback);
  } else {
    return relayOff(setting.index, errorCallback);
  }
};

var relayOn = function(index, errorCallback) {
  var relay = getRelay(index);
  var pin = relay.pin;
  if (!relayOpen[relay.index]) {
    open(pin, function(err, data) {
      if(!err) {
        winston.debug("Relay " + relay.name + " on");
        gpio.writeSync(pin, 1);
        relayOpen[relay.index] = true;
        relay.open = true;
        return relay;
      }
    });
  } else {
    winston.debug("Relay " + relay.name + " on");
    gpio.writeSync(pin, 1);
    relayOpen[relay.index] = true;
    relay.open = true;
    return relay;
  }
};

var relayOff = function(index, errorCallback) {
  var relay = getRelay(index);
  var pin = relay.pin;
  if (relayOpen[relay.index]) {
    winston.debug("Relay " + relay.name + " off");
    gpio.writeSync(pin, 0);
    close(pin);
    relayOpen[relay.index] = false;
    relay.open = false;
    return relay;
  }
  return relay;
};

var heaterOnSwitch = function() {
  setRelay({index: 0, state: "on"});
  setTimeout(function() {
    setRelay({index: 0, "off"});
  }, 800);
};

var heaterModeSwitch = function() {
  setRelay({index: 0, state: "on"});
  setTimeout(function() {
    setRelay({index: 0, state: "off"});
  }, 800);
};

var turnOn = function(errorCallback) {
  if (isOpen) {
    winston.info("Motor communication already open.");
    return;
  }
  errCallback = errorCallback;
  winston.info("Turn on. Enable Pin: " + settings.motor.enablePin);
  open(18, function() {
    open(4, function() {
      open(17, function() {
        open(23, function() {
          open(24, function() {
            output(settings.motor.enablePin, 1, function() {
              isOpen = true;
              winston.info("Motor communication is open. Waiting for commands.");
              setRelay({index: 0, "on"});
              heaterOnSwitch();
              setTimeout(function() {
                heaterModeSwitch();
              }, 500);
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
  heaterOnSwitch();
  output(settings.motor.enablePin, 0, function(err, data) {
    if (!err) {
      isOpen = false;
      close(4);
      close(17);
      close(18);
      close(23);
      close(24);
      callback(undefined, data);
    } else {
      errCallback();
      winston.error("Could not turn off heat control", err);
      callback(err, data);
    }
  });
};

var forward = function() {
  commands.push("forward");
};

var fastForward = function() {
  commands.push("forward");
  commands.push("forward");
  commands.push("forward");
};

var backward = function(steps) {
  commands.push("backward");
};

var fastBackward = function(steps) {
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

var close = function(pin) {
  gpio.closePin(pin, function(err) {
    if (err) {
      errCallback();
      winston.error("Could not close pin:", + err);
    }
  });
};

var setStep = function(w1, w2, w3, w4) {
  outputSync(settings.motor.coilA1Pin, w1);
  outputSync(settings.motor.coilA2Pin, w2);
  outputSync(settings.motor.coilB1Pin, w3);
  outputSync(settings.motor.coilB2Pin, w4);
};

var stepForward = function(steps, callback) {
  var currentStep = 0;
  var doStep = function() {
    setTimeout(function() {
      setStep(1, 0, 1, 0);
      setTimeout(function() {
        setStep(0, 1, 1, 0);
        setTimeout(function() {
          setStep(0, 1, 0, 1);
          setTimeout(function() {
            setStep(1, 0, 0, 1);
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
  gpio: gpio
};
