import Player from './Player.mjs';
import Collectible from './Collectible.mjs';

const canvas = document.getElementById('game-window');
const ctx = canvas.getContext('2d');

// Canvas dimensions
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

// Initialize socket connection
const socket = io();

// Game state
let player;
let players = {};
let collectibles = [];
let score = 0;

// Game logic to update player positions and check collisions
function gameLogic() {
    // Update player positions and handle boundary restrictions
    for (const id in players) {
        const player = players[id];

        // Restrict player movement within canvas bounds
        if (player.x < 0) player.x = 0;
        if (player.x > canvasWidth - 30) player.x = canvasWidth - 30;
        if (player.y < 0) player.y = 0;
        if (player.y > canvasHeight - 30) player.y = canvasHeight - 30;

        // Check collision with collectibles
        collectibles.forEach((collectible, index) => {
            if (player.collision(collectible)) {
                // Increase player's score
                player.score++;

                // Remove the collectible
                collectibles.splice(index, 1);

                // Notify server to spawn a new collectible
                socket.emit('collectibleCollected');
            }
        });
    }
}

// Game loop to continuously update the game state and render
function gameLoop() {
    gameLogic(); // Update game state
    render();    // Render the updated state
    requestAnimationFrame(gameLoop); // Call the loop again
}

// Receive player data from server
socket.on('connect', () => {
    const connectionInfo = document.getElementById('connection-info');
    connectionInfo.textContent = `You are connected with socket id ${socket.id}`;
  
    // Emit the new player object to the server (when the client connects)
    socket.emit('updatePlayer', { playerObj: player });

    render(); // Start the rendering loop
});

// Update players data from server
socket.on('updatePlayers', (serverPlayers) => {
    players = {};
    for (const id in serverPlayers) {
        const playerData = serverPlayers[id];
        // Recreate player as an instance of Player with proper methods
        players[id] = new Player(playerData.id, playerData.x, playerData.y);
        players[id].score = playerData.score;
    }

    // Set the local player using the current socket id
    if (players[socket.id]) {
        player = players[socket.id];
    }
});

// Update collectibles data from server
socket.on('updateCollectibles', (serverCollectibles) => {
    collectibles = serverCollectibles;
});

function render() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Clear the canvas

    // Only render if players exist
    if (Object.keys(players).length === 0) return;

    // Render players
    for (const id in players) {
        const player = players[id];

        ctx.fillStyle = id === socket.id ? 'blue' : 'red'; // Local player in blue, others in red
        ctx.fillRect(player.x, player.y, 30, 30); // Draw each player
    }

    // Render collectibles
    collectibles.forEach(collectible => {
        ctx.fillStyle = 'gold';
        ctx.fillRect(collectible.x, collectible.y, 20, 20); // Draw each collectible
    });

    // Render player's score and rank
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';

    const playerScore = player?.score || 0;
    ctx.fillText(`Score: ${playerScore}`, 10, 20);

    const scores = Object.values(players).map(p => p.score || 0).sort((a, b) => b - a);
    const rank = scores.indexOf(playerScore) + 1;
    const numberOfPlayers = Object.keys(players).length;
    ctx.fillText(`Rank: ${rank} / ${numberOfPlayers}`, 10, 50);
}

// Handle player movement (key press)
window.addEventListener('keydown', (event) => {
    let direction;
    switch (event.key) {
        case 'w': case 'ArrowUp': direction = 'up'; break;
        case 's': case 'ArrowDown': direction = 'down'; break;
        case 'a': case 'ArrowLeft': direction = 'left'; break;
        case 'd': case 'ArrowRight': direction = 'right'; break;
        default: return; // Do nothing if the key is not a movement key
    }

    // Emit player movement to server
    socket.emit('move', direction, 50);
});

// Start the game loop
gameLoop();
