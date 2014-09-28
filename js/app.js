 //Load Youtube api
 var tag = document.createElement('script');

 tag.src = "http://www.youtube.com/iframe_api";
 var firstScriptTag = document.getElementsByTagName('script')[0];
 firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

//Global Variables
var quickSearchTimer; //The function to delay searching while people type

//Angular Settings
var KPApp = angular.module('krukarsPlaylist', []);

KPApp.controller('mainController', function($rootScope, $scope, $window, ajaxLastFM, ajaxYouTube, ajaxCustomPlaylist){

	//Scope Variables
	$scope.results = []; //The results that people see
	$scope.playlist = localStorage.playlist === undefined ? [] : angular.fromJson(localStorage.playlist); //The playlist. Is there no playlist in localstorage ? Make a new one : load from localstorage
	var customPlaylists = ['krukar', 'marina', 'live laugh love']; //Array of custom playlist titles

	$scope.popUpMessage = ''; //Push notification message
	$scope.showPopUp = false; //Push notification message visibility

	$scope.youTubeState = 0; //Global variable for keeping track of the state of the video
	$scope.pause = true; //Tracks play and pause
	$scope.mute = false; //Toggles mute

	//Options
	$scope.currentSong = angular.fromJson(localStorage.currentSong) === undefined ? 0 : angular.fromJson(localStorage.currentSong); //The current song playing. If someone comes back, grab their spot in the playlist
	$scope.shuffle = angular.fromJson(localStorage.shuffle) === undefined ? false : angular.fromJson(localStorage.shuffle); //Toggle shuffle
	$scope.showVideo = angular.fromJson(localStorage.showVideo) === undefined ? true : angular.fromJson(localStorage.showVideo); //Toggles video display. Set it to true by default because Firefox cannot handle if it's false, so has to be disabled for FF
	$rootScope.header = "Krukar's Playlist"; //Set the page title

	//When people type too fast it does an ajax call every keyup. What does this is when you keyup, it waits 1 second before searching. If you type again in that second, it will reset the timer
	$scope.quickSearch=function(){
		$scope.results = []; //Clear the results on every keyup so that there won't be any lingering dropdown
		clearTimeout(quickSearchTimer);
		if ($scope.newSearch) {	
			quickSearchTimer = setTimeout($scope.lastFMSearchResults, 500, $scope.newSearch);
		}
	}

	//This will create a list underneath the search bar of the top 10 last.FM results
	$scope.lastFMSearchResults=function(lastFMSearchTerm){
		ajaxLastFM.getLastFM(lastFMSearchTerm).then(function(lastFMData){
			if(lastFMData.length != 3){
				angular.forEach(lastFMData.results.trackmatches.track, function(value, key){
					//Sometimes lastFM will return a bougs empty result, a few  times. This check will prevent that from displaying
					if (lastFMData.results.trackmatches.track[key].artist){
						var searchResult = {
							'artist': lastFMData.results.trackmatches.track[key].artist,
							'title': lastFMData.results.trackmatches.track[key].name
						}
						console.log(searchResult);
						$scope.results.push(searchResult);
					}
				}); 
			}
		});
	}

	//If you clicked on a last.FM search result, add that to the playlist
	$scope.clickResult=function(){
		//You need to store this info because this won't work inside the ajax call
		var searchArtist = $scope.results[this.$index].artist;
		var searchTitle = $scope.results[this.$index].title;
		var songClicked = this.$index;
		var youTubeSearchTerm = searchArtist + ' - ' + searchTitle;
		ajaxYouTube.getYouTube(youTubeSearchTerm).then(function(youTubeData){
			var searchResult = {
				'artist': searchArtist,
				'title': searchTitle,
				'id': youTubeData.feed.entry[0].media$group.yt$videoid.$t
			}
			$scope.results.splice(songClicked, 1); //Remove that song from the results
			$scope.addToPlaylist(searchResult);
		});
	} 

	//This is called when people hit enter
	$scope.submitSearch=function(){
		//Create a new variable
		var lastFMSearchTerm  = $scope.newSearch;
		$scope.resetForm();
		//Does the search term appear in our custom playlist, if so go to the custom playlist loader
		if(customPlaylists.indexOf(lastFMSearchTerm) > -1){
			$scope.customSubmit(lastFMSearchTerm);
		}
		//If does not appear run the regular submitSearch
		else{
			ajaxLastFM.getLastFM(lastFMSearchTerm).then(function(lastFMData){
				var lastFMError = lastFMData.length == 3 ? true : false; //My custom last.FM error check. If it returns no data it will return an empty array, which is length 3
				var youTubeSearchTerm = lastFMError ? lastFMSearchTerm : angular.isArray(lastFMData.results.trackmatches.track) ? lastFMData.results.trackmatches.track[0].artist + ' - ' + lastFMData.results.trackmatches.track[0].name : lastFMSearchTerm;
				//Search Youtube using = was there an error ? if yes then use the raw input. Otherwise are the results an array ? If it's an array use the first input : otherwise use the raw input
				ajaxYouTube.getYouTube(youTubeSearchTerm).then(function(youTubeData){
					if (youTubeData.feed.openSearch$totalResults.$t > 0){
						var artist = lastFMError ? '' : angular.isArray(lastFMData.results.trackmatches.track) ? lastFMData.results.trackmatches.track[0].artist : '';
						var title = lastFMError ? youTubeData.feed.entry[0].title.$t : angular.isArray(lastFMData.results.trackmatches.track) ? lastFMData.results.trackmatches.track[0].name : youTubeData.feed.entry[0].title.$t;
						var id = youTubeData.feed.entry[0].media$group.yt$videoid.$t;
						var searchResult = { 
							'artist': artist,
							'title': title,
							'id': id 		
						} 
						$scope.addToPlaylist(searchResult);
					} 
					else{
						$scope.popUp('Sorry, we could not find what you were looking for.'); //If it didn't add anything let them know
					} 
				}); 
			}); 
		} //else - this comment is only hear because otherwise formatting is broken in subblime
	} 

	//This function takes the searchResult var and adds it the playlist
	$scope.addToPlaylist=function(searchResult){
		$scope.playlist.push(searchResult);
		//Did you just add your first song? either because you just started or cleared, then play something
		if($scope.playlist.length == 1){
			$scope.playVideo();
		}
		$scope.localStore();
	}

	//resets search input and results array
	$scope.resetForm=function(){
		$scope.newSearch = '';
		$scope.results = [];
	}

	//Call this anytime we want to store stuff
	$scope.localStore=function(){
		//Create an array of options for people to store
		localStorage.setItem('playlist', angular.toJson($scope.playlist)); //Store the playlist
		localStorage.setItem('currentSong', angular.toJson($scope.currentSong)); //Store the currentSong
		localStorage.setItem('showVideo', angular.toJson($scope.showVideo));
		localStorage.setItem('shuffle', angular.toJson($scope.shuffle));
	}

	//When people click on a song
	$scope.goToSong=function(){
		$scope.currentSong = this.$index; //Set the currentSong to the one people clicked
		$scope.playVideo();
		$scope.localStore();
	}

	//Remove a song from the playlist
	$scope.removeSong=function(){
		$scope.playlist.splice(this.$index, 1);
		//Is the currentSong less than the song we're cutting out ? leave it : is it 0 or less ? leave it at 0 : take away 1. This will keep our currentSong consistent if you remove a song that has already been played
		$scope.currentSong = $scope.currentSong < this.$index ? $scope.currentSong : $scope.currentSong <= 0 ? 0 : $scope.currentSong  - 1;
		$scope.localStore();
	}

	//Clear the entire playlist
	$scope.clearPlaylist=function(){
		$scope.playlist = [];
		$scope.currentSong = 0;
		$scope.localStore();
		player.stopVideo();
	}

	$scope.pauseVideo=function(){
		if($scope.playlist.length >= 1){
			if ($scope.youTubeState == 1){
				$scope.pause = true;
				player.pauseVideo();
			}
			else if($scope.youTubeState == 0){
				$scope.pause = false;
				$scope.playVideo();
			}
			else{
				$scope.pause = false;
				player.playVideo();
			}
		} 
	}

	//When people click previous
	$scope.previousSong=function(){
		//Created so that if there are no songs the button's don't work
		if($scope.playlist.length >= 1){
			//Is the current Song the top of the list ? go to the bottom : go back one
			$scope.currentSong = $scope.currentSong <= 0 ? $scope.playlist.length-1 : $scope.currentSong - 1;
			$scope.playVideo();
			$scope.localStore();
		}
	}

	//When people click next
	$scope.nextSong=function(){
		//Created so that if there are no songs the button's don't work
		if($scope.playlist.length >= 1){
			//Is shuffle on ? go to random number : is it the bottom of hte playlist ? go to the top : go to the next one
			$scope.currentSong = $scope.shuffle ? (Math.floor(Math.random() * (($scope.playlist.length-1) - 0 + 1)) + 0) : $scope.currentSong >= $scope.playlist.length-1 ? 0 : $scope.currentSong + 1;
			$scope.playVideo();
			$scope.localStore();
		}
	}

	//Toggle mute when people click on it
	$scope.toggleMute=function(){
		$scope.mute = !$scope.mute;
		if($scope.mute){
			player.mute();
		}
		else{
			player.unMute();
		}
	}

	//Toggle shuffle when people click on it
	$scope.toggleShuffle=function(){
		$scope.shuffle = !$scope.shuffle;
		$scope.localStore();
	}

	//Toggle video when people click on it
	$scope.toggleVideo=function(){
		$scope.showVideo =!$scope.showVideo;
		$scope.localStore();
	}

	//When people type in a custom search term that matches something our custom playlist array
	$scope.customSubmit=function(customTerm){
		ajaxCustomPlaylist.getCustomPlaylist().then(function(customPlaylist){
			$scope.playlist = customPlaylist.data[customTerm]; //Replace the current playlist with the custom playlist
			$scope.shuffle = true; //Turn on shuffle since I like to shuffle my playlist
			$scope.popUp("Enjoy " + customTerm + "'s playlist.");
			$scope.nextSong();
		}); 
	}

	//PopUp message function
	$scope.popUp=function(popUpText){
		$scope.showPopUp = true; //Make the form visible
		$scope.popUpMessage = popUpText; //Replace the message with what we sent it
		//After 3 seconds hide the message
		setTimeout(function(){
			$scope.showPopUp = false;
			//Automated DOM manipulation requires $scope.apply();
			$scope.$apply();
		}, 3000);
	}

	//When the YoutubeAPI is ready it creates the video player
	$window.onYouTubeIframeAPIReady=function(){
		player = new YT.Player('video', {
			height: '100%',
			width: '100%',
			playerVars: {
				'hd': 1,
				'rel': 0,
				'showinfo': 0,
				'iv_load_policy': 3,
				'controls': 0
			},
			events: {
				'onStateChange': $scope.onPlayerStateChange
			}
		});
	} 

	//Anytime a change has been made to the video this function is run
	$scope.onPlayerStateChange=function(event) {
		$scope.youTubeState = event.data; //Our global state tracker
		//If a song has ended go to the next one
		if(event.data == 0){
			$scope.nextSong();
			$scope.$apply(); //Without this currentTitle and currentArtist will not update
		}
	}

	//The function to call to play a video. 
	$scope.playVideo=function(){
		player.loadVideoById($scope.playlist[$scope.currentSong].id); //Our main play video. We constantly change the currentSong and just play the current song
		$rootScope.header = $scope.playlist[$scope.currentSong].title + ' - ' + $scope.playlist[$scope.currentSong].artist; //Page title is set to title - artist
	}

});

//Our factory that calls Last.FM
KPApp.factory('ajaxLastFM', function($http) {

	return {

		getLastFM: function (ajaxLastFMSearchTerm){

			var ajaxLastFMPromise = $http.get('http://ws.audioscrobbler.com/2.0/?method=track.search&track=' + ajaxLastFMSearchTerm + '&api_key=b5ac351ccf761532804efb7262b8c320&format=json&limit=10').then(function (ajaxLastFMResponse) {
				return ajaxLastFMResponse.data;
			});
			return ajaxLastFMPromise;
		} 

	} 

});

//Ouf factory that calls YouTube
KPApp.factory('ajaxYouTube', function($http) {

	return {

		getYouTube: function(ajaxYouTubeSearchTerm) {

			var ajaxYouTubePromise = $http.get('https://gdata.youtube.com/feeds/api/videos?q=' + ajaxYouTubeSearchTerm + '&max-results=1&alt=json&v=2').then(function (ajaxYouTubeResponse) {
				return ajaxYouTubeResponse.data;
			});
			return ajaxYouTubePromise;
		} 

	} 

});

 //Our factory that gets my custom playlist
 KPApp.factory('ajaxCustomPlaylist', function($http) {

 	return {

 		getCustomPlaylist: function() {

 			var ajaxCustomPlaylistPromise = $http.get('custom.json').then(function (ajaxCustomPlaylistResponse) {
 				return ajaxCustomPlaylistResponse;
 			});
 			return ajaxCustomPlaylistPromise;
 		} 

 	} 

 });