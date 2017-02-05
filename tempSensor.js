var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

var modprobe = function(error, stdout, stderr) {
 if (error) {
   console.log("MODPROB ERROR:  " + error);
   console.log("MODPROB STDERR: " + stderr);
 }
};

if (settings.installKernelMod) {
  exec("modprobe w1-gpio", modprobe);
  exec("modprobe w1-therm", modprobe);
}

var readTemp = function(callback) {
  if (callback) {
    fs.readFile(settings.input, 'utf8', callback);
  }
  else {
    readTemp(function(err, data) {
      console.log("data:" + data);
    });
  }
};

var parseTemp = function(data) {
  var crc = data.match(/(crc=)[a-z0-9]*/g)[0];
  crc = crc.split("=")[1];
  var available = data.match(/([A-Z])\w+/g)[0];
  var temperature = 'n/a';
  if (available === 'YES') {
    temperature = data.match(/(t=)[0-9]{5}/g)[0];
    temperature = temperature.split("=")[1];
    temperature = parseInt(temperature);
  }
  var temp = {
    crc: crc,
    available: available,
    temperature: {
      raw: temperature,
      celcius: temperature / 1000
    },
    time: Date.now()
  };

  return temp;
};

var readAndParse = function(callback) {
  readTemp(function (err, data) {
    if (!err) {
      var temp = parseTemp(data);
      callback(temp);
    } else {
      console.log("Error when reading temp: " + err);
    }
  });
};

module.exports = {
  readTemp: readTemp,
  parseTemp: parseTemp,
  readAndParse: readAndParse,
  settings: settings
};