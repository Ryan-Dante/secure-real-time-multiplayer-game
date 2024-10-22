class Player {
    constructor(id, x, y) {
        this.id = id;
        this.score = 0;
        this.x = x;
        this.y = y;
    }

    movePlayer(direction, amount) {
        switch (direction) {
            case 'up':
                this.y -= amount;
                break;
            case 'down':
                this.y += amount;
                break;
            case 'left':
                this.x -= amount;
                break;
            case 'right':
                this.x += amount;
                break;
        }
    }

    calculateRank(players) {
        // Convert the object of players into an array of player objects
        const playerArray = Object.values(players);
    
        // Sort the array based on the players' scores
        const sortedPlayers = playerArray.sort((a, b) => b.score - a.score);
    
        // Find the current player's rank
        const currentRank = sortedPlayers.findIndex(p => p.id === this.id) + 1;
    
        // Return rank in the form "Rank: currentRank/totalPlayers"
        return `Rank: ${currentRank}/${sortedPlayers.length}`;
    }

    collision(collectible) {
        if (this.x < collectible.x + collectible.width &&
            this.x + 50 > collectible.x &&
            this.y < collectible.y + collectible.height &&
            this.y + 50 > collectible.y) {
            return true;
        }
    }
}

try {
    module.exports = Player;
  } catch (e) { }
  
export default Player;