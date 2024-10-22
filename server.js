require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const expect = require('chai');
const cors = require('cors');
const helmet = require('helmet');
const socketIO = require('socket.io');
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');
const Player = require('./public/Player.mjs');
const Collectible = require('./public/Collectible.mjs');

const app = express();

app.use('/public', express.static(process.cwd() + '/public'));
app.use('/assets', express.static(process.cwd() + '/assets'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// For FCC testing purposes and enables user to connect from outside the hosting platform
app.use(cors({ origin: '*' }));

// Set up security with helmet
app.use(helmet({
  noCache: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: { setTo: 'PHP 7.4.3' },
  noSniff: true,
  xssFilter: true
}));

// Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

// Error handling
app.use((err, req, res, next) => {
  if (err) {
    res.status(500).type('text').send('Internal Server Error');
  }
});

// For FCC testing purposes
fccTestingRoutes(app);

// 404 Not Found Middleware
app.use(function (req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

const portNum = process.env.PORT || 3000;

// Set up server and tests
const server = app.listen(portNum, () => {
  console.log(`Listening on port ${portNum}`);
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (error) {
        console.log('Tests are not valid:');
        console.error(error);
      }
    }, 1500);
  }
});

// Server side socket events
const io = socketIO(server);

const canvasWidth = 800;
const canvasHeight = 600;

let players = {};
let collectibles = [];

// Function to generate a single collectible
function generateCollectible() {
    const collectible = new Collectible(
        Date.now().toString(), // Unique ID for collectible
        Math.floor(Math.random() * 10) + 1, // Some value for the collectible
        Math.random() * (canvasWidth - 20), // Random x position
        Math.random() * (canvasHeight - 20), // Random y position
    );
    return collectible;
}

// Function to spawn a collectible if less than 2 are on screen
function spawnCollectible() {
    if (collectibles.length < 2) {
        collectibles.push(generateCollectible());
        updateCollectibles(); // Update clients with the new collectible
    }
}

// Emit collectibles to clients
function updateCollectibles() {
    io.emit('updateCollectibles', collectibles);
}

// Generate initial collectibles
for (let i = 0; i < 2; i++) {
  collectibles.push(generateCollectible());
}

// Detect when a player picks up a collectible
function checkCollectiblePickup(player) {
    for (let i = 0; i < collectibles.length; i++) {
        if (player.collision(collectibles[i])) {
            // Increase player's score
            player.score++;
            // Remove collected collectible
            collectibles.splice(i, 1);
            // Spawn a new collectible
            spawnCollectible();
            break; // Exit the loop once a collectible is picked up
        }
    }
}

// When a player connects
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Create a new player
    players[socket.id] = new Player(socket.id, Math.random() * canvasWidth, Math.random() * canvasHeight);
    players[socket.id].score = 0; // Initialize player score

    // Send initial game state to player
    socket.emit('updatePlayers', players);
    socket.emit('updateCollectibles', collectibles);

    // Handle player movement
    socket.on('move', (direction, amount) => {
        const player = players[socket.id];
        player.movePlayer(direction, amount);
        checkCollectiblePickup(player); // Check if player picked up a collectible
        io.emit('updatePlayers', players); // Notify all players of the updated positions
        io.emit('updateCollectibles', collectibles); // Notify all players of the updated collectibles
    });

    // When a player picks up a collectible
    socket.on('collectibleCollected', () => {
        spawnCollectible(); // Spawn a new collectible
        io.emit('updateCollectibles', collectibles); // Notify all players of the updated collectibles
    });

    // When player disconnects
    socket.on('disconnect', () => {
        delete players[socket.id];
        console.log(`Player disconnected: ${socket.id}`);
        io.emit('playerDisconnected', socket.id);
        io.emit('updatePlayers', players); // Notify all players of the updated players list
    });
});

module.exports = app; // For testing
