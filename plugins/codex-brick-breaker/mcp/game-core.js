(function attachBrickBreakerCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BrickBreakerCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function makeBrickBreakerCore() {
  "use strict";

  const WIDTH = 720;
  const HEIGHT = 900;
  const LEVELS = Object.freeze([
    Object.freeze([
      "1111111111", "1222222221", "1333333331", "1444444441", "0110110110",
    ]),
    Object.freeze([
      "1000000001", "2200000022", "0330000330", "0044004400", "0001111000", "0012222100",
    ]),
    Object.freeze([
      "1111111111", "0202020202", "3030303030", "0444444440", "0033333300", "0002222000",
    ]),
  ]);

  const COLORS = Object.freeze(["#376cff", "#ff6c68", "#ffc247", "#52ddb0"]);

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function circleHitsRect(ball, rect) {
    const x = clamp(ball.x, rect.x, rect.x + rect.w);
    const y = clamp(ball.y, rect.y, rect.y + rect.h);
    const dx = ball.x - x;
    const dy = ball.y - y;
    return dx * dx + dy * dy <= ball.r * ball.r;
  }

  function buildBricks(levelIndex) {
    const layout = LEVELS[levelIndex % LEVELS.length];
    const gap = 10;
    const margin = 42;
    const top = 146;
    const w = (WIDTH - margin * 2 - gap * 9) / 10;
    const h = 34;
    const bricks = [];
    layout.forEach((row, rowIndex) => {
      [...row].forEach((cell, colIndex) => {
        const value = Number(cell);
        if (!value) return;
        const special = (rowIndex * 7 + colIndex * 3 + levelIndex) % 11 === 0;
        bricks.push({
          x: margin + colIndex * (w + gap), y: top + rowIndex * (h + gap), w, h,
          color: COLORS[value - 1], hits: special ? 2 : 1, maxHits: special ? 2 : 1,
          special, alive: true, row: rowIndex, col: colIndex,
        });
      });
    });
    return bricks;
  }

  class BrickBreakerGame {
    constructor(options = {}) {
      this.random = typeof options.random === "function" ? options.random : Math.random;
      this.width = WIDTH;
      this.height = HEIGHT;
      this.bestScore = Number.isFinite(options.bestScore) ? Math.max(0, options.bestScore) : 0;
      this.reset();
    }

    reset() {
      this.score = 0;
      this.level = 0;
      this.lives = 3;
      this.gameOver = false;
      this.wonLevel = false;
      this.paused = false;
      this.combo = 0;
      this.events = [];
      this.loadLevel(0);
      return this.snapshot();
    }

    loadLevel(level) {
      this.level = level;
      this.bricks = buildBricks(level);
      this.paddle = { x: WIDTH / 2 - 58, y: HEIGHT - 86, w: 116, h: 16, speed: 600 };
      this.ball = { x: WIDTH / 2, y: this.paddle.y - 11, vx: 0, vy: 0, r: 8, stuck: true };
      this.wonLevel = false;
      this.paused = false;
      this.combo = 0;
      this.events.push({ type: "level", level: level + 1 });
    }

    restartLevel() {
      if (this.gameOver) return this.reset();
      this.loadLevel(this.level);
      return this.snapshot();
    }

    setPaddleCenter(x) {
      if (!Number.isFinite(x)) return;
      this.paddle.x = clamp(x - this.paddle.w / 2, 18, WIDTH - 18 - this.paddle.w);
      if (this.ball.stuck) this.ball.x = this.paddle.x + this.paddle.w / 2;
    }

    movePaddle(direction, dt) {
      const sign = Math.sign(direction);
      if (!sign || !Number.isFinite(dt)) return;
      this.setPaddleCenter(this.paddle.x + this.paddle.w / 2 + sign * this.paddle.speed * dt);
    }

    launch() {
      if (this.gameOver || !this.ball.stuck) return false;
      const nudge = (this.random() - 0.5) * 90;
      this.ball.vx = (this.level % 2 ? -220 : 220) + nudge;
      this.ball.vy = -470 - Math.min(this.level, 5) * 18;
      this.ball.stuck = false;
      this.paused = false;
      this.events.push({ type: "launch" });
      return true;
    }

    togglePause() {
      if (this.gameOver || this.ball.stuck) return false;
      this.paused = !this.paused;
      this.events.push({ type: this.paused ? "pause" : "resume" });
      return this.paused;
    }

    spaceAction() {
      return this.ball.stuck ? this.launch() : this.togglePause();
    }

    ensurePlayableVelocity() {
      if (this.ball.stuck) return;
      const speed = Math.hypot(this.ball.vx, this.ball.vy);
      if (speed < 420) {
        const scale = 420 / Math.max(speed, 1);
        this.ball.vx *= scale;
        this.ball.vy *= scale;
      }
      if (Math.abs(this.ball.vy) < 170) this.ball.vy = (this.ball.vy < 0 ? -1 : 1) * 170;
      if (Math.abs(this.ball.vx) < 75) this.ball.vx = (this.ball.vx < 0 ? -1 : 1) * 75;
      const cap = 680;
      const after = Math.hypot(this.ball.vx, this.ball.vy);
      if (after > cap) {
        this.ball.vx *= cap / after;
        this.ball.vy *= cap / after;
      }
    }

    loseLife() {
      this.lives -= 1;
      this.combo = 0;
      this.events.push({ type: "life-lost", lives: this.lives });
      if (this.lives <= 0) {
        this.gameOver = true;
        this.bestScore = Math.max(this.bestScore, this.score);
        this.events.push({ type: "game-over", score: this.score });
        return;
      }
      this.ball = { x: this.paddle.x + this.paddle.w / 2, y: this.paddle.y - 11, vx: 0, vy: 0, r: 8, stuck: true };
    }

    hitBrick(brick) {
      brick.hits -= 1;
      this.combo += 1;
      const points = (brick.special ? 25 : 10) + Math.min(40, (this.combo - 1) * 2);
      this.score += points;
      this.bestScore = Math.max(this.bestScore, this.score);
      this.events.push({ type: "brick", x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, color: brick.color, points, combo: this.combo });
      if (brick.hits <= 0) brick.alive = false;
    }

    advanceLevel() {
      this.wonLevel = true;
      this.score += 100 + this.level * 50;
      this.bestScore = Math.max(this.bestScore, this.score);
      this.events.push({ type: "level-clear", level: this.level + 1 });
    }

    nextLevel() {
      if (!this.wonLevel) return false;
      this.loadLevel(this.level + 1);
      return true;
    }

    update(dt) {
      this.events = [];
      if (!Number.isFinite(dt) || dt <= 0 || this.paused || this.gameOver || this.wonLevel || this.ball.stuck) return this.snapshot();
      const bounded = Math.min(dt, 0.05);
      const steps = Math.max(1, Math.ceil(bounded / 0.006));
      const step = bounded / steps;
      for (let i = 0; i < steps; i += 1) {
        const previous = { x: this.ball.x, y: this.ball.y };
        this.ball.x += this.ball.vx * step;
        this.ball.y += this.ball.vy * step;

        if (this.ball.x - this.ball.r <= 14 && this.ball.vx < 0) { this.ball.x = 14 + this.ball.r; this.ball.vx *= -1; }
        if (this.ball.x + this.ball.r >= WIDTH - 14 && this.ball.vx > 0) { this.ball.x = WIDTH - 14 - this.ball.r; this.ball.vx *= -1; }
        if (this.ball.y - this.ball.r <= 112 && this.ball.vy < 0) { this.ball.y = 112 + this.ball.r; this.ball.vy *= -1; }

        if (this.ball.vy > 0 && circleHitsRect(this.ball, this.paddle)) {
          this.ball.y = this.paddle.y - this.ball.r - 0.5;
          const offset = clamp((this.ball.x - (this.paddle.x + this.paddle.w / 2)) / (this.paddle.w / 2), -1, 1);
          const speed = clamp(Math.hypot(this.ball.vx, this.ball.vy) * 1.015, 440, 680);
          const angle = offset * 1.02;
          this.ball.vx = Math.sin(angle) * speed;
          this.ball.vy = -Math.cos(angle) * speed;
          this.combo = 0;
          this.events.push({ type: "paddle", offset });
        }

        for (const brick of this.bricks) {
          if (!brick.alive || !circleHitsRect(this.ball, brick)) continue;
          const cameFromTop = previous.y + this.ball.r <= brick.y;
          const cameFromBottom = previous.y - this.ball.r >= brick.y + brick.h;
          if (cameFromTop || cameFromBottom) this.ball.vy *= -1;
          else this.ball.vx *= -1;
          this.hitBrick(brick);
          break;
        }

        this.ensurePlayableVelocity();
        if (this.ball.y - this.ball.r > HEIGHT) { this.loseLife(); break; }
        if (this.bricks.every((brick) => !brick.alive)) { this.advanceLevel(); break; }
      }
      return this.snapshot();
    }

    snapshot() {
      return {
        width: this.width, height: this.height, score: this.score, bestScore: this.bestScore,
        level: this.level, lives: this.lives, gameOver: this.gameOver, wonLevel: this.wonLevel,
        paused: this.paused, combo: this.combo, paddle: { ...this.paddle }, ball: { ...this.ball },
        bricks: this.bricks.map((brick) => ({ ...brick })), events: this.events.map((event) => ({ ...event })),
      };
    }
  }

  return { BrickBreakerGame, WIDTH, HEIGHT, LEVELS, COLORS, clamp, circleHitsRect, buildBricks };
});
