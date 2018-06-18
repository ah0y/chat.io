![Screenshot](https://imgur.com/1TM9Jnd.png)

# chat.io

A Real Time Chat Application built using Node.js, Express, Mongoose, Socket.io, Passport, & Redis. Forked from OmarElGabry's [chat.io](https://github.com/OmarElGabry/chat.io).


## Demo
Check out the [demo] (https://agile-taiga-95812.herokuapp.com) on Heroku! 

## Added Features
+ Uses the HTML5 Geolocation API to ask a User for permission to access their location and persist it to a MongoDB as `location`
+ Added a `/profile/` route and functionality for a User to add `likes` to their profile
+ Made the landing route after authenticating, `/rooms/`, only show all online Users within a 10 mile radius that also have at least one mutual like
+  Added a `/friends/` route and the ability for a User to send friend requests to other Users
+  Clicking a User's profile shows you the full list of their `likes`
+ Added private direct messaging between Users
+ Made the site HTML responsive. Kind of
+ A Users profile picture is obfuscated from non-friends. 

![Screenshot](https://imgur.com/W7DJ3RG.png)
 
**Other User only viewable after adding the like "umbrella" **

![Screenshot](https://imgur.com/CJgbLz9.png)


![Screenshot](https://imgur.com/pATCVrl.png)
![Screenshot](https://imgur.com/Cm4nZJw.png)

## Installation
For installation instructions, please refer to the original fork [here](https://github.com/OmarElGabry/chat.io).

## *To Do:*
+ Integrate FB likes into a Users likes
+ Make the site **more** HTML responsive
+ Have the "online" status indicator also show offline when a User goes offline
