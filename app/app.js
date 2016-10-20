var mashControl = angular.module('mashControl', ['ngResource']);

mashControl.controller('MashControlCtrl', function($scope, vesselRestService) {
  $scope.start = function() {
  };

  var updateCurrentTemperature = function() {
    setTimeout(function () {
      vesselRestService.getCurrentTemperature().then(function(data) {
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
    startSchedule: function() {
      return $resource('/asset/rest/asset/list/',{},{
        start : { method: 'POST'}
      });
    }
  };
})

mashControl.factory('vesselRestService', function($q, $http, mashControlRestFactory){
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

  var startSchedule = function(schedule){
    var deferred = $q.defer();

    vesselRestFactory.startSchedule().start(schedule,
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
    startSchedule: startSchedule
  };
});
