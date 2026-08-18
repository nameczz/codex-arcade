"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const ROOT = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, ".codex-plugin", "plugin.json"), "utf8"));
const VERSION = manifest.version || "0.1.0";
const MIME_TYPE = "text/html;profile=mcp-app";
const RESOURCE_URI = `ui://codex-solitaire/game-${encodeURIComponent(VERSION)}.html`;

function assetDataUrl(name, mimeType) {
  const file = path.join(ROOT, "assets", name);
  if (!fs.existsSync(file)) return "";
  return `data:${mimeType};base64,${fs.readFileSync(file).toString("base64")}`;
}
function uiMeta() {
  return {
    ui: { resourceUri: RESOURCE_URI, visibility: ["model"] }, "ui/resourceUri": RESOURCE_URI,
    "openai/outputTemplate": RESOURCE_URI, "openai/widgetAccessible": true,
    "openai/toolInvocation/invoking": "Shuffling the Felt Atelier…", "openai/toolInvocation/invoked": "Solitaire is ready",
  };
}
function resourceMeta() {
  return {
    "openai/widgetDescription": "A complete, original draw-one Klondike Solitaire game with click, drag, touch, undo, hints, scoring, and timer.",
    "openai/widgetPrefersBorder": false,
    "openai/widgetCSP": { connect_domains: [], resource_domains: [], frame_domains: [] },
    ui: { prefersBorder: false, csp: { connectDomains: [], resourceDomains: [], frameDomains: [] } },
  };
}
function gameHtml() {
  const template = fs.readFileSync(path.join(__dirname, "game.html"), "utf8");
  const core = fs.readFileSync(path.join(__dirname, "game-core.js"), "utf8");
  const cardBack = assetDataUrl("gpt-knot-card-back.png", "image/png");
  return template.replace("/*__SOLITAIRE_CORE__*/", core).replaceAll("__CARD_BACK_DATA_URL__", cardBack).replace("__SOLITAIRE_ICON_DATA_URL__", assetDataUrl("icon.png", "image/png"));
}
function tools() {
  return [{
    name: "open_solitaire_game", title: "Open Codex Solitaire",
    description: "Open a complete Klondike Solitaire game in Codex. Use whenever the user asks to open or play 纸牌接龙, Solitaire, Klondike, or Patience.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: uiMeta(),
  }];
}
function resources() { return [{ uri: RESOURCE_URI, name: "codex_solitaire_game", title: "Codex Solitaire game", description: "The local Codex Felt Atelier MCP App.", mimeType: MIME_TYPE, _meta: resourceMeta() }]; }
function rpcResult(id, result) { return { jsonrpc: "2.0", id, result }; }
function rpcError(id, code, message) { return { jsonrpc: "2.0", id, error: { code, message } }; }
async function handleRpc(message) {
  if (!message || typeof message !== "object" || Array.isArray(message)) return rpcError(null, -32600, "Invalid Request");
  const { id, method } = message; const params = message.params && typeof message.params === "object" ? message.params : {};
  if (typeof method !== "string") return id == null ? null : rpcError(id, -32600, "Invalid Request");
  if (method.startsWith("notifications/") || method === "$/cancelRequest") return null;
  if (method === "initialize") return rpcResult(id, {
    protocolVersion: params.protocolVersion || "2024-11-05", capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false } },
    serverInfo: { name: "codex-solitaire", title: "Codex Solitaire", version: VERSION, description: "An original local Klondike Solitaire game for Codex.", icons: [
      { src: assetDataUrl("icon.png", "image/png"), mimeType: "image/png", sizes: ["64x64"] },
      { src: assetDataUrl("logo.png", "image/png"), mimeType: "image/png", sizes: ["512x512"] },
    ] }, instructions: "Call open_solitaire_game whenever the user asks to open or play 纸牌接龙, Solitaire, Klondike, or Patience.",
  });
  if (method === "ping") return rpcResult(id, {});
  if (method === "tools/list") return rpcResult(id, { tools: tools() });
  if (method === "tools/call") {
    if (params.name !== "open_solitaire_game") return rpcError(id, -32602, `Unknown tool: ${String(params.name)}`);
    return rpcResult(id, { content: [{ type: "text", text: "Codex Solitaire is ready. Click or drag cards; on touch, select a source then tap its destination. Undo, hint, and new-game controls are in the table." }], structuredContent: { ok: true, game: "codex-solitaire", variant: "draw-one-klondike" }, isError: false, _meta: uiMeta() });
  }
  if (method === "resources/list") return rpcResult(id, { resources: resources() });
  if (method === "resources/read") {
    if (params.uri !== RESOURCE_URI) return rpcError(id, -32602, `Unknown resource: ${String(params.uri)}`);
    return rpcResult(id, { contents: [{ uri: RESOURCE_URI, mimeType: MIME_TYPE, text: gameHtml(), _meta: resourceMeta() }] });
  }
  if (method === "resources/templates/list") return rpcResult(id, { resourceTemplates: [] });
  if (method === "prompts/list") return rpcResult(id, { prompts: [] });
  return rpcError(id, -32601, `Method not found: ${method}`);
}
function write(message) { process.stdout.write(`${JSON.stringify(message)}\n`); }
function run() {
  const rl = readline.createInterface({ input: process.stdin });
  rl.on("line", async (line) => { const input = line.trim(); if (!input) return; let decoded; try { decoded = JSON.parse(input); } catch (error) { write(rpcError(null, -32700, `Parse error: ${error.message}`)); return; } const response = await handleRpc(decoded); if (response) write(response); });
}
if (require.main === module) run();
module.exports = { handleRpc, tools, resources, gameHtml, RESOURCE_URI, MIME_TYPE };
