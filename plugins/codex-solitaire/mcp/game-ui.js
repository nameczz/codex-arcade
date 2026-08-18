(function attachSolitaireUi(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SolitaireUi = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function makeSolitaireUi() {
  "use strict";
  const DISPLAY_MODES = Object.freeze(["inline", "fullscreen", "pip"]);
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
  return { normalizeDisplayMode, availableDisplayModes, supportsMode, hostDisplayMode, computeCardOffsets, teardownNotification };
});
