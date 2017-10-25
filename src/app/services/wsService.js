var mashControl = angular.module('mashControl');

mashControl.factory('mashControlWebsocketService', ['$rootScope', function($rootScope) {

  var ws = new WebSocket("ws://localhost:3000/ws");

  var sendJson = function(msg) {
    try {
      ws.send(JSON.stringify(msg));
    } catch (error) {
      winston.error('' + msg, error);
      msg.error = error;
      msg.data = undefined;
      ws.send(msg);
    }
  };

  ws.onopen = function() {
    console.log('Websocket opened');
    $rootScope.$broadcast('socketOpen', true);
  };

  ws.onmessage = function (evt) {
    var response = JSON.parse(evt.data);
    $rootScope.$broadcast(response.request, response);
    console.log(response.data);
  };

  window.onbeforeunload = function(event) {
    ws.close();
  };

  var getCurrentTemperature = function () {
    var request = {
      request: '/temp/current'
    };
    sendJson(request);
  };

  var getSchedule = function () {
    var request = {
      request: '/schedule'
    };
    sendJson(request);
  };

  var startSchedule = function(schedule) {
    var request = {
      request: '/schedule/start',
      param: {
        schedule: schedule
      }
    };
    sendJson(request);
  };

  var getStoredSchedules = function () {
    var request = {
      request: '/schedule/store/retrieve'
    };
    sendJson(request);
  };

  var createSchedule = function(schedule){
  };

  var retrieveSchedule = function(schedule){
  };

  var updateSchedule = function(schedule){
  };

  var deleteSchedule = function(schedule){
  };

  var stopSchedule = function (){
  };

  var getStatus = function () {
    var request = {
      request: '/schedule/status'
    };
    sendJson(request);
  };

  var getTempLog = function (){
  };

  return {
    getCurrentTemperature: getCurrentTemperature,
    getSchedule: getSchedule,
    startSchedule: startSchedule,
    stopSchedule: stopSchedule,
    getStatus: getStatus,
    getTempLog: getTempLog,
    getStoredSchedules: getStoredSchedules,
    createSchedule: createSchedule,
    retrieveSchedule: retrieveSchedule,
    updateSchedule: updateSchedule,
    deleteSchedule: deleteSchedule
  };
}]);