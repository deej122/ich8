angular.module('ich8App', ['ngRoute', 'angularMoment'])
  .config(function($locationProvider, $routeProvider) {
    $locationProvider.html5Mode(true);
  })
  .controller('LocationFeedCtrl', ['$scope', '$http', '$timeout', '$location', 'moment', '$window', function($scope, $http, $timeout, $location, moment, $window) {
      $scope.report_content = {};      
      $scope.page_num = 0;
      $scope.reports = [];
      $scope.totalCount = null;
      $scope.new_reports = [];
      $scope.num_new_reports = $scope.new_reports.length;
      $scope.showNewReport=false;
      $scope.locationDoesNotExist = false;
      $scope.loadingResults = false;
      $scope.endOfResults = false;
      $scope.noReports = false;
      $scope.reported = [];  

      //use this for infinite scroll detection
      angular.element($window).bind("scroll", function() {
          var windowHeight = "innerHeight" in window ? window.innerHeight : document.documentElement.offsetHeight;
          var body = document.body, html = document.documentElement;
          var docHeight = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight,  html.scrollHeight, html.offsetHeight);
          windowBottom = windowHeight + window.pageYOffset;
          if (windowBottom >= docHeight && !$scope.endOfResults) {
            $scope.getMoreReports();
          }
      });
      
      //to add new reports to the top of the feed list vs just showing the number
      $scope.exposeNewReports = function() {
        for(i = 0; i < $scope.new_reports.length; i++) {
          $scope.reports.unshift($scope.new_reports[i]);
          $scope.totalCount = $scope.totalCount + 1;
        }
        $scope.new_reports = [];
        $scope.latestPost = $scope.reports[0].id;
        $scope.showNewReport=false;
      };
      
      $scope.getReports = function(){
        var location = $location.path();
        while(location.charAt(0) === '/')
            location = location.substr(1);
        $scope.location = location;
        $http({
          method: 'POST',
          url: '/getReports',
          data: {
            'location': location
          }
        }).then(function(response) {
          $scope.reports = response.data;
          //to remove the "count" object so no blank items show in feed
          $scope.reports.pop();
          if($scope.reports.length > 0) {
            $scope.latestPost = $scope.reports[0].id;
            //initialize page number to be one since we loaded first ten elements now
            $scope.page_num = 1;
            //keep track of total number of reports with this (will tell us when to stop infinite scrolling)
            $scope.totalCount = response.data[response.data.length - 1]['count'];  
          }
          else {
            $scope.noReports = true;
            return;
          }
        }, function(error) {
          console.log(error);
        });
        //start looking for newly created posts every ten seconds
        $scope.intervalFunction();
      };

      $scope.getNewReports = function(){
        $http({
          method: 'POST',
          url: '/getNewReports',
          data: {
            latest_post: $scope.latestPost,
            location: $scope.location
          }
        }).then(function(response) {
          //show the number of new reports
          $scope.showNewReport = true;
          //if not new report, hide it
          if(response.data[0].id == $scope.latestPost) {
            $scope.showNewReport = false;
            //check if no reports
            if($scope.noReports == true) {
              if($scope.reports.length > 0) {
                $scope.noReports = false;
              }
            };
          }
          //if there are already new reports that are unread
          else if($scope.new_reports.length > 0) {
            for(i = 0; i <= response.data.length - 2; i++) {
              //if post is already counted as new, don't add to the list
              if($scope.containsId($scope.new_reports, response.data[i])) {
                break;
              }
              //otherwise add it if it is new
              else {
                $scope.new_reports.push(response.data[i]);
                $scope.num_new_reports = $scope.num_new_reports + 1;
              }
            }
          }
          //if there are not already new reports, create the list
          else {
            $scope.new_reports = response.data;
            $scope.new_reports.pop();
            $scope.num_new_reports = $scope.new_reports.length;
          }
          // $scope.totalCount = response.data[response.data.length - 1]['count']
        }, function(error) {
          console.log(error);
        });
        $scope.intervalFunction();
      };

      //for NEXT reports to show after infinite scroll
      $scope.getMoreReports = function(){
        if($scope.reports.length > 2) {
          //if already tried to load next page (check id and also scope variable we set) --> do we need both?
          if(($scope.reports[$scope.reports.length - 2].id == $scope.last_requested) || $scope.calledForNextPage == true) {
            return;
          }
          //if length of reports (on fe) equals number we have for total reports, stop infinite scroll
          else if($scope.reports.length >= $scope.totalCount) {
            $scope.endOfResults = true;
            return;
          }
          //if there are still reports to find and a request is not currently in progress
          else {
            //note that a request is currently in progress
            $scope.calledForNextPage = true;
            //show loading animation
            $scope.loadingResults = true;
            //cause i have that scroll listener.... this is kinda jank
            $scope.$apply();
            //after 2 seconds, make request to server for more posts to show (10 more posts)
            $timeout(function() {
              $http({
                method: 'POST',
                url: '/getMoreReports',
                data: {
                  page_num: $scope.page_num,
                  num_new_reports: $scope.num_new_reports,
                  location: $scope.location
                }
              }).then(function(response) {
                //note that last requested post is last item in response
                //using length - 2 because of the "count" included in response.data
                //if there is more than one result in the array, there may be more to load
                if(response.data.length > 1) {
                  $scope.last_requested = response.data[response.data.length - 2].id;  
                }
                //if there is not more than one result, we're done loading so stop infinite scroll
                else {
                  $scope.endOfResults = true;
                }
                //reset totalCount to be whatever it is now (in the db -- may have changed in the meantime)
                $scope.totalCount = response.data[response.data.length - 1]['count'];
                //add posts to the reports array that is displaying on the page
                for(i = 0; i < response.data.length - 1; i++) {
                  $scope.reports.push(response.data[i]);
                }
                //increment page_num since we're now on the next page_
                $scope.page_num = $scope.page_num + 1;
                //note that a request is not currently in progress anymore
                $scope.calledForNextPage = false;
                //hide loading animation
                $scope.loadingResults = false;
              }, function(error) {
                console.log(error);
              })
            }, 2000)  
          }
        }
        else {
          $scope.endOfResults = true;
          return;
        }
      };
      
      //create google map on callback from google map api (called in the url)
      initMap = function(){
        var map = new google.maps.Map(document.getElementById('map'), {
          zoom: 10
        });
        var geocoder = new google.maps.Geocoder();
        
        $scope.geocodeAddress(geocoder, map);
      }
      
      $scope.getLocationTitle = function(result){
        //if location does not exist
        if(!result) {
          $scope.locationDoesNotExist = true;
        }
        //if there is a county included in the response
        else if(Object.keys(result.address_components).length > 4) {
          var zip = result.address_components[0].short_name;
          var city = result.address_components[1].short_name;
          var county = result.address_components[2].short_name;
          var state = result.address_components[3].short_name;
          var country = result.address_components[4].short_name;
          $scope.locationTitle = city + ', ' + state;
        }
        else if((result.address_components).length == 4) {
          var zip = result.address_components[0].short_name;
          var city = result.address_components[1].short_name;
          var state = result.address_components[2].short_name;
          var country = result.address_components[3].short_name;
          $scope.locationTitle = city + ', ' + state;
        }
        else if((result.address_components).length == 3) {
          var zip = result.address_components[0].short_name;
          var city = result.address_components[1].short_name;
          var country = result.address_components[2].long_name;
          $scope.locationTitle = city + ', ' + country;
        }
        //fallback for out of country or something
        else {
          $scope.locationTitle = result.formatted_address;
        }
        //apply to scope now instead of waiting for scope to update
        $scope.$apply();
      }
      
      //add pin to google map on location based on url (zipcode)
      $scope.geocodeAddress = function(geocoder, resultsMap) {
        var address = $location.path();
        geocoder.geocode({'address': address}, function(results, status) {
          if (status === 'OK') {
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
      };
      
      //reporting function
      $scope.reportPost = function(report_id) {
        $http({
            method: 'POST',
            url: '/reportPost',
            data: {
                report_id: report_id
            }
        }).then(function(response) {
            $scope.reported.push(report_id);
            console.log('post reported successfully');
        }, function(error) {
            console.log('post not reported successfully');
        });
      };
      
      //function to wait ten seconds
      //used to check for new reports only periodically
      $scope.intervalFunction = function(){
        $timeout(function() {
          $scope.getNewReports();
        }, 10000)
      };
      
      //function to find object in array
      $scope.containsId = function(arr, obj) {
        for (var i = 0; i < arr.length; i++) {
          if (arr[i].id === obj.id) {
            return true;
          }
        }
        return false;
      }
      
      //load in initial reports
      $scope.getReports();
  }]);