"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  computeSquareLayout,
  normalizeDisplayMode,
  shouldRequestDefaultFullscreen,
  teardownNotification,
} = require("../mcp/game-ui.js");

test("small-window layout keeps the square board within visible width and height", () => {
  const layout = computeSquareLayout({
    availableWidth: 360,
    availableHeight: 620,
    chromeHeight: 205,
    maxSize: 570,
  });
  assert.equal(layout.size, 360);
  assert.ok(layout.size <= layout.heightBudget);
});

test("short windows shrink the board before controls are clipped", () => {
  const layout = computeSquareLayout({
    availableWidth: 520,
    availableHeight: 500,
    chromeHeight: 210,
    maxSize: 570,
  });
  assert.equal(layout.size, 282);
  assert.equal(layout.safetyPadding, 8);
});

test("display and close helpers use host protocol values", () => {
  assert.equal(normalizeDisplayMode(" FULLSCREEN "), "fullscreen");
  assert.equal(normalizeDisplayMode("pip"), "pip");
  assert.equal(normalizeDisplayMode("expanded"), null);
  assert.deepEqual(teardownNotification(), {
    jsonrpc: "2.0",
    method: "ui/notifications/request-teardown",
    params: {},
  });
});

test("requests fullscreen once by default without overriding a later small-window choice", () => {
  const hostApi = {
    requestDisplayMode() {},
    availableDisplayModes: ["inline", "fullscreen"],
  };
  assert.equal(shouldRequestDefaultFullscreen({ hostApi, currentMode: "inline", attempted: false }), true);
  assert.equal(shouldRequestDefaultFullscreen({ hostApi, currentMode: "inline", attempted: true }), false);
  assert.equal(shouldRequestDefaultFullscreen({ hostApi, currentMode: "fullscreen", attempted: false }), false);
  assert.equal(shouldRequestDefaultFullscreen({ hostApi: {}, currentMode: "inline", attempted: false }), false);
});
