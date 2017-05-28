var mashControl = angular.module('mashControl');

mashControl.factory('mashControlRestFactory',function($resource) {
  return {
    getCurrentTemperature : function(){
      return $resource('/temp/current/');
    },
    getSchedule : function(){
      return $resource('/schedule/');
    },
    startSchedule: function() {
      return $resource('/schedule/start/',{},{
        start : { method: 'POST'}
      });
    },
    stopSchedule : function(){
      return $resource('/schedule/stop/');
    },
    getStatus : function(){
      return $resource('/schedule/status');
    },
    getTempLog : function(){
      return $resource('/schedule/tempLog');
    },
    getStoredSchedules : function(){
      return $resource('/schedule/store/retrieve');
    },
    createSchedule: function() {
      return $resource('/schedule/store/create',{}, {
        create : { method: 'POST'}
      });
    },
    retrieveSchedules : function(){
      return $resource('/schedule/store/retrieve/:uuid',{uuid: '@uuid'});
    },
    updateSchedule: function() {
      return $resource('/schedule/store/update/:uuid',{uuid: '@uuid'}, {
        update : { method: 'PUT'}
      });
    },
    deleteSchedule: function() {
      return $resource('/schedule/store/delete/:uuid',{uuid: '@uuid'}, {
        del : { method: 'DELETE'}
      });
    }
  };
});

mashControl.factory('mashControlRestService', function($q, $http, mashControlRestFactory){
  var getCurrentTemperature = function (){
    var deferred = $q.defer();
    mashControlRestFactory.getCurrentTemperature().get({},
      function(response) {
        deferred.resolve(response);
      }, function(error) {
        deferred.reject(error);
      });
    return deferred.promise;
  };

  var getSchedule = function (){
    var deferred = $q.defer();
    mashControlRestFactory.getSchedule().get({},
      function(response) {
        deferred.resolve(response);
      }, function(error) {
        console.error("Error getting current schedule");
        deferred.reject(error);
      });
    return deferred.promise;
  };

  var startSchedule = function(schedule){
    var deferred = $q.defer();

    mashControlRestFactory.startSchedule().start(schedule,
      function(response) {
        deferred.resolve(response);
      }, function(error) {
        console.error("Error starting schedule");
        deferred.reject(error);
      });
    return deferred.promise;
  };

  var getStoredSchedules = function (){
    var deferred = $q.defer();
    mashControlRestFactory.getStoredSchedules().get({},
      function(response) {
        deferred.resolve(response);
      }, function(error) {
        console.error("Error getting stored schedules");
        deferred.reject(error);
      });
    return deferred.promise;
  };

  var createSchedule = function(schedule){
    var deferred = $q.defer();

    mashControlRestFactory.createSchedule().create(schedule,
      function(response) {
        deferred.resolve(response);
      }, function(error) {
        console.error("Error starting schedule");
        deferred.reject(error);
      });
    return deferred.promise;
  };

  var retrieveSchedule = function(schedule){
    var deferred = $q.defer();

    mashControlRestFactory.retrieveSchedule().get(schedule,
      function(response) {
        deferred.resolve(response);
      }, function(error) {
        console.error("Error retrieving schedule");
        deferred.reject(error);
      });
    return deferred.promise;
  };

  var updateSchedule = function(schedule){
    var deferred = $q.defer();

    mashControlRestFactory.updateSchedule().update(schedule,
      function(response) {
        deferred.resolve(response);
      }, function(error) {
        console.error("Error updating schedule");
        deferred.reject(error);
      });
    return deferred.promise;
  };

  var deleteSchedule = function(schedule){
    var deferred = $q.defer();

    mashControlRestFactory.deleteSchedule().del(schedule,
      function(response) {
        deferred.resolve(response);
      }, function(error) {
        console.error("Error deleting schedule");
        deferred.reject(error);
      });
    return deferred.promise;
  };

  var stopSchedule = function (){
    var deferred = $q.defer();
    mashControlRestFactory.stopSchedule().get({},
      function(response) {
        deferred.resolve(response);
      }, function(error) {
        console.error("Error getting current temperature");
        deferred.reject(error);
      });
    return deferred.promise;
  };

  var getStatus = function (){
    var deferred = $q.defer();
    mashControlRestFactory.getStatus().get({},
      function(response) {
        deferred.resolve(response);
      }, function(error) {
        console.error("Error getting status");
        deferred.reject(error);
      });
    return deferred.promise;
  };

  var getTempLog = function (){
    var deferred = $q.defer();
    mashControlRestFactory.getTempLog().get({},
      function(response) {
        deferred.resolve(response);
      }, function(error) {
        console.error("Error getting temp log");
        deferred.reject(error);
      });
    return deferred.promise;
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
});