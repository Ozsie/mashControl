var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
var winston = require('winston');
winston.add(winston.transports.File, { name:"gpio", filename: settings.logs.directory + '/gpio.log' });

var openPin = function(pin, direction, callback) {
  if (!callback || typeof callback !== "function") {
    throw new Error("Callback function required");
  }
  winston.info("Opening pin " + pin + " as " + direction);
  console.log(settings.gpio.path);
  if (!fs.existsSync(settings.gpio.path + "gpio" + pin)) {
    fs.writeFile(settings.gpio.path + "export", pin, function(err) {
      if (err) {
        err.gpioMessage = "Error opening pin " + pin;
        winston.error(err.gpioMessage, err);
        callback(err);
      } else {
        setPinDirection(pin, direction, callback);
      }
    });
  } else {
    winston.error("GPIO pin " + pin + " does not exist");
    setPinDirection(pin, direction, callback);
  }
};

var setPinDirection = function(pin, direction, callback) {
  if (!callback || typeof callback !== "function") {
    throw new Error("Callback function required");
  }
  fs.writeFile(settings.gpio.path + "gpio" + pin + "/direction", direction, "utf8", function(err) {
    if (!err) {
      winston.info("Pin " + pin + " open");
      callback(undefined, "open");
    } else {
      err.gpioMessage = "Could not set direction to " + direction + " for pin " + pin;
      winston.error(err.gpioMessage, err);
      callback(err);
    }
  });
};

var openPinOut = function(pin, callback) {
    openPin(pin, "out", callback);
};

var openPinIn = function(pin, callback) {
    openPin(pin, "in", callback);
};

var closePin = function(pin, callback) {
  if (!callback || typeof callback !== "function") {
    throw new Error("Callback function required");
  }
  fs.writeFile(settings.gpio.path + "unexport", pin, function(err) {
    if (err) {
      err.gpioMessage = "Error closing pin " + pin;
      winston.error(err.gpioMessage, err);
      callback(err);
    } else {
      winston.info("Pin " + pin + " closed");
      callback(undefined, "closed");
    }
  });
};

var writeSync = function(pin, value) {
  fs.writeFileSync(settings.gpio.path + "gpio" + pin + "/value", value);
  winston.debug("Pin " + pin + " = " + value);
};

var write = function(pin, value, callback) {
  if (!callback || typeof callback !== "function") {
    throw new Error("Callback function required");
  }
  fs.writeFile(settings.gpio.path + "gpio" + pin + "/value", value, 'utf8', function(err) {
    if (err) {
      err.gpioMessage = "Error writing to pin " + pin;
      winston.error(err.gpioMessage, err);
      callback(err);
    } else {
      winston.info("Pin " + pin + " = " + value);
      callback(undefined, value);
    }
  });
};

module.exports = {
  openPin: openPin,
  openPinOut: openPinOut,
  openPinIn: openPinIn,
  closePin: closePin,
  setPinDirection: setPinDirection,
  writeSync: writeSync,
  write: write,
  settings: settings.gpio
};
