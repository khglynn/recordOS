(function () {
  window.SnakeGame = window.SnakeGame || {};

  var View = SnakeGame.View = function(el) {
    this.$el = $(el);
    this.$board = this.$el.find(".snake-game");
    this.$splash = this.$el.find(".snake-splash");
    this.paused = false;
    this.endGame = false;

    // Only restart buttons (splash screen + start screen), not D-pad
    this.$el.on("click", ".snake-splash button, #start-btn", this.start.bind(this));
  }

  // Callback for external UI to sync pause state
  View.prototype.onPauseChange = null;

  View.DIRECTIONS = [
    [38, "N"],
    [39, "E"],
    [40, "S"],
    [37, "W"]
  ];

  View.prototype.start = function (e) {
    e && e.preventDefault();

    this.endGame = false;
    this.board = new SnakeGame.Board();
    this.player = this.board.player;
    this.opponent = this.board.opponent; // Will be null in single player

    this.renderBoard();
    this.bindKeyHandlers();
    this.$splash.hide().find("span").empty();
    setTimeout(this.moveSnakes.bind(this), this.pace());
  }

  View.prototype.moveSnakes = function () {
    // Don't process if game already ended
    if (this.endGame) return;

    if (!this.paused) {
      this.moveSnake(this.player);
      // Only move opponent if it exists (multiplayer mode)
      if (this.opponent) {
        this.moveSnake(this.opponent);
      }
      this.renderApple();
      this.$el.find(".snake-score").text("Score: " + this.player.score);
    }
    if (this.board.isOver()) {
      this.gameOver();
    } else {
      setTimeout(this.moveSnakes.bind(this), this.pace());
    }
  }

  View.prototype.pace = function () {
    // Comfortable starting pace - speeds up gradually as snake grows
    var baseSpeed = 225;  // 225ms between moves (was 175ms - too fast)
    var speedIncrease = Math.floor(this.player.segments.length / 3) * 5;
    return Math.max(90, baseSpeed - speedIncrease);  // Min 90ms (was 70ms)
  }

  View.prototype.renderBoard = function () {
    this.$board.children("ul").remove();
    var view = this;
    var board = this.board.render();

    board.forEach(function (row) {
      view.$board.append(row);
    });
  }

  View.prototype.moveSnake = function (snake) {
    snake.move();
    this.renderSnakeSegments(snake);
  }

  View.prototype.renderSnakeSegments = function (snake) {
    this.$board.find("li").removeClass(snake.tagName);
    var $board = this.$board;

    snake.segments.forEach(function (pos) {
      var id = "#" + pos[0] + "-" + pos[1];
      $board.find(id).addClass(snake.tagName);
    });
  }

  View.prototype.renderApple = function () {
    this.$board.find("li").removeClass("apple");

    var applePos = this.board.applePos;
    var id = "#" + applePos[0] + "-" + applePos[1];
    this.$board.find(id).addClass("apple");
  }

  View.prototype.bindKeyHandlers = function () {
    $("body").off("keydown");
    $("body").on("keydown", this._onKeydown.bind(this));
  }

  View.prototype.gameOver = function () {
    this.endGame = true;
    var $splash = this.$splash.show().find("span");
    var playerWon = (this.board.winner === this.player);
    var status = playerWon ? "// VICTORY //" : "// TERMINATED //";
    var finalScore = this.player.score;

    // Terminal-style game over screen
    var $box = $("<div>").addClass("terminal-box");
    var $title = $("<div>").addClass("terminal-title").text(status);
    var $stats = $("<div>").addClass("terminal-text").html(
      '<span class="prompt">&gt;</span> FINAL SCORE: ' + finalScore
    );
    var $button = $("<button>").addClass("terminal-btn").text("REINITIALIZE");

    $box.append($title, $stats, $button);
    $splash.append($box);
    this._endGame();
  }

  View.prototype._endGame = function () {
    // Only continue opponent animation if opponent exists and is alive
    if (this.opponent && !this.opponent.isDead) {
      this.moveSnake(this.opponent);
      this.renderApple();
      if (this.endGame) {
        setTimeout(this._endGame.bind(this), this.pace());
      }
    }
  }

  View.prototype._onKeydown = function (e) {
    e.preventDefault();
    var view = this;

    View.DIRECTIONS.forEach(function (dir) {
      if (e.keyCode == dir[0]) {
        view.player.changeDir(dir[1]);
      }
    });

    if (e.keyCode == 32) {
      if (view.board.isOver()) { return; }
      if (view.paused) {
        view.resume();
      } else {
        view.pause();
      }
    }
  }

  View.prototype.pause = function () {
    if (this.paused || this.endGame) return;
    this.paused = true;

    // Show pause screen with terminal styling
    var $splash = this.$splash.show().find("span");
    $splash.empty();

    var $box = $("<div>").addClass("terminal-box");
    var $title = $("<div>").addClass("terminal-title").text("// PAUSED //");
    var $text = $("<div>").addClass("terminal-text").html(
      '<span class="prompt">&gt;</span> PRESS SPACE TO RESUME'
    );
    var $button = $("<button>").addClass("terminal-btn").text("RESUME");

    $box.append($title, $text, $button);
    $splash.append($box);

    // Notify external UI
    if (this.onPauseChange) {
      this.onPauseChange(true);
    }
  }

  View.prototype.resume = function () {
    if (!this.paused) return;
    this.paused = false;
    this.$splash.hide().find("span").empty();

    // Notify external UI
    if (this.onPauseChange) {
      this.onPauseChange(false);
    }
  }

})();
