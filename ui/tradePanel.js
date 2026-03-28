/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — ui/tradePanel.js  (updated with langis)

   TRADE SIDEBAR
   ─────────────────────────────────────────────────────────────
   Right-side collapsible panel showing:
     TOP:    Reputation bar
     MIDDLE: Export contracts (country task board)
     BOTTOM: Import order form + pending deliveries
     
   UPDATED: Added langis support for import/export
═══════════════════════════════════════════════════════════════ */

import { getTradeState, fulfillExport, placeImportOrder, getImportPrices } from '../resources/trade.js';

var _VS      = null;
var _showMsg = null;
var _panel   = null;
var _open    = false;

/* ══════════════════════════════════════════════════════════════
   initTradePanel
══════════════════════════════════════════════════════════════ */
export function initTradePanel(deps) {
  _VS      = deps.VS;
  _showMsg = deps.showMsg;
  _injectStyles();
  _buildPanel();
  window.openTradePanel  = openTradePanel;
  window.closeTradePanel = closeTradePanel;
}

export function openTradePanel() {
  if (_panel) { _panel.style.right = '0'; _open = true; _refresh(); }
}
export function closeTradePanel() {
  if (_panel) { _panel.style.right = '-320px'; _open = false; }
}

/* ── Refresh every second when open ──────────────────────── */
export function refreshTradePanel(VS) {
  _VS = VS;
  if (_open) _refresh();
}

/* ══════════════════════════════════════════════════════════════
   _refresh — re-render panel contents
══════════════════════════════════════════════════════════════ */
function _refresh() {
  var state  = getTradeState(_VS);
  var prices = getImportPrices(_VS);
  var gold   = Math.floor(_VS.res.gold);

  /* Reputation */
  document.getElementById('tp-rep-val').textContent  = state.reputation + '/100';
  document.getElementById('tp-rep-bar').style.width  = state.reputation + '%';
  var repColor = state.reputation > 60 ? '#44aa44' : state.reputation > 35 ? '#c49a4e' : '#e74c3c';
  document.getElementById('tp-rep-bar').style.background = repColor;

  /* Export contracts */
  var expBox = document.getElementById('tp-contracts');
  if (state.contracts.length === 0) {
    var cdMsg = state.contractCooldown > 0
      ? 'Susunod na contract sa ' + state.contractCooldown + 's...'
      : 'Walang aktibong contract.';
    expBox.innerHTML = '<div class="tp-empty">' + cdMsg + '</div>';
  } else {
    expBox.innerHTML = state.contracts.map(function(c) {
      var pct      = c.timeLeft / c.timeMax;
      var timerStr = c.timeLeft < 60
        ? Math.ceil(c.timeLeft) + 's'
        : Math.ceil(c.timeLeft / 60) + 'm' + (Math.ceil(c.timeLeft) % 60 ? Math.ceil(c.timeLeft) % 60 + 's' : '');
      var barColor = pct > 0.5 ? '#44aa44' : pct > 0.25 ? '#c49a4e' : '#e74c3c';
      var canAfford = (_VS.res[c.res] || 0) >= c.amount;
      return [
        '<div class="tp-contract">',
          '<div class="tp-contract-head">',
            '<span class="tp-flag">' + c.flag + '</span>',
            '<span class="tp-country">' + c.country + '</span>',
            '<span class="tp-timer" style="color:' + barColor + '">' + timerStr + '</span>',
          '</div>',
          '<div class="tp-contract-detail">',
            'Kailangan: <strong>' + c.amount + '</strong> ' + _resIcon(c.res),
            ' → <strong class="tp-reward">+' + c.reward + '🪙</strong>',
          '</div>',
          '<div class="tp-bar-wrap"><div class="tp-bar" style="width:' + Math.round(pct * 100) + '%;background:' + barColor + '"></div></div>',
          '<button class="tp-btn tp-sell' + (canAfford ? '' : ' tp-disabled') + '" data-cid="' + c.id + '">',
            canAfford ? 'Ibenta ✓' : 'Kulang (' + Math.floor(_VS.res[c.res] || 0) + '/' + c.amount + ')',
          '</button>',
        '</div>',
      ].join('');
    }).join('');

    /* Wire sell buttons */
    expBox.querySelectorAll('.tp-sell:not(.tp-disabled)').forEach(function(btn) {
      btn.onclick = function() {
        var r = fulfillExport(btn.dataset.cid, _VS, _showMsg);
        if (!r.ok && _showMsg) _showMsg(r.msg);
        _refresh();
      };
    });
  }

  /* Pending imports */
  var pendBox = document.getElementById('tp-pending');
  if (state.pendingImports.length === 0) {
    pendBox.innerHTML = '<div class="tp-empty">Walang pending na import.</div>';
  } else {
    pendBox.innerHTML = state.pendingImports.map(function(imp) {
      var pct = 1 - imp.timeLeft / imp.timeMax;
      var eta = imp.timeLeft < 60 ? Math.ceil(imp.timeLeft) + 's' : Math.ceil(imp.timeLeft / 60) + 'min';
      return [
        '<div class="tp-pending-row">',
          '<span>' + _resIcon(imp.res) + ' ' + imp.amount + ' ' + imp.res.toUpperCase() + '</span>',
          '<span class="tp-eta">ETA: ' + eta + '</span>',
          '<div class="tp-bar-wrap"><div class="tp-bar tp-bar-import" style="width:' + Math.round(pct * 100) + '%"></div></div>',
        '</div>',
      ].join('');
    }).join('');
  }

  /* Import prices */
  document.getElementById('tp-price-rice').textContent   = prices.rice  + '🪙/unit';
  document.getElementById('tp-price-langis').textContent = prices.langis + '🪙/unit';
  document.getElementById('tp-gold-avail').textContent   = gold + '🪙';

  /* History */
  var histBox = document.getElementById('tp-history');
  if (state.history.length === 0) {
    histBox.innerHTML = '<div class="tp-empty">Walang kasaysayan.</div>';
  } else {
    histBox.innerHTML = state.history.map(function(h) {
      var icon = h.success ? '✅' : '❌';
      return '<div class="tp-hist-row">' + icon + ' ' + (h.flag || '') + ' ' + h.amount + ' ' + _resIcon(h.res) + '</div>';
    }).join('');
  }
}

function _resIcon(res) {
  return { rice: '🌾', gold: '🪙', langis: '⛽' }[res] || res;
}

/* ── Order submission ─────────────────────────────────────── */
function _submitImport() {
  var resEl = document.getElementById('tp-import-res');
  var amtEl = document.getElementById('tp-import-amt');
  var res   = resEl ? resEl.value : 'rice';
  var amount = parseInt(amtEl ? amtEl.value : '0');

  if (!amount || amount < 1) { 
    if (_showMsg) _showMsg('Maglagay ng dami.'); 
    return; 
  }
  
  // Validate amount is reasonable
  if (amount > 500) {
    if (_showMsg) _showMsg('Masyadong malaki ang dami. Max 500 units per order.', 'warning');
    return;
  }

  var r = placeImportOrder(res, amount, _VS, _showMsg);
  if (!r.ok && _showMsg) _showMsg(r.msg);
  if (r.ok) { 
    amtEl.value = ''; 
    _refresh(); 
  }
}

/* ══════════════════════════════════════════════════════════════
   DOM + Styles (updated with langis support)
══════════════════════════════════════════════════════════════ */
function _buildPanel() {
  var container = document.getElementById('canvas-container');
  if (!container || document.getElementById('trade-panel')) return;

  _panel = document.createElement('div');
  _panel.id        = 'trade-panel';
  _panel.innerHTML = [
    '<div class="tp-header">',
      '<span>⚓ Kalakalan</span>',
      '<button class="tp-close" onclick="closeTradePanel()">✕</button>',
    '</div>',

    /* Reputation */
    '<div class="tp-section">',
      '<div class="tp-sec-label">Reputasyon</div>',
      '<div class="tp-rep-row">',
        '<div class="tp-bar-wrap"><div id="tp-rep-bar" class="tp-bar" style="width:50%;background:#c49a4e"></div></div>',
        '<span id="tp-rep-val" class="tp-rep-val">50/100</span>',
      '</div>',
    '</div>',

    /* Export contracts */
    '<div class="tp-section">',
      '<div class="tp-sec-label">📤 Export Contracts</div>',
      '<div id="tp-contracts"><div class="tp-empty">Naglo-load...</div></div>',
    '</div>',

    /* Import form */
    '<div class="tp-section">',
      '<div class="tp-sec-label">📥 Mag-import</div>',
      '<div class="tp-price-row">',
        '<span>🌾 Bigas: <span id="tp-price-rice">—</span></span>',
        '<span>⛽ Langis: <span id="tp-price-langis">—</span></span>',
      '</div>',
      '<div class="tp-import-form">',
        '<select id="tp-import-res" class="tp-select">',
          '<option value="rice">🌾 Bigas</option>',
          '<option value="langis">⛽ Langis</option>',
        '</select>',
        '<input id="tp-import-amt" class="tp-input" type="number" min="1" max="500" placeholder="Dami" />',
        '<button class="tp-btn tp-order" id="tp-order-btn">Order</button>',
      '</div>',
      '<div class="tp-gold-row">Available: <span id="tp-gold-avail">—</span></div>',
    '</div>',

    /* Pending deliveries */
    '<div class="tp-section">',
      '<div class="tp-sec-label">🚢 Pending Deliveries</div>',
      '<div id="tp-pending"><div class="tp-empty">Wala.</div></div>',
    '</div>',

    /* History */
    '<div class="tp-section tp-section-last">',
      '<div class="tp-sec-label">📋 History</div>',
      '<div id="tp-history"><div class="tp-empty">Wala pa.</div></div>',
    '</div>',
  ].join('');

  container.appendChild(_panel);

  /* Wire order button */
  document.getElementById('tp-order-btn').addEventListener('click', _submitImport);
  document.getElementById('tp-import-amt').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') _submitImport();
  });
}

function _injectStyles() {
  if (document.getElementById('tp-styles')) return;
  var s = document.createElement('style');
  s.id  = 'tp-styles';
  s.textContent = [
    '#trade-panel{',
    '  position:absolute; top:0; right:-320px; width:300px; height:100%;',
    '  background:rgba(10,6,2,0.97); border-left:1.5px solid #3a2010;',
    '  z-index:25; overflow-y:auto; overflow-x:hidden;',
    '  transition:right 0.3s ease;',
    '  display:flex; flex-direction:column; gap:0;',
    '  font-family:"Crimson Pro",Georgia,serif;',
    '  scrollbar-width:thin; scrollbar-color:#3a2010 #0e0905;',
    '}',
    '#trade-panel::-webkit-scrollbar{width:4px;}',
    '#trade-panel::-webkit-scrollbar-thumb{background:#3a2010;border-radius:2px;}',
    '.tp-header{',
    '  display:flex; justify-content:space-between; align-items:center;',
    '  padding:12px 14px; border-bottom:1px solid #2a1808;',
    '  font-family:"Oldenburg",serif; font-size:14px; color:#f5c842;',
    '  position:sticky; top:0; background:rgba(10,6,2,0.98); z-index:2;',
    '}',
    '.tp-close{',
    '  background:#2a1808; border:1px solid #8a6030; color:#f5c842;',
    '  width:26px; height:26px; border-radius:50%; cursor:pointer;',
    '  font-size:13px; transition:background .15s;',
    '}',
    '.tp-close:hover{background:#4a2810;}',
    '.tp-section{',
    '  padding:10px 12px; border-bottom:1px solid #1a1008;',
    '}',
    '.tp-section-last{border-bottom:none;}',
    '.tp-sec-label{',
    '  font-family:"Oldenburg",serif; font-size:12px; color:#8a6030;',
    '  letter-spacing:.06em; margin-bottom:7px;',
    '}',
    '.tp-rep-row{display:flex; gap:8px; align-items:center;}',
    '.tp-rep-val{font-family:monospace; font-size:13px; color:#f5c842; white-space:nowrap;}',
    '.tp-bar-wrap{flex:1; height:6px; background:#1a1008; border-radius:3px; overflow:hidden;}',
    '.tp-bar{height:100%; border-radius:3px; transition:width .4s ease, background .4s ease;}',
    '.tp-bar-import{background:#4a8fc4;}',
    '.tp-contract{',
    '  background:#1a1208; border:1px solid #2a1808; border-radius:6px;',
    '  padding:8px 10px; margin-bottom:7px;',
    '}',
    '.tp-contract:last-child{margin-bottom:0;}',
    '.tp-contract-head{display:flex; align-items:center; gap:6px; margin-bottom:5px;}',
    '.tp-flag{font-size:18px; line-height:1;}',
    '.tp-country{font-family:"Oldenburg",serif; font-size:13px; color:#f5c842; flex:1;}',
    '.tp-timer{font-family:monospace; font-size:13px; font-weight:bold;}',
    '.tp-contract-detail{font-size:14px; color:#c8a878; margin-bottom:5px;}',
    '.tp-reward{color:#ffcc44;}',
    '.tp-btn{',
    '  width:100%; padding:6px 0; margin-top:6px;',
    '  font-family:"Oldenburg",serif; font-size:12px; font-weight:bold;',
    '  border-radius:4px; cursor:pointer; transition:background .15s;',
    '}',
    '.tp-sell{background:#1a3010; border:1px solid #44aa44; color:#88ee88;}',
    '.tp-sell:hover{background:#2a4a18;}',
    '.tp-disabled{background:#1a1208; border:1px solid #3a2010; color:#6a5030; cursor:not-allowed;}',
    '.tp-empty{font-size:13px; color:#554433; font-style:italic; text-align:center; padding:6px 0;}',
    '.tp-price-row{display:flex; justify-content:space-between; font-size:13px; color:#8a7050; margin-bottom:7px;}',
    '.tp-import-form{display:flex; gap:5px; margin-bottom:5px;}',
    '.tp-select{',
    '  flex:1.2; background:#1a1008; border:1px solid #3a2010; color:#e8d4a0;',
    '  font-family:"Crimson Pro",serif; font-size:14px; padding:4px 5px;',
    '  border-radius:4px;',
    '}',
    '.tp-input{',
    '  flex:1; background:#1a1008; border:1px solid #3a2010; color:#e8d4a0;',
    '  font-family:monospace; font-size:14px; padding:4px 6px;',
    '  border-radius:4px; width:0;',
    '}',
    '.tp-input:focus,.tp-select:focus{outline:none; border-color:#c49a4e;}',
    '.tp-order{',
    '  flex-shrink:0; padding:4px 10px;',
    '  background:#1a0f06; border:1px solid #c49a4e; color:#f5c842;',
    '  font-family:"Oldenburg",serif; font-size:12px; font-weight:bold;',
    '  border-radius:4px; cursor:pointer; white-space:nowrap;',
    '}',
    '.tp-order:hover{background:#2a1808;}',
    '.tp-gold-row{font-size:13px; color:#6a5030; margin-top:2px;}',
    '.tp-pending-row{',
    '  font-size:14px; color:#c8a878;',
  '  display:flex; flex-direction:column; gap:3px; margin-bottom:6px;',
    '}',
    '.tp-pending-row>:first-child{display:flex; justify-content:space-between;}',
    '.tp-eta{font-family:monospace; font-size:13px; color:#4a8fc4;}',
    '.tp-hist-row{font-size:13px; color:#8a7050; padding:2px 0; border-bottom:1px solid #1a1008;}',
    '.tp-hist-row:last-child{border-bottom:none;}',
    /* Mobile adjustments */
    '@media (max-width: 768px) {',
    '  #trade-panel { width: 280px; right: -280px; }',
    '  .tp-header { padding: 8px 12px; font-size: 13px; }',
    '  .tp-section { padding: 8px 10px; }',
    '  .tp-sec-label { font-size: 11px; }',
    '  .tp-contract-detail { font-size: 12px; }',
    '  .tp-btn { font-size: 11px; padding: 5px 0; }',
    '  .tp-select, .tp-input { font-size: 12px; }',
    '}',
  ].join('\n');
  document.head.appendChild(s);
}