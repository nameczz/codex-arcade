"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const server = require("../mcp/server.cjs");

test("advertises tool with MCP App resource metadata", async () => {
  const response = await server.handleRpc({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
  const tool = response.result.tools[0];
  assert.equal(tool.name, "open_brick_breaker_game");
  assert.equal(tool._meta["ui/resourceUri"], server.RESOURCE_URI);
  assert.equal(tool._meta.ui.resourceUri, server.RESOURCE_URI);
});

test("serves self-contained MCP App HTML", async () => {
  const response = await server.handleRpc({ jsonrpc: "2.0", id: 2, method: "resources/read", params: { uri: server.RESOURCE_URI } });
  const resource = response.result.contents[0];
  assert.equal(resource.mimeType, "text/html;profile=mcp-app");
  assert.match(resource.text, /Codex Neon Workshop/);
  assert.match(resource.text, /class BrickBreakerGame/);
  assert.match(resource.text, /id="close"/);
  assert.match(resource.text, /ui\/notifications\/request-teardown/);
  assert.doesNotMatch(resource.text, /__BRICK_ICON_DATA_URL__|__GAME_CORE__|__GAME_UI__/);
  assert.doesNotMatch(resource.text, /<(?:script|link|img)[^>]+(?:src|href)=["']https?:\/\//i);
});

test("tool call returns structured content and matching UI metadata", async () => {
  const response = await server.handleRpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "open_brick_breaker_game", arguments: {} } });
  assert.equal(response.result.isError, false);
  assert.equal(response.result.structuredContent.ok, true);
  assert.equal(response.result._meta["ui/resourceUri"], server.RESOURCE_URI);
});
