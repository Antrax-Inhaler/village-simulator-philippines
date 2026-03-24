/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — utils/time.js
   Day/night cycle.

   TIMING (fixed):
     1 real second  =  2 in-game minutes   (speed × 1)
     1 real minute  =  2 in-game hours
     1 real hour    = half an in-game day
     Full 24h cycle = 12 real minutes  @ speed 1
                    =  6 real minutes  @ speed 2
                    =  3 real minutes  @ speed 4

   Formula: VS.time += dt * GAME_MINS_PER_REAL_SEC / 60
            where GAME_MINS_PER_REAL_SEC = 2 * speedMultiplier
            → VS.time += dt * (2/60) * speed
            → one full day (24 h) takes 720 real seconds @ 1×
═══════════════════════════════════════════════════════════════ */

import { clamp, lerp } from './perspective.js';

// ── Speed multiplier (changed by setSpeed() in main.js) ─────
export var timeSpeed = 1;

export function setTimeSpeed(s) {
  timeSpeed = s;
}

/**
 * advanceTime(dt, currentHour)
 * Advances the hour value by the correct amount.
 * Returns the new hour (wraps 0–24).
 *
 * @param {number} dt          – delta time in real seconds
 * @param {number} currentHour – current VS.time (0–24)
 * @returns {number} new VS.time
 */
export function advanceTime(dt, currentHour) {
  // 2 game-minutes per real second at speed 1
  // divide by 60 to convert game-minutes → game-hours
  var GAME_MINS_PER_REAL_SEC = 2;
  var delta = dt * GAME_MINS_PER_REAL_SEC * timeSpeed / 60;
  return (currentHour + delta) % 24;
}

/**
 * getTimeOfDay(hour)
 * Tagalog time-of-day label.
 * @param {number} hour  0–24
 * @returns {string}
 */
export function getTimeOfDay(hour) {
  var h = hour === undefined ? 12 : hour;
  if (h >= 5  && h < 12) return 'Umaga';
  if (h >= 12 && h < 14) return 'Tanghali';
  if (h >= 14 && h < 18) return 'Hapon';
  if (h >= 18 && h < 21) return 'Gabi';
  return 'Hatinggabi';
}

/**
 * getTimeStr(hour)
 * Returns a 12-hour clock string e.g. "7:35 AM"
 * @param {number} hour  0–24 float
 * @returns {string}
 */
export function getTimeStr(hour) {
  var h   = Math.floor(hour);
  var m   = Math.floor((hour - h) * 60);
  var ampm = h < 12 ? 'AM' : 'PM';
  var hh  = h % 12 || 12;
  return hh + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
}

/**
 * getOverlayColor(hour)
 * Returns an rgba() string for the day/night canvas overlay.
 *
 * Timeline:
 *   04:00 → start of dawn   (dark → light)
 *   06:00 → full day        (very subtle warm tint)
 *   17:00 → start of sunset (light → orange)
 *   18:30 → start of dusk   (orange → dark)
 *   20:00 → full night      (deep dark blue)
 *
 * @param {number} hour  0–24 float
 * @returns {string}  rgba CSS string
 */
export function getOverlayColor(hour) {
  // Define keyframes as [hour, r, g, b, alpha]
  var keys = [
    [0,    0,   0,  30, 0.50],   // midnight
    [4,    0,   0,  30, 0.45],   // pre-dawn
    [5,   20,  10,  10, 0.25],   // early dawn
    [6,   255, 220, 150, 0.08],  // morning
    [10,  255, 255, 200, 0.05],  // midday
    [14,  255, 255, 200, 0.05],  // afternoon
    [17,  255, 160,  60, 0.12],  // golden hour
    [18,  200,  80,  20, 0.20],  // sunset
    [19,   40,  10,  30, 0.35],  // dusk
    [20,    0,   0,  30, 0.45],  // early night
    [24,    0,   0,  30, 0.50],  // midnight (repeat)
  ];

  // Find surrounding keyframes
  var prev = keys[0];
  var next = keys[keys.length - 1];
  for (var i = 0; i < keys.length - 1; i++) {
    if (hour >= keys[i][0] && hour < keys[i + 1][0]) {
      prev = keys[i];
      next = keys[i + 1];
      break;
    }
  }

  // Interpolation factor within this segment
  var span = next[0] - prev[0];
  var t    = span > 0 ? clamp((hour - prev[0]) / span, 0, 1) : 0;
  // Smooth step for gentler transitions
  t = t * t * (3 - 2 * t);

  var r = Math.round(lerp(prev[1], next[1], t));
  var g = Math.round(lerp(prev[2], next[2], t));
  var b = Math.round(lerp(prev[3], next[3], t));
  var a = lerp(prev[4], next[4], t).toFixed(3);

  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

/**
 * getSunMoonState(hour)
 * Returns position + appearance of the sun or moon
 * for decorative rendering in main.js render().
 *
 * @param {number} hour 0–24
 * @param {number} VW   canvas width
 * @param {number} VH   canvas height
 * @returns {{ x, y, radius, color, glow, visible }}
 */
export function getSunMoonState(hour, VW, VH) {
  var isDay = hour >= 5.5 && hour < 19.5;

  // Arc progress: sun rises at 6, peaks at noon, sets at 18
  //               moon rises at 20, peaks at 0/24, sets at 4
  var progress, arcHeight;

  if (isDay) {
    progress  = clamp((hour - 6) / 12, 0, 1);     // 0→1 over 6:00–18:00
    arcHeight = VH * 0.28;
  } else {
    // Night arc: hour 18–30 (wrapping 24 to 30)
    var nh = hour >= 18 ? hour : hour + 24;        // 18–30
    progress  = clamp((nh - 20) / 8, 0, 1);        // 0→1 over 20:00–04:00
    arcHeight = VH * 0.22;
  }

  // Horizontal: left edge at 0, right edge at VW
  var x = lerp(VW * 0.05, VW * 0.95, progress);
  // Vertical: starts/ends near horizon, peaks at top
  var y = VH * 0.08 + arcHeight * (1 - Math.sin(progress * Math.PI));

  if (isDay) {
    // Colour shifts warm at dawn/dusk, white at noon
    var noon  = 1 - Math.abs(progress - 0.5) * 2;  // 0 at edges, 1 at noon
    var r = 255;
    var g = Math.round(lerp(180, 255, noon));
    var b = Math.round(lerp(60,  220, noon));
    return {
      x: x, y: y,
      radius: 14,
      color: 'rgb(' + r + ',' + g + ',' + b + ')',
      glow:  'rgba(' + r + ',' + g + ',' + b + ',0.25)',
      glowR: 48,
      visible: progress > 0 && progress < 1
    };
  } else {
    return {
      x: x, y: y,
      radius: 10,
      color: '#dde8ff',
      glow:  'rgba(180,200,255,0.15)',
      glowR: 36,
      visible: true
    };
  }
}
