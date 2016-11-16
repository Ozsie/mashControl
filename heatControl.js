var fs = require('fs');

var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

console.log(JSON.stringify(settings.motor));

var increase = function (inputTemp, targetTemp) {
  console.log(inputTemp + " < " + targetTemp + " increasing heat.");
};

var decrease = function (inputTemp, targetTemp) {
  console.log(inputTemp + " > " + targetTemp + " decreasing heat.");
};

var turnOn = function() {
  console.log("Turn on. Enable Pin: " + settings.motor.enablePin);
  open(4);
  open(17);
  open(18);
  open(23);
  open(24);
  output(settings.motor.enablePin, 1);
};

var turnOff = function() {
  console.log("Turn off. Enable Pin: " + settings.motor.enablePin);
  backwards(5);
  output(settings.motor.enablePin, 0, true);
  close(4);
  close(17);
  close(18);
  close(23);
  close(24);
};

var forward = function(steps) {
  console.log("Forward " + steps + " steps");
  for(var i = 0; i < steps; i++) {
    setTimeout(setStep(1, 0, 1, 0), 5);
    setTimeout(setStep(0, 1, 1, 0), 10);
    setTimeout(setStep(0, 1, 0, 1), 15);
    setTimeout(setStep(1, 0, 0, 1), 20);
  }
}

var backwards = function(steps) {
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
  fs.writeFile("/sys/class/gpio/gpio" + pin + "/value", value, function(err) {
    if (err) {
      console.log("Error writing to pin " + pin + ": ", err);
    }
  });
};

var open = function(pin) {
  fs.writeFile("/sys/class/gpio/export", pin, function(err) {
    if (err) {
      console.log("Error opening pin " + pin + ": ", err);
    } else {
      console.log("Pin " + pin + " open");
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

function exitHandler() {
    //output(settings.motor.coilA1Pin, 0, true);
    //output(settings.motor.coilA2Pin, 0, true);
    //output(settings.motor.coilB1Pin, 0, true);
    //output(settings.motor.coilB2Pin, 0, true);
    //output(settings.motor.enablePin, 0, true);
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
