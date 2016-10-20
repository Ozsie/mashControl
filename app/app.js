angular.module('mashControl', [['$resourceProvider', function($resourceProvider) {
  // Don't strip trailing slashes from calculated URLs
  $resourceProvider.defaults.stripTrailingSlashes = false;
}])
.controller('MashControlCtrl', function($scope, vesselRestService) {
  $scope.variable = 1;
  $scope.increment = function() {
    $scope.variable = vesselRestService.getCurrentTemperature().celcius;
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
