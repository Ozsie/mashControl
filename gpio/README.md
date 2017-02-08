A simple library for accessing the RaspberryPI GPIO pins.

Example:

var gpio = require('mc-gpio');

gpio.openPin(0, "out", function(err, data) {
  if (err) {
    // Handle error
  } else {
    gpio.write(0, 1, function(err, data) {
      if (err) {
        // Handle error
      } else {
        // Everything is fine and the pin is open and on.
      }
    }
  }
});