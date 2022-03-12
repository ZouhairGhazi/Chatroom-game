const socketio = require('socket.io');


module.exports = function (server) {
  // io server
  const io = socketio(server);

  // game state (players list)
  const players = {};
  const sockets = {};

  const SPRITE = 
  { 
    src: "sprite.png", 
    width: 1152, 
    height: 192, 
    rows: 4, 
    cols: 24, 
    stopFrame: 0 
  }

  var FPS = 10;
  var INTERVAL = 1000 / FPS; // milliseconds
  var STEP = INTERVAL / 1000 // seconds

  io.on('connection', function (socket) {
    sockets[socket.id] = socket
    // register new player
    players[socket.id] = {
      socket:socket.id,
      x: 300,
      y: 150,
      size: 20,
      name:'',
      currFrame: 0,
      frameCount: SPRITE.cols,
      stopped: true,
      trackLeft: 0,
      trackRight: 0,
      trackUp: 0,
      trackDown: 0,
      direction: 0,
      srcX: 0,
      srcY: 0,
      width: 0,
      height: 0,
      fps: 0
    };

    socket.on("init",(name, skin) => {
      players[socket.id].name = name;
      players[socket.id].skin = skin;
    });

    // Initializing all parameters that the animation depends upon.
    players[socket.id].currFrame = 0;
    players[socket.id].frameCount = 3;
    players[socket.id].stopped = true;

    players[socket.id].trackRight = 2;
    players[socket.id].trackLeft = 1;
    players[socket.id].trackUp = 3;
    players[socket.id].trackDown = 0;

    players[socket.id].direction = players[socket.id].trackRight
    players[socket.id].width = SPRITE.width / SPRITE.cols;
    players[socket.id].height = SPRITE.height / SPRITE.rows;
    players[socket.id].srcX = players[socket.id].skin * players[socket.id].width;
    players[socket.id].srcY = players[socket.id].direction * players[socket.id].height;

    players[socket.id].speed = 10;


    // The function responsible for collisions and moving players after receiving client-side instructions
    // Could be considered heart of canvas logic.
    function movePlayer(socketId, x, y) {

      for (const [key, value] of Object.entries(players)) {
        if (players[key]['socket'] !== socket.id) {
          console.log("other" + players[key]['socket']);
          console.log("current" + socket.id);
        }

        if (
          players[key]['socket'] !== socket.id &&  Math.abs(players[key]['y']-y)<30 &&  Math.abs(players[key]['x']-x)<40 ) 
          {
            console.log('collision');
            socket.broadcast.to(players[key]['socket']).emit('chat prompt', {player1_socket: players[key]['socket'], player1_username: players[players[key]['socket']].name, player2_socket: socket.id, player2_username: players[socket.id].name});
            io.to(socket.id).emit('chat prompt', {player1_socket: players[key]['socket'], player1_username: players[players[key]['socket']].name, player2_socket: socket.id, player2_username: players[socket.id].name});
          }
          else if(players[key]['socket'] !== socket.id){
          console.log('no collision');
          }
      }

      players[socketId].srcX = players[socket.id].skin * players[socket.id].width + players[socketId].currFrame * players[socketId].width;

      players[socketId].fps += 1;
      //check if equals 60 do the following and reset it to 0
      if (players[socketId].fps > FPS) {
        players[socket.id].currFrame = ++players[socket.id].currFrame % 3;
        players[socketId].fps = 0;
      }

      socket.emit("check collider", x+24, y+48, (response) => {
        if (response.collision === "yes") {
          players[socketId].direction = players[socketId].direction;
          players[socketId].srcY = players[socketId].direction * players[socketId].height;
        }
        else {
          players[socketId].stopped = false;
          players[socketId].direction = players[socketId].direction;
          players[socketId].srcY = players[socketId].direction * players[socketId].height;
          players[socketId].x = x;
          players[socketId].y = y;
        }
      });
    }
    
    socket.on('move left', function () {

      players[socket.id].direction = players[socket.id].trackLeft;

      var x = players[socket.id].x - players[socket.id].speed * STEP;
      var y = players[socket.id].y;

      movePlayer(socket.id, x, y);
    });

    socket.on('move up', function () {

      players[socket.id].direction = players[socket.id].trackUp;

      var x = players[socket.id].x;
      var y = players[socket.id].y -  players[socket.id].speed * STEP;

      movePlayer(socket.id, x, y);

    });

    socket.on('move right', function () {

      players[socket.id].direction = players[socket.id].trackRight;
      var x = players[socket.id].x + players[socket.id].speed * STEP;
      var y = players[socket.id].y;

      movePlayer(socket.id, x, y);
      
    });

    socket.on('move down', function () {

      players[socket.id].direction = players[socket.id].trackDown;

      var x = players[socket.id].x;
      var y = players[socket.id].y +  players[socket.id].speed * STEP;

      movePlayer(socket.id, x, y);
    });

    socket.on('chat invite',function(data){
      console.log('chat invite'+data.player1_socket+' '+data.player2_socket)
      io.to(data.player2_socket).emit('chat accepted',data);
      io.to(data.player1_socket).emit('chat accepted',data);
      
      
      socket.on("chat message",(msg,sender)=>{
        var username =players[sender].name
        io.to(data.player1_socket).emit("chat",msg,sender,username,data);
        io.to(data.player2_socket).emit("chat",msg,sender,username,data);
  
  
      })

    })
    socket.on('chat declined',(data)=>{
      console.log('one player declined the chat');
      io.to(data.id).emit('endchat');
      io.to(data.adversaireSocketId).emit('endchat');

    })
   
    
    // delete disconnected player
    socket.on('disconnect', function () {
      delete players[socket.id];
      console.log('disconnected');
    });
  });
  
  
  
  
  
  function update() {

    io.volatile.emit('players list', Object.values(players));

  }


  setInterval(update, STEP);
};
