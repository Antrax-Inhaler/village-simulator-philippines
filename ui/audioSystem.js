/* ═══════════════════════════════════════════════════════════════
   MINI BAYAN — COMPLETE AUDIO SYSTEM
   ─────────────────────────────────────────────────────────────
   DEV TOGGLE: Set SOUNDS_ENABLED = false to silence everything.
   Flip back to true before release.
═══════════════════════════════════════════════════════════════ */

var SOUNDS_ENABLED = true; // ← false = mute ALL audio during dev
window.SOUNDS_ENABLED = SOUNDS_ENABLED; // exposed for modules that read it as a global (e.g. ui/dailyReport.js)

/* ── Shared volume state ─────────────────────────────────── */
var _masterVolume = 0.5; // controlled by the slider
var _sfxVolume    = 0.7; // SFX are slightly louder than BGM

/* ── Volume helpers ──────────────────────────────────────── */
function _updateVolIcon(iconSpan, vol) {
  if (!iconSpan) return;
  iconSpan.textContent = vol === 0 ? '🔇' : vol < 0.3 ? '🔈' : vol < 0.7 ? '🔉' : '🔊';
}

function _setMasterVolume(value) {
  _masterVolume = Math.min(1, Math.max(0, parseFloat(value) || 0));
  // Apply to both BGM tracks immediately
  var dayEl   = document.getElementById('bgm-day');
  var nightEl = document.getElementById('bgm-night');
  if (dayEl)   dayEl.volume   = _masterVolume;
  if (nightEl) nightEl.volume = _masterVolume;
  // Sync all sliders + icons
  var s1 = document.getElementById('audioVolumeSlider');
  var s2 = document.getElementById('settings-volume-slider');
  if (s1) s1.value = _masterVolume;
  if (s2) s2.value = _masterVolume;
  _updateVolIcon(document.getElementById('audioVolIcon'),    _masterVolume);
  _updateVolIcon(document.getElementById('settings-vol-icon'), _masterVolume);
}

window.setBackgroundVolume = _setMasterVolume; // called by settings slider

/* ── WELCOME MUSIC (splash screen only) ──────────────────── */
var _welcomeAudio = null;

function _startWelcomeMusic() {
  if (!SOUNDS_ENABLED) return;
  if (_welcomeAudio) return; // already created
  _welcomeAudio = new Audio('audio/background/welcome.mp3');
  _welcomeAudio.loop   = true;
  _welcomeAudio.volume = _masterVolume;
  _welcomeAudio.play().catch(function() {}); // autoplay may be blocked until user clicks
}

function _stopWelcomeMusic() {
  if (!_welcomeAudio) return;
  // Fade out over 800 ms then stop
  var vol = _welcomeAudio.volume;
  var step = vol / 16;
  var fade = setInterval(function() {
    vol = Math.max(0, vol - step);
    if (_welcomeAudio) _welcomeAudio.volume = vol;
    if (vol <= 0) {
      clearInterval(fade);
      if (_welcomeAudio) { _welcomeAudio.pause(); _welcomeAudio = null; }
    }
  }, 50);
}

/* ── BGM DAY / NIGHT switcher ────────────────────────────── */
var _currentBgm = null; // 'day' | 'night' | null

function _playBgm(track) {
  // track = 'day' or 'night'
  if (!SOUNDS_ENABLED) return;
  if (_currentBgm === track) return; // already playing the right one

  var next = document.getElementById('bgm-' + track);
  var prev = document.getElementById('bgm-' + (_currentBgm || (track === 'day' ? 'night' : 'day')));

  if (!next) return;

  // Fade out previous
  if (prev && !prev.paused) {
    (function(el) {
      var v = el.volume;
      var s = Math.max(0.01, v / 10);
      var t = setInterval(function() {
        v = Math.max(0, v - s);
        el.volume = v;
        if (v <= 0) { clearInterval(t); el.pause(); el.currentTime = 0; }
      }, 60);
    })(prev);
  }

  _currentBgm    = track;
  next.volume    = 0;
  next.loop      = true;
  next.currentTime = 0;
  next.play().catch(function(e) {
    console.warn('[BGM] Could not play bgm-' + track + ':', e.message);
  });

  // Fade in new track
  var targetVol = _masterVolume;
  var fadeVol   = 0;
  var fadeIn = setInterval(function() {
    fadeVol = Math.min(targetVol, fadeVol + 0.03);
    if (next) next.volume = fadeVol;
    if (fadeVol >= targetVol) clearInterval(fadeIn);
  }, 60);
}

/* Called from main.js every frame via updateCenterTime.
   hour is a float 0–24 (VS.time).  Day = 6–18, Night = rest. */
window.updateBgmForTime = function(hour) {
  if (!SOUNDS_ENABLED) return;
  var track = (hour >= 6 && hour < 18) ? 'day' : 'night';
  _playBgm(track);
};

/* ═══════════════════════════════════════════════════════════════
   BATTLE MUSIC SYSTEM
   ═══════════════════════════════════════════════════════════════ */
var _battleMusicActive = false;
var _previousBgmTrack = null;  // Store which track was playing (day/night)

/* Switch to battle music */
window.switchToBattleMusic = function() {
  if (_battleMusicActive) return;

  // Store current track
  _previousBgmTrack = _currentBgm;

  // Fade out current BGM
  var currentEl = document.getElementById('bgm-' + _previousBgmTrack);
  if (currentEl && !currentEl.paused) {
    (function(el) {
      var v = el.volume;
      var s = Math.max(0.01, v / 10);
      var t = setInterval(function() {
        v = Math.max(0, v - s);
        el.volume = v;
        if (v <= 0) {
          clearInterval(t);
          el.pause();
        }
      }, 60);
    })(currentEl);
  }

  // Play battle music
  var battleEl = document.getElementById('bgm-battle');
  if (battleEl && SOUNDS_ENABLED) {
    battleEl.volume = 0;
    battleEl.loop = true;
    battleEl.currentTime = 0;
    battleEl.play().catch(function(e) {
      console.warn('[BGM] Could not play battle music:', e.message);
    });

    // Fade in battle music
    var targetVol = _masterVolume;
    var fadeVol = 0;
    var fadeIn = setInterval(function() {
      fadeVol = Math.min(targetVol, fadeVol + 0.03);
      if (battleEl) battleEl.volume = fadeVol;
      if (fadeVol >= targetVol) clearInterval(fadeIn);
    }, 60);

    _battleMusicActive = true;
  }
};

/* Resume regular day/night music */
window.resumeRegularMusic = function() {
  if (!_battleMusicActive) return;

  // Fade out battle music
  var battleEl = document.getElementById('bgm-battle');
  if (battleEl && !battleEl.paused) {
    (function(el) {
      var v = el.volume;
      var s = Math.max(0.01, v / 10);
      var t = setInterval(function() {
        v = Math.max(0, v - s);
        el.volume = v;
        if (v <= 0) {
          clearInterval(t);
          el.pause();
          el.currentTime = 0;
        }
      }, 60);
    })(battleEl);
  }

  // Resume previous track
  if (_previousBgmTrack) {
    var prevEl = document.getElementById('bgm-' + _previousBgmTrack);
    if (prevEl && SOUNDS_ENABLED) {
      prevEl.volume = 0;
      prevEl.play().catch(function(e) {
        console.warn('[BGM] Could not resume ' + _previousBgmTrack + ':', e.message);
      });

      // Fade in
      var targetVol = _masterVolume;
      var fadeVol = 0;
      var fadeIn = setInterval(function() {
        fadeVol = Math.min(targetVol, fadeVol + 0.03);
        if (prevEl) prevEl.volume = fadeVol;
        if (fadeVol >= targetVol) clearInterval(fadeIn);
      }, 60);
    }
    _currentBgm = _previousBgmTrack;
  }

  _battleMusicActive = false;
};

/* Check if battle music is active */
window.isBattleMusicActive = function() {
  return _battleMusicActive;
};

/* ── PLAY / PAUSE button (controls BGM) ───────────────────── */
var _bgmPaused = false;

function _toggleBgmPause() {
  var dayEl   = document.getElementById('bgm-day');
  var nightEl = document.getElementById('bgm-night');
  var btn     = document.getElementById('audioPlayPauseBtn');
  if (_bgmPaused) {
    // Resume whichever track was current
    var el = document.getElementById('bgm-' + (_currentBgm || 'day'));
    if (el) el.play().catch(function() {});
    _bgmPaused = false;
    if (btn) btn.textContent = '⏸️';
  } else {
    if (dayEl)   dayEl.pause();
    if (nightEl) nightEl.pause();
    _bgmPaused = true;
    if (btn) btn.textContent = '▶️';
  }
}

var _playPauseBtn = document.getElementById('audioPlayPauseBtn');
if (_playPauseBtn) _playPauseBtn.addEventListener('click', _toggleBgmPause);

var _volSlider1 = document.getElementById('audioVolumeSlider');
var _volSlider2 = document.getElementById('settings-volume-slider');
if (_volSlider1) _volSlider1.addEventListener('input', function(e) { _setMasterVolume(e.target.value); });
if (_volSlider2) _volSlider2.addEventListener('input', function(e) { _setMasterVolume(e.target.value); });

_setMasterVolume(0.5); // init icons & sliders

/* ── Splash buttons: start welcome music on first click ──── */
document.getElementById('btnStart')?.addEventListener('click', _startWelcomeMusic);
document.getElementById('btnContinue')?.addEventListener('click', _startWelcomeMusic);

/* ── SFX ENGINE ──────────────────────────────────────────── */
/*  DEV TOGGLE — same SOUNDS_ENABLED flag controls SFX too   */

window.playSound = function(id, opts) {
  if (!SOUNDS_ENABLED) return;
  var el = document.getElementById(id);
  if (!el) { console.warn('[SFX] No element: #' + id); return; }
  el.volume = Math.min(1, _sfxVolume);
  if (opts && opts.loop) { el.loop = true; }
  if (!opts || !opts.loop) { el.currentTime = 0; }
  el.play().catch(function(e) {
    console.warn('[SFX] Could not play #' + id + ':', e.message);
  });
};

window.stopSound = function(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.pause();
  el.currentTime = 0;
};

window.stopAllCalamitySounds = function() {
  ['sfx-calamity-bagyo', 'sfx-calamity-lindol', 'sfx-calamity-tagtuyot'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.pause(); el.currentTime = 0; el.loop = false; }
  });
};

window.setSfxVolume = function(v) { _sfxVolume = Math.min(1, Math.max(0, parseFloat(v))); };

/* ── Hook into game launch: stop welcome → start BGM ─────── */
/*  _minibayanInit is called when the user presses Start/Continue.
    We wrap it so we can cleanly swap audio at that moment.     */
var _origMinibayanInit = null;
Object.defineProperty(window, '_minibayanInit', {
  get: function() { return _origMinibayanInit; },
  set: function(fn) {
    _origMinibayanInit = function(loadSave) {
      _stopWelcomeMusic();           // fade out splash music
      // BGM starts as soon as the game loop calls updateBgmForTime()
      fn(loadSave);
    };
  },
  configurable: true,
});

/* ── Center time display (also drives BGM switching) ─────── */
window.updateCenterTime = function(timeStr, dayStr) {
  var timeEl = document.getElementById('centerTimeStr');
  var dayEl  = document.getElementById('centerDayStr');
  if (timeEl) timeEl.textContent = timeStr;
  if (dayEl)  dayEl.textContent  = dayStr;
  // Parse hour from "HH:MM AM/PM" to switch BGM
  if (window._VS && window._VS.time !== undefined) {
    window.updateBgmForTime(window._VS.time);
  }
};
