var fs = require('fs');

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
              console.log("Motor communication is open. Waiting for commands.");
            });
          });
        });
      });
    });
  });
};

var turnOff = function() {
  console.log("Turn off. Enable Pin: " + settings.motor.enablePin);
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

var backward = function(steps) {
  commands.push("backward");
};

var output = function(pin, value, callback) {
  fs.writeFile("/sys/class/gpio/gpio" + pin + "/value", value, 'utf8', function(err) {
    if (err) {
      console.log("Error writing to pin " + pin + ": ", err);
    }
    if (callback && typeof callback === "function") {
      callback();
    } else {
                     console.log("callbak error in output");
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
        console.log("Error opening pin " + pin + ": ", err);
      } else {
        fs.writeFile("/sys/class/gpio/gpio" + pin + "/direction", "out", "utf8", function(err) {
          if (!err) {
            console.log("Pin " + pin + " open");
            if (callback && typeof callback === "function") {
              callback();
            } else {
                             console.log("callbak error in open 1");
                           }
          } else {
            console.log("Could not set direction to out");
          }
        });
      }
    });
  } else {
    if (callback && typeof callback === "function") {
      callback();
    } else {
                     console.log("callbak error in open 2");
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
  var start = Date.now();
  var doStep = function() {
    setTimeout(function() {
      console.log("Step " + currentStep + "Stage 1 " + (Date.now() - start));
      start = Date.now();
      setStep(1, 0, 1, 0);
      setTimeout(function() {
        console.log("Step " + currentStep + "Stage 2 " + (Date.now() - start))
        start = Date.now();
        setStep(0, 1, 1, 0);
        setTimeout(function() {
          console.log("Step " + currentStep + "Stage 3 " + (Date.now() - start))
          start = Date.now();
          setStep(0, 1, 0, 1);
          setTimeout(function() {
            console.log("Step " + currentStep + "Stage 4 " + (Date.now() - start))
            setStep(1, 0, 0, 1);
            currentStep++;
            if (currentStep < steps) {
              start = Date.now();
              doStep();
            } else {
              if (callback && typeof callback === "function") {
                callback();
              } else {
               console.log("callbak error in stepForwards");
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
                console.log("callbak error in stepBackwards");
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

setInterval(function () {
  if (open && !stepping) {
    var command = commands.shift();
    if (command) {
      stepping = true;
      if (command === "forward") {
        stepForward(64, function() {
          stepping = false;
        });
      } else {
        stepBackward(64, function() {
          stepping = false;
        });
      }
    }
  }
}, 200)

forward();
forward();
forward();
backward();
backward();
backward();
forward();
forward();
forward();
backward();
backward();
backward();



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
  increase: increase,
  decrease: decrease,
  turnOn: turnOn,
  turnOff: turnOff
};
