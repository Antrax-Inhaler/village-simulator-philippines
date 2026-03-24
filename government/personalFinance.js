/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — government/personalFinance.js

   GOVERNOR'S PERSONAL FINANCE MODULE
   ─────────────────────────────────────────────────────────────
   Tracks the governor's personal wealth, separate from village
   resources. Personal wealth is accumulated via over-declaration
   on building projects (corruption).

   EXPORTS
   ─────────────────────────────────────────────────────────────
   initPersonalFinance(deps)       — call from main.js init
   addPersonalIncome(amount, source, isCorrupt, projectName)
   deductPersonalFunds(amount)
   getPersonalWealth()             — { gold, rice }
   getCorruptionTotal()            — total corrupt gold accumulated
   getCorruptionHistory()          — full history array
   resetPersonalFinance()          — zero out (new game)
═══════════════════════════════════════════════════════════════ */

/* ── State ───────────────────────────────────────────────── */
var _playerGold = 0;
var _playerRice = 0;
var _corruptionHistory = [];   /* [{ amount, source, date, exposed, projectName }] */
var _deps        = null;       /* { VS, showMsg } */

/* ── Ensure global mirror ─────────────────────────────────── */
function _syncGlobals() {
  window.playerGold = _playerGold;
  window.playerRice = _playerRice;
}

/* ══════════════════════════════════════════════════════════════
   initPersonalFinance
   Call from main.js after VS is ready.
══════════════════════════════════════════════════════════════ */
export function initPersonalFinance(deps) {
  _deps = deps;

  /* Restore from save if provided */
  if (deps.savedPlayerGold !== undefined) _playerGold = deps.savedPlayerGold;
  if (deps.savedPlayerRice !== undefined) _playerRice = deps.savedPlayerRice;
  if (deps.savedCorruptionHistory)        _corruptionHistory = deps.savedCorruptionHistory;

  _syncGlobals();

  /* Expose helpers used by HTML onclick handlers */
  window.getPersonalWealth    = getPersonalWealth;
  window.getCorruptionTotal   = getCorruptionTotal;
  window.addPersonalIncome    = addPersonalIncome;
  window.deductPersonalFunds  = deductPersonalFunds;
}

/* ══════════════════════════════════════════════════════════════
   addPersonalIncome
   @param amount      - gold amount to add
   @param source      - string label ('building_project', etc.)
   @param isCorrupt   - if true, records to history & adds exposure
   @param projectName - building label for record keeping
══════════════════════════════════════════════════════════════ */
export function addPersonalIncome(amount, source, isCorrupt, projectName) {
  _playerGold += amount;
  _syncGlobals();

  if (isCorrupt && amount > 0) {
    _corruptionHistory.push({
      amount:      amount,
      source:      source || 'unknown',
      date:        Date.now(),
      projectName: projectName || null,
      exposed:     false,
    });

    /* Add exposure to VS.corruption if it exists — 1 exposure per 5 corrupt gold */
    if (_deps && _deps.VS && _deps.VS.corruption) {
      var exposure = amount / 5;
      _deps.VS.corruption.exposureLevel = Math.min(
        100,
        (_deps.VS.corruption.exposureLevel || 0) + exposure
      );
      /* Also track total diverted */
      _deps.VS.corruption.totalDiverted = (_deps.VS.corruption.totalDiverted || 0) + amount;
    }
  }

  return _playerGold;
}

/* ══════════════════════════════════════════════════════════════
   deductPersonalFunds
══════════════════════════════════════════════════════════════ */
export function deductPersonalFunds(amount) {
  _playerGold = Math.max(0, _playerGold - amount);
  _syncGlobals();
  return _playerGold;
}

/* ══════════════════════════════════════════════════════════════
   getPersonalWealth
══════════════════════════════════════════════════════════════ */
export function getPersonalWealth() {
  return { gold: _playerGold, rice: _playerRice };
}

/* ══════════════════════════════════════════════════════════════
   getCorruptionTotal
══════════════════════════════════════════════════════════════ */
export function getCorruptionTotal() {
  return _corruptionHistory.reduce(function(sum, r) { return sum + r.amount; }, 0);
}

/* ══════════════════════════════════════════════════════════════
   getCorruptionHistory
══════════════════════════════════════════════════════════════ */
export function getCorruptionHistory() {
  return _corruptionHistory.slice();
}

/* ══════════════════════════════════════════════════════════════
   resetPersonalFinance  — called on new game
══════════════════════════════════════════════════════════════ */
export function resetPersonalFinance() {
  _playerGold = 0;
  _playerRice = 0;
  _corruptionHistory = [];
  _syncGlobals();
}

/* ── Serialise for storage.js ─────────────────────────────── */
export function serializePersonalFinance() {
  return {
    playerGold:         _playerGold,
    playerRice:         _playerRice,
    corruptionHistory:  _corruptionHistory.slice(),
  };
}
