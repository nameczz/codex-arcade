"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { computeCardOffsets, hostDisplayMode, normalizeDisplayMode, shouldRequestDefaultFullscreen, supportsMode, teardownNotification } = require("../mcp/game-ui.js");
test("close control emits the MCP Apps teardown notification", () => {
  assert.deepEqual(teardownNotification(), { jsonrpc: "2.0", method: "ui/notifications/request-teardown", params: {} });
});
test("card stacks compress to keep the last card inside a short inline table", () => {
  const offsets = computeCardOffsets([false, false, true, true, true, true, true], 210, 100, false);
  assert.equal(offsets.length, 7);
  assert.equal(offsets[0], 0);
  assert.ok(offsets.every((offset, index) => index === 0 || offset >= offsets[index - 1]));
  assert.ok(offsets.at(-1) + 100 <= 210);
});
test("card stacks retain natural spacing when enough height is available", () => {
  assert.deepEqual(computeCardOffsets([false, false, true, true], 300, 100, false), [0, 18, 36, 67]);
  assert.deepEqual(computeCardOffsets([false, true, true], 180, 70, true), [0, 11, 30]);
});
test("display helpers recognize inline mode and supported host modes", () => {
  assert.equal(normalizeDisplayMode("compact"), "inline");
  assert.equal(normalizeDisplayMode("FULLSCREEN"), "fullscreen");
  assert.equal(hostDisplayMode({ view: { displayMode: "inline" } }), "inline");
  assert.equal(supportsMode("fullscreen", { availableDisplayModes: ["inline", "fullscreen"] }), true);
  assert.equal(supportsMode("pip", { availableDisplayModes: ["inline", "fullscreen"] }), false);
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
