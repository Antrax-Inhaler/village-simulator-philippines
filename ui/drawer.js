/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — ui/drawer.js

   BOTTOM DRAWER  (DOM-based panel — lifted from main.js)
   ─────────────────────────────────────────────────────────────
   Self-contained DOM component. main.js calls:
     initDrawer(deps)           — once, after canvas is ready
     openDrawer(target, kind)   — on entity click
     closeDrawer()              — on ✕ / Esc
     renderDrawer()             — after any state change

   UNLOCK BANNER FIX
   ─────────────────────────────────────────────────────────────
   _showUnlockBanner is now called from window.onHallUpgradeComplete,
   which is triggered by building.js when construction finishes
   (not at the moment the player clicks Upgrade). This prevents
   the banner appearing before the build timer ends.

   window.onHallUpgradeComplete(newLevel) must be called by
   building.js (or main.js building.update hook) when the
   mainHall's underConstruction flag clears.
═══════════════════════════════════════════════════════════════ */

import { showProcurementModal } from './procurementModal.js';

var _d = null;

var drawer = {
  visible:            false,
  tab:                'info',
  target:             null,
  kind:               'building',
  movingBuilding:     false,
  _selectedStudentId: null,
};

/* ══════════════════════════════════════════════════════════════
   initDrawer
══════════════════════════════════════════════════════════════ */
export function initDrawer(deps) {
  _d = deps;
  _injectStyles();
  _ensureDrawer();

  /*
    Hook called by building.js (or main.js) when mainHall
    construction completes. Fires the unlock banner at the
    correct moment — after the build timer, not on click.
  */
  window.onHallUpgradeComplete = function(newLevel) {
    _showUnlockBanner(newLevel, _d.BUILDING_DEFS);
  };
}

/* ══════════════════════════════════════════════════════════════
   openDrawer
══════════════════════════════════════════════════════════════ */
export function openDrawer(target, kind) {
  _ensureDrawer();
  drawer.visible             = true;
  drawer.target              = target;
  drawer.kind                = kind;
  drawer.movingBuilding      = false;
  drawer._selectedStudentId  = null;

  if (!target || kind === '_shop') {
    drawer.tab  = 'shop';
    drawer.kind = 'shop';
  } else if (kind === 'villager') {
    drawer.tab = 'info';
  } else if (target.type === 'paaralan' || target.type === 'cuartel') {
    drawer.tab = 'training';
  } else {
    drawer.tab = 'info';
  }

  var el = document.getElementById('bottom-drawer');
  if (el) {
    el.style.display = 'flex';
    requestAnimationFrame(function() { el.classList.add('open'); });
  }

  renderDrawer();

  if (target && kind === 'villager') {
    target.waitT = 9999; target.carrying = false;
    _d.zoomTo(target.x, target.y, target);
    _d.triggerPlayerGreeting(target, _d.VS.time, _d.activeBubbles);
  } else if (target && kind === 'building') {
    _d.zoomTo(target.x, target.y, null);
  }
}

/* ══════════════════════════════════════════════════════════════
   closeDrawer
══════════════════════════════════════════════════════════════ */
export function closeDrawer() {
  if (!drawer.visible) return;
  if (drawer.kind === 'villager' && drawer.target) drawer.target.waitT = 0.5;
  if (drawer.movingBuilding) {
    drawer.movingBuilding = false;
    _d.setGameMode('view');
  }
  drawer.visible = false; drawer.target = null;
  var el = document.getElementById('bottom-drawer');
  if (el) {
    el.classList.remove('open');
    setTimeout(function() { if (el && !drawer.visible) el.style.display = 'none'; }, 300);
  }
  _d.zoomOut();
}

export function isDrawerVisible() { return drawer.visible; }
export function getDrawerTarget()  { return drawer.target; }
export function getDrawerKind()    { return drawer.kind; }
export function isMovingBuilding() { return drawer.movingBuilding; }

/* ══════════════════════════════════════════════════════════════
   renderDrawer
══════════════════════════════════════════════════════════════ */
export function renderDrawer() {
  var tabs = document.getElementById('bd-tabs');
  var body = document.getElementById('bd-body');
  if (!tabs || !body) return;

  var tabDefs = [];
  if (drawer.kind === 'shop' || !drawer.target) {
    tabDefs.push({ id: 'shop', label: 'Tindahan' });
  } else {
    tabDefs.push({ id: 'info', label: 'Info' });
    tabDefs.push({ id: 'shop', label: 'Tindahan' });
    if (drawer.target && (drawer.target.type === 'paaralan' || drawer.target.type === 'cuartel')) {
      tabDefs.push({ id: 'training', label: 'Pagsasanay' });
    }
  }

  tabs.innerHTML = tabDefs.map(function(t) {
    return '<div class="bd-tab' + (drawer.tab === t.id ? ' active' : '') +
           '" data-tab="' + t.id + '">' + t.label + '</div>';
  }).join('');

  tabs.querySelectorAll('.bd-tab').forEach(function(el) {
    el.addEventListener('click', function() { drawer.tab = el.dataset.tab; renderDrawer(); });
  });

  if      (drawer.tab === 'info')     body.innerHTML = _renderInfoTab();
  else if (drawer.tab === 'shop')     body.innerHTML = _renderShopTab();
  else if (drawer.tab === 'training') body.innerHTML = _renderTrainingTab();

  _wireButtons();
}

/* ── Info tab ─────────────────────────────────────────────── */
function _renderInfoTab() {
  if (!drawer.target) return '';
  return drawer.kind === 'villager' ? _renderVillagerInfo() : _renderBuildingInfo();
}

function _renderVillagerInfo() {
  var v   = drawer.target;
  var VT  = _d.VILLAGER_TYPES;
  var vt  = VT[v.typeIdx] || VT[0];
  var moodIcons = { happy:'😊', tired:'😴', hungry:'😋', stressed:'😰', masaya:'😄', excited:'🤩' };

  var rows = [
    ['Mood',     (moodIcons[v.mood] || '🙂') + ' ' + v.mood, ''],
    ['Ugali',    v.personality, ''],
    ['Kasarian', v.gender === 'male' ? 'Lalaki' : 'Babae', ''],
    ['Trabaho',  vt.role, ''],
  ];

  if (v.hunger    !== undefined) rows.push(['Gutom',    Math.round(v.hunger) + '%',    v.hunger    > 60 ? 'bad' : 'good']);
  if (v.health    !== undefined) rows.push(['Kalusugan', Math.round(v.health) + '%',   v.health    < 40 ? 'bad' : 'good']);
  if (v.govTrust  !== undefined) rows.push(['Tiwala',   Math.round(v.govTrust) + '%',  v.govTrust  < 30 ? 'bad' : 'good']);
  if (v.income    !== undefined) rows.push(['Kita',     v.income + ' ginto/araw',       '']);
  if (v.isTraining)               rows.push(['Training',  Math.floor(v.trainingProgress * 100) + '%', 'gold']);
  rows.push(['Bahay', v.homeBuilding ? (v.isHome ? '🏠 Nasa loob' : v.homeBuilding.getDef().label) : '🏚️ Wala', v.homeBuilding ? '' : 'bad']);
  if (v.workBuilding && !v.underConstruction) {
    var wbLabel = v.workBuilding.getDef ? v.workBuilding.getDef().label : '?';
    rows.push(['Trabaho', v.isInsideWork ? '💼 ' + wbLabel + ' (nasa loob)' : '🚶 Papunta sa ' + wbLabel, '']);
  } else if (!v.workBuilding) {
    rows.push(['Trabaho', '❌ Walang trabaho', 'bad']);
  }

  var rowsHTML = rows.map(function(r) {
    return '<div class="bd-row"><span class="bd-row-label">' + r[0] +
           '</span><span class="bd-row-val ' + r[2] + '">' + r[1] + '</span></div>';
  }).join('');

  return '<div id="bd-info">' +
    '<div id="bd-info-left">' +
      '<div id="bd-info-swatch" style="background:' + vt.clothColor + '33">' + _typeEmoji(vt) + '</div>' +
      '<div id="bd-info-role">' + vt.role + '</div>' +
    '</div>' +
    '<div id="bd-info-mid">' +
      '<div id="bd-info-title">' + v.label + '</div>' + rowsHTML +
    '</div>' +
    '<div id="bd-info-right">' +
      '<div class="bd-btn danger" id="bd-release">Palakarin</div>' +
    '</div>' +
  '</div>';
}

function _renderWreckInfo(b) {
  var BUILDING_DEFS = _d.BUILDING_DEFS;
  var bdef = BUILDING_DEFS[b.originalType] || b.getDef();
  var cost = window._getRepairCost ? window._getRepairCost(b.originalType) : { gold:40, rice:10, langis:0 };
  var VS   = _d.VS;
  var canAfford = (VS.res.gold  || 0) >= cost.gold &&
                  (VS.res.rice  || 0) >= cost.rice &&
                  (VS.res.langis || 0) >= cost.langis;
  var costStr = cost.gold + '🪙' +
    (cost.rice   ? ' ' + cost.rice   + '🌾' : '') +
    (cost.langis ? ' ' + cost.langis + '💧' : '');

  return '<div id="bd-info">' +
    '<div id="bd-info-left">' +
      '<div id="bd-info-swatch" style="background:#3a2010;font-size:26px">🔧</div>' +
      '<div id="bd-info-role">Sirang Gusali</div>' +
    '</div>' +
    '<div id="bd-info-mid">' +
      '<div id="bd-info-title">' + bdef.label + ' <small style="color:#e74c3c">SIRA</small></div>' +
      '<div class="bd-row"><span class="bd-row-label">Kondisyon</span><span class="bd-row-val bad">Level 0 — Walang produksyon</span></div>' +
      '<div class="bd-row"><span class="bd-row-label">Gagawin</span><span class="bd-row-val">Ayusin → Level 1</span></div>' +
      '<div class="bd-row"><span class="bd-row-label">Gastos</span><span class="bd-row-val ' + (canAfford ? 'good' : 'bad') + '">' + costStr + '</span></div>' +
    '</div>' +
    '<div id="bd-info-right">' +
      '<div class="bd-btn upgrade' + (canAfford ? '' : ' disabled') + '" id="bd-repair">' +
        (canAfford ? 'Ayusin<br><small>' + costStr + '</small>' : 'Kulang') +
      '</div>' +
    '</div>' +
  '</div>';
}

function _renderBuildingInfo() {
  var b = drawer.target;
  if (b.isWreck) return _renderWreckInfo(b);

  var bdef  = b.getDef();
  var rules = _d.getMainHallRules(_d.VS.buildings);
  var maxLv = b.type === 'mainHall' ? 5 : rules.maxBuildingLevel;
  var mhLv  = _d.getMainHallLevel(_d.VS.buildings);
  var st    = b.getStats();
  var cost  = b.getUpgradeCost();
  var canUp = b.level < maxLv;

  /* If mainHall is under construction, show timer instead of upgrade button */
  var isBuilding = b.type === 'mainHall' && b.underConstruction;
  var upLabel;
  if (isBuilding) {
    var remaining = Math.ceil(b.constructionTime || 0);
    var timeStr   = remaining >= 60 ? Math.ceil(remaining / 60) + ' min' : remaining + 's';
    upLabel = '🔨 Nagtatayo…<br><small>' + timeStr + ' na lang</small>';
  } else if (canUp) {
    upLabel = 'Upgrade Lv' + b.level + ' ke ' + (b.level + 1) + '<br><small>' + cost.gold + ' ginto ' + cost.rice + ' bigas</small>';
  } else {
    upLabel = b.type === 'mainHall' ? 'MAX LEVEL' : 'Kailangan Hall Lv' + (mhLv + 1);
  }

  var rows = [['Level', b.level + ' / ' + maxLv, b.level >= maxLv ? 'bad' : 'good']];
  if (st.productionRate > 0) rows.push(['Produksyon', st.productionRate.toFixed(1) + '/s', 'gold']);
  if (st.storageBonus) {
    var sb = st.storageBonus;
    if (sb.gold)   rows.push(['Storage+Ginto',  '+' + sb.gold,   'gold']);
    if (sb.rice)   rows.push(['Storage+Bigas',  '+' + sb.rice,   'good']);
    if (sb.langis) rows.push(['Storage+Langis', '+' + sb.langis, '']);
  }
  if (bdef.isHome) {
    var occ = b.getOccupancy(), cap = b.getCapacity();
    rows.push(['Natutulog', occ + '/' + cap, occ >= cap ? 'bad' : 'good']);
  }
  if (bdef.attackDPS > 0) rows.push(['Depensa', bdef.attackDPS + 'dps', 'bad']);

  var rowsHTML = rows.map(function(r) {
    return '<div class="bd-row"><span class="bd-row-label">' + r[0] +
           '</span><span class="bd-row-val ' + r[2] + '">' + r[1] + '</span></div>';
  }).join('');

  var moveLabel = drawer.movingBuilding ? 'I-drop (click canvas)' : 'Ilipat ang Gusali';

  return '<div id="bd-info">' +
    '<div id="bd-info-left">' +
      '<div id="bd-info-swatch" style="background:' + bdef.wallColor + '44">' + _bldEmoji(b.type) + '</div>' +
      '<div id="bd-info-role">' + bdef.label + '</div>' +
    '</div>' +
    '<div id="bd-info-mid">' +
      '<div id="bd-info-title">' + bdef.label + ' <small>Lv' + b.level + '</small></div>' + rowsHTML +
    '</div>' +
    '<div id="bd-info-right">' +
      '<div class="bd-btn upgrade' + (canUp && !isBuilding ? '' : ' disabled') + '" id="bd-upgrade">' + upLabel + '</div>' +
      '<div class="bd-btn move' + (isBuilding ? ' disabled' : '') + '" id="bd-move">' + moveLabel + '</div>' +
    '</div>' +
  '</div>';
}

/* ── Shop tab ─────────────────────────────────────────────── */
function _renderShopTab() {
  var catalogue = _d.getShopCatalogue(_d.VS.buildings);
  if (catalogue.length === 0) {
    return '<div style="color:#8a6030;font-family:\'Oldenburg\',serif;font-size:15px;padding:20px">' +
           'I-upgrade ang Bahay-Bayan para ma-unlock ang mga gusali.</div>';
  }
  return catalogue.map(function(k) {
    var def = _d.BUILDING_DEFS[k];
    var canAfford = _d.VS.res.gold   >= def.shopCost.gold &&
                    _d.VS.res.rice   >= def.shopCost.rice &&
                    _d.VS.res.langis >= def.shopCost.langis;
    var summary = [];
    if (def.prodRate > 0)           summary.push((def.prodRes === 'gold' ? 'Ginto' : def.prodRes === 'rice' ? 'Bigas' : 'Langis') + '+' + def.prodRate);
    if (def.storageBonus.gold)      summary.push('Ginto+' + def.storageBonus.gold);
    if (def.storageBonus.rice)      summary.push('Bigas+' + def.storageBonus.rice);
    if (def.storageBonus.langis)    summary.push('Langis+' + def.storageBonus.langis);
    if (def.popBonus)               summary.push('Tao+' + def.popBonus);
    if (def.attackDPS > 0)          summary.push('Depensa ' + def.attackDPS + 'dps');
    var costStr = (def.shopCost.gold   ? def.shopCost.gold   + ' ginto ' : '') +
                  (def.shopCost.rice   ? def.shopCost.rice   + ' bigas ' : '') +
                  (def.shopCost.langis ? def.shopCost.langis + ' langis' : '');
    return '<div class="bd-card' + (canAfford ? '' : ' disabled') + '" data-build="' + k + '">' +
      '<div class="bd-card-swatch" style="background:' + def.wallColor + '33">' + _bldEmoji(k) + '</div>' +
      '<div class="bd-card-name">'  + def.label + '</div>' +
      '<div class="bd-card-stats">' + summary.slice(0, 3).join(' ') + '</div>' +
      '<div class="bd-card-cost'    + (canAfford ? '' : ' cant-afford') + '">' + costStr + '</div>' +
    '</div>';
  }).join('');
}

/* ── Training tab ─────────────────────────────────────────── */
function _renderTrainingTab() {
  var bld     = drawer.target;
  var entries = _d.TRAINING_MAP[bld.type] || [];
  var students = _d.VS.villagers.filter(function(v) { return v.typeIdx === 10 && !v.isTraining; });
  var selId   = drawer._selectedStudentId;
  var ADULT_AUTO = 300;

  var studHTML = students.length === 0
    ? ('<div style="color:#8a6030;font-size:14px;padding:10px 8px;font-family:\'Oldenburg\',serif;text-align:center">' +
       'Wala pang Estudyante.<br><small style="font-size:11px;color:#554433">Ang mga bagong silang na bata<br>ay nagiging Estudyante pagkatapos ng 90 segundo.</small></div>')
    : students.map(function(v) {
        var gt = v.growthTimer || 0;
        var timeLeft = Math.max(0, ADULT_AUTO - gt);
        var timeStr  = timeLeft > 60 ? Math.ceil(timeLeft/60) + 'min' : Math.ceil(timeLeft) + 's';
        var pct   = Math.min(100, Math.round((gt / ADULT_AUTO) * 100));
        return '<div class="bd-card bd-train-student' + (v.id === selId ? ' selected-stud' : '') +
               '" data-student="' + v.id + '" style="width:110px;min-height:110px">' +
               '<div class="bd-card-swatch">👤</div>' +
               '<div class="bd-card-name">' + v.label + '</div>' +
               '<div class="bd-card-stats">' + v.personality + '</div>' +
               '<div style="font-size:10px;color:#8a7050;padding:2px 4px">⏳ ' + timeStr + ' auto-grad</div>' +
               '<div style="height:3px;background:#1a1008;border-radius:2px;margin:3px 4px">' +
               '<div style="width:' + pct + '%;height:100%;background:#f5c842;border-radius:2px"></div></div>' +
               '</div>';
      }).join('');

  var courseHTML = entries.map(function(e, ei) {
    var canAfford = _d.VS.res.gold >= e.cost.gold && _d.VS.res.rice >= e.cost.rice;
    var ok        = canAfford && !!selId;
    var secs = e.duration;
    var durStr = secs >= 60 ? Math.ceil(secs/60) + ' min' : secs + 's';
    return '<div class="bd-card' + (ok ? '' : ' disabled') + ' bd-train-course" data-course-idx="' + ei + '" style="width:130px">' +
      '<div class="bd-card-swatch">' + _roleEmoji(e.typeIdx) + '</div>' +
      '<div class="bd-card-name">'  + e.label + '</div>' +
      '<div class="bd-card-stats">⏱ ' + durStr + '</div>' +
      '<div class="bd-card-cost' + (canAfford ? '' : ' cant-afford') + '">' + e.cost.gold + '🪙 ' + e.cost.rice + '🌾</div>' +
    '</div>';
  }).join('');

  var div = '<div style="width:1px;flex-shrink:0;background:#3a2010;margin:0 4px"></div>';
  return studHTML + div + courseHTML;
}

/* ── Wire interactive elements ────────────────────────────── */
function _wireButtons() {
  var body = document.getElementById('bd-body');
  if (!body) return;

  body.querySelectorAll('.bd-card[data-build]').forEach(function(card) {
    if (card.classList.contains('disabled')) return;
    card.addEventListener('click', function() {
      var k   = card.dataset.build;
      var def = _d.BUILDING_DEFS[k];
      if (!def) return;
      var chk = _d.canPlaceBuilding(k, _d.VS.buildings);
      if (!chk.ok) { _d.showMsg(chk.msg); return; }
      var VS = _d.VS;
      /* Affordability pre-check using actual costs */
      if (VS.res.gold   < def.shopCost.gold   ||
          VS.res.rice   < def.shopCost.rice   ||
          VS.res.langis < def.shopCost.langis) {
        _d.showMsg('Kulang! Kailangan: ' + def.shopCost.gold + '🪙 ' + def.shopCost.rice + '🌾'); return;
      }
      /* Just enter build_shop mode — procurement modal fires in input.js
         when the player clicks the actual map location. */
      _d.setPendingBuildType(k);
      _d.setGameMode('build_shop');
      closeDrawer();
      _d.showMsg('I-click kung saan ilalagay ang ' + def.label + '. Esc para kanselahin.');
    });
  });

  body.querySelectorAll('.bd-train-student').forEach(function(card) {
    card.addEventListener('click', function() {
      drawer._selectedStudentId = (drawer._selectedStudentId === card.dataset.student) ? null : card.dataset.student;
      renderDrawer();
    });
  });

  body.querySelectorAll('.bd-train-course').forEach(function(card) {
    card.addEventListener('click', function() {
      if (!drawer._selectedStudentId) { _d.showMsg('Pumili muna ng Estudyante!'); return; }
      var sv  = _d.VS.villagers.filter(function(v) { return v.id === drawer._selectedStudentId; })[0];
      if (!sv) return;
      var entries = _d.TRAINING_MAP[drawer.target.type] || [];
      var entry   = entries[parseInt(card.dataset.courseIdx)];
      if (!entry) return;
      var res = _d.startTraining(sv, drawer.target, entry, _d.VS);
      _d.showMsg(res.msg);
      if (res.ok) { drawer._selectedStudentId = null; renderDrawer(); }
    });
  });

  var upBtn     = document.getElementById('bd-upgrade');
  var repairBtn = document.getElementById('bd-repair');
  var moveBtn   = document.getElementById('bd-move');
  var relBtn    = document.getElementById('bd-release');

  if (repairBtn && !repairBtn.classList.contains('disabled')) {
    repairBtn.addEventListener('click', function() {
      var b    = drawer.target;
      if (!b || !b.isWreck) return;
      var VS   = _d.VS;
      var cost = window._getRepairCost ? window._getRepairCost(b.originalType) : { gold:40, rice:10, langis:0 };
      if ((VS.res.gold   || 0) < cost.gold  ||
          (VS.res.rice   || 0) < cost.rice  ||
          (VS.res.langis || 0) < cost.langis) {
        _d.showMsg('Kulang ang resources para ayusin!'); return;
      }
      VS.res.gold   -= cost.gold;
      VS.res.rice   -= cost.rice;
      VS.res.langis -= cost.langis;
      b.isWreck      = false;
      b.originalType = undefined;
      b.level        = 1;
      b.pulse        = 1.0;
      _d.showMsg('✅ ' + b.getDef().label + ' ay naayos na! Level 1.');
      _d.recalcCaps();
      renderDrawer();
    });
  }

  if (upBtn && !upBtn.classList.contains('disabled')) {
    upBtn.addEventListener('click', function() {
      var b         = drawer.target;
      var isMH      = b.type === 'mainHall';
      var prevLevel = b.level;
      var bdef      = b.getDef ? b.getDef() : (_d.BUILDING_DEFS[b.type] || {});
      var cost      = b.getUpgradeCost ? b.getUpgradeCost() : { gold: 0, rice: 0, langis: 0 };
      var btime     = bdef.buildTime || 60;
      var VS        = _d.VS;

      showProcurementModal({
        mode:        'upgrade',
        buildingObj: b,
        def:         bdef,
        actualCost:  { gold: cost.gold || 0, rice: cost.rice || 0, langis: cost.langis || 0 },
        buildTime:   btime,
        VS:          VS,
        dayCount:    _d.dayCount ? _d.dayCount() : 1,
        showMsg:     _d.showMsg,
        onConfirm: function(declared) {
          /* Resources deducted in modal — now perform upgrade without deducting again */
          var r = b.upgradeWithoutCost ? b.upgradeWithoutCost(VS) : b.upgrade(VS, true);
          _d.showMsg(r ? r.msg : bdef.label + ' inina-upgrade!');
          _d.initWaypoints();
          _d.assignHomes(VS.villagers, VS.buildings);
          _d.recalcCaps();
          renderDrawer();
          if (isMH && !b.underConstruction) {
            _showUnlockBanner(prevLevel + 1, _d.BUILDING_DEFS);
          }
        },
        onCancel: function() { /* nothing — drawer stays open */ },
      });
    });
  }

  if (moveBtn && !moveBtn.classList.contains('disabled')) {
    moveBtn.addEventListener('click', function() {
      drawer.movingBuilding = !drawer.movingBuilding;
      _d.setGameMode(drawer.movingBuilding ? 'move_building' : 'view');
      _d.showMsg(drawer.movingBuilding
        ? 'Ilipat ang ' + drawer.target.getDef().label + '. Click para i-drop.'
        : drawer.target.getDef().label + ' nanatili.');
      renderDrawer();
    });
  }
  if (relBtn)   relBtn.addEventListener('click',   closeDrawer);
}

/* ── DOM setup ────────────────────────────────────────────── */
function _ensureDrawer() {
  if (document.getElementById('bottom-drawer')) return;
  var container = document.getElementById('canvas-container');
  if (!container) return;
  var d = document.createElement('div');
  d.id  = 'bottom-drawer';
  d.innerHTML = '<div id="bd-close">✕</div><div id="bd-tabs"></div><div id="bd-body"></div>';
  container.appendChild(d);
  document.getElementById('bd-close').addEventListener('click', closeDrawer);
}

/* ── Emoji helpers ────────────────────────────────────────── */
function _typeEmoji(vt) {
  var map = { magsasaka:'🌾',mangangalakal:'📦',bantay:'🗡️',matanda:'📿',bata:'🧸',
              guro:'📚',mangingisda:'🐟',albularyo:'🌿',doktor:'💊',driver:'🚗',
              estudyante:'📖',bayani:'⚔️' };
  return map[vt.type] || '👤';
}
function _bldEmoji(k) {
  var map = { mainHall:'🏛️',house:'🏠',palengke:'🏪',farm:'🌾',storage:'📦',
              mine:'⛏️',paaralan:'🎓',cuartel:'⚔️',moog:'🗼',kuta:'🧱',
              bantayan:'🏹',templo:'⛩️',hukuman:'⚖️',
              ospital:'🏥',paaralan2:'🏫',pulisya:'🚓' };
  return map[k] || '🏗️';
}
function _roleEmoji(typeIdx) {
  var VT = _d.VILLAGER_TYPES;
  var vt = VT[typeIdx];
  return vt ? _typeEmoji(vt) : '👤';
}

/* ══════════════════════════════════════════════════════════════
   _showUnlockBanner
   Called ONLY after construction completes (or instantly if
   mainHall has no buildTime). Shows newly unlocked buildings.
══════════════════════════════════════════════════════════════ */
function _showUnlockBanner(newLevel, BUILDING_DEFS) {
  var newBuildings = Object.keys(BUILDING_DEFS).filter(function(k) {
    var def = BUILDING_DEFS[k];
    return def.minHallLevel === newLevel && def.shopCost;
  });
  if (newBuildings.length === 0) return;

  var existing = document.getElementById('unlock-banner');
  if (existing) existing.parentNode.removeChild(existing);

  var container = document.getElementById('canvas-container') || document.body;
  var el = document.createElement('div');
  el.id = 'unlock-banner';

  var cards = newBuildings.map(function(k) {
    var def = BUILDING_DEFS[k];
    return '<div class="unlock-card">' +
      '<div class="unlock-card-icon">' + _bldEmoji(k) + '</div>' +
      '<div class="unlock-card-name">' + def.label + '</div>' +
    '</div>';
  }).join('');

  el.innerHTML =
    '<div class="unlock-inner">' +
      '<div class="unlock-title">🏛️ Bahay-Bayan Lv' + newLevel + ' — Bagong Gusali!</div>' +
      '<div class="unlock-cards">' + cards + '</div>' +
      '<button class="unlock-ok" onclick="document.getElementById(\'unlock-banner\').remove()">Sige!</button>' +
    '</div>';

  container.appendChild(el);
  _ensureUnlockStyles();

  setTimeout(function() {
    var b = document.getElementById('unlock-banner');
    if (b) b.remove();
  }, 8000);
}

/* ── Style injection ──────────────────────────────────────── */
function _injectStyles() {
  if (document.getElementById('bd-styles')) return;
  var s = document.createElement('style');
  s.id  = 'bd-styles';
  s.textContent = [
    '#bottom-drawer{position:absolute;left:0;right:0;bottom:0;height:200px;',
    'background:#0e0905ee;border-top:2px solid #8a6030;display:none;flex-direction:column;',
    'z-index:30;pointer-events:all;transform:translateY(100%);',
    'transition:transform 0.28s cubic-bezier(.4,0,.2,1);}',
    '#bottom-drawer.open{display:flex;transform:translateY(0);}',
    '#bd-close{position:absolute;top:8px;right:12px;width:28px;height:28px;line-height:28px;',
    'text-align:center;background:#2a1808;border:1px solid #8a6030;border-radius:50%;',
    'color:#f5c842;font-size:14px;cursor:pointer;font-family:"Oldenburg",serif;user-select:none;transition:background .15s;}',
    '#bd-close:hover{background:#4a2810;}',
    '#bd-tabs{display:flex;gap:0;padding:0 44px 0 8px;border-bottom:1px solid #3a2010;flex-shrink:0;}',
    '.bd-tab{padding:6px 16px;font-family:"Oldenburg",serif;font-size:14px;color:#8a6030;cursor:pointer;',
    'border-bottom:2px solid transparent;transition:color .15s,border-color .15s;white-space:nowrap;user-select:none;}',
    '.bd-tab:hover{color:#c49a4e;}',
    '.bd-tab.active{color:#f5c842;border-bottom-color:#f5c842;}',
    '#bd-body{flex:1;overflow-x:auto;overflow-y:hidden;display:flex;align-items:stretch;',
    'gap:8px;padding:8px 12px;scrollbar-width:thin;scrollbar-color:#3a2010 #0e0905;}',
    '#bd-body::-webkit-scrollbar{height:4px;}',
    '#bd-body::-webkit-scrollbar-track{background:#0e0905;}',
    '#bd-body::-webkit-scrollbar-thumb{background:#3a2010;border-radius:2px;}',
    '.bd-card{flex-shrink:0;width:150px;height:150px;background:#1a1208;border:1px solid #3a2010;',
    'border-radius:6px;display:flex;flex-direction:column;overflow:hidden;cursor:pointer;',
    'transition:border-color .15s,background .15s;user-select:none;}',
    '.bd-card:hover{background:#221608;border-color:#8a6030;}',
    '.bd-card.selected{background:#1a2a0a;border-color:#44aa44;}',
    '.bd-card.disabled{opacity:.45;cursor:not-allowed;}',
    '.bd-card-swatch{height:52px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:22px;}',
    '.bd-card-name{font-family:"Oldenburg",serif;font-size:16px;color:#f5c842;text-align:center;padding:2px 4px;line-height:1.3;}',
    '.bd-card-stats{font-family:monospace;font-size:13px;color:#8a7050;text-align:center;padding:2px 4px;flex:1;line-height:1.5;}',
    '.bd-card-cost{font-family:monospace;font-size:13px;color:#c49a4e;text-align:center;padding:3px 4px;border-top:1px solid #2a1808;}',
    '.bd-card-cost.cant-afford{color:#aa4444;}',
    '#bd-info{display:flex;gap:10px;align-items:stretch;width:100%;flex-shrink:0;}',
    '#bd-info-left{width:64px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;}',
    '#bd-info-swatch{width:48px;height:48px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:24px;border:1px solid #3a2010;}',
    '#bd-info-role{font-family:"Oldenburg",serif;font-size:13px;color:#c49a4e;text-align:center;line-height:1.3;}',
    '#bd-info-mid{flex:1;display:flex;flex-direction:column;gap:3px;overflow:hidden;}',
    '#bd-info-title{font-family:"Oldenburg",serif;font-size:16px;color:#f5c842;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.bd-row{display:flex;justify-content:space-between;align-items:center;font-size:14px;padding:1px 0;border-bottom:1px solid #1e1208;}',
    '.bd-row-label{color:#6a5030;font-family:monospace;font-size:13px;text-transform:uppercase;}',
    '.bd-row-val{color:#e8d4a0;font-family:"Crimson Pro",Georgia,serif;}',
    '.bd-row-val.good{color:#88dd88;}.bd-row-val.bad{color:#e74c3c;}.bd-row-val.gold{color:#f5c842;}',
    '#bd-info-right{width:140px;flex-shrink:0;display:flex;flex-direction:column;gap:6px;justify-content:center;}',
    '.bd-btn{display:block;width:100%;padding:7px 0;font-family:"Oldenburg",serif;font-size:14px;font-weight:bold;',
    'text-align:center;border-radius:4px;cursor:pointer;border:1px solid;transition:background .15s,opacity .15s;user-select:none;color:#f5c842;}',
    '.bd-btn:hover{filter:brightness(1.2);}.bd-btn:active{filter:brightness(0.9);}',
    '.bd-btn.primary{background:#1a3010;border-color:#44aa44;}',
    '.bd-btn.upgrade{background:#2a1808;border-color:#c49a4e;}',
    '.bd-btn.move{background:#0a1a2a;border-color:#4a8ac4;}',
    '.bd-btn.danger{background:#2a0a0a;border-color:#aa4444;}',
    '.bd-btn.disabled{opacity:.4;cursor:not-allowed;pointer-events:none;}',
    '.bd-train-student.selected-stud{border-color:#44aa44 !important;background:#1a2a0a !important;}',
    /* Mobile drawer height reduction */
    '@media (max-width: 768px) {',
    '  #bottom-drawer { height: 140px !important; }',
    '  .bd-card { width: 110px !important; height: 110px !important; }',
    '  .bd-card-swatch { height: 38px !important; font-size: 18px !important; }',
    '  .bd-card-name { font-size: 12px !important; }',
    '  .bd-card-stats { font-size: 10px !important; }',
    '  .bd-card-cost { font-size: 10px !important; }',
    '  .bd-tab { padding: 4px 12px !important; font-size: 12px !important; }',
    '  #bd-info-left { width: 52px !important; }',
    '  #bd-info-swatch { width: 40px !important; height: 40px !important; font-size: 20px !important; }',
    '  #bd-info-role { font-size: 11px !important; }',
    '  #bd-info-title { font-size: 13px !important; }',
    '  .bd-row-label { font-size: 11px !important; }',
    '  .bd-row-val { font-size: 11px !important; }',
    '  #bd-info-right { width: 110px !important; }',
    '  .bd-btn { padding: 5px 0 !important; font-size: 11px !important; }',
    '  #bd-close { width: 24px !important; height: 24px !important; font-size: 12px !important; top: 6px !important; right: 10px !important; }',
    '  #bd-tabs { padding: 0 38px 0 6px !important; }',
    '}',
    '@media (max-height: 480px) and (orientation: landscape) {',
    '  #bottom-drawer { height: 127px !important; }',
    '  .bd-card { width: 90px !important; height: 90px !important; }',
    '  .bd-card-swatch { height: 32px !important; font-size: 16px !important; }',
    '  .bd-card-name { font-size: 10px !important; }',
    '  .bd-card-stats { font-size: 9px !important; }',
    '  .bd-tab { padding: 3px 8px !important; font-size: 10px !important; }',
    '  .bd-btn { padding: 4px 0 !important; font-size: 10px !important; }',
    '  #bd-info-right { width: 90px !important; }',
    '}',
  ].join('');
  document.head.appendChild(s);
}

function _ensureUnlockStyles() {
  if (document.getElementById('unlock-styles')) return;
  var s = document.createElement('style');
  s.id = 'unlock-styles';
  s.textContent = [
    '#unlock-banner{',
    '  position:absolute;inset:0;z-index:90;',
    '  display:flex;align-items:center;justify-content:center;',
    '  background:rgba(0,0,0,0.72);pointer-events:all;',
    '  animation:unlockFadeIn .3s ease;',
    '}',
    '@keyframes unlockFadeIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}',
    '.unlock-inner{',
    '  background:linear-gradient(160deg,#1a1208,#0e0905);',
    '  border:2px solid #f5c842;border-radius:14px;',
    '  padding:28px 32px;max-width:480px;width:90%;',
    '  text-align:center;box-shadow:0 0 40px rgba(245,200,66,0.25);',
    '}',
    '.unlock-title{',
    '  font-family:"Oldenburg",serif;font-size:17px;color:#f5c842;',
    '  letter-spacing:.08em;margin-bottom:20px;',
    '}',
    '.unlock-cards{',
    '  display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:22px;',
    '}',
    '.unlock-card{',
    '  background:#1a1208;border:1.5px solid #8a6030;',
    '  border-radius:10px;padding:14px 16px;min-width:90px;',
    '  animation:unlockCardPop .4s ease both;',
    '}',
    '.unlock-card:nth-child(2){animation-delay:.07s}',
    '.unlock-card:nth-child(3){animation-delay:.14s}',
    '.unlock-card:nth-child(4){animation-delay:.21s}',
    '@keyframes unlockCardPop{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}',
    '.unlock-card-icon{font-size:32px;margin-bottom:8px;}',
    '.unlock-card-name{font-family:"Oldenburg",serif;font-size:11px;color:#f5c842;letter-spacing:.04em;}',
    '.unlock-ok{',
    '  padding:10px 36px;font-family:"Oldenburg",serif;font-size:13px;font-weight:bold;',
    '  background:#2a1808;border:1.5px solid #f5c842;color:#f5c842;',
    '  border-radius:6px;cursor:pointer;transition:background .15s;',
    '}',
    '.unlock-ok:hover{background:#3a2810;}',
  ].join('\n');
  document.head.appendChild(s);
}