var http = require('http');
var express = require('express');
var fs = require('fs');
var exec = require('child_process').exec;

exec("modprobe w1-gpio", function(error, stdout, stderr) {
  // command output is in stdout
});

exec("modprobe w1-therm", function(error, stdout, stderr) {
});

var app = express();

app.use(express['static'](__dirname ));

var readTemp = function() {
  readTemp(function(err, data) {
    console.log("data:" + data);
  });
}

var readTemp = function(callback) {
  fs.readFile("/sys/bus/w1/devices/28-800000263717/w1_slave", 'utf8', callback);
}

// Express route for incoming requests for a customer name
app.get('/temp/current', function(req, res) {
  readTemp(function(error, data) {
    if (!error) {
      res.status(200).send(data);
    }
  });
  console.log('Temp requested');
}); 

// Express route for any other unrecognised incoming requests
app.get('*', function(req, res) {
  res.status(404).send('Unrecognised API call');
});

// Express route to handle errors
app.use(function(err, req, res, next) {
  if (req.xhr) {
    res.status(500).send('Oops, Something went wrong!');
  } else {
    next(err);
  }
});

app.listen(3000);
console.log('App Server running at port 3000');
console.log('Current temp: ' + readTemp());
console.log('REST: /temp/current');
