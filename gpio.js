var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
var winston = require('winston');
winston.add(winston.transports.File, { name:"gpio", filename: settings.logs.directory + '/gpio.log' });


var openPin = function(pin, direction, callback) {
  if (!fs.existsSync("/sys/class/gpio/gpio" + pin)) {
    fs.writeFile("/sys/class/gpio/export", pin, function(err) {
      if (err) {
        winston.error("Error opening pin " + pin + ": ", err);
      } else {
        fs.writeFile("/sys/class/gpio/gpio" + pin + "/direction", direction, "utf8", function(err) {
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

var closePin = function(pin) {
  fs.writeFile("/sys/class/gpio/unexport", pin, function(err) {
    if (err) {
      winston.error("Error closing pin " + pin + ": ", err);
    } else {
      winston.info("Pin " + pin + " closed");
    }
  });
};

var writeSync = function(pin, value) {
  fs.writeFileSync("/sys/class/gpio/gpio" + pin + "/value", value);
  winston.debug("Pin " + pin + " = " + value);
};

var write = function(pin, value, callback) {
  fs.writeFile("/sys/class/gpio/gpio" + pin + "/value", value, 'utf8', function(err) {
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
