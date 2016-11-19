var fs = require('fs');

var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

var open = false;

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
            output(settings.motor.enablePin, 1);
            open = true;
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

var forward = function(steps) {
  while (!open.enable && !open.coilA1 && !open.coilA2 && !open.coilB1 && !open.coilB2) {
    console.log("Waiting for pins to open")
  }
  console.log("Forward " + steps + " steps");
  for(var i = 0; i < steps; i++) {
    setTimeout(setStep(1, 0, 1, 0), 5);
    setTimeout(setStep(0, 1, 1, 0), 10);
    setTimeout(setStep(0, 1, 0, 1), 15);
    setTimeout(setStep(1, 0, 0, 1), 20);
  }
}

var backwards = function(steps) {
  while (!open.enable && !open.coilA1 && !open.coilA2 && !open.coilB1 && !open.coilB2) {
    console.log("Waiting for pins to open")
  }
  console.log("Backward " + steps + " steps");
  for (var i = 0; i < steps; i++) {
    setTimeout(setStep(1, 0, 0, 1), 5);
    setTimeout(setStep(0, 1, 0, 1), 10);
    setTimeout(setStep(0, 1, 1, 0), 15);
    setTimeout(setStep(1, 0, 1, 0), 20);
  }
};

var setStep = function(w1, w2, w3, w4) {
  output(settings.motor.coilA1Pin, w1)
  output(settings.motor.coilA2Pin, w2)
  output(settings.motor.coilB1Pin, w3)
  output(settings.motor.coilB2Pin, w4)
};

var output = function(pin, value) {
  fs.writeFile("/sys/class/gpio/gpio" + pin + "/value", value, 'utf8', function(err) {
    if (err) {
      console.log("Error writing to pin " + pin + ": ", err);
    }
  });
};

var open = function(pin, callback) {
  fs.writeFile("/sys/class/gpio/export", pin, function(err) {
    if (err) {
      console.log("Error opening pin " + pin + ": ", err);
    } else {
      fs.writeFile("/sys/class/gpio/gpio" + pin + "/direction", "out", "utf8", function(err) {
        if (!err) {
          console.log("Pin " + pin + " open");
          if (callback) {
            callback();
          }
        } else {
          console.log("Could not set direction to out");
        }
      });
    }
  });
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

turnOn();

setInterval(function () {
  console.log("Is it on? " + open);
}, 300)
//forward(100);

function exitHandler() {
  turnOff();
}

process.on('exit', exitHandler.bind());

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind());

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind());

module.exports = {
  increase: increase,
  decrease: decrease,
  turnOn: turnOn,
  turnOff: turnOff
};
