var fs = require('fs');
var gpio = require("pi-gpio");

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
  open(settings.motor.enablePin);
  open(settings.motor.coilA1Pin);
  open(settings.motor.coilA2Pin);
  open(settings.motor.coilB1Pin);
  open(settings.motor.coilB2Pin);
  output(settings.motor.enablePin, 1);
};

var turnOff = function() {
  console.log("Turn off. Enable Pin: " + settings.motor.enablePin);
  backwards(500);
  output(settings.motor.enablePin, 0, true);
  close(settings.motor.enablePin);
  close(settings.motor.coilA1Pin);
  close(settings.motor.coilA2Pin);
  close(settings.motor.coilB1Pin);
  close(settings.motor.coilB2Pin);
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

var output = function(pin, value, close) {
  gpio.write(pin, value, function(err) {
    console.log(err);
    console.log("Writing to " + pin + ": " + value);
    if (close && close === true) {
      console.log("closing pin " + pin);
      gpio.close(pin);
    }
  });
};

var open = function(pin) {
  gpio.close(pin, function(err) {
    if (err) {
      console.err("Error closing pin: " + pin + ": " + err);
    } else {
      console.log("Pin closed: " + pin);
    }
  });
};

var open = function(pin) {
  gpio.open(pin, "output", function(err) {
    if (err) {
      console.err("Error opening pin: " + pin + ": " + err);
    } else {
      console.log("Pin open: " + pin);
    }
  });
};

turnOn();
forward(500);
turnOff();

function exitHandler() {
    output(settings.motor.coilA1Pin, 0, true);
    output(settings.motor.coilA2Pin, 0, true);
    output(settings.motor.coilB1Pin, 0, true);
    output(settings.motor.coilB2Pin, 0, true);
    output(settings.motor.enablePin, 0, true);
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
