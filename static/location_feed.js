angular.module('ich8App', ['ngRoute', 'angularMoment'])
  .config(function($locationProvider, $routeProvider) {
    $locationProvider.html5Mode(true);
  })
  .controller('LocationFeedCtrl', ['$scope', '$http', '$timeout', '$location', 'moment', function($scope, $http, $timeout, $location, moment) {
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
      
      //create google map on callback from google map api (called in the url)
      initMap = function(){
        console.log('hi');
        var map = new google.maps.Map(document.getElementById('map'), {
          zoom: 10
        });
        var geocoder = new google.maps.Geocoder();
        
        $scope.geocodeAddress(geocoder, map);
      }
      
      $scope.getLocationTitle = function(result){
        //if there is a county included in the response
        if(Object.keys(result.address_components).length > 4) {
          var zip = result.address_components[0].short_name;
          var city = result.address_components[1].short_name;
          var county = result.address_components[2].short_name;
          var state = result.address_components[3].short_name;
          var country = result.address_components[4].short_name;
          $scope.locationTitle = city + ', ' + state;
        }
        //if there is no county included in the response
        else {
          var zip = result.address_components[0].short_name;
          var city = result.address_components[1].short_name;
          var state = result.address_components[2].short_name;
          var country = result.address_components[3].short_name;
          $scope.locationTitle = city + ', ' + state;
        }
        //apply to scope now instead of waiting for scope to update
        $scope.$apply();
      }
      
      //add pin to google map on location based on url (zipcode)
      $scope.geocodeAddress = function(geocoder, resultsMap) {
        console.log('yoyo');
        var address = $location.path();
        geocoder.geocode({'address': address}, function(results, status) {
          if (status === 'OK') {
            console.log(results);
            var result = results[0];
            $scope.getLocationTitle(result);
            resultsMap.setCenter(results[0].geometry.location);
            var marker = new google.maps.Marker({
              map: resultsMap,
              position: results[0].geometry.location
            });
          } else {
            alert('Geocode was not successful for the following reason: ' + status);
          }
        });
      }
      
      //load in initial reports
      $scope.getReports();
  }]);