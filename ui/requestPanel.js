/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — ui/requestPanel.js

   CITIZEN REQUEST INBOX + EVENT RESPONSE PANEL
   ─────────────────────────────────────────────────────────────
   DOM strip injected at the TOP of #canvas-container.
   Shows up to MAX_VISIBLE cards at once — citizen needs and
   government events share the same inbox.

   CARD TYPES
   ─────────────────────────────────────────────────────────────
   'need'   — from citizenNeeds.js (hunger, health, tax, etc.)
              Buttons: Tulungan (Help) | Ipagpaliban (Delay) | Balewalain (Ignore)
   'event'  — from government/events.js (bagyo, welga, etc.)
              Buttons: response labels from the event template

   FLOW
   ─────────────────────────────────────────────────────────────
   main.js calls refreshRequests(VS) once per second.
   The panel merges need-requests and active-events, sorts by
   severity, and re-renders. Button clicks call the appropriate
   resolver in citizenNeeds.js or events.js.

   EXPORTS
   ─────────────────────────────────────────────────────────────
   initRequestPanel(deps)    — call once after DOM ready
   refreshRequests(VS)       — call periodically from main.js
═══════════════════════════════════════════════════════════════ */

import { getActiveRequests, resolveRequest } from '../villagers/citizenNeeds.js';

/* ── Deps ─────────────────────────────────────────────────── */
var _showMsg = null;
var _VS      = null;

var MAX_VISIBLE = 5;

/* ══════════════════════════════════════════════════════════════
   initRequestPanel
══════════════════════════════════════════════════════════════ */
export function initRequestPanel(deps) {
  _showMsg = deps.showMsg;
  _VS      = deps.VS;
  _injectStyles();
  _buildDOM();
}

/* ══════════════════════════════════════════════════════════════
   refreshRequests
   Merges needs + events, re-renders the inbox strip.
   Call from main.js every ~1 real second (not every frame).
══════════════════════════════════════════════════════════════ */
export function refreshRequests(VS) {
  _VS = VS;
  var strip = document.getElementById('req-strip');
  if (!strip) return;

  /* Gather all pending items */
  var needs  = getActiveRequests(VS);

  /* Sort needs by urgency desc */
  var items = needs.map(function(req) {
    return { type: 'need', data: req, priority: req.urgency || 1 };
  });

  items.sort(function(a, b) { return b.priority - a.priority; });
  items = items.slice(0, MAX_VISIBLE);

  if (items.length === 0) {
    strip.innerHTML = '';
    strip.style.display = 'none';
    return;
  }

  strip.style.display = 'flex';
  strip.innerHTML = items.map(function(item) { return _renderNeedCard(item.data); }).join('');

  _wireCards(VS);
}

/* ── Need card ────────────────────────────────────────────── */
function _renderNeedCard(req) {
  var urgColor = req.urgency >= 3 ? '#e74c3c' : req.urgency === 2 ? '#e67e22' : '#f5c842';
  var helpCost = req.helpCostGold || 0;
  var canAffordHelp = _VS ? _VS.res.gold >= helpCost : true;

  return '<div class="req-card req-card-need" style="border-color:' + urgColor + '">' +
    '<div class="req-card-head">' +
      '<span class="req-card-title" style="color:' + urgColor + '">' +
        (req.citizenLabel || 'Mamamayan') +
      '</span>' +
      '<span class="req-tag">' + (req.category || 'Kailangan') + '</span>' +
    '</div>' +
    '<div class="req-card-body">' + req.message + '</div>' +
    '<div class="req-card-btns">' +
      '<button class="req-btn req-help' + (canAffordHelp ? '' : ' cant-afford') + '" ' +
              'data-req-id="' + req.id + '" data-action="help">' +
        'Tulungan' + (helpCost > 0 ? '<small>' + helpCost + ' ginto</small>' : '') +
      '</button>' +
      '<button class="req-btn req-delay" data-req-id="' + req.id + '" data-action="delay">' +
        'Ipagpaliban' +
      '</button>' +
      '<button class="req-btn req-ignore" data-req-id="' + req.id + '" data-action="ignore">' +
        'Balewalain' +
      '</button>' +
    '</div>' +
  '</div>';
}

/* ── Wire button clicks ───────────────────────────────────── */
function _wireCards(VS) {
  /* Need action buttons */
  document.querySelectorAll('[data-req-id]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var reqId  = btn.dataset.reqId;
      var action = btn.dataset.action;
      var result = resolveRequest(reqId, action, VS, _showMsg);
      if (result.ok) refreshRequests(VS);
      else if (_showMsg) _showMsg(result.msg);
    });
  });
}

/* ── DOM builder ──────────────────────────────────────────── */
function _buildDOM() {
  var container = document.getElementById('canvas-container');
  if (!container || document.getElementById('req-strip')) return;

  var strip = document.createElement('div');
  strip.id  = 'req-strip';
  container.appendChild(strip);
}

/* ── Style injection ──────────────────────────────────────── */
function _injectStyles() {
  if (document.getElementById('req-styles')) return;
  var s = document.createElement('style');
  s.id  = 'req-styles';
  s.textContent = [
    '#req-strip{',
    '  position:absolute; bottom:8px; left:50%; transform:translateX(-50%);',
    '  display:flex; gap:8px; align-items:flex-end;',
    '  z-index:22; pointer-events:all;',
    '  max-width:90vw; overflow-x:auto;',
    '  padding-bottom:2px;',
    '}',
    '.req-card{',
    '  flex-shrink:0; width:220px;',
    '  background:rgba(13,8,4,0.96);',
    '  border:1.5px solid #8a6030;',
    '  border-radius:8px;',
    '  padding:7px 9px 8px;',
    '  font-family:"Crimson Pro",Georgia,serif;',
    '  pointer-events:all;',
    '}',
    '.req-card-head{',
    '  display:flex; justify-content:space-between; align-items:center;',
    '  margin-bottom:4px;',
    '}',
    '.req-card-title{',
    '  font-family:"Oldenburg",serif; font-size:14px; font-weight:bold;',
    '  color:#f5c842;',
    '}',
    '.req-timer{',
    '  font-family:monospace; font-size:13px; color:#e74c3c;',
    '}',
    '.req-tag{',
    '  font-family:monospace; font-size:13px; color:#8a6030;',
    '  background:#2a1808; border-radius:3px; padding:1px 5px;',
    '}',
    '.req-card-body{',
    '  font-size:15px; color:#c8a878; line-height:1.45;',
    '  margin-bottom:6px;',
    '}',
    '.req-card-btns{',
    '  display:flex; gap:4px; flex-wrap:wrap;',
    '}',
    '.req-btn{',
    '  flex:1; min-width:0; padding:4px 4px;',
    '  font-family:"Oldenburg",serif; font-size:13px; font-weight:bold;',
    '  border:1px solid #3a2010; border-radius:4px;',
    '  background:#1a1208; color:#f5c842;',
    '  cursor:pointer; text-align:center; line-height:1.3;',
    '  transition:background .12s;',
    '}',
    '.req-btn small{',
    '  display:block; font-family:monospace; font-size:12px;',
    '  color:#8a7050; font-weight:normal;',
    '}',
    '.req-btn:hover{ background:#2a2010; border-color:#c49a4e; }',
    '.req-btn:active{ filter:brightness(.85); }',
    '.req-btn.cant-afford{ opacity:.45; cursor:not-allowed; }',
    '.req-help { border-color:#44aa44; background:#0a1a08; }',
    '.req-help:hover { background:#1a2a10; }',
    '.req-delay{ border-color:#8a6030; }',
    '.req-ignore{ border-color:#aa4444; background:#1a0808; }',
    '.req-ignore:hover{ background:#2a1010; }',

    /* Mobile landscape — tighter cards */
    '@media (max-height:480px) and (orientation:landscape){',
    '  #req-strip{ bottom:4px; gap:5px; }',
    '  .req-card{ width:160px; padding:5px 7px 6px; }',
    '  .req-card-title{ font-size:11px; }',
    '  .req-card-body{ font-size:12px; margin-bottom:3px; }',
    '  .req-btn{ font-size:10px; padding:3px 2px; }',
    '  .req-btn small{ font-size:9px; }',
    '}',
    /* Touch devices — already smaller via style.css coarse pointer rule,
       but ensure the strip doesn't block canvas tap targets */
    '@media (hover:none) and (pointer:coarse){',
    '  #req-strip{ max-width:96vw; }',
    '}',

  ].join('\n');
  document.head.appendChild(s);
}