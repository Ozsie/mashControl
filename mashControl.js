var http = require('http');
var express = require('express');
var fs = require('fs');
var exec = require('child_process').exec;
var bodyParser = require('body-parser');

var heatControl = require('./heatControl');
var tempSensor = require('mc-tempsensor');
var scheduleRunner = require('./scheduleRunner');
var db = require('./db');
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
      switch (error.code) {
        case 'ENOENT':
          winston.error("Could not fetch temperature. Probe unavailable.");
          break;
        default:
          winston.error("Could not fetch temperature.", error);
      }

      res.status(503).send(error);
    }
  });
});

app.post('/schedule/start', function(req, res) {
  winston.info('Start schedule requested');
  scheduleRunner.startSchedule(req.body, function(err) {
    if (!err) {
      winston.info('Start ok = ' + true);
      res.status(200).send(true);
    } else {
      winston.info('Start nok = ' + err);
      res.status(200).send(false);
    }
  });
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

app.post('/schedule/store/create', function(req, res) {
  winston.info('Create schedule');
  var schedule = req.body;
  db.createSchedule(schedule, function(err, data) {
    if (!err) {
      res.status(200).send({uuid: data});
    }
  });
});

app.get('/schedule/store/retrieve/:uuid', function(req, res) {
  var uuid = req.params.uuid;
  winston.info('Retrieve schedule ' + uuid);
  db.retrieveSchedule(uuid, function(err, data) {
    if (!err) {
      res.status(200).send(data);
    }
  });
});

app.get('/schedule/store/retrieve/', function(req, res) {
  winston.info('Retrieve all schedules');
  db.retrieveSchedules(function(err, data) {
    if (!err) {
      res.status(200).send({schedules: data});
    }
  });
});

app.put('/schedule/store/update/:uuid', function(req, res) {
  var schedule = req.body;
  var uuid = req.params.uuid;
  winston.info('Update schedule ' + uuid);
  db.updateSchedule(uuid, schedule, function(err, data) {
    if (!err) {
      res.status(200).send(data);
    }
  });
});

app.delete('/schedule/store/delete/:uuid', function(req, res) {
  var uuid = req.params.uuid;
  winston.info('Delete schedule ' + uuid);
  db.deleteSchedule(uuid, function(err, data) {
    if (!err) {
      res.status(200).send(data);
    }
  });
});

app.get('/heater/on', function(req, res) {
  winston.info('Heater on');
  res.status(200).send(heatControl.heaterOn(function() {
    winston.error("ERROR!");
  }));
});

app.post('/relay', function(req, res) {
  winston.info('Switch relay');
  var setting = req.body;
  winston.info('Setting relay ' + setting.index + ' to ' + setting.state);
  heatControl.setRelay(setting, function(err, relay) {
    res.status(200).send(relay);
    if (err) {
      winston.error('Error while switching relay', err);
    }
  });
});

app.get('/relay/status', function(req, res) {
  res.status(200).send(heatControl.getRelayStatus());
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
db.loadSchedules(function(err, data) {
  if (err) {
    winston.error(err);
  } else {
    winston.info("Schedules loaded");
  }
});

var server = app.listen(3000);
winston.info('App Server running at port 3000');

function exitHandler() {
  //turnOff();
  winston.info("EXIT!");
  grpcServer.stopServer();
  heatControl.setRelay({index: 3, state: "off"}, function(err) {
    if (err) {
      winston.error('Error while turning off relay', err);
    }
  });
  heatControl.setRelay({index: 2, state: "off"}, function(err) {
    if (err) {
      winston.error('Error while turning off relay', err);
    }
  });
  heatControl.setRelay({index: 1, state: "off"}, function(err) {
    if (err) {
      winston.error('Error while turning off relay', err);
    }
  });
  heatControl.setRelay({index: 0, state: "off"}, function(err) {
    if (err) {
      winston.error('Error while turning off relay', err);
    }
  });
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
