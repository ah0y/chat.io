'use strict';

var app = {


  rooms: function () {

    var socket = io('/rooms', { transports: ['websocket'] });

    getLocation()

    // When socket connects, get a list of chatrooms
    socket.on('connect', function () {

      socket.on('currentUser', function (user) {
        console.log(`user is ${user}`)

        $("body").on("click", '#chatFriend', function (e) {
          var friend = e.target.parentNode.childNodes[1].href.split('/users/')[1]
          var friendDM = [friend, user].sort().join().replace(',', '')
          console.log(friendDM)
          socket.emit('createRoom', friendDM);
          socket.on('joinDM', function (room) {
            window.location.href = `chat/${room}`
          })
        })

      }
      )

      $("body").on("click", '#addFriend', function (e) {
        console.log(e.target.parentNode.childNodes[1].href.split('/users/')[1]);
        socket.emit('friendRequest', e.target.parentNode.childNodes[1].href.split('/users/')[1])
      })

      socket.emit('locate', x)

      socket.on('updateUsersList', function (users, clear) {

        $('.container p.message').remove();
        if (users.error != null) {
          $('.container').html(`<p class="message error">${users.error}</p>`);
        } else {
          app.helpers.updateUsersList(users, clear);
        }
      });

      // Update rooms list upon emitting updateRoomsList event
      socket.on('updateRoomsList', function (room) {

        // Display an error message upon a user error(i.e. creating a room with an existing title)
        $('.room-create p.message').remove();
        if (room.error != null) {
          $('.room-create').append(`<p class="message error">${room.error}</p>`);
        } else {
          app.helpers.updateRoomsList(room);
        }
      });
    });
  },

  profile: function () {
    var socket = io('/profile', { transports: ['websocket'] })
    var closebtns = document.getElementsByClassName("close");
    var i;
    var ev;
    for (i = 0; i < closebtns.length; i++) {
      closebtns[i].addEventListener("click", function (e) {
        console.log(e.srcElement.parentElement.innerText.split(' ×')[0])
        socket.emit('updateLikes', e.srcElement.parentElement.innerText.split(' ×')[0])
        this.parentElement.style.display = 'none';
      });
    }
  },

  friends: function () {
    var socket = io('/friends', { transports: ['websocket'] })

    socket.on('connect', function () {
      console.log('we made it')

    })

    socket.on('currentUser', function (user) {
      console.log(`user is ${user}`)

      $("body").on("click", '#chatFriend', function (e) {
        var friend = e.target.parentNode.childNodes[1].href.split('/users/')[1]
        var friendDM = [friend, user].sort().join().replace(',', '')
        console.log(friendDM)
        socket.emit('createRoom', friendDM);
        socket.on('joinDM', function (room) {
          window.location.href = `chat/${room}`
        })
      })

    }
    )



    socket.on('updateFriendsList', function (users, clear) {

      $('.container p.message').remove();
      if (users.error != null) {
        $('.container').html(`<p class="message error">${users.error}</p>`);
      } else {
        app.helpers.updateFriendsList(users, clear);
      }
    });

  },

  chat: function (roomId, username) {

    var socket = io('/chatroom', { transports: ['websocket'] });

    // When socket connects, join the current chatroom
    socket.on('connect', function () {

      socket.emit('join', roomId);

      // Update users list upon emitting updateUsersList event
      socket.on('updateUsersList', function (users, clear) {

        $('.container p.message').remove();
        if (users.error != null) {
          $('.container').html(`<p class="message error">${users.error}</p>`);
        } else {
          app.helpers.updateUsersList(users, clear);
        }
      });

      // Whenever the user hits the save button, emit newMessage event.
      $(".chat-message button").on('click', function (e) {

        var textareaEle = $("textarea[name='message']");
        var messageContent = textareaEle.val().trim();
        if (messageContent !== '') {
          var message = {
            content: messageContent,
            username: username,
            date: Date.now()
          };

          socket.emit('newMessage', roomId, message);
          textareaEle.val('');
          app.helpers.addMessage(message);
        }
      });

      document.querySelector("body").addEventListener("keyup", event => {
        event.preventDefault(); 
        if (event.key == "Enter") 
        document.querySelector(".chat-message button").click(); // Things you want to do.
      });

      // Whenever a user leaves the current room, remove the user from users list
      socket.on('removeUser', function (userId) {
        $('li#user-' + userId).remove();
        app.helpers.updateNumOfUsers();
      });

      // Append a new message 
      socket.on('addMessage', function (message) {
        app.helpers.addMessage(message);
      });
    });
  },

  helpers: {

    encodeHTML: function (str) {
      return $('<div />').text(str).html();
    },

    // Update rooms list
    updateRoomsList: function (room) {
      room.title = this.encodeHTML(room.title);
      var html = `<a href="/chat/${room._id}"><li class="room-item">${room.title}</li></a>`;

      if (html === '') { return; }

      if ($(".room-list ul li").length > 0) {
        $('.room-list ul').prepend(html);
      } else {
        $('.room-list ul').html('').html(html);
      }

      this.updateNumOfRooms();
    },

    // Update users list
    updateUsersList: function (users, clear) {
      if (users.constructor !== Array) {
        users = [users];
      }

      var html = '';
      for (var user of users) {
        user.username = this.encodeHTML(user.username);
        html += `<li class="clearfix" id="user-${user._id}">
                      <img src="${user.hidden}" alt="${user.username}" />
                     <div class="about">
                        <a href = "/users/${user._id}"</a>
                          <div class="name">${user.username}
                          </div>   
                        </a>       
                        <div class="status"><i class="fa fa-circle online"></i> online</div>
                        <button type="button" id="addFriend" style=color:'white'>Add</button>
                        <button type="button" id="chatFriend" style=color:'white'>Chat</button>
                     </div>

                     </li>`;
      }

      if (html === '') { return; }

      if (clear != null && clear == true) {
        $('.users-list ul').html('').html(html);
      } else {
        $('.users-list ul').prepend(html);
      }

      this.updateNumOfUsers();
    },

    updateFriendsList: function (users, clear) {
      if (users.constructor !== Array) {
        users = [users];
      }

      var html = '';
      for (var user of users) {
        user.username = this.encodeHTML(user.username);
        html += `<li class="clearfix" id="user-${user._id}">
                      <img src="${user.picture}" alt="${user.username}" />
                     <div class="about">
                        <a href = "/users/${user._id}"</a>
                          <div class="name">${user.username}
                          </div>   
                        </a>       
                        <div class="status"><i class="fa fa-circle online"></i> online</div>
                        <button type="button" id="addFriend" style=color:'white'>Add</button>
                        <button type="button" id="chatFriend" style=color:'white'>Chat</button>
                     </div>

                     </li>`;
      }

      if (html === '') { return; }

      if (clear != null && clear == true) {
        $('.users-list ul').html('').html(html);
      } else {
        $('.users-list ul').prepend(html);
      }

      this.updateNumOfUsers();
    },

    // Adding a new message to chat history
    addMessage: function (message) {
      message.date = (new Date(message.date)).toLocaleString();
      message.username = this.encodeHTML(message.username);
      message.content = this.encodeHTML(message.content);

      var html = `<li>
                    <div class="message-data">
                      <span class="message-data-name">${message.username}</span>
                      <span class="message-data-time">${message.date}</span>
                    </div>
                    <div class="message my-message" dir="auto">${message.content}</div>
                  </li>`;
      $(html).hide().appendTo('.chat-history ul').slideDown(50);

      // Keep scroll bar down
      $(".chat-history").animate({ scrollTop: $('.chat-history')[0].scrollHeight }, 1000);
    },

    // Update number of rooms
    // This method MUST be called after adding a new room
    updateNumOfRooms: function () {
      var num = $('.room-list ul li').length;
      $('.room-num-rooms').text(num + " Room(s)");
    },

    // Update number of online users in the current room
    // This method MUST be called after adding, or removing list element(s)
    updateNumOfUsers: function () {
      var num = $('.users-list ul li').length;
      $('.chat-num-users').text(num + " User(s)");
    }


  }
};




var x = 'location';

function getLocation() {
  // console.log('called')
  if (navigator.geolocation) {
    // console.log('navigator present')
    navigator.geolocation.getCurrentPosition(showPosition);
  } else {
    x = "Geolocation is not supported by this browser.";
  }
}
function showPosition(position) {
  // console.log('show position called')
  x = position.coords.latitude +
    "," + position.coords.longitude
}






