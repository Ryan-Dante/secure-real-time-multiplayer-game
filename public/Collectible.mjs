class Collectible {
  constructor(id, value, x, y) {
    this.id = id;
    this.value = value;
    this.x = x;
    this.y = y;
    this.height = 20;
    this.width = 20;
  }
}

try {
  module.exports = Collectible;
} catch (e) { }

export default Collectible;
