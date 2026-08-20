(function attachSnakeUi(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SnakeUi = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function makeSnakeUi() {
  "use strict";

  const DISPLAY_MODES = Object.freeze(["inline", "fullscreen", "pip"]);
  const INLINE_MIN_HEIGHT = 600;
  const LAYOUT_SAFETY_PADDING = 8;

  function normalizeDisplayMode(value) {
    if (typeof value !== "string") return null;
    const mode = value.trim().toLowerCase();
    return DISPLAY_MODES.includes(mode) ? mode : null;
  }

  function normalizeModes(values) {
    if (!Array.isArray(values)) return [];
    return Array.from(new Set(values.map(normalizeDisplayMode).filter(Boolean)));
  }

  function availableDisplayModes(hostApi = {}) {
    const candidates = [
      hostApi.availableDisplayModes,
      hostApi.view && hostApi.view.availableDisplayModes,
      hostApi.hostContext && hostApi.hostContext.availableDisplayModes,
    ];
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

  function modeFromDisplayModeResult(result) {
    if (!result || typeof result !== "object") return null;
    return normalizeDisplayMode(result.mode || result.displayMode);
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

  function computeSquareLayout(options = {}) {
    const availableWidth = Math.max(1, Math.floor(Number(options.availableWidth) || 0));
    const availableHeight = Math.max(1, Math.floor(Number(options.availableHeight) || 0));
    const chromeHeight = Math.max(0, Math.floor(Number(options.chromeHeight) || 0));
    const maxSize = Math.max(1, Math.floor(Number(options.maxSize) || 570));
    const heightBudget = Math.max(1, availableHeight - chromeHeight - LAYOUT_SAFETY_PADDING);
    return {
      size: Math.max(1, Math.min(availableWidth, heightBudget, maxSize)),
      heightBudget,
      chromeHeight,
      maxSize,
      safetyPadding: LAYOUT_SAFETY_PADDING,
    };
  }

  function teardownNotification() {
    return { jsonrpc: "2.0", method: "ui/notifications/request-teardown", params: {} };
  }

  return {
    normalizeDisplayMode,
    availableDisplayModes,
    supportsMode,
    hostDisplayMode,
    modeFromDisplayModeResult,
    shouldRequestDefaultFullscreen,
    preferredInlineHeight,
    sizeChangedNotification,
    computeSquareLayout,
    teardownNotification,
  };
});
