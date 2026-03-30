/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — attack/attackUI.js
   UI components for attack mode: troop selection, deployment, HUD
═══════════════════════════════════════════════════════════════ */

import { TROOP_DEFS } from './attack.js';

export var MILITARY = ['bantay', 'bayani', 'marine', 'airforce'];
export var ROLE_POWER = { bantay: 10, bayani: 25, marine: 40, airforce: 60 };
export var ROLE_ICON = { bantay: '🛡️', bayani: '⚔️', marine: '🔱', airforce: '✈️' };
export var ROLE_LABEL = { bantay: 'Bantay', bayani: 'Bayani', marine: 'Marine', airforce: 'Air Force' };
export var ROLE_COLOR = { bantay: '#4a7a9b', bayani: '#922B21', marine: '#1B4F72', airforce: '#6c3483' };

function G(id) { return document.getElementById(id); }

/* ── Get military inventory from main game ─────────────────── */
export function getMilitaryInventory() {
  var vs = window._VS;
  var inv = { bantay: 0, bayani: 0, marine: 0, airforce: 0 };
  if (!vs || !vs.villagers) return inv;
  vs.villagers.forEach(function(v) {
    var t = (v._typeDef || {}).type;
    if (t in inv && !v.isTraining) inv[t]++;
  });
  return inv;
}

/* ── Update enemy village HUD ──────────────────────────────── */
export function updateHUD(enemy) {
  if (!enemy) return;
  var hud = {
    'atk-village-name': enemy.name,
    'atk-level': '⭐'.repeat(enemy.level),
    'atk-leader': enemy.leader,
    'atk-def': enemy.defPower,
    'atk-gold': enemy.goldLoot,
    'atk-rice': enemy.riceLoot,
  };
  Object.keys(hud).forEach(function(id) {
    var el = G(id);
    if (el) el.textContent = hud[id];
  });
}

/* ── Render troop selection bar ────────────────────────────── */
export function renderTroopBar(sel, deployRole, onSelect, onChange) {
  var inv = getMilitaryInventory();
  var html = '';
  MILITARY.forEach(function(r) {
    var avail = inv[r] || 0;
    var selected = sel[r] || 0;
    var td = TROOP_DEFS[r];
    html +=
      '<div class="troop-slot' + (r === deployRole ? ' troop-slot-active' : '') + '" ' +
      'style="border-color:' + ROLE_COLOR[r] + '" ' +
      'onclick="window._atkSelectDeploy(\'' + r + '\')">' +
      '<div class="ts-icon">' + ROLE_ICON[r] + '</div>' +
      '<div class="ts-name">' + ROLE_LABEL[r] + '</div>' +
      '<div class="ts-stats">❤️' + td.hp + '  ⚔️' + td.dps + '/s</div>' +
      '<div class="ts-avail">' + avail + ' available</div>' +
      '<div class="ts-ctrl">' +
      '<button onclick="event.stopPropagation();window._atkChg(\'' + r + '\',-1)">−</button>' +
      '<span id="tsel-' + r + '">' + selected + '</span>' +
      '<button onclick="event.stopPropagation();window._atkChg(\'' + r + '\',1)">+</button>' +
      '</div>' +
      '</div>';
  });
  var row = G('atk-troop-row');
  if (row) row.innerHTML = html;
}

/* ── Update power bar (win chance) ─────────────────────────── */
export function updatePowerBar(sel, enemyDefPower) {
  var atk = 0;
  MILITARY.forEach(function(r) {
    atk += (sel[r] || 0) * ROLE_POWER[r];
  });
  var def = enemyDefPower || 1;
  var pct = Math.min(95, Math.max(5, Math.round(atk / (atk + def) * 100)));
  var color = pct > 60 ? '#27ae60' : pct > 40 ? '#f39c12' : '#e74c3c';
  
  var pl = G('atk-power-label');
  if (pl) pl.innerHTML = '💥 ' + atk + ' vs 🛡️ ' + def;
  
  var wp = G('atk-win-pct');
  if (wp) {
    wp.textContent = pct + '%';
    wp.style.color = color;
  }
  
  var wf = G('atk-win-fill');
  if (wf) {
    wf.style.width = pct + '%';
    wf.style.background = color;
  }
  
  var goBtn = G('atk-go-btn');
  if (goBtn) goBtn.disabled = (atk === 0);
}

/* ── Show deployment panel ─────────────────────────────────── */
export function showDeployUI() {
  var plan = G('atk-plan-panel');
  var deploy = G('atk-deploy-panel');
  if (plan) plan.style.display = 'none';
  if (deploy) deploy.style.display = 'flex';
}

/* ── Update deployment panel with troop queue ──────────────── */
export function updateDeployUI(deployQueue, deployRole, troops, enemy) {
  var dp = G('atk-deploy-panel');
  if (!dp) return;
  
  var html = '<div style="color:#f5c842;font-weight:bold;margin-bottom:6px;">🎯 Mag-click sa mapa para mag-deploy ng tropa</div>';
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
  
  MILITARY.forEach(function(r) {
    var q = deployQueue[r] || 0;
    if (q <= 0) return;
    html +=
      '<div class="deploy-slot' + (r === deployRole ? ' deploy-active' : '') + '" ' +
      'onclick="window._atkSelectDeploy(\'' + r + '\')" ' +
      'style="border-color:' + ROLE_COLOR[r] + ';cursor:pointer">' +
      ROLE_ICON[r] + ' ' + ROLE_LABEL[r] + ' <span class="deploy-count">×' + q + '</span>' +
      '</div>';
  });
  html += '</div>';
  
  if (troops && troops.length > 0) {
    var alive = troops.filter(function(t) { return t.hp > 0; }).length;
    var bAlive = enemy ? enemy.buildings.filter(function(b) { return b.hp > 0; }).length : 0;
    html += '<div style="margin-top:8px;color:#ccc;font-size:12px;">' +
      '⚔️ Tropa: ' + alive + '/' + troops.length + '   ' +
      '🏠 Gusali: ' + bAlive + '/' + (enemy ? enemy.buildings.length : 0) +
      '</div>';
  }
  
  dp.innerHTML = html;
}

/* ── Update destruction bar ────────────────────────────────── */
export function updateDestructionBar(buildings) {
  if (!buildings) return;
  var total = buildings.length;
  var destroyed = buildings.filter(function(b) { return b.hp <= 0; }).length;
  var pct = total > 0 ? Math.round(destroyed / total * 100) : 0;
  var fill = G('atk-dest-fill');
  var label = G('atk-dest-label');
  if (fill) fill.style.width = pct + '%';
  if (label) label.textContent = pct + '% nasira';
}

/* ── Show battle result modal ──────────────────────────────── */
export function showResultModal(won, stars, gold, rice, casualties, pct) {
  var starStr = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  var animEl = G('br-anim');
  var titleEl = G('br-title');
  var bodyEl = G('br-body');
  var resultEl = G('battle-result');
  
  if (animEl) animEl.textContent = won ? '🎉' : '💀';
  if (titleEl) {
    titleEl.textContent = won ? 'TAGUMPAY! Nanalo kayo!' : 'NATALO... Bumalik na.';
    titleEl.style.color = won ? '#f5c842' : '#e74c3c';
  }
  if (bodyEl) {
    bodyEl.innerHTML =
      '<div style="font-size:22px;letter-spacing:4px;">' + starStr + '</div>' +
      '<div style="color:#aaa;margin-bottom:8px;">' + Math.round(pct * 100) + '% ng gusali ang nasira</div>' +
      (gold > 0 ? '<div class="res-loot">🪙 +' + gold + ' ginto</div>' : '') +
      (rice > 0 ? '<div class="res-loot">🌾 +' + rice + ' bigas</div>' : '') +
      (casualties > 0
        ? '<div class="res-cas">⚠️ ' + casualties + ' sundalo ang namatay</div>'
        : '<div style="color:#27ae60;margin-top:6px;">Walang biktima!</div>');
  }
  if (resultEl) resultEl.style.display = 'flex';
}

/* ── Hide result modal ─────────────────────────────────────── */
export function hideResultModal() {
  var resultEl = G('battle-result');
  if (resultEl) resultEl.style.display = 'none';
}

/* ── Clear all UI panels ──────────────────────────────────── */
export function clearPanels() {
  var plan = G('atk-plan-panel');
  var deploy = G('atk-deploy-panel');
  var result = G('battle-result');
  if (plan) plan.style.display = 'block';
  if (deploy) deploy.style.display = 'none';
  if (result) result.style.display = 'none';
  
  var fill = G('atk-dest-fill');
  var label = G('atk-dest-label');
  if (fill) fill.style.width = '0%';
  if (label) label.textContent = '0% nasira';
}