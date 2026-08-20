"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  computeInlineLayout,
  normalizeDisplayMode,
  hostDisplayMode,
  availableDisplayModes,
  supportsMode,
  modeFromDisplayModeResult,
  shouldRequestDefaultFullscreen,
  preferredInlineHeight,
  sizeChangedNotification,
  teardownNotification,
} = require("../mcp/game-ui.js");

test("close control emits the MCP Apps teardown notification", () => {
  assert.deepEqual(teardownNotification(), {
    jsonrpc: "2.0",
    method: "ui/notifications/request-teardown",
    params: {},
  });
});

test("inline layout keeps game board visible within representative chat dimensions", () => {
  const tight = computeInlineLayout({
    availableWidth: 360,
    availableHeight: 620,
    chromeHeight: 170,
    aspectWidth: 4,
    aspectHeight: 5,
    maxWidth: 720,
    maxHeight: 720,
  });
  assert.ok(tight.width > 0 && tight.height > 0);
  assert.equal(tight.width <= 360, true);
  assert.equal(tight.height <= 620 - 170 - 8, true);
  assert.equal(Math.abs(tight.width * 5 - tight.height * 4) <= 1, true);
});

test("wide short inline windows keep the board large enough to play", () => {
  const preferredHeight = preferredInlineHeight(385);
  const screenshotWindow = computeInlineLayout({
    availableWidth: 1430,
    availableHeight: preferredHeight,
    chromeHeight: 155,
    aspectWidth: 4,
    aspectHeight: 5,
    maxWidth: 720,
    maxHeight: 720,
  });
  assert.equal(preferredHeight, 600);
  assert.ok(screenshotWindow.width >= 280, `board width was only ${screenshotWindow.width}px`);
});

test("inline resize notification reports the preferred playable height", () => {
  assert.deepEqual(sizeChangedNotification({ width: 720, height: preferredInlineHeight(385) }), {
    jsonrpc: "2.0",
    method: "ui/notifications/size-changed",
    params: { width: 720, height: 600 },
  });
});

test("display mode helpers are strict and host-only", () => {
  const host = {
    displayMode: "fullscreen",
    availableDisplayModes: ["inline", "fullscreen", "pip"],
    view: { availableDisplayModes: ["inline"] },
    hostContext: { availableDisplayModes: ["fullscreen"] },
  };
  assert.equal(hostDisplayMode(host), "fullscreen");
  assert.deepEqual(availableDisplayModes(host), ["inline", "fullscreen", "pip"]);
  assert.equal(supportsMode("fullscreen", host), true);
  assert.equal(supportsMode("pip", host), true);
  assert.equal(supportsMode("fullscreen", { availableDisplayModes: ["inline"], view: { availableDisplayModes: ["inline", "fullscreen"] } }), false);
});

test("result shape can use mode or displayMode", () => {
  assert.equal(modeFromDisplayModeResult({ mode: "fullscreen" }), "fullscreen");
  assert.equal(modeFromDisplayModeResult({ displayMode: "pip" }), "pip");
  assert.equal(modeFromDisplayModeResult({ viewMode: "fullscreen" }), null);
  assert.equal(modeFromDisplayModeResult(undefined), null);
});

test("requests fullscreen once by default without overriding a later inline choice", () => {
  const hostApi = {
    requestDisplayMode() {},
    availableDisplayModes: ["inline", "fullscreen"],
  };
  assert.equal(shouldRequestDefaultFullscreen({ hostApi, currentMode: "inline", attempted: false }), true);
  assert.equal(shouldRequestDefaultFullscreen({ hostApi, currentMode: "inline", attempted: true }), false);
  assert.equal(shouldRequestDefaultFullscreen({ hostApi, currentMode: "fullscreen", attempted: false }), false);
});

test("normalizeDisplayMode trims and lowercases only", () => {
  assert.equal(normalizeDisplayMode(" FULLSCREEN "), "fullscreen");
  assert.equal(normalizeDisplayMode("PiP"), "pip");
  assert.equal(normalizeDisplayMode("Expanded"), null);
  assert.equal(normalizeDisplayMode("modal"), null);
});

test("layout can be bounded by maxHeight while keeping board proportions", () => {
  const largeWindow = computeInlineLayout({
    availableWidth: 900,
    availableHeight: 2000,
    chromeHeight: 50,
    aspectWidth: 4,
    aspectHeight: 5,
    maxWidth: 720,
    maxHeight: 720,
  });
  assert.equal(largeWindow.width <= 720, true);
  assert.equal(largeWindow.height <= 720, true);
  assert.equal(Math.abs(largeWindow.width * 5 - largeWindow.height * 4) <= 4, true);
});
