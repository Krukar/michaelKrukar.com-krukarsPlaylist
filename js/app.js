 //Load Youtube api
 var tag = document.createElement('script');

 tag.src = "http://www.youtube.com/iframe_api";
 var firstScriptTag = document.getElementsByTagName('script')[0];
 firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

//Global Variables
var customPlaylists = ['krukar', 'live laugh love']; //Array of custom playlist titles
var quickSearchTimer; //Used to determine if a person has stopped typing
var youTubeState = 0; //Global variable for keeping track of the state of the video

//Angular Settings
var KPApp = angular.module('krukarsPlaylist', ['ui.sortable']);

KPApp.controller('mainController', ['$rootScope', '$scope', '$window', 'ajaxCalls', function($rootScope, $scope, $window, ajaxCalls){

	//Scope Variables
	$scope.results = []; //The results that people see
	$scope.playlist = localStorage.playlist === undefined ? [] : angular.fromJson(localStorage.playlist); //The playlist. Is there no playlist in localstorage ? Make a new one : load from localstorage

	$scope.popUpMessage = ''; //Push notification message
	$scope.showPopUp = false; //Push notification message visibility
	$scope.pause = false; //Tracks play and pause
	$scope.mute = false; //Toggles mute
	$( ".volume" ).slider({
      range: "min",
      max: 100,
      value: 100,
      change: function( event, ui ) {
      	player.setVolume(ui.value);
      }
    });

	//Options
	$scope.currentSong = localStorage.currentSong === undefined ? 0 : localStorage.currentSong; //The current song playing. If someone comes back, grab their spot in the playlist
	$scope.shuffle = localStorage.shuffle === undefined ? false : angular.fromJson(localStorage.shuffle); //Toggle shuffle
	$scope.showVideo = localStorage.showVideo === undefined ? true : angular.fromJson(localStorage.showVideo); //Toggles video display. Set it to true by default because Firefox cannot handle if it's false, so has to be disabled for FF
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
		ajaxCalls.getLastFM(lastFMSearchTerm).then(function(lastFMData){
			if(lastFMData.length != 3){
				angular.forEach(lastFMData.results.trackmatches.track, function(value, key){
					//Sometimes lastFM will return a bougs empty result, a few  times. This check will prevent that from displaying
					if (lastFMData.results.trackmatches.track[key].artist){
						var searchResult = {
							'artist': lastFMData.results.trackmatches.track[key].artist,
							'title': lastFMData.results.trackmatches.track[key].name
						}
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
		ajaxCalls.getYouTube(youTubeSearchTerm).then(function(youTubeData){
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
		//Do the first 3 letters in lower case = kp0 (that means they're loading a KPID)
		else if(lastFMSearchTerm.substring(0,3) == 'KP0'){
			$scope.mysqlGet(lastFMSearchTerm);
		}
		else{
			ajaxCalls.getLastFM(lastFMSearchTerm).then(function(lastFMData){
				var lastFMError = lastFMData.length == 3 ? true : false; //My custom last.FM error check. If it returns no data it will return an empty array, which is length 3
				var youTubeSearchTerm = lastFMError ? lastFMSearchTerm : angular.isArray(lastFMData.results.trackmatches.track) ? lastFMData.results.trackmatches.track[0].artist + ' - ' + lastFMData.results.trackmatches.track[0].name : lastFMSearchTerm;
				//Search Youtube using = was there an error ? if yes then use the raw input. Otherwise are the results an array ? If it's an array use the first input : otherwise use the raw input
				ajaxCalls.getYouTube(youTubeSearchTerm).then(function(youTubeData){
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
		} //this comment is only hear because otherwise formatting is broken in subblime
	} 

	//This function takes the searchResult var and adds it the playlist
	$scope.addToPlaylist=function(searchResult){
		$scope.playlist.push(searchResult);
		//Did you just add your first song? either because you just started or cleared, then play something
		if($scope.playlist.length == 1){
			$scope.playVideo();
		}
		$scope.storeLocally();	
	}

	//This function will store your plylist in the mysql db
	$scope.mysqlSave=function(){
		//So that people don't save empty playlists
		if($scope.playlist.length >= 1){
			ajaxCalls.setMYSQL($scope.playlist).then(function(kpid){
				localStorage.setItem('kpid', kpid); //Store the kpid
				$scope.popUp("Your playlist has been saved. Paste " + kpid + " to retrieve it.");
				$scope.$apply(); //For some reason the message will not pop up unless you apply
			});	
		}
		else{
			$scope.popUp("Sorry, you need at least 1 song in your playlist to save.");
		}
		
	}

	$scope.mysqlGet=function(term){
		ajaxCalls.getMYSQL(term).then(function(phpPlaylist){
			//If the person types in kp0 and the database doesn't exist, it returns an empty string. So this is our error check
			if(phpPlaylist.length >= 1){
				$scope.playlist = angular.fromJson(phpPlaylist);
				$scope.popUp("Loaded playlist " + term);
				$scope.currentSong = 0;
				$scope.playVideo();
				$scope.$apply();
			}
			else{
				$scope.popUp("Sorry, could not load that playlist.");	
			}
		});	
	}

	//resets search input and results array
	$scope.resetForm=function(){
		$scope.newSearch = '';
		$scope.results = [];
	}

	//Call this anytime we want to store stuff
	$scope.storeLocally=function(){
		//Create an array of options for people to store
		localStorage.setItem('playlist', angular.toJson($scope.playlist)); //Store the playlist
		localStorage.setItem('currentSong', $scope.currentSong); //Store the currentSong, since it's an int does not need to be serialized (I hope)
		localStorage.setItem('showVideo', angular.toJson($scope.showVideo)); //Store showVideo option
		localStorage.setItem('shuffle', angular.toJson($scope.shuffle)); //Store shuffle option
	}

	//When people click on a song
	$scope.goToSong=function(){
		$scope.currentSong = this.$index; //Set the currentSong to the one people clicked
		$scope.playVideo();
		$scope.showMenu = !$scope.showMenu; //Hide menu, since you clicked a song you obviously won't click another (debatable)	
		$scope.storeLocally();
	}

	//Remove a song from the playlist
	$scope.removeSong=function(){
		$scope.playlist.splice(this.$index, 1);
		//If you remove the song that's active, it should just stop
		if($scope.currentSong == this.$index){
			$scope.nextSong();
		}
		else{
			//Is the currentSong less than the song we're cutting out ? leave it : is it 0 or less ? leave it at 0 : take away 1. This will keep our currentSong constantlyistent if you remove a song that has already been played
			$scope.currentSong = $scope.currentSong < this.$index ? $scope.currentSong : $scope.currentSong <= 0 ? 0 : $scope.currentSong  - 1;
		}
		$scope.storeLocally();
	}

	//Clear the entire playlist
	$scope.clearPlaylist=function(){
		$scope.showMenu = !$scope.showMenu;
		$scope.playlist = [];
		$scope.currentSong = 0;
		player.stopVideo();
		$rootScope.header = "Krukar's Playlist";
		$scope.storeLocally();
	}

	$scope.pauseVideo=function(){
		if(youTubeState == 1){
			$scope.pause = true;
			player.pauseVideo();
		}
		else if(youTubeState == 2){
			$scope.pause = false;
			player.playVideo();
		}
		else{
			$scope.playVideo();
		}
	}

	//When people click previous
	$scope.previousSong=function(){
		//Created so that if there are no songs the button's don't work
		if($scope.playlist.length >= 1){
			//Is the current Song the top of the list ? go to the bottom : go back one
			$scope.currentSong = $scope.currentSong <= 0 ? $scope.playlist.length-1 : $scope.currentSong - 1;
			$scope.playVideo();
			$scope.storeLocally();
		}
	}

	//When people click next
	$scope.nextSong=function(){
		//Created so that if there are no songs the button's don't work
		if($scope.playlist.length >= 1){
			//Is shuffle on ? go to random number : is it the bottom of hte playlist ? go to the top : go to the next one
			$scope.currentSong = $scope.shuffle ? (Math.floor(Math.random() * (($scope.playlist.length-1) - 0 + 1)) + 0) : $scope.currentSong >= $scope.playlist.length-1 ? 0 : $scope.currentSong + 1;
			$scope.playVideo();
			$scope.storeLocally();
		}
	}

	//Toggle mute when people click on it
	$scope.toggleVolume=function(){
		$scope.showVolume = !$scope.showVolume;
	}

	//Toggle shuffle when people click on it
	$scope.toggleShuffle=function(){
		$scope.shuffle = !$scope.shuffle;
		$scope.storeLocally();
	}

	//Toggle video when people click on it
	$scope.toggleVideo=function(){
		$scope.showVideo =!$scope.showVideo;
		$scope.storeLocally();
	}

	//When people type in a custom search term that matches something our custom playlist array
	$scope.customSubmit=function(customTerm){
		ajaxCalls.getCustomPlaylist().then(function(customPlaylist){
			$scope.playlist = $scope.playlist.concat(customPlaylist.data[customTerm]); //Append the current playlist with the custom playlist
			$scope.shuffle = false;
			$scope.currentSong = 0;
			$scope.playVideo(); //Start at the top of the playlist
			$scope.popUp("Enjoy " + customTerm + "'s playlist.", 3000);
			$scope.storeLocally();
		}); 
	}

	//PopUp message function
	$scope.popUp=function(popUpText, duration){
		$scope.showPopUp = true; //Make the form visible
		$scope.popUpMessage = popUpText; //Replace the message with what we sent it
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
		youTubeState = event.data; //Our global state tracker
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

}]);

//Our mega factory
KPApp.factory('ajaxCalls', ['$http', function($http){

	return{

		getLastFM: function (ajaxLastFMSearchTerm){

			var ajaxLastFMPromise = $http.get('http://ws.audioscrobbler.com/2.0/?method=track.search&track=' + ajaxLastFMSearchTerm + '&api_key=b5ac351ccf761532804efb7262b8c320&format=json&limit=10').then(function (ajaxLastFMResponse) {
				return ajaxLastFMResponse.data;
			});
			return ajaxLastFMPromise;
		},

		getYouTube: function(ajaxYouTubeSearchTerm) {

			var ajaxYouTubePromise = $http.get('https://gdata.youtube.com/feeds/api/videos?q=' + ajaxYouTubeSearchTerm + '&max-results=1&alt=json&v=2').then(function (ajaxYouTubeResponse) {
				return ajaxYouTubeResponse.data;
			});
			return ajaxYouTubePromise;
		},

		getCustomPlaylist: function() {

			var ajaxCustomPlaylistPromise = $http.get('custom.json').then(function (ajaxCustomPlaylistResponse) {
				return ajaxCustomPlaylistResponse;
			});
			return ajaxCustomPlaylistPromise;
		},

		setMYSQL: function(ajaxPlaylist) {

			var kpid = localStorage.kpid === undefined ? undefined : localStorage.kpid;

			var setMYSQLPromise = $.post('php/setMYSQL.php', {
				phpKpid : kpid,
				phpPlaylist: angular.toJson(ajaxPlaylist)
			}).then(function (setMYSQLResponse) {
				console.log(setMYSQLResponse);
				return setMYSQLResponse;
			});
			return setMYSQLPromise;

		},

		getMYSQL: function(ajaxKPID){

			var getMYSQLPromise = $.post('php/getMYSQL.php', {
				phpKpid: ajaxKPID,
			}).then(function (getMYSQLResponse) {
				return getMYSQLResponse;
			});
			return getMYSQLPromise;

		}

	}

}]);

//Google Analytics
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
	(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
	m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-12435905-12', 'auto');
ga('send', 'pageview');