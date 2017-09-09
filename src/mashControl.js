var http = require('http');
var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');

var scheduleRunner = require('./runner/scheduleRunner');
var rc = require('./components/relay');
var db = require('./db');

//var grpcServer = require('./mashControlGRPC');
var winston = require('winston');

//"/sys/bus/w1/devices/28-800000263717/w1_slave"
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
winston.add(winston.transports.File, { name:"mashControl", filename: settings.logs.directory + '/mashControl.log', 'timestamp':true});
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {'timestamp':true});

var logDir = settings.logs.directory;

if (!fs.existsSync(logDir)){
    fs.mkdirSync(logDir);
}

var app = express();

app.use(express.static('src/app'));
for (var index in settings.publishedModules) {
  var script = settings.publishedModules[index];
  winston.info("Publishing " + 'node_modules/' + script + " as /static/" + script);
  app.use('/static/' + script, express.static('node_modules/' + script));
}
app.use(bodyParser.json());

require('./routes/tempRoutes')(app, winston);
require('./routes/scheduleRoutes')(app, winston);
require('./routes/dbRoutes')(app, winston);
require('./routes/pumpRoutes')(app, winston);
require('./routes/heaterRoutes')(app, winston);
require('./routes/relayRoutes')(app, winston);

// Express route for any other unrecognised incoming requests
app.get('*', function(req, res) {
  //winston.warn("Unrecognised API call", req);
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

//grpcServer.startServer();
db.loadSchedules(function(err, data) {
  if (err) {
    winston.error(err);
  } else {
    winston.info("Schedules loaded");
    winston.info("Routes:");
    app._router.stack.forEach(function(r) {
      if (r.route && r.route.path) {
        winston.info(r.route.path);
      }
    });
  }
});

var server = app.listen(3000);
winston.info('App Server running at port 3000');

function exitHandler() {
  //turnOff();
  winston.info("EXIT!");
  //grpcServer.stopServer();
  rc.setRelay({index: 3, state: "off"}, function(err) {
    if (err) {
      winston.error('Error while turning off relay');
      winston.error(err.code + ': ' + err.path);
    }
  });
  rc.setRelay({index: 2, state: "off"}, function(err) {
    if (err) {
      winston.error('Error while turning off relay');
      winston.error(err.code + ': ' + err.path);
    }
  });
  rc.setRelay({index: 1, state: "off"}, function(err) {
    if (err) {
      winston.error('Error while turning off relay');
      winston.error(err.code + ': ' + err.path);
    }
  });
  rc.setRelay({index: 0, state: "off"}, function(err) {
    if (err) {
      winston.error('Error while turning off relay');
      winston.error(err.code + ': ' + err.path);
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
  server: server
};
