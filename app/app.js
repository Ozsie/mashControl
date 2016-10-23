var mashControl = angular.module('mashControl', ['ngResource']);

mashControl.controller('MashControlCtrl', function($scope, mashControlRestService) {
  $scope.start = function() {
    mashControlRestService.startSchedule($scope.schedule).then(function(data) {
      $scope.startResponse = data;
    });
  };
  $scope.getSchedule = function() {
    mashControlRestService.getSchedule().then(function(data) {
      $scope.schedule = data;
    });
  };

  var updateCurrentTemperature = function() {
    setTimeout(function () {
      mashControlRestService.getCurrentTemperature().then(function(data) {
        $scope.currentTemp = data;
        $scope.currentTempTime = new Date(data.time);
      });
      updateCurrentTemperature();
    }, 1000);
  };

  updateCurrentTemperature();
});

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
    }
  };
})

mashControl.factory('mashControlRestService', function($q, $http, mashControlRestFactory){
  var getCurrentTemperature = function (){
    var deferred = $q.defer();
    mashControlRestFactory.getCurrentTemperature().get({},
      function(response) {
        deferred.resolve(response);
      }, function(error) {
        console.error("Error getting current temperature");
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
  }

  return {
    getCurrentTemperature: getCurrentTemperature,
    getSchedule: getSchedule,
    startSchedule: startSchedule
  };
});
