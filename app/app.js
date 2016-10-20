var mashControl = angular.module('mashControl', ['ngResource']);

mashControl.controller('MashControlCtrl', function($scope, vesselRestService) {
  $scope.variable = 1;
  $scope.increment = function() {

  }

  var function updateCurrentTemperature() {
    setTimeout(function () {
      vesselRestService.getCurrentTemperature().then(function(data) {
          $scope.variable = data.temperature.celcius;
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

  return {
    getCurrentTemperature: getCurrentTemperature
  };
});
