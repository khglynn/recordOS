/* globals alert */
/**
 MineSweeper.js
 Author: Michael C. Butler (original)
 Modified for Record OS: Simplified - removed timer, levels, best times
 Added mobile flagging support (long-press + toggle button)

 Original: https://github.com/michaelbutler/minesweeper

 GPL v3 License
 */

var MineSweeper;

jQuery(function ($) {
  'use strict';

  // Fixed configuration: 9x12 grid with editable mine count
  const DEFAULT_BOARD_SIZE = [9, 12];
  const DEFAULT_MINES = 10;
  const MAX_MINES = 107; // 108 cells - 1 safe cell

  // "Static Constants"
  let STATE_UNKNOWN = 'unknown',
    STATE_OPEN = 'open',
    STATE_NUMBER = 'number',
    STATE_FLAGGED = 'flagged',
    STATE_EXPLODE = 'explode',
    STATE_QUESTION = 'question';
  let LEFT_MOUSE_BUTTON = 1,
    RIGHT_MOUSE_BUTTON = 3;

  MineSweeper = function () {
    if (!(this instanceof MineSweeper)) {
      throw 'Invalid use of Minesweeper';
    }
    let msObj = this;
    this.options = {};
    this.grid = [];
    this.running = true;
    this.minesDealt = false;
    this.flagMode = false; // Mobile flag toggle mode
    this.defaults = {
      selector: '#minesweeper',
      boardSize: DEFAULT_BOARD_SIZE,
      numMines: DEFAULT_MINES,
      pathToCellToucher: 'js/cell_toucher.js',
    };

    this.init = function (options) {
      msObj.options = $.extend({}, msObj.defaults, options || {});
      var msUI = $(msObj.options.selector);
      if (!msUI.length) {
        throw 'MineSweeper element not found';
      }
      if (!window.JSON) {
        throw 'This application requires a JSON parser.';
      }
      if ($('.ajax-loading').length < 1) {
        msUI.before('<div class="invisible ajax-loading"></div>');
      }
      msObj.initWorkers(msObj.options.pathToCellToucher);
      msObj.clearBoard();
      msObj.redrawBoard();
      msObj.resetDisplays();
      msObj.initHandlers(msUI);
      msObj.initCleanUpTimer();
      msObj.initMobileHandlers(msUI);
      return msObj;
    };

    this.callWorker = function (taskType, payload) {
      $('.ajax-loading').removeClass('invisible');
      let job = {
        type: taskType,
        grid: msObj.grid,
      };
      if (typeof payload === 'number') {
        job.mines = payload;
      } else if (typeof payload === 'object') {
        job.x = payload.x;
        job.y = payload.y;
      }
      msObj.worker.postMessage(JSON.stringify(job));
    };

    this.initWorkers = function (wPath) {
      if (window.Worker) {
        msObj.worker = new Worker(wPath);
        msObj.worker.onmessage = function (e) {
          let data = JSON.parse(e.data);
          msObj.handleWorkerMessage(data);
        };
      } else {
        alert(
          'Minesweeper requires Web Worker support. ' +
            'See https://browser-update.org/update.html'
        );
      }
    };

    this.initCleanUpTimer = function () {
      setInterval(function () {
        if (
          !msObj.LEFT_MOUSE_DOWN &&
          !msObj.RIGHT_MOUSE_DOWN &&
          msObj.board.find('.cell.test').length > 0
        ) {
          msObj.board.find('.cell').removeClass('test');
        }
      }, 150);
    };

    // Mobile touch support: long-press to flag + toggle button
    this.initMobileHandlers = function (msUI) {
      let longPressTimer = null;
      let longPressTriggered = false;
      let touchHandled = false; // Prevent mouseup from double-firing
      const LONG_PRESS_DURATION = 400; // ms

      // Touch start - begin long-press timer
      msUI.on('touchstart', '.cell', function (ev) {
        let targ = $(ev.target);
        longPressTriggered = false;
        touchHandled = false;

        longPressTimer = setTimeout(function () {
          longPressTriggered = true;
          touchHandled = true;
          // Trigger flag action (same as right-click)
          msObj.handleRightClick(targ);
          // Visual feedback
          targ.addClass('long-press-feedback');
          setTimeout(() => targ.removeClass('long-press-feedback'), 150);
        }, LONG_PRESS_DURATION);
      });

      // Touch end - clear timer and handle tap
      msUI.on('touchend', '.cell', function (ev) {
        let targ = $(ev.target);
        clearTimeout(longPressTimer);

        if (longPressTriggered) {
          // Long-press was triggered, don't do tap action
          ev.preventDefault();
          touchHandled = true;
          return;
        }

        // Regular tap - check flag mode
        if (msObj.flagMode) {
          ev.preventDefault();
          touchHandled = true;
          msObj.handleRightClick(targ);
        } else {
          // Tap to reveal - handle here instead of mouseup to avoid double-fire
          ev.preventDefault();
          touchHandled = true;
          msObj.handleLeftClick(targ);
        }
      });

      // Cancel long-press if user moves finger
      msUI.on('touchmove', '.cell', function () {
        clearTimeout(longPressTimer);
      });

      // Touch cancel
      msUI.on('touchcancel', '.cell', function () {
        clearTimeout(longPressTimer);
      });

      // Prevent mouseup from firing after touch events
      msUI.on('mouseup', '.cell', function (ev) {
        if (touchHandled) {
          ev.preventDefault();
          ev.stopPropagation();
          touchHandled = false;
          return false;
        }
      });

      // Flag mode toggle button handler (also serves as NEW GAME after loss)
      msUI.on('click', '.flag-toggle', function (ev) {
        ev.preventDefault();

        // If game is over, this button becomes NEW GAME
        if (!msObj.running) {
          msObj.running = true;
          msObj.flagMode = false;
          $(this).removeClass('active').text('MARK MINES');
          msObj.setBoardOptions();
          msObj.clearBoard();
          msObj.redrawBoard();
          msObj.resetDisplays();
          return;
        }

        // Normal flag toggle during game
        msObj.flagMode = !msObj.flagMode;
        $(this).toggleClass('active', msObj.flagMode);
      });
    };

    this.initHandlers = function (msUI) {
      msUI.on('contextmenu', '.cell', function (ev) {
        ev.preventDefault();
      });

      msUI.on('mousemove', function (ev) {
        let button = ev.button || 0;
        let buttons = ev.buttons || 0;
        if (button === 0 && buttons === 0) {
          msObj.RIGHT_MOUSE_DOWN = false;
          msObj.LEFT_MOUSE_DOWN = false;
        }
      });

      msUI.on('mousedown', function (ev) {
        if (ev.which === RIGHT_MOUSE_BUTTON) {
          clearTimeout(msObj.RIGHT_BUTTON_TIMEOUT);
          msObj.RIGHT_MOUSE_DOWN = true;
        } else if (ev.which === LEFT_MOUSE_BUTTON) {
          clearTimeout(msObj.LEFT_BUTTON_TIMEOUT);
          msObj.LEFT_MOUSE_DOWN = true;
        }
      });

      msUI.on('mouseup', function (ev) {
        if (ev.which === RIGHT_MOUSE_BUTTON) {
          msObj.RIGHT_BUTTON_TIMEOUT = setTimeout(function () {
            msObj.RIGHT_MOUSE_DOWN = false;
          }, 50);
        } else if (ev.which === LEFT_MOUSE_BUTTON) {
          msObj.LEFT_BUTTON_TIMEOUT = setTimeout(function () {
            msObj.LEFT_MOUSE_DOWN = false;
          }, 50);
        }
      });

      msUI.on('mousedown', '.cell', function (ev) {
        let targ = $(ev.target);
        if (
          (ev.which === LEFT_MOUSE_BUTTON && msObj.RIGHT_MOUSE_DOWN) ||
          (ev.which === RIGHT_MOUSE_BUTTON && msObj.LEFT_MOUSE_DOWN)
        ) {
          let x = targ.attr('data-x') - 1;
          let ud = targ.parent().prev();
          let i;

          for (i = x; i < x + 3; i++) {
            ud.children('.unknown.[data-x=' + i + ']').addClass('test');
          }
          targ.prev('.unknown').addClass('test');
          targ.next('.unknown').addClass('test');
          ud = targ.parent().next();
          for (i = x; i < x + 3; i++) {
            ud.children('.unknown.[data-x=' + i + ']').addClass('test');
          }
        }
      });

      msUI.on('mouseup', '.cell', function (ev) {
        let targ = $(ev.target);
        if (ev.which === LEFT_MOUSE_BUTTON) {
          if (ev.shiftKey || ev.ctrlKey) {
            msObj.MODIFIER_KEY_DOWN = true;
            setTimeout(function () {
              msObj.MODIFIER_KEY_DOWN = false;
            }, 50);
            msObj.handleRightClick(targ);
          } else if (msObj.flagMode) {
            // Flag mode: left click = flag (for mouse users too)
            msObj.handleRightClick(targ);
          } else {
            msObj.handleLeftClick(targ);
          }
        } else if (ev.which === RIGHT_MOUSE_BUTTON) {
          msObj.handleRightClick(targ);
        }
      });

      $('.new-game').on('click', function (ev) {
        ev.preventDefault();
        msObj.running = true;
        msObj.flagMode = false;
        $('.flag-toggle').removeClass('active').text('MARK MINES');
        msObj.setBoardOptions();
        msObj.clearBoard();
        msObj.redrawBoard();
        msObj.resetDisplays();
      });
    };

    this.handleRightClick = function (cell) {
      if (!(cell instanceof jQuery)) {
        throw 'Parameter must be jQuery instance';
      }
      if (!msObj.running) {
        return;
      }
      let obj = msObj.getCellObj(cell);

      if (obj.state === STATE_NUMBER) {
        if (msObj.LEFT_MOUSE_DOWN || msObj.MODIFIER_KEY_DOWN) {
          msObj.callWorker('get_adjacent', obj);
        }
        return;
      }

      if (obj.state === STATE_NUMBER) {
        return;
      }
      if (obj.state === STATE_QUESTION) {
        obj.state = STATE_UNKNOWN;
      } else {
        let flagDisplay = $('#mine_flag_display'),
          curr = parseInt(flagDisplay.val(), 10);
        if (obj.state === STATE_UNKNOWN) {
          obj.state = STATE_FLAGGED;
          flagDisplay.val(curr - 1);
        } else if (obj.state === STATE_FLAGGED) {
          obj.state = STATE_QUESTION;
          flagDisplay.val(curr + 1);
        }
      }
      msObj.drawCell(cell);
    };

    this.handleLeftClick = function (cell) {
      if (!(cell instanceof jQuery)) {
        throw 'Parameter must be jQuery instance';
      }
      if (!msObj.running) {
        return;
      }
      if (!msObj.minesDealt) {
        let x = parseInt(cell.attr('data-x'), 10);
        let y = parseInt(cell.attr('data-y'), 10);
        msObj.assignMines(x, y);
      }

      let obj = msObj.getCellObj(cell);
      if (obj.state === STATE_OPEN || obj.state === STATE_FLAGGED) {
        return;
      }
      if (obj.state === STATE_NUMBER) {
        if (msObj.RIGHT_MOUSE_DOWN) {
          msObj.callWorker('get_adjacent', obj);
        }
        return;
      }

      if (obj.mine) {
        msObj.gameOver(cell);
        return;
      }

      if (msObj.worker) {
        msObj.callWorker('touch_adjacent', obj);
      } else {
        if (!window.touchAdjacent) {
          throw 'Could not load ' + msObj.options.pathToCellToucher;
        }
        msObj.grid = window.touchAdjacent(obj, msObj.grid);
        msObj.redrawBoard();
      }
    };

    this.handleWorkerMessage = function (data) {
      if (data.type === 'touch_adjacent' || data.type === 'get_adjacent') {
        msObj.grid = data.grid;
        msObj.redrawBoard();
      } else if (data.type === 'calc_win') {
        if (data.win) {
          msObj.winGame();
        }
      } else if (data.type === 'explode') {
        let cell = msObj.getJqueryObject(data.cell.x, data.cell.y);
        msObj.gameOver(cell);
      } else if (data.type === 'log') {
        if (console && console.log) {
          console.log(data.obj);
        }
      }
      $('.ajax-loading').addClass('invisible');
    };

    this.getCellObj = function (domObj) {
      let gridobj, x, y;
      try {
        x = parseInt(domObj.attr('data-x'), 10);
        y = parseInt(domObj.attr('data-y'), 10);
        gridobj = msObj.grid[y][x];
      } catch (e) {
        console.warn('Could not find memory representation for:');
        console.log(domObj);
        throw 'Stopped.';
      }

      return gridobj;
    };

    this.getJqueryObject = function (x, y) {
      return msObj.board.find('.cell[data-coord="' + [x, y].join(',') + '"]');
    };

    this.getRandomMineArray = function (safeX, safeY) {
      let width = msObj.options.boardSize[0],
        height = msObj.options.boardSize[1],
        totalMines = msObj.options.numMines,
        array = [],
        x,
        max,
        infiniteLoop = 0;

      for (x = 0, max = width * height; x < max; x++) {
        if (x < totalMines) {
          array[x] = 1;
        } else {
          array[x] = 0;
        }
      }

      function fisherYates(myArray) {
        let i = myArray.length,
          j,
          tempi,
          tempj;
        if (i === 0) {
          return;
        }
        while (--i) {
          j = Math.floor(Math.random() * (i + 1));
          tempi = myArray[i];
          tempj = myArray[j];
          myArray[i] = tempj;
          myArray[j] = tempi;
        }
      }

      let safeIndex = safeX + safeY * width;
      do {
        fisherYates(array);
        infiniteLoop += 1;
        if (infiniteLoop > 999) {
          console.warn(
            'Giving up trying to prevent initial space from blowing up'
          );
          break;
        }
      } while (array[safeIndex] === 1);

      return array;
    };

    // Set board options from mine count input
    this.setBoardOptions = function () {
      let numMines = parseInt($('#numMines').val(), 10);

      // Validate mine count
      if (isNaN(numMines) || numMines < 1) {
        numMines = 1;
      } else if (numMines > MAX_MINES) {
        numMines = MAX_MINES;
      }

      $('#numMines').val(numMines);
      msObj.options.boardSize = DEFAULT_BOARD_SIZE;
      msObj.options.numMines = numMines;
    };

    this.resetDisplays = function () {
      let numMines = msObj.options.numMines;
      $('#mine_flag_display').val(numMines);
    };

    this.assignMines = function (safeX, safeY) {
      if (msObj.minesDealt) {
        return;
      }
      let width = msObj.options.boardSize[0],
        height = msObj.options.boardSize[1],
        mineHat = msObj.getRandomMineArray(safeX, safeY),
        x,
        y,
        z = 0;

      for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
          msObj.grid[y][x].mine = mineHat[z++];
        }
      }

      msObj.minesDealt = true;
    };

    this.clearBoard = function () {
      let width = msObj.options.boardSize[0],
        height = msObj.options.boardSize[1],
        x,
        y;

      msObj.minesDealt = false;
      msObj.grid = [];
      for (y = 0; y < height; y++) {
        msObj.grid[y] = [];
        for (x = 0; x < width; x++) {
          msObj.grid[y][x] = {
            state: STATE_UNKNOWN,
            number: 0,
            mine: 0,
            x: x,
            y: y,
          };
        }
      }

      if (!msObj.board) {
        $(msObj.options.selector)
          .html('')
          .append(msObj.getTemplate('controls'))
          .append('<div class="board-wrap"></div>');
        msObj.board = $('.board-wrap');
        msObj.board
          .attr('unselectable', 'on')
          .css('UserSelect', 'none')
          .css('MozUserSelect', 'none');
      } else {
        msObj.board.html('');
      }
      for (y = 0; y < height; y++) {
        var row = $('<ul class="row" data-index=' + y + '></ul>');
        for (x = 0; x < width; x++) {
          var cell;
          row.append(
            '<li class="cell" data-coord="' +
              [x, y].join(',') +
              '" data-x=' +
              x +
              ' data-y=' +
              y +
              '>x</li>'
          );
          cell = row.find('.cell:last');
          msObj.drawCell(cell);
        }
        msObj.board.append(row);
      }
    };

    this.redrawBoard = function () {
      msObj.board.find('li.cell').each(function (ind, cell) {
        msObj.drawCell($(cell));
      });

      if (msObj.worker) {
        msObj.callWorker('calc_win', msObj.options.numMines);
      } else {
        if (!window.touchAdjacent) {
          throw 'Could not load ' + msObj.options.pathToCellToucher;
        }

        let win = window.minesweeperCalculateWin(msObj.grid);
        if (win) {
          msObj.winGame();
        }
      }
    };

    this.drawCell = function (x, y) {
      let cell = null,
        gridobj;
      if (x instanceof jQuery) {
        cell = x;
        x = parseInt(cell.attr('data-x'), 10);
        y = parseInt(cell.attr('data-y'), 10);
      } else if (typeof x === 'number' && typeof y === 'number') {
        cell = msObj.getJqueryObject(x, y);
      }

      cell.removeClass().addClass('cell');

      try {
        gridobj = msObj.grid[y][x];
      } catch (e) {
        console.warn('Invalid grid coord: x,y = ' + [x, y].join(','));
        return;
      }
      cell.html('');
      cell.attr('data-number', '');
      switch (gridobj.state) {
        case STATE_FLAGGED:
          cell.addClass('ui-icon ui-icon-flag');
          cell.addClass(gridobj.state);
          break;
        case STATE_QUESTION:
          cell.addClass('ui-icon ui-icon-help');
        /* falls through */
        case STATE_UNKNOWN:
        case STATE_OPEN:
        case STATE_EXPLODE:
          cell.addClass(gridobj.state);
          break;
        case STATE_NUMBER:
          cell.addClass('number');
          cell.html(gridobj.number);
          cell.attr('data-number', gridobj.number);
          break;
        default:
          throw 'Invalid gridobj state: ' + gridobj.state;
      }
    };

    this.gameOver = function (cellParam) {
      let width = msObj.options.boardSize[0],
        height = msObj.options.boardSize[1],
        x,
        y;

      if (cellParam) {
        cellParam.removeClass();
        cellParam.addClass('cell ' + STATE_EXPLODE);
      }
      for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
          var obj = msObj.grid[y][x],
            cell = msObj.getJqueryObject(x, y);
          if (obj.mine) {
            cell
              .removeClass('ui-icon-help')
              .addClass('ui-icon ui-icon-close blown');
          } else {
            cell.addClass('unblown');
          }
        }
      }
      msObj.running = false;
      // Change FLAG button to PLAY AGAIN
      $('.flag-toggle').removeClass('active').text('PLAY AGAIN');
    };

    this.winGame = function () {
      msObj.running = false;
      // Change FLAG button to PLAY AGAIN
      $('.flag-toggle').removeClass('active').text('PLAY AGAIN');
      alert('You win!');
    };

    this.getTemplate = function (template) {
      let templates = {
        controls:
          '<div class="game_controls">' +
          '<button class="flag-toggle">MARK MINES</button>' +
          '<div class="mine-count-wrap">' +
          '<label>MINES</label>' +
          '<input type="number" id="numMines" value="10" min="1" max="80" />' +
          '</div>' +
          '<div class="mine-remaining-wrap">' +
          '<label>LEFT</label>' +
          '<input type="text" id="mine_flag_display" value="10" readonly />' +
          '</div>' +
          '</div>',
      };

      return templates[template];
    };
  };
});
