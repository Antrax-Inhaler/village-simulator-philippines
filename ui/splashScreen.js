/* ═══════════════════════════════════════════════════════════════
   MINI BAYAN — Splash Screen Logic
   Continue/New Game buttons, save-slot detection, loading bar.
═══════════════════════════════════════════════════════════════ */

var SAVE_KEY = 'miniBayan_save';
var AUTOSAVE_KEY = 'miniBayan_autosave';
function _getSaveInfo(key) { try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; } }
var save = _getSaveInfo(SAVE_KEY) || _getSaveInfo(AUTOSAVE_KEY);
var isAuto = !_getSaveInfo(SAVE_KEY) && !!_getSaveInfo(AUTOSAVE_KEY);
var btnCont = document.getElementById('btnContinue');
var infoEl = document.getElementById('splash-save-info');
var day = save ? (save.dayCount || 1) : 1;
var date = save && save.savedAt ? new Date(save.savedAt).toLocaleDateString('fil-PH') : '';
if (save && btnCont) {
  btnCont.style.display = 'block';
  if (infoEl) infoEl.textContent = (isAuto ? 'Auto-save' : 'Naligtas') + ': Araw ' + day + (date ? '  •  ' + date : '');
}
function _launch(loadSave) {
  var splash = document.getElementById('splash');
  var gameWrap = document.getElementById('game-wrap');
  if (!splash || !gameWrap) return;
  splash.style.opacity = '0';
  splash.style.transition = 'opacity 0.6s';
  setTimeout(function() {
    splash.style.display = 'none';
    gameWrap.classList.add('visible');
    window._minibayanAutoLoad = loadSave;
    if (window._minibayanInit) window._minibayanInit(loadSave);
  }, 620);
}
document.getElementById('btnContinue').addEventListener('click', function() { _launch(true); });
document.getElementById('btnStart').addEventListener('click', function() { _launch(false); });

// Simulate loading for 1.2 seconds, then reveal the start buttons
var loadingContainer = document.getElementById('loading-container');
var buttonContainer = document.getElementById('button-container');
var progressBar = document.getElementById('loading-progress');

function finishLoading() {
  loadingContainer.style.display = 'none';
  buttonContainer.style.display = 'block';
  if (save && btnCont) btnCont.style.display = 'block';
  if (infoEl && save) infoEl.textContent = (isAuto ? 'Auto-save' : 'Naligtas') + ': Araw ' + day + (date ? '  •  ' + date : '');
}

var startTime = Date.now();
var duration = 1200; // 1.2 seconds
var interval = setInterval(function() {
  var elapsed = Date.now() - startTime;
  var percent = Math.min(100, (elapsed / duration) * 100);
  progressBar.style.width = percent + '%';
  if (percent >= 100) {
    clearInterval(interval);
    finishLoading();
  }
}, 16);
