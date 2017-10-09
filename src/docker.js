var gpioMock = require('gpio-mock');
var fs = require('fs');

function exitHandler() {
  gpioMock.stop();
}

process.on('exit', exitHandler.bind());
process.on('SIGINT', exitHandler.bind());
process.on('uncaughtException',  (err) => { console.error('Caught exception', err); });

gpioMock.start(function(err) {
  if (!err) {
    gpioMock.addDS18B20('28-800000263717', {
      behavior: 'external',
      temperature: 10
    }, function(err) {
      if (!err) {
        console.log('DS18B20 mocked');
        var hardwareInterface = require('./hardwareInterface');
        require('./mashControl.js')(hardwareInterface());
      } else {
        process.exit();
      }
    });
  } else {
    process.exit();
  }
});