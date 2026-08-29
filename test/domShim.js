/* Minimal browser-global shim so game logic modules can be imported
   under Node's test runner without a real DOM. Several modules read/
   write `window.*` (dayCount, showMsg, etc.) at call time, and a few
   attach functions to `window` at module top-level (e.g. ranking/
   rankingSystem.js's window.closeRankUpBanner). None of the functions
   covered by these tests touch `document`, so only `window` needs a
   stand-in. Import this before importing any game module in a test. */
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}
