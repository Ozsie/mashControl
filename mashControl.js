var http = require('http');
var express = require('express');
var fs = require('fs');
var exec = require('child_process').exec;

var schedule;

var runSchedule = function(callback) {
  setTimeout(callback, 30000);
};

var startSchedule = function(newSchedule) {
  if (newSchedule) {
    console.log(JSON.stringify(schedule));
    schedule = {
      status: 'started',
      step: 0
    }
    runSchedule(function() {
      schedule.status = 'done';
    });
    return true;
  } else {
    return false;
  }
};

var stopSchedule = function() {
  if (schedule) {
    console.log(schedule);
    schedule.status = 'stopped';
    return true;
  } else {
    return false;
  }
};

var getStatus = function() {
  if (!schedule) {
    return "unavailable";
  } else {
    return schedule.status;
  }
};

var modprobe = function(error, stdout, stderr) {
 if (error) {
   console.log("MODPROB ERROR:  " + error);
   console.log("MODPROB STDERR: " + stderr);
 }
};

var readTemp = function() {
  readTemp(function(err, data) {
    console.log("data:" + data);
  });
};

var readTemp = function(callback) {
  fs.readFile("/sys/bus/w1/devices/28-800000263717/w1_slave", 'utf8', callback);
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
  //console.log("Temp status: " + temp);

  return temp;
};

exec("modprobe w1-gpio", modprobe);
exec("modprobe w1-therm", modprobe);

var app = express();

app.use(express['static']('app'));

// Express route for incoming requests for a customer name
app.get('/temp/current', function(req, res) {
  //console.log('Temp requested');
  readTemp(function(error, data) {
    if (!error) {
      res.status(200).send(parseTemp(data));
    }
  });
});

app.post('/schedule/start', function(req, res) {
  console.log('Start schedule requested ' + JSON.stringify(req.body));
  var scheduleStarted = startSchedule(req.body);
  res.status(200).send(scheduleStarted);
});

app.get('/schedule/stop', function(req, res) {
  console.log('Stop schedule requested');
  var scheduleStopped = stopSchedule();
  res.status(200).send(scheduleStopped);
});

app.get('/schedule/status', function(req, res) {
  console.log('Schedule status requested');
  var status = getStatus();
  res.status(200).send(status);
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
