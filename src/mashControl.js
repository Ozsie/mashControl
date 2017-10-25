var http = require('http');
var express = require('express');
var expressWs = require('express-ws');
var fs = require('fs');
var bodyParser = require('body-parser');

var gpio = require('mc-gpio');
var rc = require('./components/relay')(gpio);
var db = require('./db');

module.exports = function(hwi) {
  var mashControl = {};

  //var grpcServer = require('./mashControlGRPC');
  var winston = require('winston');

  //"/sys/bus/w1/devices/28-800000263717/w1_slave"
  mashControl.settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
  winston.add(winston.transports.File, { name:"mashControl", filename: mashControl.settings.logs.directory + '/mashControl.log', 'timestamp':true});
  winston.remove(winston.transports.Console);
  winston.add(winston.transports.Console, {'timestamp':true});

  var logDir = mashControl.settings.logs.directory;

  if (!fs.existsSync(logDir)){
    fs.mkdirSync(logDir);
  }

  var app = express();
  var ws = expressWs(app);

  app.use(express.static('src/app'));
  for (var index in mashControl.settings.publishedModules) {
    var script = mashControl.settings.publishedModules[index];
    winston.info("Publishing " + 'node_modules/' + script + " as /static/" + script);
    app.use('/static/' + script, express.static('node_modules/' + script));
  }
  app.use(bodyParser.json());

  require('./websocket/websocket')(app, hwi, winston);
  require('./routes/tempRoutes')(app, hwi, winston);
  require('./routes/scheduleRoutes')(app, hwi, winston);
  require('./routes/dbRoutes')(app, winston);
  require('./routes/heaterRoutes')(app, hwi, winston);
  require('./routes/relayRoutes')(app, rc, winston);

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

  mashControl.server = app.listen(3000);
  var lastSocketKey = 0;
  var socketMap = {};
  mashControl.server.on('connection', function(socket) {
      /* generate a new, unique socket-key */
      var socketKey = ++lastSocketKey;
      /* add socket when it is connected */
      socketMap[socketKey] = socket;
      socket.on('close', function() {
          /* remove socket when it is closed */
          delete socketMap[socketKey];
      });
  });
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
    mashControl.server.close();
    process.exit();
  }

  process.on('exit', exitHandler.bind());

  //catches ctrl+c event
  process.on('SIGINT', exitHandler.bind());

  process.on('uncaughtException',  (err) => {
    winston.error('Caught exception', err);
  });

  mashControl.closeServer = function(callback) {
    winston.info('Trying to close server');
    Object.keys(socketMap).forEach(function(socketKey) {
      winston.info('Forcing ' + socketMap[socketKey].address().address + ' to close');
      socketMap[socketKey].destroy();
    });
    mashControl.server.close(function() {
      callback();
    });
  };

  return mashControl;
};
