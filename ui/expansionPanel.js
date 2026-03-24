/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — ui/expansionPanel.js  (rewritten for 9-zone system)

   Now renders content via window.renderExpandContent() which is
   called by the unified side panel in index.html.
   Also keeps the legacy openExpansionPanel() for backward compat.
═══════════════════════════════════════════════════════════════ */

var _deps      = null;
var _injected  = false;

export function initExpansionPanel(deps) {
  _deps     = deps;
  _injected = true;

  /* Expose render function for the side panel engine in index.html */
  window.renderExpandContent = function() {
    return _renderZoneGrid();
  };
}

export function openExpansionPanel() {
  /* Delegate to the unified side panel */
  if (window.openSidePanel) {
    window.openSidePanel('expand');
  }
}

export function closeExpansionPanel() {
  if (window.closeSidePanel) window.closeSidePanel();
}

/* ── Build zone grid HTML for the side panel ─────────────── */
function _renderZoneGrid() {
  var VS       = _deps ? _deps.VS : window._VS;
  var ZONE_DEFS = window.ZONE_DEFS || {};
  var isUnlocked = window.isZoneUnlocked || function() { return false; };
  var buy       = window.purchaseZone   || function() {};

  /* Build 3x3 grid layout as HTML table */
  var grid = [
    ['kalikasan','dagat','lungsod'],
    ['bukid','sentro','bundok'],
    ['depensa','langis','kalye'],
  ];

  var rows = grid.map(function(row) {
    var cells = row.map(function(key) {
      var z      = ZONE_DEFS[key];
      if (!z) return '<td class="ez-cell"></td>';
      var owned  = isUnlocked(key);
      var mhLv   = 1;
      (VS.buildings||[]).forEach(function(b) { if (b.type==='mainHall') mhLv=Math.max(mhLv,b.level); });
      var locked  = !owned && mhLv < z.prereqHall;
      var canAfford = VS && !locked && !owned &&
        (VS.res.gold||0) >= z.cost.gold &&
        (VS.res.rice||0) >= z.cost.rice &&
        (VS.res.langis||0) >= z.cost.langis;

      var stateClass = owned ? 'ez-owned' : locked ? 'ez-locked' : canAfford ? 'ez-affordable' : 'ez-unavail';

      var content =
        '<div class="ez-icon">' + z.icon + '</div>' +
        '<div class="ez-name">' + z.label + '</div>' +
        (owned
          ? '<div class="ez-badge-own">✓ Na-unlock</div>'
          : locked
            ? '<div class="ez-badge-lock">Hall Lv' + z.prereqHall + '</div>'
            : '<div class="ez-cost">' + z.cost.gold + '🪙' +
              (z.cost.rice ? ' ' + z.cost.rice + '🌾' : '') +
              (z.cost.langis ? ' ' + z.cost.langis + '💧' : '') + '</div>' +
              '<button class="ez-buy' + (canAfford ? '' : ' ez-buy-dim') + '" onclick="window.purchaseZone(\'' + key + '\');if(window.openSidePanel)window.openSidePanel(\'expand\')">Bilhin</button>'
        );

      return '<td class="ez-cell ' + stateClass + '" title="' + z.desc + '">' + content + '</td>';
    }).join('');
    return '<tr>' + cells + '</tr>';
  }).join('');

  /* Resource legend */
  var legend = Object.keys(ZONE_DEFS).filter(function(k) {
    return isUnlocked(k) && Object.keys(ZONE_DEFS[k].resourceBonus||{}).length > 0;
  }).map(function(k) {
    var z = ZONE_DEFS[k];
    var bonuses = Object.keys(z.resourceBonus).map(function(r) {
      return '+' + Math.round((z.resourceBonus[r]-1)*100) + '% ' + ({rice:'🌾',gold:'🪙',langis:'💧'}[r]||r);
    }).join(', ');
    return '<div class="ez-bonus-row">' + z.icon + ' ' + z.label + ': <span>' + bonuses + '</span></div>';
  }).join('');

  return '<table class="ez-grid"><tbody>' + rows + '</tbody></table>' +
    (legend ? '<div class="ez-bonus-header">Aktibong Bonus</div>' + legend : '') +
    _ezStyles();
}

function _ezStyles() {
  if (document.getElementById('ez-styles')) return '';
  var s = document.createElement('style');
  s.id  = 'ez-styles';
  s.textContent = [
    '.ez-grid{width:100%;border-collapse:collapse;table-layout:fixed;}',
    '.ez-cell{width:33.33%;aspect-ratio:1;border:1px solid #2a1808;text-align:center;',
    '  vertical-align:middle;padding:6px 4px;font-size:11px;',
    '  font-family:"Crimson Pro",serif;transition:background .15s;cursor:default;',
    '  position:relative;}',
    '.ez-owned{background:#0a1a08;border-color:#2a6a2a;}',
    '.ez-owned .ez-name{color:#88ee88;}',
    '.ez-locked{background:#0a0604;border-color:#2a1808;opacity:.65;}',
    '.ez-affordable{background:#1a1208;border-color:#8a6030;cursor:pointer;}',
    '.ez-affordable:hover{background:#2a1808;}',
    '.ez-unavail{background:#1a1208;opacity:.7;}',
    '.ez-cell:nth-child(2):nth-last-child(2){background:#1a2a0a;}',
    '.ez-icon{font-size:22px;line-height:1;margin-bottom:3px;}',
    '.ez-name{font-family:"Oldenburg",serif;font-size:9px;color:#c49a4e;',
    '  letter-spacing:.04em;line-height:1.2;margin-bottom:3px;}',
    '.ez-badge-own{font-size:10px;color:#44aa44;font-weight:bold;}',
    '.ez-badge-lock{font-size:9px;color:#aa4444;font-family:monospace;}',
    '.ez-cost{font-family:monospace;font-size:9px;color:#8a7050;margin-bottom:3px;}',
    '.ez-buy{font-family:"Oldenburg",serif;font-size:9px;font-weight:bold;',
    '  background:#1a3010;border:1px solid #44aa44;color:#88ee88;',
    '  border-radius:3px;padding:2px 7px;cursor:pointer;transition:background .12s;}',
    '.ez-buy:hover{background:#2a4a18;}',
    '.ez-buy-dim{opacity:.4;cursor:not-allowed;background:#1a1208;border-color:#3a2010;color:#6a5030;}',
    '.ez-bonus-header{font-family:"Oldenburg",serif;font-size:11px;color:#8a6030;',
    '  letter-spacing:.05em;margin:12px 0 6px;border-top:1px solid #2a1808;padding-top:10px;}',
    '.ez-bonus-row{font-size:12px;color:#8a7050;padding:2px 0;}',
    '.ez-bonus-row span{color:#88ee88;}',
  ].join('\n');
  document.head.appendChild(s);
  return '';
}