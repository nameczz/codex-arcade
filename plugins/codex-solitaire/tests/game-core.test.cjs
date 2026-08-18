"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { SolitaireGame, SUITS, makeDeck, canPlaceOnTableau, canPlaceOnFoundation } = require("../mcp/game-core.js");

const card = (suit, rank, faceUp = true) => ({ id: `${suit}-${rank}`, suit, rank, color: suit === "hearts" || suit === "diamonds" ? "red" : "black", faceUp });

function emptyGame() {
  const game = new SolitaireGame({ random: () => 0.5 });
  game.stock = []; game.waste = []; game.tableau = Array.from({ length: 7 }, () => []);
  game.foundations = Object.fromEntries(SUITS.map((suit) => [suit, []]));
  game.score = 0; game.moves = 0; game.history = []; game.won = false; game.lost = false; game.events = [];
  return game;
}

test("creates a unique standard 52-card deck", () => {
  const deck = makeDeck();
  assert.equal(deck.length, 52);
  assert.equal(new Set(deck.map((c) => c.id)).size, 52);
  assert.deepEqual(new Set(deck.map((c) => c.suit)), new Set(SUITS));
});

test("deals seven columns with only each top card face up", () => {
  const game = new SolitaireGame({ random: () => 0.42 });
  assert.deepEqual(game.tableau.map((pile) => pile.length), [1, 2, 3, 4, 5, 6, 7]);
  for (const pile of game.tableau) pile.forEach((c, i) => assert.equal(c.faceUp, i === pile.length - 1));
  assert.equal(game.stock.length, 24);
  assert.equal(game.countCards(), 52);
});

test("draw-one stock and redeal preserve all cards and order", () => {
  const game = emptyGame();
  game.stock = [card("clubs", 2, false), card("hearts", 7, false)];
  assert.equal(game.draw(), true); assert.equal(game.waste.at(-1).id, "hearts-7");
  assert.equal(game.draw(), true); assert.equal(game.waste.at(-1).id, "clubs-2");
  assert.equal(game.draw(), true); assert.equal(game.stock.at(-1).id, "hearts-7");
  assert.equal(game.redeals, 1); assert.ok(game.stock.every((c) => !c.faceUp));
});

test("tableau requires descending alternating colors and kings on empty columns", () => {
  assert.equal(canPlaceOnTableau(card("hearts", 12), card("clubs", 13)), true);
  assert.equal(canPlaceOnTableau(card("diamonds", 12), card("hearts", 13)), false);
  assert.equal(canPlaceOnTableau(card("spades", 12), null), false);
  assert.equal(canPlaceOnTableau(card("clubs", 13), null), true);
});

test("moving a valid tableau run reveals the newly exposed card", () => {
  const game = emptyGame();
  game.tableau[0] = [card("spades", 9, false), card("hearts", 8), card("clubs", 7)];
  game.tableau[1] = [card("clubs", 9)];
  assert.equal(game.moveTableauToTableau(0, 1, 1), true);
  assert.equal(game.tableau[0][0].faceUp, true);
  assert.deepEqual(game.tableau[1].map((c) => c.rank), [9, 8, 7]);
  assert.equal(game.score, 10);
});

test("foundation builds upward by matching suit from ace", () => {
  const game = emptyGame();
  game.waste = [card("hearts", 1)];
  assert.equal(canPlaceOnFoundation(game.waste[0], { suit: "hearts", cards: [] }), true);
  assert.equal(game.moveToFoundation({ type: "waste" }), true);
  game.waste = [card("hearts", 3)];
  assert.equal(game.moveToFoundation({ type: "waste" }), false);
  game.waste = [card("hearts", 2)];
  assert.equal(game.moveToFoundation({ type: "waste" }), true);
  assert.deepEqual(game.foundations.hearts.map((c) => c.rank), [1, 2]);
});

test("only a tableau top card can move to foundation", () => {
  const game = emptyGame();
  game.tableau[0] = [card("spades", 1), card("hearts", 13)];
  assert.equal(game.moveToFoundation({ type: "tableau", col: 0 }), false);
  assert.equal(game.tableau[0].length, 2);
});

test("undo restores piles, score, and move count", () => {
  const game = emptyGame(); game.waste = [card("diamonds", 13)];
  assert.equal(game.moveWasteToTableau(0), true); assert.equal(game.moves, 1);
  assert.equal(game.undo(), true); assert.equal(game.moves, 0); assert.equal(game.waste.length, 1); assert.equal(game.tableau[0].length, 0);
});

test("detects victory when all four foundations contain thirteen cards", () => {
  const game = emptyGame();
  for (const suit of SUITS) game.foundations[suit] = Array.from({ length: 13 }, (_, i) => card(suit, i + 1));
  game.updateOutcome(); assert.equal(game.won, true); assert.equal(game.lost, false);
});

test("hint returns a legal move before suggesting another draw", () => {
  const game = emptyGame(); game.waste = [card("clubs", 1)]; game.stock = [card("spades", 3, false)];
  const hint = game.hint(); assert.equal(hint.from, "waste"); assert.equal(hint.to, "foundation");
});
