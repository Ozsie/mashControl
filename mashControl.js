var http = require('http');
var express = require('express');
var fs = require('fs');
var exec = require('child_process').exec;
var bodyParser = require('body-parser');

var heatControl = require('./heatControl');
var tempSensor = require('mc-tempSensor');
var scheduleRunner = require('./scheduleRunner');
var winston = require('winston');

//"/sys/bus/w1/devices/28-800000263717/w1_slave"
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
winston.add(winston.transports.File, { name:"mashControl", filename: settings.logs.directory + '/mashControl.log' });

var logDir = settings.logs.directory;

if (!fs.existsSync(logDir)){
    fs.mkdirSync(logDir);
}

var app = express();

app.use(express.static('app'));
for (var index in settings.publishedModules) {
  var script = settings.publishedModules[index];
  winston.info("Publishing " + 'node_modules/' + script + " as /static/" + script);
  app.use('/static/' + script, express.static('node_modules/' + script));
}
app.use(bodyParser.json());

// Express route for incoming requests for a customer name
app.get('/temp/current', function(req, res) {
  //winston.info('Temp requested');
  tempSensor.readTemp(function(error, data) {
    if (!error) {
      res.status(200).send(tempSensor.parseTemp(data));
    } else {
      res.status(500).send();
    }
  });
});

app.post('/schedule/start', function(req, res) {
  winston.info('Start schedule requested');
  var scheduleStarted = scheduleRunner.startSchedule(req.body);
  winston.info('Start ok = ' + scheduleStarted);
  res.status(200).send(scheduleStarted);
});

app.get('/schedule/stop', function(req, res) {
  winston.info('Stop schedule requested');
  var scheduleStopped = scheduleRunner.stopSchedule();
  res.status(200).send(scheduleStopped);
});

app.get('/schedule/status', function(req, res) {
  winston.info('Schedule status requested');
  var status = scheduleRunner.getStatus();
  res.status(200).send(status);
});

app.get('/schedule', function(req, res) {
  winston.info('Get Schedule');
  res.status(200).send(scheduleRunner.getSchedule());
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
winston.info('App Server running at port 3000');
tempSensor.readAndParse(function(err, temp) {
  if (err) {
    winston.error("Could not read temperature", err);
  } else {
    winston.info('Current temp: ' + temp.temperature.celcius + "C");
  }
});

module.exports = {
  settings: settings
};
