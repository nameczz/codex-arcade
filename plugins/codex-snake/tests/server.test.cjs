"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const server = require("../mcp/server.cjs");

test("advertises the Snake tool with MCP App resource metadata", async () => {
  const response = await server.handleRpc({ jsonrpc:"2.0", id:1, method:"tools/list", params:{} });
  const tool = response.result.tools[0];
  assert.equal(tool.name, "open_snake_game");
  assert.equal(tool._meta["ui/resourceUri"], server.RESOURCE_URI);
  assert.equal(tool._meta.ui.resourceUri, server.RESOURCE_URI);
});

test("serves a self-contained MCP App HTML resource", async () => {
  const response = await server.handleRpc({ jsonrpc:"2.0", id:2, method:"resources/read", params:{ uri:server.RESOURCE_URI } });
  const resource = response.result.contents[0];
  assert.equal(resource.mimeType, "text/html;profile=mcp-app");
  assert.match(resource.text, /Codex Snake/);
  assert.match(resource.text, /class SnakeGame/);
  assert.doesNotMatch(resource.text, /__SNAKE_ICON_DATA_URL__|__GAME_CORE__/);
  assert.doesNotMatch(resource.text, /https?:\/\//);
});

test("tool call returns structured content and matching UI metadata", async () => {
  const response = await server.handleRpc({ jsonrpc:"2.0", id:3, method:"tools/call", params:{ name:"open_snake_game", arguments:{} } });
  assert.equal(response.result.isError, false);
  assert.equal(response.result.structuredContent.ok, true);
  assert.equal(response.result._meta["ui/resourceUri"], server.RESOURCE_URI);
});
