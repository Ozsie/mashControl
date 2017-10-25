var winston = require('winston');

module.exports = function(rc) {
  var pumpObj = {};

  var doPump = false;
  var pumping = false;

  var pumpOuter;
  var pumpInner;

  pumpObj.pause = function(callback) {
    rc.relayOff(0, function(err) {
      if (!err) {
        pumping = false;
        winston.info('Pump stop');
        if (doPump) {
          pumpInner = setTimeout(pump, 60000);
        }
        if (callback) {
          callback(undefined, pumpInner);
        }
      } else {
        callback(err);
      }
    });
  };

  var pump = function(callback) {
    if (doPump) {
      rc.relayOn(0, function(err) {
        if (!err) {
          winston.info('Pump start');
          pumping = true;
          pumpOuter = setTimeout(pumpObj.pause, 120000);
          if (callback) {
            callback(undefined, pumpOuter);
          }
        } else if (callback) {
          callback(err);
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