"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { SnakeGame } = require("../mcp/game-core.js");

test("starts centered and advances right", () => {
  const game = new SnakeGame({ cols: 9, rows: 9, random: () => 0 });
  const before = game.snake[0];
  const result = game.step();
  assert.equal(result.moved, true);
  assert.deepEqual(game.snake[0], { x: before.x + 1, y: before.y });
  assert.equal(game.snake.length, 3);
});

test("prevents an immediate reverse turn", () => {
  const game = new SnakeGame({ cols: 9, rows: 9 });
  assert.equal(game.turn("left"), false);
  assert.equal(game.turn("up"), true);
  game.step();
  assert.deepEqual(game.direction, { x: 0, y: -1 });
});

test("eating grows the snake and adds ten points", () => {
  const game = new SnakeGame({ cols: 9, rows: 9, random: () => 0 });
  const head = game.snake[0];
  game.food = { x: head.x + 1, y: head.y };
  const result = game.step();
  assert.equal(result.ate, true);
  assert.equal(game.snake.length, 4);
  assert.equal(game.score, 10);
});

test("wall collision ends the game", () => {
  const game = new SnakeGame({ cols: 7, rows: 7 });
  for (let i = 0; i < 4; i += 1) game.step();
  assert.equal(game.gameOver, true);
  assert.equal(game.step().moved, false);
});

test("pause blocks movement until resumed", () => {
  const game = new SnakeGame({ cols: 9, rows: 9 });
  const head = { ...game.snake[0] };
  game.togglePause();
  assert.equal(game.step().moved, false);
  assert.deepEqual(game.snake[0], head);
  game.togglePause();
  assert.equal(game.step().moved, true);
});
