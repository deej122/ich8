angular.module('ich8App', ['ngRoute'])
  .config(function($locationProvider, $routeProvider) {
    $locationProvider.html5Mode(true);
  })
  .controller('LocationFeedCtrl', ['$scope', '$http', '$timeout', '$location', function($scope, $http, $timeout, $location) {
      $scope.showNewReport=false;
      $scope.report_content = {};      
      
      $scope.getReports = function(){
        var url_start = $location.path()
        $http({
          method: 'POST',
          url: url_start + '/getReports',
        }).then(function(response) {
          console.log(response + "get response");
          $scope.reports = response.data;
          console.log($scope.reports);
          console.log('reports',$scope.reports);
        }, function(error) {
          console.log(error);
        });
        $scope.intervalFunction();
      };

      $scope.intervalFunction = function(){
        $timeout(function() {
          $scope.getReports();
        }, 10000)
      };
      
      $scope.getReports();
  }]);