var gpioMock = require('gpio-mock');
var fs = require('fs');

function exitHandler() {
  //turnOff();
  gpioMock.stop();
}

process.on('exit', exitHandler.bind());

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind());

process.on('uncaughtException',  (err) => {
  console.error('Caught exception', err);
});

var ds18b20Simulator = function() {
  return '12000';
};

gpioMock.start(function(err) {
  if (!err) {
    gpioMock.addDS18B20('28-800000263717', {
      behavior: 'function',
      temperature: ds18b20Simulator
    }, function(err) {
      if (!err) {
        console.log('DS18B20 mocked');
      } else {
        var mashControl = require('./mashControl');
      }
    });
  }
});