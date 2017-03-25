var http = require('http');
var express = require('express');
var fs = require('fs');
var exec = require('child_process').exec;
var bodyParser = require('body-parser');

var heatControl = require('./heatControl');
var tempSensor = require('mc-tempsensor');
var scheduleRunner = require('./scheduleRunner');
var grpcServer = require('./mashControlGRPC');
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

app.get('/temp/current', function(req, res) {
  //winston.info('Temp requested');
  tempSensor.readTemp(function(error, data) {
    if (!error) {
      var tempData = tempSensor.parseTemp(data);
      tempData.minute = scheduleRunner.getRunningForMinutes();
      res.status(200).send(tempData);
    } else {
      winston.error("Could not fetch temperature", error);
      res.status(500).send(error);
    }
  });
});

app.post('/schedule/start', function(req, res) {
  winston.info('Start schedule requested');
  heatControl.turnOn();
  var scheduleStarted = scheduleRunner.startSchedule(req.body);
  winston.info('Start ok = ' + scheduleStarted);
  res.status(200).send(scheduleStarted);
});

app.get('/schedule/stop', function(req, res) {
  winston.info('Stop schedule requested');
  scheduleRunner.stopSchedule(function(err, data) {
    if (!err) {
      res.status(200).send(data);
    } else {
      winston.warn("Stopped with error", err);
      res.status(200).send(data);
    }
  });

});

app.get('/schedule/status', function(req, res) {
  var status = scheduleRunner.getStatus();
  res.status(200).send(status);
});

app.get('/schedule/tempLog', function(req, res) {
  var tempLog = scheduleRunner.getTempLog();
  res.status(200).send({log: tempLog});
});

app.get('/schedule', function(req, res) {
  winston.info('Get Schedule');
  res.status(200).send(scheduleRunner.getSchedule());
});

// Express route for any other unrecognised incoming requests
app.get('*', function(req, res) {
  winston.warn("Unrecognised API call", req);
  res.status(404).send('Unrecognised API call');
});

// Express route to handle errors
app.use(function(err, req, res, next) {
  if (req.xhr) {
    winston.error('Oops, Something went wrong!', err, req);
    res.status(500).send('Oops, Something went wrong!');
  } else {
    next(err);
  }
});

grpcServer.startServer();

var server = app.listen(3000);
winston.info('App Server running at port 3000');

function exitHandler() {
  //turnOff();
  winston.info("EXIT!");
  grpcServer.stopServer();
  server.close();
  process.exit();
}

process.on('exit', exitHandler.bind());

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind());

process.on('uncaughtException',  (err) => {
  winston.error('Caught exception', err);
});

module.exports = {
  settings: settings,
  server: server,
  heatControl: heatControl,
  tempSensor: tempSensor,
  scheduleRunner: scheduleRunner
};
