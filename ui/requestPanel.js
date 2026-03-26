/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — ui/requestPanel.js (Side Panel Version)
═══════════════════════════════════════════════════════════════ */

import { getActiveRequests, resolveRequest, getEmploymentProgress, getAyudaSatisfactionRange } from '../villagers/citizenNeeds.js';

/* ── Deps ─────────────────────────────────────────────────── */
var _showMsg = null;
var _VS = null;
var _openShopFiltered = null;

/* ── Ayuda slider values per request ───────────────────────── */
var _ayudaValues = {};

/* ══════════════════════════════════════════════════════════════
   initRequestPanel
══════════════════════════════════════════════════════════════ */
export function initRequestPanel(deps) {
  _showMsg = deps.showMsg;
  _VS = deps.VS;
  _openShopFiltered = deps.openShopFiltered || null;
  _injectStyles();
  
  // Expose render function to window
  window._renderRequestsToSidePanel = renderRequestsToSidePanel;
  window._wireRequestButtons = wireRequestButtons;
}

/* ══════════════════════════════════════════════════════════════
   renderRequestsToSidePanel
══════════════════════════════════════════════════════════════ */
function renderRequestsToSidePanel() {
  if (!_VS) return '<div class="sp-empty">Loading...</div>';
  
  var needs = getActiveRequests(_VS);
  
  if (needs.length === 0) {
    return '<div class="sp-empty">✨ Walang aktibong kahilingan. Mabuti ang nayon!</div>';
  }
  
  // Sort by urgency
  needs.sort(function(a, b) { return (b.urgency || 1) - (a.urgency || 1); });
  
  var html = needs.map(function(req) {
    return _renderRequestCard(req);
  }).join('');
  
  return html;
}

/* ── Render individual request card ───────────────────────── */
function _renderRequestCard(req) {
  var urgColor = req.urgency >= 3 ? '#e74c3c' : req.urgency === 2 ? '#e67e22' : '#f5c842';
  var urgencyIcon = req.urgency >= 3 ? '🔴' : req.urgency === 2 ? '🟠' : '🟡';
  
  if (req.category === 'job') {
    return _renderJobCard(req, urgColor, urgencyIcon);
  } else if (req.category === 'building') {
    return _renderBuildingCard(req, urgColor, urgencyIcon);
  } else if (req.category === 'housing') {
    return _renderHousingCard(req, urgColor, urgencyIcon);
  } else {
    return _renderLegacyCard(req, urgColor, urgencyIcon);
  }
}

/* Job card */
function _renderJobCard(req, urgColor, urgencyIcon) {
  var progress = getEmploymentProgress(req.id, _VS);
  var employed = progress ? progress.currentEmployed : 0;
  var total = req.unemployedCount || 1;
  var percent = total > 0 ? (employed / total) * 100 : 0;
  
  var professionNames = {
    magsasaka: 'Magsasaka',
    mangingisda: 'Mangingisda',
    magsasaka_kalikasan: 'Magsasaka (Kalikasan)',
    manggagawa: 'Manggagawa'
  };
  var professionName = professionNames[req.profession] || 'Manggagawa';
  
  var professionIcons = { magsasaka: '🌾', mangingisda: '🐟', magsasaka_kalikasan: '🌳', manggagawa: '🔧' };
  var icon = professionIcons[req.profession] || '👨‍🌾';
  
  var ayudaKey = 'job_' + req.id;
  if (_ayudaValues[ayudaKey] === undefined) _ayudaValues[ayudaKey] = 150;
  
  return '<div class="req-card req-card-job" style="border-left-color: ' + urgColor + '">' +
    '<div class="req-card-header">' +
      '<span class="req-card-icon">' + icon + '</span>' +
      '<span class="req-card-title" style="color: ' + urgColor + '">' + professionName + '</span>' +
      '<span class="req-card-urgency">' + urgencyIcon + '</span>' +
    '</div>' +
    '<div class="req-card-body">' + req.message + '</div>' +
    '<div class="req-progress-container">' +
      '<div class="req-progress-bar" style="width: ' + percent + '%"></div>' +
    '</div>' +
    '<div class="req-progress-text">' + employed + '/' + total + ' may trabaho na</div>' +
    '<div class="req-card-actions">' +
      '<button class="req-build-btn" data-req-id="' + req.id + '" data-building="' + req.solutionBuilding + '">' +
        '🏗️ Magtayo ng ' + req.solutionBuilding +
      '</button>' +
      '<div class="req-ayuda-section">' +
        '<div class="req-ayuda-header">💰 Magbigay ng Ayuda</div>' +
        '<div class="req-ayuda-slider-container">' +
          '<input type="range" class="req-ayuda-slider" data-req-id="' + req.id + '" data-type="job" ' +
                 'min="0" max="500" step="10" value="' + _ayudaValues[ayudaKey] + '" />' +
          '<span class="req-ayuda-amount">🪙 ' + _ayudaValues[ayudaKey] + '</span>' +
        '</div>' +
        '<button class="req-ayuda-submit" data-req-id="' + req.id + '" data-type="job">💸 Ibigay ang Ayuda</button>' +
      '</div>' +
      '<button class="req-ignore-btn" data-req-id="' + req.id + '" data-action="ignore">❌ Balewalain</button>' +
    '</div>' +
  '</div>';
}

/* Building card */
function _renderBuildingCard(req, urgColor, urgencyIcon) {
  var buildingNames = { palengke: 'Palengke', paaralan: 'Paaralan', ospital: 'Ospital', bahay: 'Bahay' };
  var buildingName = buildingNames[req.subcategory] || req.subcategory;
  var buildingIcons = { palengke: '🏪', paaralan: '📚', ospital: '🏥', bahay: '🏠' };
  var icon = buildingIcons[req.subcategory] || '🏗️';
  
  var ayudaKey = 'building_' + req.id;
  if (_ayudaValues[ayudaKey] === undefined) _ayudaValues[ayudaKey] = 150;
  
  return '<div class="req-card req-card-building" style="border-left-color: ' + urgColor + '">' +
    '<div class="req-card-header">' +
      '<span class="req-card-icon">' + icon + '</span>' +
      '<span class="req-card-title" style="color: ' + urgColor + '">' + buildingName + '</span>' +
      '<span class="req-card-urgency">' + urgencyIcon + '</span>' +
    '</div>' +
    '<div class="req-card-body">' + req.message + '</div>' +
    '<div class="req-card-actions">' +
      '<button class="req-build-btn" data-req-id="' + req.id + '" data-building="' + buildingName + '">' +
        '🏗️ Magtayo ng ' + buildingName +
      '</button>' +
      '<div class="req-ayuda-section">' +
        '<div class="req-ayuda-header">💰 Magbigay ng Ayuda</div>' +
        '<div class="req-ayuda-slider-container">' +
          '<input type="range" class="req-ayuda-slider" data-req-id="' + req.id + '" data-type="building" ' +
                 'min="0" max="500" step="10" value="' + _ayudaValues[ayudaKey] + '" />' +
          '<span class="req-ayuda-amount">🪙 ' + _ayudaValues[ayudaKey] + '</span>' +
        '</div>' +
        '<button class="req-ayuda-submit" data-req-id="' + req.id + '" data-type="building">💸 Ibigay ang Ayuda</button>' +
      '</div>' +
      '<button class="req-ignore-btn" data-req-id="' + req.id + '" data-action="ignore">❌ Balewalain</button>' +
    '</div>' +
  '</div>';
}

/* Housing card */
function _renderHousingCard(req, urgColor, urgencyIcon) {
  var progress = getEmploymentProgress(req.id, _VS);
  var housed = progress ? progress.currentEmployed : 0;
  var total = req.homelessCount || 1;
  var percent = total > 0 ? (housed / total) * 100 : 0;
  
  var ayudaKey = 'housing_' + req.id;
  if (_ayudaValues[ayudaKey] === undefined) _ayudaValues[ayudaKey] = 150;
  
  return '<div class="req-card req-card-housing" style="border-left-color: ' + urgColor + '">' +
    '<div class="req-card-header">' +
      '<span class="req-card-icon">🏠</span>' +
      '<span class="req-card-title" style="color: ' + urgColor + '">Walang Tirahan</span>' +
      '<span class="req-card-urgency">' + urgencyIcon + '</span>' +
    '</div>' +
    '<div class="req-card-body">' + req.message + '</div>' +
    '<div class="req-progress-container">' +
      '<div class="req-progress-bar" style="width: ' + percent + '%"></div>' +
    '</div>' +
    '<div class="req-progress-text">' + housed + '/' + total + ' may bahay na</div>' +
    '<div class="req-card-actions">' +
      '<button class="req-build-btn" data-req-id="' + req.id + '" data-building="Bahay">' +
        '🏗️ Magtayo ng Bahay' +
      '</button>' +
      '<div class="req-ayuda-section">' +
        '<div class="req-ayuda-header">💰 Magbigay ng Ayuda</div>' +
        '<div class="req-ayuda-slider-container">' +
          '<input type="range" class="req-ayuda-slider" data-req-id="' + req.id + '" data-type="housing" ' +
                 'min="0" max="500" step="10" value="' + _ayudaValues[ayudaKey] + '" />' +
          '<span class="req-ayuda-amount">🪙 ' + _ayudaValues[ayudaKey] + '</span>' +
        '</div>' +
        '<button class="req-ayuda-submit" data-req-id="' + req.id + '" data-type="housing">💸 Ibigay ang Ayuda</button>' +
      '</div>' +
      '<button class="req-ignore-btn" data-req-id="' + req.id + '" data-action="ignore">❌ Balewalain</button>' +
    '</div>' +
  '</div>';
}

/* Legacy card */
function _renderLegacyCard(req, urgColor, urgencyIcon) {
  var helpCost = req.helpCostGold || 0;
  var canAffordHelp = _VS ? _VS.res.gold >= helpCost : true;
  var categoryIcons = { hunger: '🍚', health: '❤️', safety: '🛡️' };
  var icon = categoryIcons[req.category] || '📢';
  var categoryNames = { hunger: 'Gutom', health: 'Sakit', safety: 'Kaligtasan' };
  var categoryName = categoryNames[req.category] || 'Pangangailangan';
  
  var ayudaKey = 'legacy_' + req.id;
  if (_ayudaValues[ayudaKey] === undefined) _ayudaValues[ayudaKey] = 150;
  
  return '<div class="req-card req-card-legacy" style="border-left-color: ' + urgColor + '">' +
    '<div class="req-card-header">' +
      '<span class="req-card-icon">' + icon + '</span>' +
      '<span class="req-card-title" style="color: ' + urgColor + '">' + categoryName + '</span>' +
      '<span class="req-card-urgency">' + urgencyIcon + '</span>' +
    '</div>' +
    '<div class="req-card-body">' + req.message + '</div>' +
    '<div class="req-card-actions">' +
      '<button class="req-help-btn" data-req-id="' + req.id + '" data-action="help" ' + (canAffordHelp ? '' : 'disabled') + '>' +
        '🩺 Tulungan (' + helpCost + '🪙)' +
      '</button>' +
      '<div class="req-ayuda-section">' +
        '<div class="req-ayuda-header">💰 Magbigay ng Ayuda</div>' +
        '<div class="req-ayuda-slider-container">' +
          '<input type="range" class="req-ayuda-slider" data-req-id="' + req.id + '" data-type="legacy" ' +
                 'min="0" max="500" step="10" value="' + _ayudaValues[ayudaKey] + '" />' +
          '<span class="req-ayuda-amount">🪙 ' + _ayudaValues[ayudaKey] + '</span>' +
        '</div>' +
        '<button class="req-ayuda-submit" data-req-id="' + req.id + '" data-type="legacy">💸 Ibigay ang Ayuda</button>' +
      '</div>' +
      '<button class="req-ignore-btn" data-req-id="' + req.id + '" data-action="ignore">❌ Balewalain</button>' +
    '</div>' +
  '</div>';
}

/* Wire up event listeners */
function wireRequestButtons() {
  // Build buttons
  document.querySelectorAll('.req-build-btn').forEach(function(btn) {
    btn.removeEventListener('click', _onBuildClick);
    btn.addEventListener('click', _onBuildClick);
  });
  
  // Ayuda sliders
  document.querySelectorAll('.req-ayuda-slider').forEach(function(slider) {
    slider.removeEventListener('input', _onAyudaSliderChange);
    slider.addEventListener('input', _onAyudaSliderChange);
  });
  
  // Ayuda submit buttons
  document.querySelectorAll('.req-ayuda-submit').forEach(function(btn) {
    btn.removeEventListener('click', _onAyudaSubmit);
    btn.addEventListener('click', _onAyudaSubmit);
  });
  
  // Help buttons
  document.querySelectorAll('.req-help-btn').forEach(function(btn) {
    btn.removeEventListener('click', _onHelpClick);
    btn.addEventListener('click', _onHelpClick);
  });
  
  // Ignore buttons
  document.querySelectorAll('.req-ignore-btn').forEach(function(btn) {
    btn.removeEventListener('click', _onIgnoreClick);
    btn.addEventListener('click', _onIgnoreClick);
  });
}

function _onBuildClick(e) {
  var btn = e.currentTarget;
  var building = btn.dataset.building;
  var reqId = btn.dataset.reqId;
  
  if (_openShopFiltered) {
    _openShopFiltered(building, reqId);
  } else if (_showMsg) {
    _showMsg('Buksan ang Tindahan para magtayo ng ' + building, 'info');
  }
}

function _onAyudaSliderChange(e) {
  var slider = e.currentTarget;
  var reqId = slider.dataset.reqId;
  var type = slider.dataset.type;
  var value = parseInt(slider.value);
  var key = type + '_' + reqId;
  _ayudaValues[key] = value;
  
  var amountDisplay = slider.closest('.req-ayuda-slider-container').querySelector('.req-ayuda-amount');
  if (amountDisplay) amountDisplay.textContent = '🪙 ' + value;
}

function _onAyudaSubmit(e) {
  var btn = e.currentTarget;
  var reqId = btn.dataset.reqId;
  var type = btn.dataset.type;
  var key = type + '_' + reqId;
  var amount = _ayudaValues[key] || 150;
  
  var result = resolveRequest(reqId, 'ayuda', _VS, _showMsg, amount);
  if (result.ok) {
    if (result.effect && _showMsg) {
      var reactionMsg = result.effect.reaction === 'low' ? '😤 Masyadong mababa ang ayuda!' :
                        result.effect.reaction === 'high' ? '😲 Sobra ang ayuda! Sana laging ganito.' :
                        '🙏 Salamat po sa ayuda!';
      _showMsg(reactionMsg, result.effect.reaction === 'good' ? 'success' : 'info');
    }
    // Refresh side panel
    if (window.refreshSidePanel) window.refreshSidePanel();
  }
}

function _onHelpClick(e) {
  var btn = e.currentTarget;
  var reqId = btn.dataset.reqId;
  var result = resolveRequest(reqId, 'help', _VS, _showMsg);
  if (result.ok && window.refreshSidePanel) window.refreshSidePanel();
}

function _onIgnoreClick(e) {
  var btn = e.currentTarget;
  var reqId = btn.dataset.reqId;
  var result = resolveRequest(reqId, 'ignore', _VS, _showMsg);
  if (result.ok && window.refreshSidePanel) window.refreshSidePanel();
}

/* Backward compatibility exports */
export function refreshRequests(VS) {
  _VS = VS;
  // No longer needed, but kept for compatibility
}

/* ── Style injection ───────────────────────────────────────── */
function _injectStyles() {
  if (document.getElementById('req-card-styles')) return;
  var s = document.createElement('style');
  s.id = 'req-card-styles';
  s.textContent = [
    '.req-card {',
    '  background: #1a1208;',
    '  border: 1px solid #3a2a18;',
    '  border-left-width: 4px;',
    '  border-radius: 10px;',
    '  padding: 12px;',
    '  margin-bottom: 12px;',
    '  transition: all 0.2s;',
    '}',
    '.req-card:hover {',
    '  border-color: #c49a4e;',
    '  transform: translateX(-2px);',
    '}',
    '.req-card-header {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 8px;',
    '  margin-bottom: 8px;',
    '}',
    '.req-card-icon { font-size: 20px; }',
    '.req-card-title {',
    '  font-family: "Slackey", sans-serif;',
    '  font-size: 13px;',
    '  font-weight: bold;',
    '  flex: 1;',
    '}',
    '.req-card-urgency { font-size: 12px; }',
    '.req-card-body {',
    '  font-size: 12px;',
    '  color: #c8a878;',
    '  line-height: 1.4;',
    '  margin-bottom: 10px;',
    '}',
    '.req-progress-container {',
    '  background: #2a1a10;',
    '  border-radius: 6px;',
    '  height: 8px;',
    '  margin: 8px 0 4px;',
    '  overflow: hidden;',
    '}',
    '.req-progress-bar {',
    '  background: linear-gradient(90deg, #88dd88, #44aa44);',
    '  height: 100%;',
    '  width: 0%;',
    '  transition: width 0.3s ease;',
    '  border-radius: 6px;',
    '}',
    '.req-progress-text {',
    '  font-family: monospace;',
    '  font-size: 10px;',
    '  color: #8a7040;',
    '  text-align: right;',
    '  margin-bottom: 8px;',
    '}',
    '.req-card-actions {',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 8px;',
    '  margin-top: 8px;',
    '}',
    '.req-build-btn, .req-help-btn {',
    '  width: 100%;',
    '  padding: 8px;',
    '  background: #2a1a08;',
    '  border: 1px solid #c49a4e;',
    '  border-radius: 6px;',
    '  color: #f5c842;',
    '  font-family: "Oldenburg", serif;',
    '  font-size: 12px;',
    '  cursor: pointer;',
    '  transition: all 0.15s;',
    '}',
    '.req-build-btn:hover:not(:disabled), .req-help-btn:hover:not(:disabled) {',
    '  background: #3a2a18;',
    '  transform: translateY(-1px);',
    '}',
    '.req-build-btn:disabled, .req-help-btn:disabled {',
    '  opacity: 0.5;',
    '  cursor: not-allowed;',
    '}',
    '.req-ayuda-section {',
    '  background: #0e0905;',
    '  border: 1px solid #2a1808;',
    '  border-radius: 8px;',
    '  padding: 8px;',
    '}',
    '.req-ayuda-header {',
    '  font-size: 11px;',
    '  color: #c49a4e;',
    '  margin-bottom: 6px;',
    '  font-family: monospace;',
    '  text-transform: uppercase;',
    '}',
    '.req-ayuda-slider-container {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 8px;',
    '  margin-bottom: 8px;',
    '}',
    '.req-ayuda-slider {',
    '  flex: 1;',
    '  height: 4px;',
    '  -webkit-appearance: none;',
    '  background: #3a2a18;',
    '  border-radius: 2px;',
    '  outline: none;',
    '}',
    '.req-ayuda-slider::-webkit-slider-thumb {',
    '  -webkit-appearance: none;',
    '  width: 14px;',
    '  height: 14px;',
    '  border-radius: 50%;',
    '  background: #f5c842;',
    '  cursor: pointer;',
    '}',
    '.req-ayuda-amount {',
    '  font-family: "Oldenburg", serif;',
    '  font-size: 12px;',
    '  color: #f5c842;',
    '  min-width: 45px;',
    '}',
    '.req-ayuda-submit {',
    '  width: 100%;',
    '  padding: 6px;',
    '  background: #1a3010;',
    '  border: 1px solid #44aa44;',
    '  border-radius: 6px;',
    '  color: #88ee88;',
    '  font-family: "Oldenburg", serif;',
    '  font-size: 11px;',
    '  cursor: pointer;',
    '  transition: all 0.15s;',
    '}',
    '.req-ayuda-submit:hover { background: #2a4a18; }',
    '.req-ignore-btn {',
    '  width: 100%;',
    '  padding: 8px;',
    '  background: #2a0808;',
    '  border: 1px solid #aa4444;',
    '  border-radius: 6px;',
    '  color: #ee8888;',
    '  font-family: "Oldenburg", serif;',
    '  font-size: 12px;',
    '  cursor: pointer;',
    '  transition: all 0.15s;',
    '}',
    '.req-ignore-btn:hover { background: #3a1010; }',
    '@media (max-width: 768px) {',
    '  .req-card { padding: 10px; }',
    '  .req-card-title { font-size: 12px; }',
    '  .req-card-body { font-size: 11px; }',
    '  .req-build-btn, .req-help-btn, .req-ignore-btn { padding: 10px; font-size: 11px; }',
    '}',
  ].join('\n');
  document.head.appendChild(s);
}