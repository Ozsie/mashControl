var util = require('../util');
var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
var winston = require('winston');

module.exports = function(rc) {
  var pumpObj = {};

  var doPump = false;
  var pumping = false;

  var pumpOuter;
  var pumpInner;

  pumpObj.pause = function(callback) {
    rc.relayOff(0, function(err, relay) {
      pumping = false;
      winston.info('Pump stop');
      if (doPump) {
        pumpInner = setTimeout(pump, 60000);
      }
      if (callback) {
        callback(undefined, pumpInner);
      }
    });
  };

  var pump = function(callback) {
    if (doPump) {
      rc.relayOn(0, function(err, relay) {
        winston.info('Pump start');
        pumping = true;
        pumpOuter = setTimeout(pumpObj.pause, 120000);
        if (callback) {
          callback(undefined, pumpOuter);
        }
      });
    }
  };

  pumpObj.start = function(callback) {
    doPump = true;
    pump(callback);
  };

  pumpObj.stop = function(callback) {
    winston.info('PUMP OFF');
    doPump = false;
    clearTimeout(pumpOuter);
    clearTimeout(pumpInner);
    callback(undefined, doPump);
  };

  pumpObj.isOn = function() { return doPump; };
  pumpObj.isRunning = function() { return pumping; };

  return pumpObj;
};