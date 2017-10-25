var fs = require('fs');
var winston = require('winston');

module.exports = function(gpio) {
  var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

  var relay = {};

  var relayOpen = [false, false, false, false];

  var getRelay = function(index) {
    return settings.relay[index];
  };

  relay.getRelayStatus = function() {
    var relays = settings.relay;
    for (var index in relays) {
      relays[index].open = relayOpen[index];
    }

    return relays;
  };

  relay.setRelay = function(setting, callback) {
    winston.info('flip ' + JSON.stringify(setting));
    if (setting.state === 'on') {
      relay.relayOn(setting.index, callback);
    } else {
      relay.relayOff(setting.index, callback);
    }
  };

  relay.relayOn = function(index, callback) {
    winston.info('Fetching relay ' + index);
    var relay = getRelay(index);
    var pin = relay.pin;
    if (!relayOpen[relay.index]) {
      open(pin, function(err) {
        if(!err) {
          winston.info('Relay "' + relay.name + '" on');
          gpio.writeSync(pin, 1);
          relayOpen[relay.index] = true;
          relay.open = true;
        }
        callback(err, relay);
      });
    } else {
      winston.info('Relay "' + relay.name + '" already on');
      gpio.writeSync(pin, 1);
      relayOpen[relay.index] = true;
      relay.open = true;
      callback(undefined, relay);
    }
  };

  relay.relayOff = function(index, callback) {
    winston.info('Fetching relay ' + index);
    var relay = getRelay(index);
    var pin = relay.pin;
    if (relayOpen[relay.index]) {
      try {
        gpio.writeSync(pin, 0);
        close(pin, function(err) {
          if (!err) {
            relayOpen[relay.index] = false;
            relay.open = false;
            winston.debug('Relay ' + relay.name + ' off');
          }
          callback(err, relay);
        });
      } catch (error) {
        winston.error('Could not close relay', error);
        callback(error);
      }
    } else {
      callback(undefined, relay);
    }
  };

  var open = function(pin, callback) {
    gpio.openPinOut(pin, callback);
  };

  var close = function(pin, callback) {
    gpio.closePin(pin, function(err) {
      if (err) {
        winston.error('Could not close pin:', + err);
      }
      callback(err);
    });
  };

  return relay;
};