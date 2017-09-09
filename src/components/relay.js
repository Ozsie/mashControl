var gpio = require('mc-gpio');
var fs = require('fs');

var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

var winston = require('winston');
winston.add(winston.transports.File, { name: "relay", filename: settings.logs.directory + '/relay.log', 'timestamp':true });

var relayOpen = [false, false, false, false];

var getRelay = function(index) {
  return settings.relay[index];
};

var getRelayStatus = function() {
  var relays = settings.relay;
  for (var index in relays) {
    relays[index].open = relayOpen[index];
  }

  return relays;
};

var setRelay = function(setting, callback) {
  if (setting.state === "on") {
    relayOn(setting.index, callback);
  } else {
    relayOff(setting.index, callback);
  }
};

var relayOn = function(index, callback) {
  var relay = getRelay(index);
  var pin = relay.pin;
  if (!relayOpen[relay.index]) {
    open(pin, function(err, data) {
      if(!err) {
        winston.debug("Relay " + relay.name + " on");
        gpio.writeSync(pin, 1);
        relayOpen[relay.index] = true;
        relay.open = true;
      }
      callback(err, relay);
    });
  } else {
    winston.debug("Relay " + relay.name + " on");
    gpio.writeSync(pin, 1);
    relayOpen[relay.index] = true;
    relay.open = true;
    callback(undefined, relay);
  }
};

var relayOff = function(index, callback) {
  var relay = getRelay(index);
  var pin = relay.pin;
  if (relayOpen[relay.index]) {
    winston.debug("Relay " + relay.name + " off");
    try {
      gpio.writeSync(pin, 0);
      close(pin, function(err) {
        if (!err) {
          relayOpen[relay.index] = false;
          relay.open = false;
        }
        callback(err, relay);
      });
    } catch (error) {
      console.log(JSON.stringify(error));
      callback(error);
    }
  }
};

var open = function(pin, callback) {
  gpio.openPinOut(pin, callback);
};

var close = function(pin, callback) {
  gpio.closePin(pin, function(err) {
    if (err) {
      winston.error("Could not close pin:", + err);
    }
    callback(err);
  });
};

module.exports = {
  setRelay: setRelay,
  relayOn: relayOn,
  relayOff: relayOff,
  getRelayStatus: getRelayStatus
};