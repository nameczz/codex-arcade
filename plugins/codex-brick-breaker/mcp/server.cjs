"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const ROOT = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, ".codex-plugin", "plugin.json"), "utf8"));
const VERSION = manifest.version || "0.1.0";
const MIME_TYPE = "text/html;profile=mcp-app";
const RESOURCE_URI = `ui://codex-brick-breaker/game-${encodeURIComponent(VERSION)}.html`;

function assetDataUrl(name, mimeType) {
  return `data:${mimeType};base64,${fs.readFileSync(path.join(ROOT, "assets", name)).toString("base64")}`;
}

function uiMeta() {
  return {
    ui: { resourceUri: RESOURCE_URI, visibility: ["model"] },
    "ui/resourceUri": RESOURCE_URI,
    "openai/outputTemplate": RESOURCE_URI,
    "openai/widgetAccessible": true,
    "openai/toolInvocation/invoking": "Powering up the Neon Workshop…",
    "openai/toolInvocation/invoked": "Brick Breaker is ready",
  };
}

function resourceMeta() {
  return {
    "openai/widgetDescription": "A polished, fully playable original Brick Breaker game with keyboard, pointer, and touch controls.",
    "openai/widgetPrefersBorder": false,
    "openai/widgetCSP": { connect_domains: [], resource_domains: [], frame_domains: [] },
    ui: { prefersBorder: false, csp: { connectDomains: [], resourceDomains: [], frameDomains: [] } },
  };
}

function gameHtml() {
  const template = fs.readFileSync(path.join(__dirname, "game.html"), "utf8");
  const core = fs.readFileSync(path.join(__dirname, "game-core.js"), "utf8");
  const ui = fs.readFileSync(path.join(__dirname, "game-ui.js"), "utf8");
  return template
    .replace("/*__GAME_CORE__*/", core)
    .replace("/*__GAME_UI__*/", ui)
    .replace("__BRICK_ICON_DATA_URL__", assetDataUrl("icon.png", "image/png"));
}

function tools() {
  return [{
    name: "open_brick_breaker_game",
    title: "Open Codex Brick Breaker",
    description: "Open an interactive Brick Breaker game in Codex. Use whenever the user asks to open or play 打砖块, Brick Breaker, or Breakout.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: uiMeta(),
  }];
}

function resources() {
  return [{ uri: RESOURCE_URI, name: "codex_brick_breaker_game", title: "Codex Brick Breaker game", description: "The local Codex Neon Workshop MCP App.", mimeType: MIME_TYPE, _meta: resourceMeta() }];
}

function rpcResult(id, result) { return { jsonrpc: "2.0", id, result }; }
function rpcError(id, code, message) { return { jsonrpc: "2.0", id, error: { code, message } }; }

async function handleRpc(message) {
  if (!message || typeof message !== "object" || Array.isArray(message)) return rpcError(null, -32600, "Invalid Request");
  const { id, method } = message;
  const params = message.params && typeof message.params === "object" ? message.params : {};
  if (typeof method !== "string") return id == null ? null : rpcError(id, -32600, "Invalid Request");
  if (method.startsWith("notifications/") || method === "$/cancelRequest") return null;
  if (method === "initialize") return rpcResult(id, {
    protocolVersion: params.protocolVersion || "2024-11-05",
    capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false } },
    serverInfo: {
      name: "codex-brick-breaker", title: "Codex Brick Breaker", version: VERSION,
      description: "An original local Brick Breaker game for Codex.",
      icons: [
        { src: assetDataUrl("icon.png", "image/png"), mimeType: "image/png", sizes: ["64x64"] },
        { src: assetDataUrl("logo.png", "image/png"), mimeType: "image/png", sizes: ["512x512"] },
      ],
    },
    instructions: "Call open_brick_breaker_game whenever the user asks to open or play 打砖块, Brick Breaker, or Breakout.",
  });
  if (method === "ping") return rpcResult(id, {});
  if (method === "tools/list") return rpcResult(id, { tools: tools() });
  if (method === "tools/call") {
    if (params.name !== "open_brick_breaker_game") return rpcError(id, -32602, `Unknown tool: ${String(params.name)}`);
    return rpcResult(id, {
      content: [{ type: "text", text: "Codex Brick Breaker is ready. Move with ←/→, A/D, mouse, or touch. Space launches or pauses; R restarts." }],
      structuredContent: { ok: true, game: "codex-brick-breaker", controls: "Arrow keys or A/D; mouse/touch/drag; Space launches or pauses; R restarts." },
      isError: false, _meta: uiMeta(),
    });
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
  rl.on("line", async (line) => {
    const input = line.trim(); if (!input) return;
    let decoded;
    try { decoded = JSON.parse(input); } catch (error) { write(rpcError(null, -32700, `Parse error: ${error.message}`)); return; }
    const response = await handleRpc(decoded); if (response) write(response);
  });
}
if (require.main === module) run();

module.exports = { handleRpc, tools, resources, gameHtml, RESOURCE_URI, MIME_TYPE };
