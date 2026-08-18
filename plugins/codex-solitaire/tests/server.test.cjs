"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const server = require("../mcp/server.cjs");

test("advertises Solitaire tool with MCP App metadata", async () => {
  const response = await server.handleRpc({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
  const tool = response.result.tools[0];
  assert.equal(tool.name, "open_solitaire_game");
  assert.equal(tool._meta["ui/resourceUri"], server.RESOURCE_URI);
  assert.equal(tool._meta.ui.resourceUri, server.RESOURCE_URI);
});

test("serves self-contained HTML and embeds the local GPT knot card back", async () => {
  const response = await server.handleRpc({ jsonrpc: "2.0", id: 2, method: "resources/read", params: { uri: server.RESOURCE_URI } });
  const resource = response.result.contents[0];
  assert.equal(resource.mimeType, "text/html;profile=mcp-app");
  assert.match(resource.text, /Codex Felt Atelier/);
  assert.match(resource.text, /class SolitaireGame/);
  assert.match(resource.text, /id="cardBackAsset" src="data:image\/png;base64,/);
  assert.doesNotMatch(resource.text, /__CARD_BACK_DATA_URL__|__SOLITAIRE_CORE__|__SOLITAIRE_ICON_DATA_URL__/);
  assert.doesNotMatch(resource.text, /<(?:script|link|img)[^>]+(?:src|href)=["']https?:\/\//i);
});

test("tool call returns structured content and matching UI metadata", async () => {
  const response = await server.handleRpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "open_solitaire_game", arguments: {} } });
  assert.equal(response.result.isError, false);
  assert.equal(response.result.structuredContent.variant, "draw-one-klondike");
  assert.equal(response.result._meta["ui/resourceUri"], server.RESOURCE_URI);
});
