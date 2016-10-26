var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

var increase = function (inputTemp, targetTemp) {
  console.log(inputTemp + " < " + targetTemp + " increasing heat.");
};

var decrease = function (inputTemp, targetTemp) {
  console.log(inputTemp + " > " + targetTemp + " decreasing heat.");
};

var turnOn = function() {};

var turnOff = function() {};

module.exports = {
  increase: increase,
  decrease: decrease,
  turnOn: turnOn,
  turnOff: turnOff
};