var http = require('http');
var express = require('express');
var fs = require('fs');
var exec = require('child_process').exec;

var modprobe = function(error, stdout, stderr) {
 if (error) {
   console.log("MODPROB ERROR:  " + error);
   console.log("MODPROB STDERR: " + stderr);
 }
}

var readTemp = function() {
  readTemp(function(err, data) {
    console.log("data:" + data);
  });
}

var readTemp = function(callback) {
  fs.readFile("/sys/bus/w1/devices/28-800000263717/w1_slave", 'utf8', callback);
}

exec("modprobe w1-gpio", modprobe);
exec("modprobe w1-therm", modprobe);

var app = express();

app.use(express['static'](__dirname ));

// Express route for incoming requests for a customer name
app.get('/temp/current', function(req, res) {
  readTemp(function(error, data) {
    if (!error) {
      var match = data.match(/([A-Z])\w+/g);
      console.log("match: " + match);
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
