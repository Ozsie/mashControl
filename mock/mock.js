let fs = require('fs');

var currentDirection;

let tempFileContent = '00 11 22 33 44 55 aa bb cc dd : crc=66 YES\n77 88 99 ee ff 00 11 22 33 44 t='
var currentTemp = 10;

if (!fs.existsSync('logs/currentMotorDirection')) {
  console.log('Creating currentMotorDirection');
  fs.writeFileSync('logs/currentMotorDirection', '');
}

fs.watch('logs/currentMotorDirection', {encoding: 'utf8', persistent: 'true'}, (eventType, filename) => {
  if (eventType === 'change') {
    fs.readFile('logs/currentMotorDirection', 'utf8', function(err, fd) {
      currentDirection = fd;
    });
  }
});

let updateTemp = function() {
  if (currentDirection === 'forward') {
    if (currentTemp < 100) {
      currentTemp += 4/60;
      var tempOutput = parseInt(currentTemp * 1000)
      console.log('increasing temp to ' + tempOutput);
      fs.writeFileSync('sys/bus/w1/devices/28-800000263717/w1_slave', tempFileContent + tempOutput);
    }
  } else if (currentDirection === 'backward') {
    if (currentTemp > 22) {
      currentTemp -= 0.05/60;
    } else if (currentTemp > 0 && currentTemp < 22) {
      currentTemp += 0.01/60;
    }
    var tempOutput = parseInt(currentTemp * 1000)
    console.log('decreasing temp to ' + tempOutput);
    fs.writeFileSync('sys/bus/w1/devices/28-800000263717/w1_slave', tempFileContent + tempOutput);
  }
  tempLoop();
};

let tempLoop = function() {
  setTimeout(updateTemp, 1000);
}

console.log('Mash Control hardware mock started.');
tempLoop();

