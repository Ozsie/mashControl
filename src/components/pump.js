var util = require('../util');
var rc = require('./relay');
var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
var winston = require('winston');
winston.add(winston.transports.File, { name:"pump", filename: settings.logs.directory + '/pump.log', 'timestamp':true });

var doPump = false;

var pump = function() {
  if (doPump) {
    rc.relayOn(0, function(err, relay) {
      winston.info('Pump start');
      setTimeout(function() {
        rc.relayOff(0, function(err, relay) {
          winston.info('Pump stop');
          if (doPump) {
            setTimeout(function() {
              pump();
            }, 60000);
          }
        });
      }, 120000);
    });
  }
};

var startPump = function(callback) {
  doPump = true;
  pump();
  callback(undefined, doPump);
};

var stopPump = function(callback) {
  doPump = false;
  callback(undefined, doPump);
};

module.exports = {
  isRunning: function() { return doPump; },
  start: startPump,
  stop: stopPump
};