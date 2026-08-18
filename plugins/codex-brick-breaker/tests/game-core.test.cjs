"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { BrickBreakerGame, LEVELS, buildBricks, circleHitsRect } = require("../mcp/game-core.js");

test("ships at least three distinct playable layouts", () => {
  assert.ok(LEVELS.length >= 3);
  assert.equal(new Set(LEVELS.map((level) => level.join("/"))).size, LEVELS.length);
  for (let i = 0; i < LEVELS.length; i += 1) assert.ok(buildBricks(i).length >= 20);
});

test("launch creates an upward playable trajectory", () => {
  const game = new BrickBreakerGame({ random: () => 0.5 });
  assert.equal(game.launch(), true);
  assert.equal(game.ball.stuck, false);
  assert.ok(game.ball.vy < -400);
  assert.ok(Math.abs(game.ball.vx) >= 75);
});

test("paddle collision reflects upward and keeps speed healthy", () => {
  const game = new BrickBreakerGame({ random: () => 0.5 });
  game.ball = { x: game.paddle.x + game.paddle.w * .8, y: game.paddle.y - 7, vx: 20, vy: 480, r: 8, stuck: false };
  game.update(.016);
  assert.ok(game.ball.vy < 0);
  assert.ok(Math.hypot(game.ball.vx, game.ball.vy) >= 420);
});

test("brick hit awards score and destroys a normal brick", () => {
  const game = new BrickBreakerGame({ random: () => 0.5 });
  const brick = game.bricks.find((candidate) => !candidate.special);
  game.ball = { x: brick.x + brick.w / 2, y: brick.y + brick.h + 7, vx: 0, vy: -430, r: 8, stuck: false };
  game.update(.016);
  assert.equal(brick.alive, false);
  assert.ok(game.score >= 10);
  assert.ok(game.events.some((event) => event.type === "brick"));
});

test("missing the paddle consumes lives and eventually ends the game", () => {
  const game = new BrickBreakerGame();
  for (let lives = 2; lives >= 0; lives -= 1) {
    game.ball = { x: 100, y: 920, vx: 0, vy: 400, r: 8, stuck: false };
    game.update(.016);
    assert.equal(game.lives, lives);
  }
  assert.equal(game.gameOver, true);
});

test("clearing a level enables progression loop", () => {
  const game = new BrickBreakerGame();
  for (const brick of game.bricks) brick.alive = false;
  game.ball.stuck = false; game.ball.vy = -450; game.ball.vx = 120;
  game.update(.01);
  assert.equal(game.wonLevel, true);
  assert.equal(game.nextLevel(), true);
  assert.equal(game.level, 1);
  assert.ok(game.bricks.some((brick) => brick.alive));
});

test("circle to rectangle collision handles edges", () => {
  assert.equal(circleHitsRect({ x: 9, y: 15, r: 2 }, { x: 10, y: 10, w: 10, h: 10 }), true);
  assert.equal(circleHitsRect({ x: 3, y: 3, r: 2 }, { x: 10, y: 10, w: 10, h: 10 }), false);
});
