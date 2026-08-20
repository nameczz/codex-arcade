(function attachSolitaireUi(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SolitaireUi = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function makeSolitaireUi() {
  "use strict";
  const DISPLAY_MODES = Object.freeze(["inline", "fullscreen", "pip"]);
  const INLINE_MIN_HEIGHT = 600;
  function normalizeDisplayMode(value) {
    if (typeof value !== "string") return null;
    const mode = value.toLowerCase();
    if (mode === "expanded" || mode === "full") return "fullscreen";
    if (mode === "picture-in-picture" || mode === "picture in picture") return "pip";
    if (mode === "compact" || mode === "modal") return "inline";
    return DISPLAY_MODES.includes(mode) ? mode : null;
  }
  function normalizeModes(values) {
    if (!Array.isArray(values)) return [];
    return Array.from(new Set(values.map(normalizeDisplayMode).filter(Boolean)));
  }
  function availableDisplayModes(hostApi = {}) {
    const candidates = [hostApi.availableDisplayModes, hostApi.view && hostApi.view.availableDisplayModes, hostApi.hostContext && hostApi.hostContext.availableDisplayModes];
    for (const candidate of candidates) {
      const modes = normalizeModes(candidate);
      if (modes.length) return modes;
    }
    return [];
  }
  function supportsMode(mode, hostApi = {}) {
    const normalized = normalizeDisplayMode(mode);
    if (!normalized) return false;
    const available = availableDisplayModes(hostApi);
    return available.length === 0 || available.includes(normalized);
  }
  function hostDisplayMode(hostApi = {}) {
    return normalizeDisplayMode(hostApi.displayMode)
      || normalizeDisplayMode(hostApi.view && hostApi.view.displayMode)
      || normalizeDisplayMode(hostApi.hostContext && hostApi.hostContext.displayMode)
      || normalizeDisplayMode(hostApi.host && hostApi.host.displayMode);
  }
  function shouldRequestDefaultFullscreen(options = {}) {
    const hostApi = options.hostApi || {};
    return options.attempted !== true
      && normalizeDisplayMode(options.currentMode) !== "fullscreen"
      && typeof hostApi.requestDisplayMode === "function"
      && supportsMode("fullscreen", hostApi);
  }
  function preferredInlineHeight(currentHeight) {
    const current = Math.max(1, Math.floor(Number(currentHeight) || 0));
    return Math.max(current, INLINE_MIN_HEIGHT);
  }
  function sizeChangedNotification(options = {}) {
    const params = {};
    const width = Math.floor(Number(options.width) || 0);
    const height = Math.floor(Number(options.height) || 0);
    if (options.width != null && width > 0) params.width = width;
    if (options.height != null && height >= 0) params.height = height;
    return { jsonrpc: "2.0", method: "ui/notifications/size-changed", params };
  }
  function computeCardOffsets(faceUpCards, availableHeight, cardHeight, compact = false) {
    const cards = Array.isArray(faceUpCards) ? faceUpCards : [];
    if (!cards.length) return [];
    const faceUpStep = compact ? 19 : 31;
    const faceDownStep = compact ? 11 : 18;
    const natural = [0];
    let total = 0;
    for (let index = 1; index < cards.length; index += 1) {
      total += cards[index - 1] ? faceUpStep : faceDownStep;
      natural.push(total);
    }
    const height = Math.max(0, Number(availableHeight) || 0);
    const card = Math.max(0, Number(cardHeight) || 0);
    const fanBudget = Math.max(0, height - card);
    const scale = total > 0 ? Math.min(1, fanBudget / total) : 1;
    return natural.map((offset) => Math.floor(offset * scale));
  }
  function teardownNotification() {
    return { jsonrpc: "2.0", method: "ui/notifications/request-teardown", params: {} };
  }
  return { normalizeDisplayMode, availableDisplayModes, supportsMode, hostDisplayMode, shouldRequestDefaultFullscreen, preferredInlineHeight, sizeChangedNotification, computeCardOffsets, teardownNotification };
});
