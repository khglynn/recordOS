(function () {
  window.SnakeGame = window.SnakeGame || {};

  var Board = SnakeGame.Board = function (options) {
    options = options || {};

    this.height = options.height || Board.HEIGHT;
    this.width = options.width || Board.WIDTH;
    this.player = options.player || new SnakeGame.Snake(this);
    // Single player mode - no AI opponent
    this.opponent = options.opponent || null;

    this.placeApple();
  };

  Board.HEIGHT = 20;
  Board.WIDTH = 20;

  Board.prototype.placeApple = function () {
    var emptySpaces = this.emptySpaces();
    var randomSpaceIdx = Math.floor(Math.random() * emptySpaces.length);

    this.applePos = emptySpaces[randomSpaceIdx];
  };

  Board.prototype.emptySpaces = function () {
    var emptySpaces = [];

    for (row = 0; row < this.height; row++) {
      for (col = 0; col < this.width; col++) {
        var pos = [row, col];
        var segments = this.player.segments;
        // Include opponent segments only if opponent exists
        if (this.opponent) {
          segments = segments.concat(this.opponent.segments);
        }

        if (!SnakeGame.Util.samePos(this.applePos, pos) &&
            !SnakeGame.Util.inSegments(segments, pos)) {
          emptySpaces.push([row, col]);
        }
      }
    }
    return emptySpaces;
  }

  Board.prototype.render = function () {
    var board = [];

    for (row = 0; row < this.height; row++) {
      board[row] = $("<ul>").addClass("snake-row").addClass("group");

      for (col = 0; col < this.width; col++) {
        var pos = row + "-" + col;
        var $li = $("<li>").attr("id", pos);

        board[row].append($li);
      }
    }
    return board;
  }

  Board.prototype.inRange = function (pos) {
    return (pos[0] >= 0 && pos[0] < this.height) &&
           (pos[1] >= 0 && pos[1] < this.width);
  }

  Board.prototype.winner = function () {
    if (this.player.isDead) {
      return this.opponent || { name: 'wall' }; // Player lost
    } else if (this.opponent && this.opponent.isDead) {
      return this.player;
    }
    return null;
  }

  Board.prototype.isOver = function () {
    return this.player.isDead || (this.opponent && this.opponent.isDead);
  }

})();
