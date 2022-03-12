const socket = io();
var socketId;
socket.on('connect', () => {
  // Retrieve the id from current socket, will serve as an id in the database represented as a server-side list.
  socketId = socket.id;
});

// Different contexts, in order to draw the map and treat its collision seperately
var colliderCtx;
var MapCtx;

// Importing the map, collider map and the sprite sheet.
const MAP = { src: "map.png", collider: "collider.png", width: 800, height: 640 }
const SPRITE = { src: "sprite.png", width: 192, height: 1152, rows: 4, cols: 24, stopFrame: 0 }
const ctx = document.getElementById("canvas").getContext('2d');

// The game settings, determining how many times an update will take place, thus the smoothness of the animations.
var FPS = 10;
var INTERVAL = 1000 / FPS; // milliseconds
var STEP = INTERVAL / 1000 // seconds

var collider = new Image()
collider.src = MAP.collider
collider.onload = function () {
  var ctx2 = document.createElement("canvas").getContext("2d");
  ctx2.canvas.width = MAP.width;
  ctx2.canvas.height = MAP.height;
  ctx2.drawImage(collider, 0, 0, MAP.width, MAP.height);
  colliderCtx = ctx2
}

// This list will be populated by the updated list called upon from server-side.
let players = [];

var map = new Image()
map.src = MAP.src

map.onload = function () {
  ctx.drawImage(map, 0, 0, MAP.width, MAP.height);
}

// Making a function to be able to call it in every update
function drawMap(){
  ctx.drawImage(map, 0, 0, MAP.width, MAP.height);
}

var sprite = new Image();
sprite.src = SPRITE.src;

socket.on('new player', (name) => {
  alert(name + " has just joined us!");
})

// We wait for server to update player list
socket.on('players list', function (list) {
  players = list;
});

// Iterates over list of players and draws each one of them, with the name on top.
function drawPlayers() {
  players.forEach(function ({ x, y, srcX, srcY, width, height, name }) {
    //console.log(x, y)
    ctx.drawImage(sprite, srcX, srcY, width, height, x, y, width, height);
    ctx.font = '14px bold';
    ctx.strokeText(name, x - 4, y - 10);

  });
}

const keyboard = {};

//adds key to keyboard while pressed
window.onkeydown = function (e) {
  keyboard[e.key] = true;
};

//removes key from keyboard once its released
window.onkeyup = function (e) {
  delete keyboard[e.key];
};

// server side would emit coordinates to check if they violate the boundaries of the map collider
socket.on("check collider", (x, y, callback) => {
  var collision = "no";
  if (colliderCtx.getImageData(x, y, 1, 1).data[0] === 255 || x < 24 || x > 776 || y < 24 || y > 616) {
    collision = "yes";
  }
  callback({
    collision: collision
  });
});

//checks for input from keyboard and notifies server to move the player by socket id
function movePlayer() {
  if (keyboard['ArrowLeft']) {
    socket.emit('move left');
  }
  if (keyboard['ArrowUp']) {
    socket.emit('move up');
  }
  if (keyboard['ArrowRight']) {
    socket.emit('move right');
  }
  if (keyboard['ArrowDown']) {
    socket.emit('move down');
  }
}

//game update function loop
function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();
  drawPlayers();
  movePlayer();
  requestAnimationFrame(update);
}

// first call
requestAnimationFrame(update);

// Function to send message chat
function sendMessage() {
  var message = document.getElementById("message-input")
  if (message.value != "") {
    console.log(message.value + " sent")
    socket.emit("chat message", message.value);
    message.value = "";
  }
}
socket.on('chat message', function (msg, name) {
  var messages = document.getElementById('messages');
  var item = document.createElement('li');
  const d = new Date();
  let hour = d.getHours();
  let min = d.getMinutes();
  item.textContent = hour+':'+min +' '+name + ": " + msg;
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
});



