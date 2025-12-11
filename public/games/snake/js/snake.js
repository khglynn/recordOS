(function () {
  window.SnakeGame = window.SnakeGame || {};

  var Snake = SnakeGame.Snake = function (board) {
    this.score = 0;
    this.dir = "S";
    this.tagName = "snake";
    this.segments = [[4, 4], [4, 5], [5, 5]];
    this.board = board;
    this.dirQueue = []; // Queue for rapid direction changes
  }

  Snake.prototype.currentPos = function () {
    return this.segments[(this.segments.length - 1)];
  }

  Snake.prototype.nextPos = function (dir) {
    dir = dir || this.dir;
    return SnakeGame.Util.add(this.currentPos(), dir);
  }

  Snake.prototype.move = function () {
    // Process direction queue - apply first valid direction
    while (this.dirQueue.length > 0) {
      var nextDir = this.dirQueue.shift();
      if (this.safeMove(this.nextPos(nextDir))) {
        this.dir = nextDir;
        break; // Apply one direction per move tick
      }
    }

    var nextPos = this.nextPos();

    if (!this.safeMove(nextPos)) {
      this.isDead = true;
      return;
    }

    if (SnakeGame.Util.samePos(nextPos, this.board.applePos)) {
      this.incrementScore();
      this.board.placeApple();
    } else {
      this.segments.shift();
    }
    this.segments.push(nextPos);
  }

  Snake.prototype.changeDir = function (dir) {
    if (!SnakeGame.Util.DIRECTIONS[dir]) { return; }
    // Queue direction changes for processing on next move tick
    // This allows rapid inputs to be buffered instead of lost
    if (this.dirQueue.length < 3) {
      this.dirQueue.push(dir);
    }
  }

  Snake.prototype.safeMove = function (pos) {
    var segments = this.segments;
    // Include opponent segments only if opponent exists
    if (this.board.opponent) {
      segments = segments.concat(this.board.opponent.segments);
    }
    return this.board.inRange(pos) &&
      !SnakeGame.Util.inSegments(segments, pos);
  }

  Snake.prototype.incrementScore = function () {
    this.score += (this.segments.length - 2) * 5;
  }

})();
