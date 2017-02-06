var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
var winston = require('winston');
winston.add(winston.transports.File, { name:"gpio", filename: settings.logs.directory + '/gpio.log' });

var gpioPath = settings.gpio.path;

var openPin = function(pin, direction, callback) {
  winston.info("Opening pin " + pin + " as " + direction);
  if (!fs.existsSync(gpioPath + "/gpio" + pin)) {
    fs.writeFile(gpioPath + "/export", pin, function(err) {
      if (err) {
        winston.error("Error opening pin " + pin + ": ", err);
      } else {
        fs.writeFile(gpioPath + "/gpio" + pin + "/direction", direction, "utf8", function(err) {
          if (!err) {
            winston.info("Pin " + pin + " open");
            if (callback && typeof callback === "function") {
              callback(undefined, "open");
            } else {
              winston.error("callback error in open 1");
            }
          } else {
            winston.warn("Could not set direction to " + direction + " for pin " + pin, err);
          }
        });
      }
    });
  } else {
    winston.error("GPIO pin " + pin + " does not exist");
    if (callback && typeof callback === "function") {
      callback("GPIO pin " + pin + " does not exist", undefined);
    } else {
      winston.error("callback error in open 2");
    }
  }
};

var openPinOut = function(pin, callback) {
    openPin(pin, "out", callback);
};

var openPinIn = function(pin, callback) {
    openPin(pin, "in", callback);
};

var closePin = function(pin, callback) {
  fs.writeFile(gpioPath + "unexport", pin, function(err) {
    if (err) {
      winston.error("Error closing pin " + pin + ": ", err);
      callback(err);
    } else {
      winston.info("Pin " + pin + " closed");
    }
  });
};

var writeSync = function(pin, value) {
  fs.writeFileSync(gpioPath + "gpio" + pin + "/value", value);
  winston.debug("Pin " + pin + " = " + value);
};

var write = function(pin, value, callback) {
  fs.writeFile(gpioPath + "gpio" + pin + "/value", value, 'utf8', function(err) {
    if (err) {
      winston.error("Error writing to pin " + pin + ": ", err);
    }
    if (callback && typeof callback === "function") {
      winston.debug("Pin " + pin + " = " + value);
      callback();
    } else {
      winston.error("callback error in output: " + callback);
    }
  });
};

module.exports = {
  openPin: openPin,
  openPinOut: openPinOut,
  openPinIn: openPinIn,
  closePin: closePin,
  writeSync: writeSync,
  write: write
};
