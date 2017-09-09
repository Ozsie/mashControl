var grpc = require('grpc');
var tempSensor = require('mc-tempsensor');
var scheduleRunner = require('./runner/scheduleRunner');

var mcProto = grpc.load('./mashControl.proto').mashControl;

var server;

function getRawTemperature(call, callback) {
  tempSensor.readTemp(function(error, data) {
    if (!error) {
      callback(null, data);
    } else {
      callback(error, null);
    }
  });
}

function getTemperature(call, callback) {
  tempSensor.readTemp(function(error, data) {
    if (!error) {
      var parsed = tempSensor.parseTemp(data);
      callback(null, parsed);
    } else {
      callback(error, null);
    }
  });
}

function startSchedule(call, callback) {
}

function stopSchedule(call, callback) {
}

function getScheduleStatus(call, callback) {
  var status = scheduleRunner.getStatus();
  callback(null, status);
}

function getCurrentSchedule(call, callback) {
}

/**
 * Starts an RPC server that receives requests for the Greeter service at the
 * sample server port
 */
var startServer = function() {
  server = new grpc.Server();
  server.addProtoService(mcProto.TemperatureService.service, {
    getTemperature: getTemperature,
    getRawTemperature: getRawTemperature
  });
  server.addProtoService(mcProto.ScheduleService.service, {
    startSchedule: startSchedule,
    stopSchedule: stopSchedule,
    getScheduleStatus: getScheduleStatus,
    getCurrentSchedule: getCurrentSchedule
  });
  server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
  server.start();
};

var stopServer = function() {
  server.tryShutdown();
};

module.exports = {
  startServer: startServer,
  stopServer: stopServer
};