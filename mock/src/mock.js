let fs = require('fs');
var http = require('http');

var currentDirection;

let tempFileContent = '00 11 22 33 44 55 aa bb cc dd : crc=66 YES\n77 88 99 ee ff 00 11 22 33 44 t='
var currentTemp = 10;

let updateTemp = function() {
  var url = 'http://mash-control:3000/heater/direction';
  if (process.argv[2] === 'local') {
    url = 'http://localhost:3000/heater/direction';
  }
  http.get(url, (res) => {
    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      try {
        const data = JSON.parse(rawData);
        const currentDirection = data.direction;

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
      } catch (e) {
        console.error(e.message);
        tempLoop();
      }
    });
  }).on('error', (e) => {
    console.error('Connection refused');
    tempLoop();
  });
};

let tempLoop = function() {
  setTimeout(updateTemp, 1000);
}

console.log('Mash Control hardware mock started. ' + process.argv[2]);
tempLoop();

