/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — ui/notifToast.js
   (original code preserved — only _injectStyles updated for mobile)
═══════════════════════════════════════════════════════════════ */

var MAX_TOASTS   = 4;
var DEFAULT_LIFE = 4000;
var LIFE_BY_TYPE = {
  success:   4500,
  warning:   4000,
  danger:    6000,
  info:      3400,
  game_over: 0,
};

var _toasts   = [];
var _injected = false;

export function initToasts() {
  if (_injected) return;
  _injectStyles();
  _buildDOM();
  _injected = true;
}

export function showToast(message, type) {
  type = type || 'info';
  if (type === 'game_over') { _showGameOver(message); return; }

  if (_toasts.length >= MAX_TOASTS) {
    var oldest = _toasts.shift();
    _removeToastEl(oldest.id);
  }

  var id    = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  var life  = LIFE_BY_TYPE[type] || DEFAULT_LIFE;
  var toast = { id: id, type: type, message: message };
  _toasts.push(toast);
  _renderToast(toast);
  if (life > 0) setTimeout(function() { _dismissToast(id); }, life);
}

export function showMsg(text) { showToast(text, 'info'); }

function _renderToast(toast) {
  var stack = document.getElementById('toast-stack');
  if (!stack) return;
  var el = document.createElement('div');
  el.id        = toast.id;
  el.className = 'toast toast-' + toast.type;
  var icons = { success: '✓', warning: '!', danger: '✕', info: '·' };
  el.innerHTML =
    '<span class="toast-icon toast-icon-' + toast.type + '">' + (icons[toast.type] || '·') + '</span>' +
    '<span class="toast-msg">' + _escapeHtml(toast.message) + '</span>' +
    '<button class="toast-close" data-id="' + toast.id + '">✕</button>';
  el.querySelector('.toast-close').addEventListener('click', function() { _dismissToast(toast.id); });
  el.style.opacity   = '0';
  el.style.transform = 'translateX(30px)';
  stack.appendChild(el);
  requestAnimationFrame(function() {
    requestAnimationFrame(function() { el.style.opacity = '1'; el.style.transform = 'translateX(0)'; });
  });
}

function _dismissToast(id) {
  _toasts = _toasts.filter(function(t) { return t.id !== id; });
  _removeToastEl(id);
}

function _removeToastEl(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.opacity   = '0';
  el.style.transform = 'translateX(30px)';
  setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 280);
}

function _showGameOver(message) {
  _toasts.forEach(function(t) { _removeToastEl(t.id); });
  _toasts = [];
  var overlay = document.createElement('div');
  overlay.id  = 'game-over-overlay';
  overlay.innerHTML =
    '<div id="game-over-box">' +
      '<div id="game-over-title">Laro ay Tapos Na</div>' +
      '<div id="game-over-msg">' + _escapeHtml(message) + '</div>' +
      '<button id="game-over-restart" onclick="location.reload()">Subukan Muli</button>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.style.opacity = '0';
  requestAnimationFrame(function() {
    requestAnimationFrame(function() { overlay.style.opacity = '1'; });
  });
}

function _buildDOM() {
  if (document.getElementById('toast-stack')) return;
  var stack = document.createElement('div');
  stack.id  = 'toast-stack';
  document.body.appendChild(stack);
}

function _escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _injectStyles() {
  if (document.getElementById('toast-styles')) return;
  var s = document.createElement('style');
  s.id  = 'toast-styles';
  s.textContent = [
    '#toast-stack{',
    '  position:fixed; top:18px; left:50%; transform:translateX(-50%);',
    '  display:flex; flex-direction:column; gap:6px;',
    '  z-index:500; pointer-events:none;',
    '  max-width:min(520px, 90vw);',
    '}',
    '.toast{',
    '  display:flex; align-items:center; gap:8px;',
    '  background:rgba(13,8,4,0.96); border:1px solid #3a2010; border-radius:5px;',
    '  padding:9px 14px 9px 10px; pointer-events:all;',
    '  font-family:"Crimson Pro",Georgia,serif; font-size:13px; color:#e8d4a0;',
    '  box-shadow:0 3px 12px rgba(0,0,0,0.55);',
    '  transition:opacity .25s ease, transform .25s ease; max-width:520px;',
    '}',
    '.toast-success { border-color:#44aa44; }',
    '.toast-warning { border-color:#c49a4e; }',
    '.toast-danger  { border-color:#aa4444; }',
    '.toast-info    { border-color:#3a2010; }',
    '.toast-icon{ width:18px; height:18px; border-radius:50%; display:flex;',
    '  align-items:center; justify-content:center; font-size:10px; font-weight:bold; flex-shrink:0; }',
    '.toast-icon-success{ background:#1a3010; color:#44aa44; }',
    '.toast-icon-warning{ background:#2a1808; color:#c49a4e; }',
    '.toast-icon-danger { background:#2a0a0a; color:#aa4444; }',
    '.toast-icon-info   { background:#1a1208; color:#6a5030; }',
    '.toast-msg{ flex:1; line-height:1.45; }',
    '.toast-close{ flex-shrink:0; background:none; border:none; color:#6a5030;',
    '  cursor:pointer; font-size:11px; padding:0 0 0 6px; line-height:1; transition:color .12s; }',
    '.toast-close:hover{ color:#c49a4e; }',

    /* Mobile landscape — smaller toasts */
    '@media (max-height:480px) and (orientation:landscape){',
    '  #toast-stack{ top:5px; gap:3px; max-width:min(300px,65vw); }',
    '  .toast{ padding:5px 8px 5px 6px; font-size:11px; gap:5px; }',
    '  .toast-icon{ width:13px; height:13px; font-size:8px; }',
    '  .toast-close{ font-size:9px; }',
    '}',

    /* Touch — game-over box smaller */
    '@media (hover:none) and (pointer:coarse){',
    '  #game-over-box{ padding:24px 28px; }',
    '  #game-over-title{ font-size:22px; }',
    '  #game-over-msg{ font-size:13px; }',
    '}',

    '#game-over-overlay{ position:fixed; inset:0; z-index:900;',
    '  background:rgba(5,2,1,0.88); display:flex; align-items:center; justify-content:center;',
    '  transition:opacity .5s ease; }',
    '#game-over-box{ background:#0e0905; border:2px solid #aa4444;',
    '  border-radius:8px; padding:40px 56px; text-align:center; max-width:480px; }',
    '#game-over-title{ font-family:"Oldenburg",serif; font-size:32px;',
    '  color:#aa4444; letter-spacing:.1em; margin-bottom:16px; }',
    '#game-over-msg{ font-family:"Crimson Pro",Georgia,serif;',
    '  font-size:15px; color:#e8d4a0; line-height:1.6; margin-bottom:28px; }',
    '#game-over-restart{ padding:12px 40px; font-family:"Oldenburg",serif; font-size:13px;',
    '  background:transparent; border:1.5px solid #f5c842; color:#f5c842; cursor:pointer;',
    '  border-radius:4px; letter-spacing:.1em; transition:background .2s; }',
    '#game-over-restart:hover{ background:#f5c84218; }',
  ].join('\n');
  document.head.appendChild(s);
}