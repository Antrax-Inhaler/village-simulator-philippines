/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — villagers/villagerQuips.js

   DESIGN
   ─────────────────────────────────────────────────────────────
   • Floating head labels — canvas-drawn, no DOM / no bubble tail
   • Background: rgba(10,6,2,0.72) — dark panel, semi-transparent
   • Border: thin rounded rect in --clr-accent-dim (#c49a4e)
   • Text: --clr-accent (#f5c842) — matches HUD gold exactly
   • Small font (~9px screen-stable), short duration (~2s)
   • Only a RANDOM SUBSET of villagers quip during calamities
     (2–4 villagers max, chosen randomly each wave)

   CALAMITY REACTIONS
   ─────────────────────────────────────────────────────────────
   tickQuips receives VS so it can read VS.events.calamity.
   When a calamity is active, a dedicated quip pool fires for
   that calamity type. Reaction quips suppress normal ambient
   quips while the calamity lasts.
   Only a random sample of 2–4 visible villagers react per wave,
   with a new wave every 6 seconds while the calamity persists.

   INTEGRATION
   ─────────────────────────────────────────────────────────────
   villager.js  → import { tickQuips, drawVillagerQuip }
                  drawVillagerQuip(ctx, v, window._camZoom||1)
                  export { tickQuips } from './villagerQuips.js'

   main.js      → tickQuips(dt, VS.villagers, VS)   ← pass VS!
   input.js     → spawnPlayerQuip(clickedVillager)
═══════════════════════════════════════════════════════════════ */

import { perspScale, randInt, randRange } from '../utils/perspective.js';

/* ══════════════════════════════════════════════════════════════
   TIMING & LIMITS
══════════════════════════════════════════════════════════════ */
var QUIP_DURATION        = 2.2;   /* ambient quips — gone quickly */
var PLAYER_DURATION      = 2.8;   /* click response stays a touch longer */
var CALAMITY_DURATION    = 3.0;   /* calamity reactions linger slightly */
var QUIP_CHANCE_PER_SEC  = 0.014; /* per-villager ambient roll */
var MAX_ACTIVE_QUIPS     = 5;     /* global cap (ambient only) */

var CALAMITY_REACT_MIN   = 2;     /* min villagers that react per wave */
var CALAMITY_REACT_MAX   = 4;     /* max villagers that react per wave */
var _calamityReactCD     = 0;     /* cooldown between reaction waves */
var CALAMITY_WAVE_SECS   = 6.0;   /* new wave fires every 6s */

/* ══════════════════════════════════════════════════════════════
   QUIP POOLS
══════════════════════════════════════════════════════════════ */

var RANDOM_QUIPS = [
  'Naol.',
  'Push mo \'yan!',
  'Lowkey.',
  'Periodt.',
  'What haffen, Vella?',
  'Esophagus…',
  'Fine-dining daw.',
  'Bigyan ng jacket!',
  'Kuya, natanggal.',
  'Nasaan si Fyang?',
  'Bigla kang sumakses!',
  'Sobrang Latina!',
  'Over naman!',
  'Soafer.',
  'Okay na \'to.',
  'Bulalo ang inorder ko.',
  'GG boss',
  'Clutch!',
  'Sheesh',
  'Slay',
  'Bet ko \'yan',
  'G na G',
  'Kwento mo sa pagong',
  'Edi wow.',
  'Ikaw na magaling.',
  'Solid ka dyan ah',
  'Jepoy Dizon',
  'Walang ganon!',
  'Iba ka.',
];

var HUNGRY_QUIPS = [
  'Gutom na gutom na.',
  'May pagkain ba?',
  'Boss, wala nang bigas.',
  'Trentahin ang gutom ko.',
  'Ang inorder ko bulalo!',
  'Tandtado...',
  'Ohulol !',
];

var ANGRY_QUIPS = [
  'Over naman sa gobyerno!',
  'Walang ganon!',
  'Periodt. Galit na tayo.',
  'Pabaya talaga.',
  'Edi wow.',
];

var PLAYER_QUIPS = [
  'Boss! Bossing!',
  'Ano na boss?',
  'Galaw galaw boss',
  'Easy ka lang bossing',
  'Laro \'to boss',
  'Kaya mo \'yan boss!',
  'Wag papatalo boss',
  'Ganyan ka ba boss?',
  'Naku, nandito na!',
  'Salamat, lider!',
  'Kinilabutan ako!',
  'Push mo \'yan governor!',
  'Slay boss, slay!',
  'GG governor!',
  'Naol, nandito ka.',
  'Bet ko ang lider natin!',
  'Solid ka dyan boss.',
];

/* ── Calamity-specific reaction pools ──────────────────────── */
var CALAMITY_QUIPS = {

  bagyo: [
    'Bagyo!',
    'Sumilong na!',
    'Naku, malakas!',
    'Walang signal!',
    'Handa ka na ba?',
    'Wag lumabas!',
    'Ulan na ulan.',
    'Lumuluha ang langit.',
    'Talon sa bubong!',
    'Grabe ang hangin!',
  ],

  lindol: [
    'Lindol!',
    'Lumabas na!',
    'Yumayanig!',
    'Anong magnitude?',
    'Duck and cover!',
    'Grabe yung alon!',
    'Nahulog ang baso ko!',
    'Lupa, tigil ka na!',
    'Naku, nauwi sa lupa.',
    'Kuya, natanggal!',
  ],

  tagtuyot: [
    'Mainit!',
    'Walang tubig.',
    'Natuyo na ang bukid.',
    'Gutom na tayo nito.',
    'Sana umulan na.',
    'Nalanta na lahat.',
    'Parang impyerno.',
    'Init na init.',
    'Saan na ang ulan?',
    'Nadurog na ang palay.',
  ],

  implasyon: [
    'Mahal na lahat!',
    'Wala nang pera.',
    'Grabe ang presyo!',
    'Edi wow, ang mahal.',
    'Hindi ko mabili.',
    'Saan na ang sahod?',
    'Economically terrorized.',
    'Walang pera walang buhay.',
    'Over naman sa presyo!',
    'Trentahin ang sahod namin!',
  ],

  welga: [
    'Strike na tayo!',
    'Huwag magtrabaho!',
    'Welga na!',
    'Sawa na kami!',
    'Pakinggan mo kami!',
    'Tigil trabaho!',
    'Sama-sama tayo!',
    'Hindi kami papayag.',
    'Protesta!',
    'Ayaw na naming pumasok.',
  ],

  iskandalo: [
    'Iskandalo!',
    'Nahalata na!',
    'Nanloloko pa!',
    'Shame! Shame!',
    'Grabe ang kapal.',
    'Wala na tayong tiwala.',
    'Sinungaling!',
    'Pababa na \'yan!',
    'Kwento mo sa pagong.',
    'Edi wow, caught.',
  ],

  protesta: [
    'Protesta na!',
    'Sawa na kami!',
    'Pakinggan ninyo kami!',
    'Galit na ang bayan.',
    'Hindi na kami tatahimik.',
    'Ibagsak ang lider!',
    'Sama-sama na tayo.',
    'Walang takot!',
    'Hindi patas!',
    'Pababa na \'yan boss.',
  ],

  biganiAni: [
    'Masaganang ani!',
    'May pagkain na!',
    'Salamat sa bukid!',
    'Grabe ang ani!',
    'Okay na \'to!',
    'Slay ang bukid natin!',
    'GG sa magsasaka!',
    'Ayos ito!',
    'Bet ko \'to!',
    'G na G!',
  ],
};

var CALAMITY_GENERIC = [
  'Naku!',
  'Anong nangyari?',
  'Grabe!',
  'Mag-ingat!',
  'Ayaw ko na.',
  'Tulungan tayo.',
];

function _getCalamityQuip(type) {
  var pool = CALAMITY_QUIPS[type] || CALAMITY_GENERIC;
  return pool[randInt(0, pool.length - 1)];
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */
function _countActive(villagers) {
  var n = 0;
  for (var i = 0; i < villagers.length; i++) {
    if (villagers[i]._quip && villagers[i]._quip.timer > 0) n++;
  }
  return n;
}

function _pickAmbient(v) {
  if ((v.hunger || 0) > 65 && Math.random() < 0.55)
    return HUNGRY_QUIPS[randInt(0, HUNGRY_QUIPS.length - 1)];
  if ((v.anger  || 0) > 55 && Math.random() < 0.45)
    return ANGRY_QUIPS[randInt(0, ANGRY_QUIPS.length - 1)];
  return RANDOM_QUIPS[randInt(0, RANDOM_QUIPS.length - 1)];
}

function _shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = randInt(0, i);
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

/* ══════════════════════════════════════════════════════════════
   tickQuips — call from main.js update() every fixed tick
   dt        — fixed delta (seconds)
   villagers — VS.villagers array
   VS        — full village state; reads VS.events.calamity
══════════════════════════════════════════════════════════════ */
export function tickQuips(dt, villagers, VS) {
  /* Tick down all existing quips */
  for (var i = 0; i < villagers.length; i++) {
    if (villagers[i]._quip) {
      villagers[i]._quip.timer -= dt;
      if (villagers[i]._quip.timer <= 0) villagers[i]._quip = null;
    }
  }

  /* ── Calamity reaction waves ─────────────────────────────
     While any calamity is active, every CALAMITY_WAVE_SECS a
     random 2–4 visible idle villagers shout a calamity quip.
     Normal ambient quips are fully suppressed during calamity.
  ─────────────────────────────────────────────────────────── */
  var calamity = VS && VS.events && VS.events.calamity;
  if (calamity && calamity.remaining > 0) {
    _calamityReactCD -= dt;
    if (_calamityReactCD <= 0) {
      _calamityReactCD = CALAMITY_WAVE_SECS;

      var candidates = [];
      for (var c = 0; c < villagers.length; c++) {
        var vc = villagers[c];
        if (!vc.isHome && !vc.isInsideWork && !vc._quip) candidates.push(vc);
      }
      _shuffle(candidates);
      var count = Math.min(
        randInt(CALAMITY_REACT_MIN, CALAMITY_REACT_MAX),
        candidates.length
      );
      for (var r = 0; r < count; r++) {
        candidates[r]._quip = {
          text:       _getCalamityQuip(calamity.type),
          timer:      CALAMITY_DURATION,
          maxTimer:   CALAMITY_DURATION,
          isPlayer:   false,
          isCalamity: true,
        };
      }
    }
    /* Suppress ambient while calamity active */
    return;
  }

  /* Reset wave CD so first wave fires immediately on next calamity */
  _calamityReactCD = 0;

  /* ── Ambient quips (no calamity) ─────────────────────────── */
  var activeCount = _countActive(villagers);
  for (var j = 0; j < villagers.length; j++) {
    var v = villagers[j];
    if (v._quip) continue;
    if (v.isHome || v.isInsideWork) continue;
    if (activeCount >= MAX_ACTIVE_QUIPS) break;
    if (Math.random() < QUIP_CHANCE_PER_SEC * dt) {
      v._quip = {
        text:       _pickAmbient(v),
        timer:      QUIP_DURATION,
        maxTimer:   QUIP_DURATION,
        isPlayer:   false,
        isCalamity: false,
      };
      activeCount++;
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   spawnPlayerQuip — call when player clicks a villager
══════════════════════════════════════════════════════════════ */
export function spawnPlayerQuip(villager) {
  villager._quip = {
    text:       PLAYER_QUIPS[randInt(0, PLAYER_QUIPS.length - 1)],
    timer:      PLAYER_DURATION,
    maxTimer:   PLAYER_DURATION,
    isPlayer:   true,
    isCalamity: false,
  };
}

/* ══════════════════════════════════════════════════════════════
   drawVillagerQuip
   Called in render loop after drawVillager(ctx, v).

   ctx  — canvas 2d context (world-space camera transform active)
   v    — villager object
   zoom — cam.zoom (window._camZoom set by main.js gameLoop)

   VISUAL
   • Background: rgba(10,6,2,0.72) dark semi-transparent panel
   • Border:     #c49a4e (--clr-accent-dim) for ambient
                 #f5c842 (--clr-accent)     for player / calamity
   • Text:       #f5c842 (--clr-accent) — matches HUD gold
   • Font:       ~9px screen-stable — small, unobtrusive
   • Fade: 0.2s in, 0.4s out
   • Gentle sine float upward
══════════════════════════════════════════════════════════════ */
export function drawVillagerQuip(ctx, v, zoom) {
  if (!v._quip || v._quip.timer <= 0) return;
  if (v.isHome || v.isInsideWork) return;

  var q  = v._quip;
  var vt = v._typeDef || {};
  var sc = perspScale(v.y) * (vt.scale || 1.0);
  var z  = Math.max(0.25, zoom);

  /* Alpha: 0.2s fade-in, 0.4s fade-out */
  var elapsed = q.maxTimer - q.timer;
  var alpha;
  if (elapsed < 0.20) {
    alpha = elapsed / 0.20;
  } else if (q.timer < 0.40) {
    alpha = q.timer / 0.40;
  } else {
    alpha = 1.0;
  }
  alpha = Math.max(0, Math.min(1, alpha));
  if (alpha < 0.02) return;

  /* Font — small, screen-stable ~9px */
  var fontSize = Math.round(9 / z);
  var fontStr  = 'bold ' + fontSize + 'px "Segoe UI",Arial,sans-serif';

  ctx.save();
  ctx.font = fontStr;

  var textW = ctx.measureText(q.text).width;
  var padH  = fontSize * 0.50;
  var padV  = fontSize * 0.30;
  var boxW  = textW + padH * 2;
  var boxH  = fontSize + padV * 2;

  /* Float gently upward via sine */
  var floatY = Math.sin(elapsed * 2.5) * (1.6 / z);

  /* World position: just above head (~32px * scale above origin) */
  var wx = v.x;
  var wy = v.y - 32 * sc - boxH - (2 / z) + floatY;

  var rx = wx - boxW / 2;
  var ry = wy;
  var rr = Math.min(fontSize * 0.36, boxH * 0.45);

  ctx.globalAlpha = alpha;

  /* Background */
  ctx.beginPath();
  _roundRect(ctx, rx, ry, boxW, boxH, rr);
  ctx.fillStyle = 'rgba(10,6,2,0.72)';
  ctx.fill();

  /* Border — accent for player/calamity, dim-gold for ambient */
  ctx.strokeStyle = (q.isPlayer || q.isCalamity) ? '#f5c842' : '#c49a4e';
  ctx.lineWidth   = 0.9 / z;
  ctx.stroke();

  /* Text */
  ctx.shadowColor   = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur    = 2 / z;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle     = '#f5c842';   /* --clr-accent */
  ctx.font          = fontStr;
  ctx.textAlign     = 'center';
  ctx.textBaseline  = 'middle';
  ctx.fillText(q.text, wx, ry + boxH / 2);

  ctx.restore();
}

/* ── Rounded rect path (no Path2D for broad compat) ─────────── */
function _roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}