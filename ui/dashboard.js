/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — ui/dashboard.js

   UNIFIED LEFT SIDEBAR  (bottom-anchored)
   ─────────────────────────────────────────────────────────────
   Single retractable panel anchored to the BOTTOM-LEFT corner.
   Four collapsible sections:
     1. NAYON      — resources (Ginto, Bigas, Langis, Tao)
     2. PAMAHALAAN — gov stats (Trabaho, Kasiyahan, Tiwala,
                     Pagkain, Korapsyon, Eleksyon)
     3. GOBERNADOR — personal finance
     4. NASAYANG   — wasted resources (overflow losses)

   STATES
   ─────────────────────────────────────────────────────────────
   EXPANDED  (230px) — all section bodies visible
   COLLAPSED (48px)  — icon strip only, each stat as emoji+value

   The ‹/› toggle button sits on the top-right edge of the panel.
   Each section header is individually clickable to show/hide.

   EXPORTS
   ─────────────────────────────────────────────────────────────
   initDashboard()
   updateDashboard(VS, dayCount)
   toggleDashboard()
═══════════════════════════════════════════════════════════════ */

import { getCorruptionState }  from '../government/corruption.js';
import { getPolicyState }      from '../government/policy.js';
import { getElectionState }    from '../government/election.js';
import { getMainHallLevel, getMainHallRules } from '../buildings/building.js';

/* ── State ────────────────────────────────────────────────── */
var _injected    = false;
var _sidebarOpen = true;
var _sections    = { nayon: true, gov: true, gobern: true, waste: true };
var _prevValues  = {};
var _floaters    = [];
var _lastUpdate  = 0;

var WASTE_WARN   = 200;   /* total waste threshold for warning */

/* ══════════════════════════════════════════════════════════════
   initDashboard
══════════════════════════════════════════════════════════════ */
export function initDashboard() {
  if (_injected) return;
  _injectStyles();
  _buildDOM();
  _injected = true;

  /* Hook for renderer.js updateWasteDisplay — writes into sidebar */
  window.updateWasteDisplay = function(ws) {
    var wGold   = Math.floor(ws.gold   || 0);
    var wRice   = Math.floor(ws.rice   || 0);
    var wLangis = Math.floor(ws.langis || 0);
    var total   = wGold + wRice + wLangis;

    _setWasteEl('sb-waste-gold',   wGold);
    _setWasteEl('sb-waste-rice',   wRice);
    _setWasteEl('sb-waste-langis', wLangis);

    /* Warning row */
    var warn = document.getElementById('sb-waste-warn');
    if (warn) warn.style.display = total >= WASTE_WARN ? 'block' : 'none';

    /* Section header pulse */
    var sec = document.getElementById('sb-section-waste');
    if (sec) sec.classList.toggle('sb-waste-alert', total >= WASTE_WARN);

    /* Section summary (shown when collapsed) */
    var sum = document.getElementById('sb-waste-sum');
    if (sum) sum.textContent = '🗑️' + total;

    /* Collapsed strip */
    var stripEl = document.getElementById('sb-strip-waste');
    if (stripEl) {
      stripEl.querySelector('span').textContent = total;
      stripEl.classList.toggle('sb-strip-corrupt', total >= WASTE_WARN);
    }
  };
}

function _setWasteEl(id, amount) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = amount;
  el.className   = 'sb-val';
  if (amount >= 500)      el.classList.add('sb-waste-high');
  else if (amount >= 100) el.classList.add('sb-waste-med');
}

/* ══════════════════════════════════════════════════════════════
   updateDashboard  — called every frame from main.js
══════════════════════════════════════════════════════════════ */
export function updateDashboard(VS, dayCount) {
  if (!_injected) return;

  var now = performance.now();
  var dt  = Math.min((now - _lastUpdate) / 1000, 0.1);
  _lastUpdate = now;

  /* ── Derived values ───────────────────────────────────── */
  var gold   = Math.floor(VS.res.gold);
  var rice   = Math.floor(VS.res.rice);
  var langis = Math.floor(VS.res.langis);
  var pop    = VS.villagers.length;
  var popMax = VS.pop.max;

  var employed     = VS.villagers.filter(function(v) { return v.workBuilding; }).length;
  var empPct       = pop > 0 ? Math.round((employed / pop) * 100) : 0;
  var avgHappiness = _avg(VS.villagers, 'happiness', 70);
  var avgTrust     = _avg(VS.villagers, 'govTrust',  50);
  var avgHunger    = _avg(VS.villagers, 'hunger',    20);
  var foodPct      = Math.max(0, 100 - avgHunger);

  var corruption = getCorruptionState(VS);
  var election   = getElectionState(VS);
  var policies   = getPolicyState(VS);
  var activePols = policies.filter(function(p) { return p.isActive; }).length;
  var mhLv       = getMainHallLevel(VS.buildings);
  var rules      = getMainHallRules(VS.buildings);
  var bCnt       = VS.buildings.filter(function(b) { return b.type !== 'mainHall'; }).length;
  var inConst    = VS.buildings.filter(function(b) { return b.underConstruction; }).length;

  var mins     = Math.floor(election.secondsLeft / 60);
  var secs     = election.secondsLeft % 60;
  var timerStr = election.terminated      ? 'TAPOS'
               : election.electionPending ? 'ELEKSYON!'
               : mins + ':' + (secs < 10 ? '0' : '') + secs;
  var timerColor = election.secondsLeft < 120 ? '#e74c3c' : '#f5c842';

  var pfGold = Math.floor(window.playerGold || 0);
  var pfCorr = typeof window.getCorruptionTotal === 'function'
    ? Math.floor(window.getCorruptionTotal()) : 0;

  /* ── NAYON ────────────────────────────────────────────── */
  _updateVal('sb-gold',   gold   + ' / ' + VS.resCap.gold,   '#ffcc44', gold   / VS.resCap.gold,   gold);
  _updateVal('sb-rice',   rice   + ' / ' + VS.resCap.rice,   '#88dd88', rice   / VS.resCap.rice,   rice);
  _updateVal('sb-langis', langis + ' / ' + VS.resCap.langis, '#cc88ff', langis / VS.resCap.langis, langis);
  _updateVal('sb-pop',    pop    + ' / ' + popMax,            '#ddaa66', pop    / popMax,            pop);

  var nayonSum = document.getElementById('sb-nayon-sum');
  if (nayonSum) nayonSum.textContent = '🪙' + gold + ' 🌾' + rice;

  var asleep  = VS.villagers.filter(function(v) { return v.isHome; }).length;
  var working = VS.villagers.filter(function(v) { return v.isInsideWork; }).length;
  var stud    = VS.villagers.filter(function(v) { return v.isTraining; }).length;
  var actEl   = document.getElementById('sb-activity');
  if (actEl) actEl.textContent =
    'Tulog:' + asleep + '  Trabaho:' + working + '  Aral:' + stud +
    '  Hall' + mhLv + '(' + bCnt + '/' + rules.maxBuildings + ')' +
    (inConst > 0 ? '  🔨' + inConst : '');

  /* ── PAMAHALAAN ───────────────────────────────────────── */
  var corrColor = corruption.exposureLevel > 60 ? '#e74c3c'
                : corruption.exposureLevel > 30 ? '#e67e22' : '#8a6a3a';
  _updateVal('sb-emp',   empPct + '%',                          _pctColor(empPct, 60, 80),       empPct / 100,                   empPct);
  _updateVal('sb-happy', Math.round(avgHappiness) + '%',        _pctColor(avgHappiness, 40, 65), avgHappiness / 100,             Math.round(avgHappiness));
  _updateVal('sb-trust', Math.round(avgTrust) + '%',            _pctColor(avgTrust, 30, 55),     avgTrust / 100,                 Math.round(avgTrust));
  _updateVal('sb-food',  Math.round(foodPct) + '%',             _pctColor(foodPct, 40, 60),      foodPct / 100,                  Math.round(foodPct));
  _updateVal('sb-corr',  Math.round(corruption.exposureLevel) + '%', corrColor,                  corruption.exposureLevel / 100, Math.round(corruption.exposureLevel));

  var elEl = document.getElementById('sb-election-val');
  if (elEl) { elEl.textContent = timerStr; elEl.style.color = timerColor; }

  var govSum = document.getElementById('sb-gov-sum');
  if (govSum) govSum.textContent = '😊' + Math.round(avgHappiness) + '% 🏛️' + Math.round(avgTrust) + '%';

  var cLbl = document.getElementById('sb-corr-label');
  if (cLbl) cLbl.textContent = corruption.exposureLevel > 30 ? 'Korapsyon' : 'Kahina-hinala';

  var footer = document.getElementById('sb-footer');
  if (footer) footer.textContent = 'Patakaran: ' + activePols + '  |  Araw ' + dayCount;

  /* ── GOBERNADOR ───────────────────────────────────────── */
  var pfGoldEl = document.getElementById('sb-pf-gold');
  var pfCorrEl = document.getElementById('sb-pf-corr');
  if (pfGoldEl) pfGoldEl.textContent = pfGold + ' 🪙';
  if (pfCorrEl) pfCorrEl.textContent = pfCorr + ' 💀';

  var gobSec = document.getElementById('sb-section-gobern');
  if (gobSec) gobSec.classList.toggle('sb-corrupt', pfCorr > 0);

  var gobSum = document.getElementById('sb-gobern-sum');
  if (gobSum) gobSum.textContent = '💼' + pfGold;

  /* ── Collapsed icon strip ─────────────────────────────── */
  var strip = document.getElementById('sb-strip');
  if (strip) {
    strip.innerHTML =
      '<div class="sb-strip-item" title="Ginto">🪙<br><span>' + gold + '</span></div>' +
      '<div class="sb-strip-item" title="Bigas">🌾<br><span>' + rice + '</span></div>' +
      '<div class="sb-strip-item" title="Langis">🛢️<br><span>' + langis + '</span></div>' +
      '<div class="sb-strip-item" title="Tao">👥<br><span>' + pop + '</span></div>' +
      '<div class="sb-strip-sep"></div>' +
      '<div class="sb-strip-item" title="Kasiyahan">😊<br><span>' + Math.round(avgHappiness) + '%</span></div>' +
      '<div class="sb-strip-item" title="Tiwala">🏛️<br><span>' + Math.round(avgTrust) + '%</span></div>' +
      '<div class="sb-strip-item" title="Eleksyon">🗳️<br><span>' + timerStr + '</span></div>' +
      '<div class="sb-strip-sep"></div>' +
      '<div class="sb-strip-item' + (pfCorr > 0 ? ' sb-strip-corrupt' : '') + '" title="Personal na Ginto">💼<br><span>' + pfGold + '</span></div>' +
      '<div class="sb-strip-sep"></div>' +
      '<div class="sb-strip-item" id="sb-strip-waste" title="Nasayang">🗑️<br><span>0</span></div>';
  }

  _tickFloaters(dt);
}

/* ══════════════════════════════════════════════════════════════
   toggleDashboard
══════════════════════════════════════════════════════════════ */
export function toggleDashboard() { _toggleSidebar(); }

/* ── Internal ─────────────────────────────────────────────── */
function _toggleSidebar() {
  _sidebarOpen = !_sidebarOpen;
  var sb  = document.getElementById('left-sidebar');
  var btn = document.getElementById('sb-toggle-btn');
  if (!sb) return;
  sb.classList.toggle('sb-collapsed', !_sidebarOpen);
  if (btn) btn.textContent = _sidebarOpen ? '‹' : '›';
}

function _toggleSection(key) {
  _sections[key] = !_sections[key];
  var body = document.getElementById('sb-body-' + key);
  var icon = document.getElementById('sb-icon-' + key);
  var sum  = document.getElementById('sb-' + key + '-sum');
  if (body) body.style.display = _sections[key] ? 'block' : 'none';
  if (icon) icon.textContent   = _sections[key] ? '▾' : '▸';
  if (sum)  sum.style.display  = _sections[key] ? 'none' : 'inline';
}
window._sbToggleSection = _toggleSection;
window._sbToggleSidebar = _toggleSidebar;

function _updateVal(id, text, barColor, ratio, numVal) {
  var valEl = document.getElementById(id + '-val');
  var barEl = document.getElementById(id + '-bar');
  if (valEl) valEl.textContent = text;
  if (barEl && barColor) {
    barEl.style.width      = Math.round(Math.min(1, Math.max(0, ratio || 0)) * 100) + '%';
    barEl.style.background = barColor;
  }
  if (numVal !== undefined) {
    var prev = _prevValues[id];
    if (prev !== undefined && Math.abs(numVal - prev) >= 1) {
      _spawnFloater(id + '-row', numVal - prev, barColor);
    }
    _prevValues[id] = numVal;
  }
}

function _spawnFloater(rowId, delta, color) {
  var row = document.getElementById(rowId);
  if (!row) return;
  var rect  = row.getBoundingClientRect();
  var cont  = document.getElementById('canvas-container');
  if (!cont) return;
  var cRect = cont.getBoundingClientRect();
  var isPos = delta > 0;
  var el    = document.createElement('div');
  el.className   = 'sb-floater';
  el.textContent = (isPos ? '+' : '') + Math.round(delta) + (isPos ? ' ▲' : ' ▼');
  el.style.color = isPos ? '#88dd88' : '#e74c3c';
  el.style.left  = (rect.right - cRect.left + 6) + 'px';
  el.style.top   = (rect.top - cRect.top + rect.height / 2 - 8) + 'px';
  cont.appendChild(el);
  _floaters.push({ el: el, vy: -36, alpha: 1.0, y: rect.top - cRect.top + rect.height / 2 - 8 });
}

function _tickFloaters(dt) {
  for (var i = _floaters.length - 1; i >= 0; i--) {
    var f = _floaters[i];
    f.y    += f.vy * dt;
    f.alpha = Math.max(0, f.alpha - dt * 1.4);
    f.el.style.top     = Math.round(f.y) + 'px';
    f.el.style.opacity = f.alpha.toFixed(2);
    if (f.alpha <= 0) {
      if (f.el.parentNode) f.el.parentNode.removeChild(f.el);
      _floaters.splice(i, 1);
    }
  }
}

function _avg(arr, field, fallback) {
  if (!arr.length) return fallback;
  var s = 0, c = 0;
  arr.forEach(function(v) { if (v[field] !== undefined) { s += v[field]; c++; } });
  return c > 0 ? s / c : fallback;
}
function _pctColor(v, bad, good) {
  return v >= good ? '#88dd88' : v >= bad ? '#f5c842' : '#e74c3c';
}

/* ══════════════════════════════════════════════════════════════
   DOM builder
══════════════════════════════════════════════════════════════ */
function _row(id, label, labelId) {
  return '<div class="sb-row" id="' + id + '-row">' +
    '<span class="sb-lbl"' + (labelId ? ' id="' + labelId + '"' : '') + '>' + label + '</span>' +
    '<div class="sb-bar-wrap"><div class="sb-bar" id="' + id + '-bar"></div></div>' +
    '<span class="sb-val" id="' + id + '-val">—</span>' +
  '</div>';
}

function _rowNoBar(id, label, extraClass) {
  return '<div class="sb-row" id="' + id + '-row">' +
    '<span class="sb-lbl">' + label + '</span>' +
    '<span class="sb-val' + (extraClass ? ' ' + extraClass : '') + '" id="' + id + '">—</span>' +
  '</div>';
}

function _sectionHead(key, icon, title, sumId) {
  return '<div class="sb-section-head" onclick="window._sbToggleSection(\'' + key + '\')">' +
    '<span class="sb-section-icon">' + icon + '</span>' +
    '<span class="sb-section-title">' + title + '</span>' +
    '<span class="sb-section-sum" id="' + sumId + '" style="display:none"></span>' +
    '<span class="sb-section-toggle" id="sb-icon-' + key + '">▾</span>' +
  '</div>';
}

function _buildDOM() {
  var container = document.getElementById('canvas-container');
  if (!container || document.getElementById('left-sidebar')) return;

  var sb = document.createElement('div');
  sb.id  = 'left-sidebar';

  sb.innerHTML =
    /* Toggle button — sits on top-right edge of the panel */
    '<button id="sb-toggle-btn" onclick="window._sbToggleSidebar()" title="Itago/Ipakita">‹</button>' +

    /* Icon strip — visible only when sidebar is collapsed */
    '<div id="sb-strip" class="sb-strip"></div>' +

    /* Full content — visible when expanded */
    '<div id="sb-content">' +

      /* 1 — NAYON */
      '<div class="sb-section" id="sb-section-nayon">' +
        _sectionHead('nayon', '🏡', 'NAYON', 'sb-nayon-sum') +
        '<div class="sb-body" id="sb-body-nayon">' +
          _row('sb-gold',   '🪙 Ginto') +
          _row('sb-rice',   '🌾 Bigas') +
          _row('sb-langis', '🛢️ Langis') +
          _row('sb-pop',    '👥 Tao') +
          '<div class="sb-activity" id="sb-activity"></div>' +
        '</div>' +
      '</div>' +

      /* 2 — PAMAHALAAN */
      '<div class="sb-section" id="sb-section-gov">' +
        _sectionHead('gov', '🏛️', 'PAMAHALAAN', 'sb-gov-sum') +
        '<div class="sb-body" id="sb-body-gov">' +
          _row('sb-emp',   'Trabaho') +
          _row('sb-happy', 'Kasiyahan') +
          _row('sb-trust', 'Tiwala') +
          _row('sb-food',  'Pagkain') +
          _row('sb-corr',  'Kahina-hinala', 'sb-corr-label') +
          '<div class="sb-election-row">' +
            '<span class="sb-lbl">Eleksyon</span>' +
            '<span class="sb-val" id="sb-election-val" style="color:#f5c842">—</span>' +
          '</div>' +
          '<div class="sb-activity" id="sb-footer"></div>' +
        '</div>' +
      '</div>' +

      /* 3 — GOBERNADOR */
      '<div class="sb-section" id="sb-section-gobern">' +
        _sectionHead('gobern', '💼', 'GOBERNADOR', 'sb-gobern-sum') +
        '<div class="sb-body" id="sb-body-gobern">' +
          _rowNoBar('sb-pf-gold', 'Personal na Ginto') +
          _rowNoBar('sb-pf-corr', 'Kinuha sa Korapsyon', 'sb-corrupt-val') +
        '</div>' +
      '</div>' +

      /* 4 — NASAYANG */
      '<div class="sb-section" id="sb-section-waste">' +
        _sectionHead('waste', '🗑️', 'NASAYANG', 'sb-waste-sum') +
        '<div class="sb-body" id="sb-body-waste">' +
          _rowNoBar('sb-waste-gold',   '🪙 Ginto') +
          _rowNoBar('sb-waste-rice',   '🌾 Bigas') +
          _rowNoBar('sb-waste-langis', '🛢️ Langis') +
          '<div class="sb-waste-warn" id="sb-waste-warn" style="display:none">' +
            '⚠️ Maraming nasasayang! I-upgrade ang imbakan.' +
          '</div>' +
          '<div class="sb-activity">Nasasayang kapag puno ang imbakan.</div>' +
        '</div>' +
      '</div>' +

    '</div>';  /* end #sb-content */

  container.appendChild(sb);
}

/* ══════════════════════════════════════════════════════════════
   Styles
══════════════════════════════════════════════════════════════ */
function _injectStyles() {
  if (document.getElementById('sb-styles')) return;
  var s = document.createElement('style');
  s.id  = 'sb-styles';
  s.textContent = `
/* ── Sidebar — bottom-left anchored ─────────────────────── */
#left-sidebar {
  position: absolute;
  bottom: 14px;
  left: 0;
  width: 230px;
  max-height: calc(100vh - 64px);   /* top gap for HUD */
  background: rgba(10,6,2,0.94);
  border: 1px solid #3a2010;
  border-left: none;
  border-radius: 0 8px 8px 0;
  z-index: 25;
  display: flex;
  flex-direction: column-reverse;   /* sections stack upward from bottom */
  overflow: hidden;
  transition: width 0.25s cubic-bezier(.4,0,.2,1);
  pointer-events: all;
  font-family: monospace;
}

/* Collapsed — icon strip only */
#left-sidebar.sb-collapsed { width: 48px; }
#left-sidebar.sb-collapsed #sb-content    { display: none; }
#left-sidebar.sb-collapsed #sb-strip      { display: flex; }

/* Toggle button — anchored to top-right of panel */
#sb-toggle-btn {
  position: absolute;
  top: 8px;
  right: -16px;
  width: 18px;
  height: 36px;
  background: rgba(10,6,2,0.94);
  border: 1px solid #3a2010;
  border-left: none;
  border-radius: 0 6px 6px 0;
  color: #8a6030;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: color .15s, background .15s;
  padding: 0;
  line-height: 1;
}
#sb-toggle-btn:hover { color: #f5c842; background: #1a0f06; }

/* Icon strip (collapsed) */
.sb-strip {
  display: none;
  flex-direction: column;
  align-items: center;
  padding: 8px 0 6px;
  gap: 2px;
  overflow-y: auto;
  max-height: calc(100vh - 64px);
  scrollbar-width: none;
}
.sb-strip::-webkit-scrollbar { display: none; }
.sb-strip-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 0;
  font-size: 15px;
  line-height: 1.2;
  width: 100%;
  cursor: default;
}
.sb-strip-item span {
  font-size: 9px;
  color: #e8c870;
  font-family: monospace;
  line-height: 1.2;
  text-align: center;
}
.sb-strip-item.sb-strip-corrupt span { color: #e74c3c; }
.sb-strip-sep {
  width: 26px; height: 1px;
  background: #2a1808;
  margin: 2px auto;
}

/* Full content — scrolls upward from bottom */
#sb-content {
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: #3a2010 transparent;
}
#sb-content::-webkit-scrollbar { width: 3px; }
#sb-content::-webkit-scrollbar-thumb { background: #3a2010; border-radius: 2px; }

/* Section */
.sb-section { border-top: 1px solid #1a1008; }
.sb-section.sb-corrupt    { border-left: 2px solid #7a2010; }
.sb-section.sb-waste-alert { border-left: 2px solid #7a3000; }

/* Section header */
.sb-section-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px 5px;
  cursor: pointer;
  background: rgba(10,6,2,0.5);
  user-select: none;
  transition: background .15s;
}
.sb-section-head:hover { background: rgba(30,15,6,0.8); }
.sb-section-icon  { font-size: 13px; flex-shrink: 0; }
.sb-section-title {
  font-family: 'Oldenburg', serif;
  font-size: 10px;
  color: #7a5028;
  letter-spacing: .08em;
  flex: 1;
}
.sb-section-sum {
  font-size: 10px;
  color: #a08040;
  font-family: monospace;
  white-space: nowrap;
  margin-right: 2px;
}
.sb-section-toggle { font-size: 10px; color: #5a3a18; flex-shrink: 0; }

/* Section body */
.sb-body { padding: 3px 8px 7px; }

/* Row */
.sb-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
  position: relative;
}
.sb-lbl {
  font-size: 11px;
  color: #6a5030;
  width: 82px;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sb-bar-wrap {
  flex: 1;
  height: 3px;
  background: #1a1008;
  border-radius: 2px;
  overflow: hidden;
}
.sb-bar {
  height: 100%;
  width: 50%;
  background: #f5c842;
  border-radius: 2px;
  transition: width .4s ease, background .4s ease;
}
.sb-val {
  font-size: 12px;
  color: #e8d4a0;
  text-align: right;
  min-width: 50px;
  white-space: nowrap;
}
.sb-corrupt-val   { color: #e74c3c; }
.sb-waste-high    { color: #e74c3c !important; font-weight: bold; }
.sb-waste-med     { color: #e67e22 !important; }

/* No-bar rows */
.sb-row .sb-val:only-child { /* stretch when no bar */ }

/* Election row (no bar) */
.sb-election-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 0 3px;
  border-top: 1px solid #1a1008;
  margin-top: 2px;
}

/* Activity / footer */
.sb-activity {
  font-size: 10px;
  color: #4a3820;
  line-height: 1.5;
  padding: 2px 0 0;
  border-top: 1px solid #1a1008;
  margin-top: 2px;
}

/* Waste warning */
.sb-waste-warn {
  font-size: 10px;
  color: #ff9966;
  background: rgba(180,40,10,0.15);
  border: 1px solid #5a2010;
  border-radius: 3px;
  padding: 4px 7px;
  margin: 4px 0 2px;
  line-height: 1.5;
}

/* Floaters */
.sb-floater {
  position: absolute;
  font-family: monospace;
  font-size: 11px;
  font-weight: bold;
  pointer-events: none;
  white-space: nowrap;
  z-index: 50;
  text-shadow: 0 1px 3px rgba(0,0,0,0.9);
}
  `;
  document.head.appendChild(s);
}