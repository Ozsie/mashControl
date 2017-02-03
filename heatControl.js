var fs = require('fs');
var winston = require('winston');
winston.add(winston.transports.File, { filename: 'logs/heatControl.log' });

var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

var open = false;
var stepping = false;

var commands = [];

console.log(JSON.stringify(settings.motor));

var increase = function (inputTemp, targetTemp) {
  console.log(inputTemp + " < " + targetTemp + " increasing heat.");
};

var decrease = function (inputTemp, targetTemp) {
  console.log(inputTemp + " > " + targetTemp + " decreasing heat.");
};

var turnOn = function() {
  console.log("Turn on. Enable Pin: " + settings.motor.enablePin);
  open(18, function() {
    open(4, function() {
      open(17, function() {
        open(23, function() {
          open(24, function() {
            output(settings.motor.enablePin, 1, function() {
              open = true;
              winston.info("Motor communication is open. Waiting for commands.");
            });
          });
        });
      });
    });
  });
};

var turnOff = function() {
  winston.info("Turn off. Enable Pin: " + settings.motor.enablePin);
  output(settings.motor.enablePin, 0, true);
  close(4);
  close(17);
  close(18);
  close(23);
  close(24);
};

var forward = function() {
  commands.push("forward");
}

var fastForward = function() {
  commands.push("forward");
  commands.push("forward");
  commands.push("forward");
}

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
  fs.writeFile("/sys/class/gpio/gpio" + pin + "/value", value, 'utf8', function(err) {
    if (err) {
      winston.error("Error writing to pin " + pin + ": ", err);
    }
    if (callback && typeof callback === "function") {
      callback();
    } else {
      winston.error("callback error in output: " + callback);
    }
  });
};

var outputSync = function(pin, value) {
  fs.writeFileSync("/sys/class/gpio/gpio" + pin + "/value", value);
};

var open = function(pin, callback) {
  if (!fs.existsSync("/sys/class/gpio/gpio" + pin)) {
    fs.writeFile("/sys/class/gpio/export", pin, function(err) {
      if (err) {
        winston.error("Error opening pin " + pin + ": ", err);
      } else {
        fs.writeFile("/sys/class/gpio/gpio" + pin + "/direction", "out", "utf8", function(err) {
          if (!err) {
            winston.info("Pin " + pin + " open");
            if (callback && typeof callback === "function") {
              callback();
            } else {
              winston.error("callback error in open 1");
            }
          } else {
            winston.warn("Could not set direction to out");
          }
        });
      }
    });
  } else {
    if (callback && typeof callback === "function") {
      callback();
    } else {
      console.log("callback error in open 2");
    }
  }
};

var close = function(pin) {
  fs.writeFile("/sys/class/gpio/unexport", pin, function(err) {
    if (err) {
      console.log("Error closing pin " + pin + ": ", err);
    } else {
      console.log("Pin " + pin + " closed");
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

turnOn();

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
  }, 200)},
  1000
);

function exitHandler() {
  turnOff();
}

process.on('exit', exitHandler.bind());

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind());

//catches uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log("Caught exception: " + err);
  turnOff();
});

module.exports = {
  increase: forward,
  decrease: backward,
  fastIncrease: fastForward,
  fastDecrease: fastBackward,
  turnOn: turnOn,
  turnOff: turnOff
};
