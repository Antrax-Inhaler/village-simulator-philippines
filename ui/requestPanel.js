/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — ui/requestPanel.js (Side Panel Version - FIXED)
═══════════════════════════════════════════════════════════════ */

import { getActiveRequests, resolveRequest, getEmploymentProgress, getAyudaSatisfactionRange } from '../villagers/citizenNeeds.js';

/* ── Deps ─────────────────────────────────────────────────── */
var _showMsg = null;
var _VS = null;
var _openShopFiltered = null;

/* ── Ayuda values per request ─────────────────────────────── */
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
  
  // Job-based requests
  if (req.category === 'job') {
    return _renderJobCard(req, urgColor, urgencyIcon);
  } 
  // Building deficit requests
  else if (req.category === 'building') {
    return _renderBuildingCard(req, urgColor, urgencyIcon);
  } 
  // Housing requests
  else if (req.category === 'housing') {
    return _renderHousingCard(req, urgColor, urgencyIcon);
  } 
  // Legacy requests (hunger, health, safety) - without help button
  else {
    return _renderLegacyCard(req, urgColor, urgencyIcon);
  }
}

/* Job card with progress bar, build button, ayuda number input, ignore button */
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
  var minMax = getAyudaSatisfactionRange(req.id);
  
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
      '<div class="req-ayuda-section">' +
        '<div class="req-ayuda-header">💰 Magbigay ng Ayuda</div>' +
        '<div class="req-ayuda-input-container">' +
          '<input type="number" class="req-ayuda-input" data-req-id="' + req.id + '" data-type="job" ' +
                 'min="0" max="500" step="10" value="' + _ayudaValues[ayudaKey] + '" />' +
          '<span class="req-ayuda-unit">🪙</span>' +
        '</div>' +
        '<button class="req-ayuda-submit" data-req-id="' + req.id + '" data-type="job">💸 Ibigay ang Ayuda</button>' +
      '</div>' +
      '<button class="req-ignore-btn" data-req-id="' + req.id + '" data-action="ignore">❌ Balewalain</button>' +
    '</div>' +
  '</div>';
}

/* Building deficit card - shows build button, ayuda, ignore */
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
      '<div class="req-ayuda-section">' +
        '<div class="req-ayuda-header">💰 Magbigay ng Ayuda</div>' +
        '<div class="req-ayuda-input-container">' +
          '<input type="number" class="req-ayuda-input" data-req-id="' + req.id + '" data-type="building" ' +
                 'min="0" max="500" step="10" value="' + _ayudaValues[ayudaKey] + '" />' +
          '<span class="req-ayuda-unit">🪙</span>' +
        '</div>' +
        '<button class="req-ayuda-submit" data-req-id="' + req.id + '" data-type="building">💸 Ibigay ang Ayuda</button>' +
      '</div>' +
      '<button class="req-ignore-btn" data-req-id="' + req.id + '" data-action="ignore">❌ Balewalain</button>' +
    '</div>' +
  '</div>';
}

/* Housing card - shows progress bar, build button, ayuda, ignore */
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
      '<div class="req-ayuda-section">' +
        '<div class="req-ayuda-header">💰 Magbigay ng Ayuda</div>' +
        '<div class="req-ayuda-input-container">' +
          '<input type="number" class="req-ayuda-input" data-req-id="' + req.id + '" data-type="housing" ' +
                 'min="0" max="500" step="10" value="' + _ayudaValues[ayudaKey] + '" />' +
          '<span class="req-ayuda-unit">🪙</span>' +
        '</div>' +
        '<button class="req-ayuda-submit" data-req-id="' + req.id + '" data-type="housing">💸 Ibigay ang Ayuda</button>' +
      '</div>' +
      '<button class="req-ignore-btn" data-req-id="' + req.id + '" data-action="ignore">❌ Balewalain</button>' +
    '</div>' +
  '</div>';
}

/* Legacy card (hunger, health, safety) - only ayuda and ignore, no help button */
function _renderLegacyCard(req, urgColor, urgencyIcon) {
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
      '<div class="req-ayuda-section">' +
        '<div class="req-ayuda-header">💰 Magbigay ng Ayuda</div>' +
        '<div class="req-ayuda-input-container">' +
          '<input type="number" class="req-ayuda-input" data-req-id="' + req.id + '" data-type="legacy" ' +
                 'min="0" max="500" step="10" value="' + _ayudaValues[ayudaKey] + '" />' +
          '<span class="req-ayuda-unit">🪙</span>' +
        '</div>' +
        '<button class="req-ayuda-submit" data-req-id="' + req.id + '" data-type="legacy">💸 Ibigay ang Ayuda</button>' +
      '</div>' +
      '<button class="req-ignore-btn" data-req-id="' + req.id + '" data-action="ignore">❌ Balewalain</button>' +
    '</div>' +
  '</div>';
}

/* Wire up event listeners */
function wireRequestButtons() {
  // Ayuda number inputs - store values
  document.querySelectorAll('.req-ayuda-input').forEach(function(input) {
    input.removeEventListener('change', _onAyudaInputChange);
    input.addEventListener('change', _onAyudaInputChange);
  });
  
  // Ayuda submit buttons
  document.querySelectorAll('.req-ayuda-submit').forEach(function(btn) {
    btn.removeEventListener('click', _onAyudaSubmit);
    btn.addEventListener('click', _onAyudaSubmit);
  });
  
  // Ignore buttons
  document.querySelectorAll('.req-ignore-btn').forEach(function(btn) {
    btn.removeEventListener('click', _onIgnoreClick);
    btn.addEventListener('click', _onIgnoreClick);
  });
}

function _onAyudaInputChange(e) {
  var input = e.currentTarget;
  var reqId = input.dataset.reqId;
  var type = input.dataset.type;
  var value = parseInt(input.value) || 0;
  var key = type + '_' + reqId;
  _ayudaValues[key] = Math.min(500, Math.max(0, value));
  input.value = _ayudaValues[key];
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
      var reactionMsg = result.effect.reaction === 'low' ? '😤 Masyadong mababa ang ayuda! (-5 tiwala)' :
                        result.effect.reaction === 'high' ? '😲 Sobra ang ayuda! Sana laging ganito.' :
                        '🙏 Salamat po sa ayuda! (+8 tiwala)';
      _showMsg(reactionMsg, result.effect.reaction === 'good' ? 'success' : 'info');
    }
    // Refresh side panel
    if (window.refreshSidePanel) window.refreshSidePanel();
  }
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

/* ── Style injection for request cards ────────────────────── */
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
    '.req-ayuda-section {',
    '  background: #0e0905;',
    '  border: 1px solid #2a1808;',
    '  border-radius: 8px;',
    '  padding: 10px;',
    '}',
    '.req-ayuda-header {',
    '  font-size: 11px;',
    '  color: #c49a4e;',
    '  margin-bottom: 8px;',
    '  font-family: monospace;',
    '  text-transform: uppercase;',
    '  text-align: center;',
    '}',
    '.req-ayuda-input-container {',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  gap: 8px;',
    '  margin-bottom: 10px;',
    '}',
    '.req-ayuda-input {',
    '  width: 120px;',
    '  padding: 8px;',
    '  background: #2a1a10;',
    '  border: 1px solid #c49a4e;',
    '  border-radius: 6px;',
    '  color: #f5c842;',
    '  font-family: "Oldenburg", serif;',
    '  font-size: 14px;',
    '  text-align: center;',
    '  font-weight: bold;',
    '}',
    '.req-ayuda-input:focus {',
    '  outline: none;',
    '  border-color: #f5c842;',
    '  background: #3a2a18;',
    '}',
    '.req-ayuda-unit {',
    '  font-size: 16px;',
    '  color: #f5c842;',
    '}',
    '.req-ayuda-submit {',
    '  width: 100%;',
    '  padding: 8px;',
    '  background: #1a3010;',
    '  border: 1px solid #44aa44;',
    '  border-radius: 6px;',
    '  color: #88ee88;',
    '  font-family: "Oldenburg", serif;',
    '  font-size: 12px;',
    '  font-weight: bold;',
    '  cursor: pointer;',
    '  transition: all 0.15s;',
    '}',
    '.req-ayuda-submit:hover {',
    '  background: #2a4a18;',
    '  transform: translateY(-1px);',
    '}',
    '.req-ignore-btn {',
    '  width: 100%;',
    '  padding: 8px;',
    '  background: #2a0808;',
    '  border: 1px solid #aa4444;',
    '  border-radius: 6px;',
    '  color: #ee8888;',
    '  font-family: "Oldenburg", serif;',
    '  font-size: 12px;',
    '  font-weight: bold;',
    '  cursor: pointer;',
    '  transition: all 0.15s;',
    '}',
    '.req-ignore-btn:hover {',
    '  background: #3a1010;',
    '  transform: translateY(-1px);',
    '}',
    '@media (max-width: 768px) {',
    '  .req-card { padding: 10px; }',
    '  .req-card-title { font-size: 12px; }',
    '  .req-card-body { font-size: 11px; }',
    '  .req-ayuda-input { width: 100px; padding: 6px; font-size: 12px; }',
    '  .req-ayuda-submit, .req-ignore-btn { padding: 8px; font-size: 11px; }',
    '}',
    '@media (max-width: 480px) {',
    '  .req-ayuda-input { width: 80px; }',
    '}',
  ].join('\n');
  document.head.appendChild(s);
}