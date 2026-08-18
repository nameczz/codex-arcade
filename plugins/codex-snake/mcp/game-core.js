(function attachSnakeCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SnakeGameCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function makeSnakeCore() {
  "use strict";

  const DIRECTIONS = Object.freeze({
    up: Object.freeze({ x: 0, y: -1 }),
    down: Object.freeze({ x: 0, y: 1 }),
    left: Object.freeze({ x: -1, y: 0 }),
    right: Object.freeze({ x: 1, y: 0 }),
  });

  function sameCell(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function opposite(a, b) {
    return a.x + b.x === 0 && a.y + b.y === 0;
  }

  class SnakeGame {
    constructor(options = {}) {
      this.cols = Number.isInteger(options.cols) ? options.cols : 19;
      this.rows = Number.isInteger(options.rows) ? options.rows : 19;
      this.random = typeof options.random === "function" ? options.random : Math.random;
      if (this.cols < 7 || this.rows < 7) throw new Error("Snake board must be at least 7x7");
      this.reset();
    }

    reset() {
      const x = Math.floor(this.cols / 2);
      const y = Math.floor(this.rows / 2);
      this.snake = [{ x, y }, { x: x - 1, y }, { x: x - 2, y }];
      this.direction = DIRECTIONS.right;
      this.pendingDirection = DIRECTIONS.right;
      this.score = 0;
      this.paused = false;
      this.gameOver = false;
      this.food = this.placeFood();
      return this.snapshot();
    }

    placeFood() {
      const empty = [];
      for (let y = 0; y < this.rows; y += 1) {
        for (let x = 0; x < this.cols; x += 1) {
          if (!this.snake.some((part) => part.x === x && part.y === y)) empty.push({ x, y });
        }
      }
      if (!empty.length) return null;
      const index = Math.min(empty.length - 1, Math.floor(this.random() * empty.length));
      return empty[index];
    }

    turn(name) {
      const next = DIRECTIONS[name];
      if (!next || this.gameOver || opposite(next, this.direction)) return false;
      this.pendingDirection = next;
      return true;
    }

    togglePause() {
      if (this.gameOver) return false;
      this.paused = !this.paused;
      return this.paused;
    }

    step() {
      if (this.paused || this.gameOver) return { ...this.snapshot(), moved: false, ate: false };
      this.direction = this.pendingDirection;
      const head = this.snake[0];
      const next = { x: head.x + this.direction.x, y: head.y + this.direction.y };
      const ate = Boolean(this.food && sameCell(next, this.food));
      const collisionBody = ate ? this.snake : this.snake.slice(0, -1);
      const hitWall = next.x < 0 || next.y < 0 || next.x >= this.cols || next.y >= this.rows;
      const hitSelf = collisionBody.some((part) => sameCell(part, next));
      if (hitWall || hitSelf) {
        this.gameOver = true;
        return { ...this.snapshot(), moved: false, ate: false };
      }
      this.snake.unshift(next);
      if (ate) {
        this.score += 10;
        this.food = this.placeFood();
        if (!this.food) this.gameOver = true;
      } else {
        this.snake.pop();
      }
      return { ...this.snapshot(), moved: true, ate };
    }

    snapshot() {
      return {
        cols: this.cols,
        rows: this.rows,
        snake: this.snake.map((part) => ({ ...part })),
        direction: { ...this.direction },
        food: this.food ? { ...this.food } : null,
        score: this.score,
        paused: this.paused,
        gameOver: this.gameOver,
      };
    }
  }

  return { SnakeGame, DIRECTIONS, sameCell, opposite };
});
