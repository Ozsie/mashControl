angular.module('mashControl', [])
.controller('MashControlCtrl', function($scope) {
  $scope.variable = 1;
  $scope.increment = function() {
    $scope.variable += 1;
  }
})
.factory('mashControlRestFactory',function($resource) {
  return {
    getCurrentTemperature : function(){
      return $resource('/temp/current/');
    }
  };
})
.factory('vesselRestService', function($q, $http, mashControlRestFactory){
  var getCurrentTemperature = function (){
    var deferred = $q.defer();
    mashControlRestFactory.getCurrentTemperature().get({},
      function(response) {
        deferred.resolve(response.data);
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
