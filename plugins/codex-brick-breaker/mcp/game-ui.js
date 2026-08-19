(function attachBrickBreakerUi(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BrickBreakerUi = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function makeBrickBreakerUi() {
  "use strict";

  const ASPECT_WIDTH = 4;
  const ASPECT_HEIGHT = 5;
  const DISPLAY_MODES = Object.freeze(["inline", "fullscreen", "pip"]);
  const INLINE_MIN_HEIGHT = 600;
  const LAYOUT_SAFETY_PADDING = 8;

  function clampValue(value, min, max) {
    const clamped = Number(value);
    if (!Number.isFinite(clamped)) return min;
    return Math.max(min, Math.min(max, clamped));
  }

  function normalizeDisplayMode(value) {
    if (typeof value !== "string") return null;
    const mode = value.trim().toLowerCase();
    if (DISPLAY_MODES.includes(mode)) return mode;
    return null;
  }

  function toBooleanArray(values) {
    if (!Array.isArray(values)) return null;
    const valuesNorm = values
      .map(normalizeDisplayMode)
      .filter((value) => value !== null);
    return Array.from(new Set(valuesNorm));
  }

  function availableDisplayModes(hostApi = {}) {
    const hostModes = toBooleanArray(hostApi.availableDisplayModes);
    if (hostModes && hostModes.length) return hostModes;
    return [];
  }

  function supportsMode(mode, hostApi = {}) {
    const normalized = normalizeDisplayMode(mode);
    if (!normalized) return false;
    const supported = availableDisplayModes(hostApi);
    return supported.length === 0 || supported.includes(normalized);
  }

  function hostDisplayMode(hostApi = {}) {
    return normalizeDisplayMode(hostApi.displayMode);
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

  function teardownNotification() {
    return { jsonrpc: "2.0", method: "ui/notifications/request-teardown", params: {} };
  }

  function computeInlineLayout(options = {}) {
    const {
      availableWidth,
      availableHeight,
      chromeHeight = 0,
      aspectWidth = ASPECT_WIDTH,
      aspectHeight = ASPECT_HEIGHT,
      maxWidth = 720,
      maxHeight = 720,
    } = options;

    const safeWidth = clampValue(availableWidth, 1, maxWidth);
    const safeChrome = Math.max(0, Math.floor(Number(chromeHeight) || 0));
    const safeHeight = Math.max(1, Math.floor(Number(availableHeight) || 0));
    const safeHeightBudget = Math.max(1, Math.min(maxHeight, safeHeight - safeChrome - LAYOUT_SAFETY_PADDING));
    const widthForHeight = Math.max(1, Math.floor(safeHeightBudget * aspectWidth / aspectHeight));
    const width = Math.min(safeWidth, widthForHeight, maxWidth);
    const height = Math.max(1, Math.floor(width * aspectHeight / aspectWidth));
    const heightBudget = Math.max(1, safeHeight - safeChrome - LAYOUT_SAFETY_PADDING);

    return {
      width,
      height,
      heightBudget,
      maxWidth,
      maxHeight,
      chromeHeight: safeChrome,
      aspect: {
        width: aspectWidth,
        height: aspectHeight,
      },
      safetyPadding: LAYOUT_SAFETY_PADDING,
    };
  }

  return {
    ASPECT_WIDTH,
    ASPECT_HEIGHT,
    INLINE_MIN_HEIGHT,
    clampValue,
    normalizeDisplayMode,
    availableDisplayModes,
    supportsMode,
    hostDisplayMode,
    modeFromDisplayModeResult,
    shouldRequestDefaultFullscreen,
    preferredInlineHeight,
    sizeChangedNotification,
    teardownNotification,
    computeInlineLayout,
  };
});
