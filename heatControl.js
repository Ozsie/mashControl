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
  output(settings.motor.enablePin, 1);
};

var turnOff = function() {
  console.log("Turn off. Enable Pin: " + settings.motor.enablePin);
  backwards(500);
  output(settings.motor.enablePin, 0, true);
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
  console.log("set step: " + w1 + ", " + w2 + ", " + w3 + ", " + w4);
  output(settings.motor.coilA1Pin, w1)
  output(settings.motor.coilA2Pin, w2)
  output(settings.motor.coilB1Pin, w3)
  output(settings.motor.coilB2Pin, w4)
};

var output = function(pin, value, close) {
  gpio.open(pin, "output", function(err) {
    if (err) {
      console.err("Error: " + err);
    }
    gpio.write(pin, value, function() {
      console.log("Writing to " + pin + ": " + value);
      if (close && close === true) {
        console.log("closing pin " + pin);
        gpio.close(pin);
      }
    });
  });
};

turnOn();
forward(100);
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
