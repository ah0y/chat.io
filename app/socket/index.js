'use strict';

var config = require('../config');
var redis = require('redis').createClient;
var adapter = require('socket.io-redis');
var fs = require('fs')
var Room = require('../models/room');
var User = require('../models/user')
var online = []
var friends = []


function calcCrow(coords1, coords2) {
	var lat1 = coords1.split(',')[0];
	var lon1 = coords1.split(',')[1];
	var lat2 = coords2.split(',')[0];
	var lon2 = coords2.split(',')[1];
	var R = 6371; // km
	var dLat = toRad(lat2 - lat1);
	var dLon = toRad(lon2 - lon1);
	var lat1 = toRad(lat1);
	var lat2 = toRad(lat2);

	var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	var d = R * c;
	return d;
}

// Converts numeric degrees to radians
function toRad(Value) {
	return Value * Math.PI / 180;
}

/**
 * Encapsulates all code for emitting and listening to socket events
 *
 */
var ioEvents = function (io) {

	// Rooms namespace
	io.of('/rooms').on('connection', function (socket) {

		socket.emit('currentUser', socket.request.session.passport.user)

		function displayNearMe(online) {
			var users = [];
			User.findById(socket.request.session.passport.user, function (err, current) {
				for (var user in online) {
					if (calcCrow(online[user].location, current.location) < 20) {
						users.unshift(online[user])
					}
					if (user == online.length - 1) {
						displayMatchesNearMe(users)
						// socket.emit('updateUsersList', users, true);
					}
				}
			})
		}

		function displayMatchesNearMe(online) {
			var users = [];
			User.findById(socket.request.session.passport.user, function (err, current) {
				for (var user in online) {
					var arrays = [online[user].likes, current.likes]
					var result = arrays.shift().filter(function(v) {
						return arrays.every(function(a) {
							return a.indexOf(v) !== -1;
						});
					});
					if (result.length > 0) {
						users.unshift(online[user])
					}
					if (user == online.length - 1) {
						socket.emit('updateUsersList', users, true);
					}
				}
			})
		}

		online[socket.id] = socket.request.session.passport
		var users = [];
		for (var user in online) {
			if (online[user] != undefined) {
				var user = JSON.stringify(online[user].user);
				User.findById(JSON.parse(user), function (err, user) {
					users.unshift(user)
					if (users.length == Object.keys(online).length) {
						displayNearMe(users)
					}
				})
			}

		}

		socket.on('locate', function (gps) {
			// console.log(gps)
			User.findByIdAndUpdate("" + socket.request.session.passport.user + "", { location: gps }, function () {
			});
		})

		socket.on('friendRequest', function (request) {
			User.findByIdAndUpdate(
				{ _id: socket.request.session.passport.user },
				{
					$push: { friends: request }
				},


				function (error, success) {
					if (error) {
						// console.log(error);
					} else {
						// console.log(success);
					}
				}
			)
		})

		socket.on('createRoom', function (title) {
			Room.findOne({ 'title': new RegExp('^' + title + '$', 'i') }, function (err, room) {
				if (err) throw err;
				if (room) {
					socket.emit('joinDM', room.id)
					socket.emit('updateRoomsList', { error: 'Room title already exists.' });
				} else {
					Room.create({
						title: title,
						public: false
					}, function (err, newRoom) {
						if (err) throw err;
						socket.emit('updateRoomsList', newRoom);
						socket.broadcast.emit('updateRoomsList', newRoom);
						socket.emit('joinDM', newRoom.id)
					});
				}
			});
		});

		socket.on('disconnect', function () {
			delete online[socket.id]
		});

	});
	io.of('/friends').on('connection', function (socket) {
		User.findById(socket.request.session.passport.user, function (err, user) {
			User.find({ _id: { $in: user.friends } }, function (err, users) {
				var mutualFriends = []
				for (user in users) {
					if (users[user].friends.indexOf(socket.request.session.passport.user) == -1) {
					}
					else {
						mutualFriends.unshift(users[user])
					}
				}
				if (user == users.length - 1) {
					socket.emit('updateFriendsList', mutualFriends, true);
				}
			})
		})

		socket.emit('currentUser', socket.request.session.passport.user)

		socket.on('createRoom', function (title) {
			Room.findOne({ 'title': new RegExp('^' + title + '$', 'i') }, function (err, room) {
				if (err) throw err;
				if (room) {
					socket.emit('joinDM', room.id)
					socket.emit('updateRoomsList', { error: 'Room title already exists.' });
				} else {
					Room.create({
						title: title,
						public: false
					}, function (err, newRoom) {
						if (err) throw err;
						socket.emit('updateRoomsList', newRoom);
						socket.broadcast.emit('updateRoomsList', newRoom);
						socket.emit('joinDM', newRoom.id)
					});
				}
			});
		});
	}),

		// Chatroom namespace
		io.of('/chatroom').on('connection', function (socket) {

			// Join a chatroom
			socket.on('join', function (roomId) {
				Room.findById(roomId, function (err, room) {
					if (err) throw err;
					if (!room) {
						// Assuming that you already checked in router that chatroom exists
						// Then, if a room doesn't exist here, return an error to inform the client-side.
						socket.emit('updateUsersList', { error: 'Room doesnt exist.' });

					} else {
						// Check if user exists in the session
						if (socket.request.session.passport == null) {
							return;
						}

						Room.addUser(room, socket, function (err, newRoom) {

							// Join the room channel
							socket.join(newRoom.id);

							Room.getUsers(newRoom, socket, function (err, users, cuntUserInRoom) {
								if (err) throw err;

								// Return list of all user connected to the room to the current user
								socket.emit('updateUsersList', users, true);


								// Return the current user to other connecting sockets in the room 
								// ONLY if the user wasn't connected already to the current room
								if (cuntUserInRoom === 1) {
									socket.broadcast.to(newRoom.id).emit('updateUsersList', users[users.length - 1]);
								}
							});
						});
					}
				});
			});

			// When a socket exits
			socket.on('disconnect', function () {

				// Check if user exists in the session
				if (socket.request.session.passport == null) {


				}

				// Find the room to which the socket is connected to, 
				// and remove the current user + socket from this room
				Room.removeUser(socket, function (err, room, userId, cuntUserInRoom) {
					if (err) throw err;

					// Leave the room channel
					socket.leave(room.id);

					// Return the user id ONLY if the user was connected to the current room using one socket
					// The user id will be then used to remove the user from users list on chatroom page
					if (cuntUserInRoom === 1) {
						socket.broadcast.to(room.id).emit('removeUser', userId);
					}
				});
			});

			// When a new message arrives
			socket.on('newMessage', function (roomId, message) {

				// No need to emit 'addMessage' to the current socket
				// As the new message will be added manually in 'main.js' file
				// socket.emit('addMessage', message);

				socket.broadcast.to(roomId).emit('addMessage', message);
			});

		});

	io.of('/profile').on('connection', function (socket) {
		socket.on('updateLikes', function (like) {
			User.findByIdAndUpdate(socket.request.session.passport.user,
				{ $pull: { likes: { $in: [like] } } },
				{ multi: true }
			)
		})
	});
}

/**
 * Initialize Socket.io
 * Uses Redis as Adapter for Socket.io
 *
 */
var init = function (app) {

	var server = require('http').Server(app);
	var io = require('socket.io')(server)



	// Force Socket.io to ONLY use "websockets"; No Long Polling.
	io.set('transports', ['websocket']);

	// Using Redis
	let port = config.redis.port;
	let host = config.redis.host;
	let password = config.redis.password;
	let pubClient = redis(port, host, { auth_pass: password });
	let subClient = redis(port, host, { auth_pass: password, return_buffers: true, });
	io.adapter(adapter({ pubClient, subClient }));

	// Allow sockets to access session data
	io.use((socket, next) => {
		require('../session')(socket.request, {}, next);
	});

	// Define all Events
	ioEvents(io);

	// The server object will be then used to list to a port number
	return server;
}

module.exports = init;

