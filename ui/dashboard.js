/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — ui/dashboard.js

   SLIDE-OUT LEFT PANEL (Social Hub Style)
   ─────────────────────────────────────────────────────────────
   A drawer-style panel that slides out from the left edge,
   anchored vertically in the center of the screen (like Clash of Clans
   social hub). It has a prominent tab/button on the left edge that reveals
   the full panel when clicked.

   Five collapsible sections:
     1. NAYON      — resources (Ginto, Bigas, Langis, Tao)
     2. PAMAHALAAN — gov stats (Trabaho, Kasiyahan, Tiwala,
                     Pagkain, Korapsyon, Eleksyon)
     3. GOBERNADOR — personal finance
     4. NASAYANG   — wasted resources (overflow losses)
     5. RANK       — leader rank and progression with animated badge

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
import { getRankFromScore, getNextRank } from '../ranking/rankingSystem.js';
import { RANK_DRAWERS, BADGE_SIZE } from '../ranking/rankBadges.js';

/* ── State ────────────────────────────────────────────────── */
var _injected    = false;
var _panelOpen   = false;
var _sections    = { nayon: true, gov: true, gobern: true, waste: true, rank: true };
var _prevValues  = {};
var _floaters    = [];
var _lastUpdate  = 0;
var _rankCanvas   = null;
var _rankAnimationFrame = null;

var WASTE_WARN   = 200;   /* total waste threshold for warning */

/* ══════════════════════════════════════════════════════════════
   initDashboard
══════════════════════════════════════════════════════════════ */
export function initDashboard() {
  if (_injected) return;
  _injectStyles();
  _buildDOM();
  _injected = true;

  /* Ensure panel starts closed */
  var panel = document.getElementById('left-dashboard-panel');
  if (panel) panel.classList.remove('open');

  /* Start rank badge animation */
  _startRankBadgeAnimation();

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

    /* Section summary (shown when collapsed inside panel) */
    var sum = document.getElementById('sb-waste-sum');
    if (sum) sum.textContent = '🗑️' + total;
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

/* Start rank badge animation */
function _startRankBadgeAnimation() {
  function animate() {
    _updateRankBadgeCanvas();
    _rankAnimationFrame = requestAnimationFrame(animate);
  }
  animate();
}

/* Update rank badge canvas with animation */
function _updateRankBadgeCanvas() {
  if (!_rankCanvas) {
    _rankCanvas = document.getElementById('sb-rank-badge-canvas');
  }
  if (!_rankCanvas || !window._VS) return;
  
  const rank = getRankFromScore(window._VS.rank.score);
  const drawer = RANK_DRAWERS[rank.id];
  if (drawer) {
    const ctx = _rankCanvas.getContext('2d');
    // Clear canvas before drawing
    ctx.clearRect(0, 0, _rankCanvas.width, _rankCanvas.height);
    // Draw the badge
    drawer(ctx, _rankCanvas.width, _rankCanvas.height, performance.now());
  }
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

  /* ── RANK ─────────────────────────────────────────────── */
  _updateRankDisplay(VS);

  _tickFloaters(dt);
}

/* ══════════════════════════════════════════════════════════════
   toggleDashboard
══════════════════════════════════════════════════════════════ */
export function toggleDashboard() { _togglePanel(); }

/* ── Internal ─────────────────────────────────────────────── */
function _togglePanel() {
  _panelOpen = !_panelOpen;
  var panel = document.getElementById('left-dashboard-panel');
  var handle = document.getElementById('dashboard-handle');
  var handleArrow = document.getElementById('handle-arrow');
  if (!panel) return;
  
  if (_panelOpen) {
    panel.classList.add('open');
    if (handle) handle.classList.add('open');
    if (handleArrow) handleArrow.textContent = '◀';
  } else {
    panel.classList.remove('open');
    if (handle) handle.classList.remove('open');
    if (handleArrow) handleArrow.textContent = '▶';
  }
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
window._sbTogglePanel = _togglePanel;

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

/* ── Rank Display Update ────────────────────────────────────── */
function _updateRankDisplay(VS) {
  if (!VS.rank) return;
  
  var rank = getRankFromScore(VS.rank.score);
  var nextRank = getNextRank(VS.rank.score);
  
  var titleEl = document.getElementById('sb-rank-title');
  var scoreEl = document.getElementById('sb-rank-score');
  var progressLabel = document.getElementById('sb-rank-progress-label');
  var progressBar = document.getElementById('sb-rank-progress-bar');
  var progressText = document.getElementById('sb-rank-progress-text');
  var bonusEl = document.getElementById('sb-rank-bonus');
  
  if (titleEl) titleEl.textContent = rank.title;
  if (scoreEl) scoreEl.textContent = Math.floor(VS.rank.score) + ' pts';
  if (bonusEl) bonusEl.textContent = '✨ +' + rank.bonus + '% approval bonus';
  
  if (nextRank) {
    var pointsNeeded = nextRank.scoreRequired - VS.rank.score;
    var pointsInRank = VS.rank.score - rank.scoreRequired;
    var rankRange = nextRank.scoreRequired - rank.scoreRequired;
    var percent = (pointsInRank / rankRange) * 100;
    
    if (progressLabel) progressLabel.textContent = 'Next: ' + nextRank.title;
    if (progressBar) progressBar.style.width = Math.min(100, Math.max(0, percent)) + '%';
    if (progressText) progressText.textContent = Math.floor(pointsInRank) + ' / ' + rankRange + ' points';
  } else {
    if (progressLabel) progressLabel.textContent = 'MAX RANK!';
    if (progressBar) progressBar.style.width = '100%';
    if (progressText) progressText.textContent = 'Legendary Leader!';
  }
  
  var rankSum = document.getElementById('sb-rank-sum');
  if (rankSum) rankSum.textContent = rank.badge + ' ' + rank.title;
  
  // Update the badge canvas
  _updateRankBadgeCanvas();
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
  if (!container || document.getElementById('left-dashboard-panel')) return;

  /* Create the panel wrapper */
  var panel = document.createElement('div');
  panel.id = 'left-dashboard-panel';
  
  /* Create the handle/tab button */
  var handle = document.createElement('div');
  handle.id = 'dashboard-handle';
  handle.className = 'dashboard-handle';
  handle.innerHTML = `
    <div class="handle-inner">
      <div class="handle-arrow" id="handle-arrow">▶</div>
    </div>
  `;
  handle.onclick = function(e) { 
    e.stopPropagation();
    _togglePanel(); 
  };
  
  /* Create the inner content */
  var content = document.createElement('div');
  content.id = 'dashboard-content';
  content.className = 'dashboard-content';
  
  content.innerHTML =
    /* Header with close button */
    '<div class="db-header">' +
      '<div class="db-title">🏡<span>NAYON DASHBOARD</span></div>' +
      '<button class="db-close-btn" onclick="window._sbTogglePanel()">✕</button>' +
    '</div>' +

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

    /* 5 — RANK (with animated badge canvas - FIXED SIZING) */
    '<div class="sb-section" id="sb-section-rank" onclick="window.openRankModal && window.openRankModal(window._VS)">' +
      _sectionHead('rank', '🏆', 'RANK', 'sb-rank-sum') +
      '<div class="sb-body" id="sb-body-rank">' +
        '<div class="rank-display-with-badge">' +
          '<div class="rank-badge-wrapper-dashboard">' +
            '<canvas class="rank-badge-dashboard" id="sb-rank-badge-canvas" width="80" height="80" style="width: 80px; height: 80px; display: block;"></canvas>' +
          '</div>' +
          '<div class="rank-info-dashboard">' +
            '<div class="rank-title-dashboard" id="sb-rank-title">Humble Start</div>' +
            '<div class="rank-score-dashboard" id="sb-rank-score">0 pts</div>' +
          '</div>' +
        '</div>' +
        '<div class="rank-progress-container" id="sb-rank-progress-container">' +
          '<div class="rank-progress-label" id="sb-rank-progress-label">Next: Rising Leader</div>' +
          '<div class="rank-progress-bar-bg">' +
            '<div class="rank-progress-bar" id="sb-rank-progress-bar" style="width:0%"></div>' +
          '</div>' +
          '<div class="rank-progress-text" id="sb-rank-progress-text">0 / 100 points</div>' +
        '</div>' +
        '<div class="rank-bonus-info" id="sb-rank-bonus">✨ +0% approval bonus</div>' +
        '<div class="rank-click-hint">📊 I-click para tingnan ang lahat ng ranggo</div>' +
      '</div>' +
    '</div>';

  panel.appendChild(handle);
  panel.appendChild(content);
  container.appendChild(panel);
  
  // Store reference to rank canvas for animation
  _rankCanvas = document.getElementById('sb-rank-badge-canvas');
  
  console.log('[Dashboard] Panel created with animated rank badge');
}
/* ══════════════════════════════════════════════════════════════
   Styles - With badge canvas styles
══════════════════════════════════════════════════════════════ */
function _injectStyles() {
  if (document.getElementById('db-styles')) return;
  var s = document.createElement('style');
  s.id  = 'db-styles';
  s.textContent = `
/* ═══════════════════════════════════════════════════════════════
   DASHBOARD PANEL — Slide-out left panel
═══════════════════════════════════════════════════════════════ */

#left-dashboard-panel {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: rgb(10 6 2 / 73%);
  border-right: 2px solid #c49a4e;
  z-index: 900;
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
  pointer-events: none;
  font-family: monospace;
  box-shadow: 5px 0 25px rgba(0,0,0,0.6);
  height: 100vh;
}

#left-dashboard-panel.open {
  width: 320px;
  pointer-events: all;
}

/* HANDLE BUTTON */
.dashboard-handle {
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 80px;
  background: linear-gradient(135deg, #3a2a1a 0%, #2a1a0a 100%);
  border: 2px solid #f5c842;
  border-left: none;
  border-radius: 0 24px 24px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1);
  z-index: 901;
  pointer-events: auto;
  box-shadow: 3px 0 12px rgba(0,0,0,0.4);
}

#left-dashboard-panel.open .dashboard-handle {
  z-index: 902;
  left: 320px;
}

.dashboard-handle:hover {
  width: 58px;
  height: 96px;
  background: linear-gradient(135deg, #5a3a2a 0%, #3a2a1a 100%);
  border-color: #ffdd88;
  box-shadow: 4px 0 20px rgba(245,200,66,0.5);
  border-radius: 0 28px 28px 0;
  z-index: 903;
}

.dashboard-handle.open {
  left: 320px;
  width: 44px;
  height: 72px;
  background: linear-gradient(135deg, #2a1a0a 0%, #1a1208 100%);
  border-color: #c49a4e;
  box-shadow: 2px 0 10px rgba(0,0,0,0.4);
}

.dashboard-handle.open:hover {
  left: 310px;
  width: 54px;
  height: 86px;
}

.dashboard-handle .handle-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  transition: all 0.2s ease;
}

.dashboard-handle .handle-arrow {
  font-size: 16px;
  color: #f5c842;
  margin-top: 2px;
  font-weight: bold;
  transition: all 0.2s;
  background: rgba(0,0,0,0.3);
  padding: 2px 5px;
  border-radius: 10px;
}

.dashboard-handle:hover .handle-arrow {
  transform: translateX(6px);
  font-size: 18px;
}

/* Panel content */
.dashboard-content {
  position: relative;
  z-index: 903;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 2px 12px 8px 12px;
  scrollbar-width: thin;
  scrollbar-color: #c49a4e #2a1808;
}

.dashboard-content::-webkit-scrollbar {
  width: 4px;
}

/* Header */
.db-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 4px 12px 4px;
  margin-bottom: 10px;
  border-bottom: 2px solid #3a2a18;
}

.db-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Slackey', sans-serif;
  font-size: 13px;
  color: #f5c842;
  letter-spacing: 0.08em;
}

.db-title span {
  font-size: 11px;
  color: #c49a4e;
  letter-spacing: 0.05em;
}

.db-close-btn {
  background: rgba(42,24,12,0.9);
  border: 1px solid #c49a4e;
  color: #f5c842;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

/* Section styles */
.sb-section {
  border-top: 1px solid #2a1a0a;
  margin-bottom: 6px;
  cursor: pointer;
}

.sb-section-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 6px 8px 4px;
  background: rgba(26,18,8,0.3);
  user-select: none;
  transition: background 0.15s;
  border-radius: 6px;
}

.sb-section-head:hover {
  background: rgba(58,38,22,0.7);
}

.sb-section-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.sb-section-title {
  font-family: 'Oldenburg', serif;
  font-size: 12px;
  color: #d69c5a;
  letter-spacing: 0.06em;
  flex: 1;
  font-weight: bold;
}

.sb-section-sum {
  font-size: 10px;
  color: #c49a4e;
  font-family: monospace;
  white-space: nowrap;
  margin-right: 3px;
}

.sb-section-toggle {
  font-size: 11px;
  color: #8a6030;
  flex-shrink: 0;
}

.sb-body {
  padding: 6px 6px 10px 12px;
  display: block;
}
.sb-body {
  overflow: visible !important;
}

#sb-body-rank {
  overflow: visible !important;
}
/* Rank Display with Badge */
.rank-display-with-badge {
  display: flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, #2a1a0a, #1a1208);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid #c49a4e;
  overflow: visible;
}

.rank-badge-dashboard {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.rank-info-dashboard {
  flex: 1;
  min-width: 0;
}
.rank-title-dashboard {
  font-family: 'Slackey', sans-serif;
  font-size: 14px;
  color: #f5c842;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-score-dashboard {
  font-family: monospace;
  font-size: 11px;
  color: #88dd88;
}

/* Progress bar */
.rank-progress-container {
  margin: 12px 0;
}

.rank-progress-label {
  font-size: 10px;
  color: #c49a4e;
  margin-bottom: 4px;
}

.rank-progress-bar-bg {
  background: #2a1a10;
  border-radius: 12px;
  height: 6px;
  overflow: hidden;
}

.rank-progress-bar {
  background: linear-gradient(90deg, #f5c842, #ffdd88);
  height: 100%;
  width: 0%;
  transition: width 0.5s ease;
  border-radius: 12px;
}

.rank-progress-text {
  font-size: 9px;
  color: #8a6a48;
  margin-top: 4px;
  text-align: center;
  font-family: monospace;
}

.rank-bonus-info {
  font-size: 10px;
  color: #88dd88;
  text-align: center;
  padding: 6px;
  background: rgba(68,170,68,0.1);
  border-radius: 8px;
  margin-top: 8px;
}

.rank-click-hint {
  font-size: 9px;
  color: #c49a4e;
  text-align: center;
  margin-top: 8px;
  padding: 4px;
  border-top: 1px solid #2a1a0a;
  opacity: 0.7;
  transition: opacity 0.2s;
}

#sb-section-rank:hover .rank-click-hint {
  opacity: 1;
  color: #f5c842;
}

/* Other rows */
.sb-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  position: relative;
}

.sb-lbl {
  font-size: 11px;
  color: #b88c54;
  width: 85px;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sb-bar-wrap {
  flex: 1;
  height: 5px;
  background: #2a1a0a;
  border-radius: 3px;
  overflow: hidden;
}

.sb-bar {
  height: 100%;
  width: 50%;
  background: #f5c842;
  border-radius: 3px;
  transition: width 0.4s ease, background 0.4s ease;
}

.sb-val {
  font-size: 11px;
  color: #f0e0b0;
  text-align: right;
  min-width: 55px;
  white-space: nowrap;
}

.sb-election-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 0 6px;
  border-top: 1px solid #2a1a0a;
  margin-top: 5px;
}

.sb-activity {
  font-size: 10px;
  color: #8a6a48;
  line-height: 1.4;
  padding: 5px 0 3px;
  border-top: 1px solid #2a1a0a;
  margin-top: 5px;
}

.sb-waste-warn {
  font-size: 10px;
  color: #ffaa77;
  background: rgba(180, 60, 20, 0.25);
  border: 1px solid #8a4020;
  border-radius: 4px;
  padding: 6px 8px;
  margin: 6px 0 4px;
  line-height: 1.4;
}

.sb-floater {
  position: absolute;
  font-family: monospace;
  font-size: 10px;
  font-weight: bold;
  pointer-events: none;
  white-space: nowrap;
  z-index: 1000;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
}

/* Mobile responsive */
@media (max-width: 768px) {
  #left-dashboard-panel.open {
    width: 280px;
  }
  #left-dashboard-panel.open .dashboard-handle {
    left: 280px;
  }
  .rank-badge-dashboard {
    width: 60px !important;
    height: 60px !important;
  }
  .rank-title-dashboard {
    font-size: 12px;
  }
  .sb-lbl {
    width: 75px;
    font-size: 10px;
  }
  .sb-val {
    min-width: 50px;
    font-size: 10px;
  }
      .rank-display-with-badge {
    gap: 12px;
    padding: 10px;
  }
}

@media (max-width: 480px) {
  #left-dashboard-panel.open {
    width: 260px;
  }
  #left-dashboard-panel.open .dashboard-handle {
    left: 260px;
  }
  .rank-badge-dashboard {
    width: 50px !important;
    height: 50px !important;
  }
  .rank-title-dashboard {
    font-size: 11px;
  }
      .rank-display-with-badge {
    gap: 10px;
    padding: 8px;
  }
}
  `;
  document.head.appendChild(s);
}