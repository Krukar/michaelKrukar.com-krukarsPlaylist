Krukar Radio - Formerly Krukar's Playlist
===============

radio.michaelkrukar.com - Formerly http://krukarsplaylist.com/

Plays music I like via Youtube.

1.1.0
July 9, 2016
- Added pause, video and playlist UI
- New Analytics code

1.0.0
July 4, 2016
- MVP

OLD
--------------

About
--------------
Built in AngularJS
YouTube playlist creator that uses Last.FM to narrow down search results
Type in Krukar and hit enter to listen to Krukar's playlist

**Release History**
- September 28, 2014 	- Release Candidate 1 		- Basic features working on all tested devices
- September 29, 2014 	- Release Candidate 1.01 	- Menu slide was position left, now translate x for improved performance
													- When you click on a new track the menu now hides
													- Fixed x being too low on safari (translate y was not set for other browsers)
- October 1, 2014 		- Release Candidate 1.01 	- Google Analytics added
													- Custom submit doesn't replace but concats
													- Clear playlist will close menu and reset title
													- Swipe left/right on song title will go to previous/next song
													- Abandoned iOS support until playVideo and loadVideobyID are supported on iOS
													
- October 2, 2014		- Released Candidate 1.02	- Removed swipe left/right since it was loading a library for something so small
													- Replaced all JS with one single cdn
													- Implemented sorting
													- PopUp now has animation
													- Cloud button now stores to MySQL db, and searching the unique ID will retrieve it

- October 3, 2014		- Released Candidate 1.03	- Added selection color
													- I was serializing everything, I only need to serialize the playlist and booleans
													- Custom playlists now do not shuffle and start at the top

- October 4, 2014		- Released Candidate 1.04	- All factories converted in to one mega factory
													- Reworked play/pause button
													- Error message now slides in like the menu
													- Cloud button moved to the controls
													- Storing your playlist in a db now works

- October 4, 2014		- Version 1

- October 5, 2014		- Version 1.1 				- Your unique ID is now stored in localStorage and will always update your list until you clear your cache

- October 6, 2014		- Version.1.2 				- Changed mute to volume slider