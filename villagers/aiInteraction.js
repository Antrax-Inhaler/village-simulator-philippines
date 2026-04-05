/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — villagers/aiInteraction.js  (rewritten)

   WHAT THIS MODULE DOES
   ─────────────────────────────────────────────────────────────
   1. CHAT BUBBLES (DOM overlay — readable at all zoom/DPR)
      • Villagers chat with each other when they meet
      • Clicking a villager shows a player-greeting bubble
      • Hungry/angry villagers get a 'stressed' red-tinted bubble
      • Protest/welga triggers crowd-complaint bubbles

   2. PROTEST / WELGA GATHERING
      • When anger is high, villagers physically walk toward the
        main hall or center of the map and complain together
      • Camera does a softPan to the crowd (player can override)
      • Unique protest lines drawn from their anger/trust stats

   3. BIRTH CAMERA PAN
      • triggerBirthAnnouncement() → soft pan to baby's position
        with a happy bubble above both parents

   4. AI DIALOGUE (Gemini) — CAN BE TOGGLED ON/OFF
      • Set ENABLE_GEMINI = true to use Gemini API
      • Set ENABLE_GEMINI = false to use fallback dialogues only

   5. REQUEST REACTION BUBBLES
      • New request appears
      • Request fulfilled (ayuda or building)
      • Request ignored/expired
      • Ayuda amount reactions (low/good/high)
═══════════════════════════════════════════════════════════════ */

import { perspScale, clamp, dist, randInt, randRange } from '../utils/perspective.js';
import { getTimeOfDay } from '../utils/time.js';
import { SpatialGrid } from '../utils/collision.js';
import { spawnPlayerQuip } from './villagerQuips.js';

/* ── Quip helper ─────────────────────────────────────────────
   Sets v._quip using the exact shape drawVillagerQuip expects:
     { text, timer, maxTimer, isPlayer, isCalamity }
   isPlayer:true  → bright gold border (#f5c842), same as click quips.
   tickQuips() decrements timer and nulls _quip at 0.
──────────────────────────────────────────────────────────── */
function _setQuip(villager, text, durationSecs) {
  var dur = durationSecs || 4;
  villager._quip = {
    text:       text,
    timer:      dur,
    maxTimer:   dur,
    isPlayer:   true,
    isCalamity: false,
  };
}

/* ── GEMINI TOGGLE ──────────────────────────────────────────── */
// SET THIS TO true TO ENABLE GEMINI AI, false TO DISABLE
var ENABLE_GEMINI = false;  // ← CHANGE THIS TO true TO TURN ON GEMINI

/* ── Obfuscated API key (only used if ENABLE_GEMINI is true) ─ */
const _0x4f7a = [
  '66','74','123','98','84','122','67','112','55','54',
  '72','117','103','81','91','77','57','51','110','103',
  '122','110','112','114','72','114','106','58','83','120',
  '82','115','82','98','84','69','102','120','74'
];
const _reconstructed = _0x4f7a.map(x => String.fromCharCode(parseInt(x) - 1)).join('');

import { GoogleGenerativeAI as AI } from 'https://esm.run/@google/generative-ai';
const _ai   = new AI(_reconstructed);
var _model  = null;
function _getModel() {
  if (!_model) _model = _ai.getGenerativeModel({ model: 'gemini-2.0-flash-preview' });
  return _model;
}

/* ── API throttle: 1 req / 3.5 s (only if Gemini enabled) ──── */
var _lastReqAt = 0;
function _canRequest() {
  var now = Date.now();
  if (now - _lastReqAt < 3500) return false;
  _lastReqAt = now;
  return true;
}

/* ── Fallback dialogue pools ──────────────────────────────── */
var FALLBACKS = [
  ['Magandang araw po!',           'Oo, maganda. Ingat ka!'],
  ['Ano balita sa nayon?',         'Wala naman, tahimik.'],
  ['Grabe ang init ngayon!',       'Oo nga, uminom ng tubig.'],
  ['Kumusta na ang bukid mo?',     'Sana umabot buwan!'],
  ['Saan ka pupunta?',             'Sa palengke lang po.'],
  ['May bagyo daw mamaya.',        'Mag-ingat na tayo.'],
  ['Masarap luto mo kahapon!',     'Salamat, may natira pa!'],
  ['Pagod na pagod na ako.',       'Magpahinga ka muna.'],
  ['Malapit na pista opisyal!',    'Masaya ang mga bata!'],
  ['Grabe maraming trabaho!',      'Tulungan kita mamaya.'],
  ['Maliwanag ngayon ang buwan.',  'Oo, payapa ang gabi.'],
  ['Kumain ka na ba?',             'Hindi pa, gutom nga!'],
];
var HUNGRY_FALLBACKS = [
  ['Gutom na gutom na ako!',           'Ako rin, walang pagkain.'],
  ['Kailan pa darating ang tulong?',   'Hindi ko alam, hintayin na.'],
  ['Walang bigas sa bahay namin.',      'Pareho tayo, kawawa naman.'],
];
var ANGRY_FALLBACKS = [
  ['Galit na ako sa gobyerno!',        'Hush, baka marinig tayo.'],
  ['Walang ginagawa ang lider natin!', 'Totoo, pabaya talaga.'],
  ['Dapat magprotesta na tayo!',       'Ingat ka, delikado iyon.'],
];
var PROTEST_LINES = [
  'Pababa ng buwis!',
  'Kailangan namin ng pagkain!',
  'Hindi patas!',
  'Pakinggan mo kami!',
  'Sawa na kami!',
  'Gusto namin ng pagbabago!',
  'Magbitiw na ang lider!',
  'Ibalik ang aming karapatan!',
];
var PLAYER_GREETS = [
  'Boss, kumusta ka na?',
  'Salamat sa pagbisita, lider!',
  'Nandito na ang punong-bayan!',
  'Boss, okay ba ang nayon?',
  'Ikaw ang pinakamahusay na lider!',
  'Kailangan mo ba ng tulong?',
  'Ang galing mo talaga, lider!',
  'Naku, narito na ang boss natin!',
];

function _fallback(vA) {
  if ((vA.hunger || 0) > 65 && Math.random() < 0.6)
    return HUNGRY_FALLBACKS[randInt(0, HUNGRY_FALLBACKS.length - 1)];
  if ((vA.anger || 0) > 55 && Math.random() < 0.5)
    return ANGRY_FALLBACKS[randInt(0, ANGRY_FALLBACKS.length - 1)];
  return FALLBACKS[randInt(0, FALLBACKS.length - 1)];
}

/* ══════════════════════════════════════════════════════════════
   DOM BUBBLE LAYER
   One #bubble-layer div lives inside #canvas-container.
   Each bubble is a positioned child div.
══════════════════════════════════════════════════════════════ */
(function _injectStyles() {
  if (document.getElementById('bubble-styles')) return;
  var s = document.createElement('style');
  s.id  = 'bubble-styles';
  s.textContent = [
    '#bubble-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:20;}',
    '.chat-bubble{',
    '  position:absolute;transform:translateX(-50%);pointer-events:none;',
    '  font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif;',
    '  font-size:13px;font-weight:600;line-height:1.45;',
    '  color:#1a1008;white-space:pre-wrap;word-break:break-word;',
    '  max-width:180px;min-width:80px;text-align:center;',
    '  background:#fffbe6;border:2px solid #c49a4e;border-radius:10px;',
    '  padding:7px 12px 9px;',
    '  box-shadow:3px 3px 0 rgba(0,0,0,0.55);',
    '  transition:opacity 0.25s ease;',
    '}',
    '.chat-bubble::after{content:"";position:absolute;bottom:-11px;left:50%;',
    '  transform:translateX(-50%);border-left:9px solid transparent;',
    '  border-right:9px solid transparent;border-top:11px solid #c49a4e;}',
    '.chat-bubble::before{content:"";position:absolute;bottom:-8px;left:50%;',
    '  transform:translateX(-50%);border-left:7px solid transparent;',
    '  border-right:7px solid transparent;border-top:9px solid #fffbe6;z-index:1;}',
    '.chat-bubble.greet{background:#e8f4ff;border-color:#4a8fc4;color:#0a1a2a;}',
    '.chat-bubble.greet::after{border-top-color:#4a8fc4;}',
    '.chat-bubble.greet::before{border-top-color:#e8f4ff;}',
    '.chat-bubble.stressed{background:#fff0e8;border-color:#c45030;color:#2a0a0a;}',
    '.chat-bubble.stressed::after{border-top-color:#c45030;}',
    '.chat-bubble.stressed::before{border-top-color:#fff0e8;}',
    '.chat-bubble.protest{background:#fff0f0;border-color:#e74c3c;color:#2a0000;font-weight:700;}',
    '.chat-bubble.protest::after{border-top-color:#e74c3c;}',
    '.chat-bubble.protest::before{border-top-color:#fff0f0;}',
    '.chat-bubble.birth{background:#e8fff0;border-color:#44aa44;color:#0a2a0a;font-size:14px;}',
    '.chat-bubble.birth::after{border-top-color:#44aa44;}',
    '.chat-bubble.birth::before{border-top-color:#e8fff0;}',
    '.chat-bubble.fade-out{opacity:0!important;}',
  ].join('\n');
  document.head.appendChild(s);
})();

function _getBubbleLayer() {
  var layer = document.getElementById('bubble-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'bubble-layer';
    var container = document.getElementById('canvas-container');
    if (container) container.appendChild(layer);
    else           document.body.appendChild(layer);
  }
  return layer;
}

/* ══════════════════════════════════════════════════════════════
   ChatBubble
══════════════════════════════════════════════════════════════ */
export function ChatBubble(vA, vB, textA, textB, styleA, styleB) {
  this.vA      = vA;
  this.vB      = vB;
  this.textA   = textA;
  this.textB   = textB;
  this.styleA  = styleA || '';    /* extra CSS class */
  this.styleB  = styleB || '';
  this.timer   = 5.5;
  this.paused  = false;
  this.elA     = null;
  this.elB     = null;
  this._built  = false;
}

ChatBubble.prototype._build = function() {
  var layer = _getBubbleLayer();
  this.elA = _makeEl(this.textA, this.styleA);
  layer.appendChild(this.elA);
  if (this.vB && this.textB) {
    this.elB = _makeEl(this.textB, this.styleB);
    layer.appendChild(this.elB);
  }
  /* Force opacity to 0 first frame, then show */
  this.elA.style.opacity = '0';
  if (this.elB) this.elB.style.opacity = '0';
  this._built = true;
};

function _makeEl(text, extraClass) {
  var cl = 'chat-bubble' + (extraClass ? ' ' + extraClass : '');
  var el = document.createElement('div');
  el.className   = cl;
  el.textContent = text;
  el.style.opacity = '0';
  return el;
}

ChatBubble.prototype.update = function(dt) {
  if (!this._built) this._build();
  if (this.paused) { this._position(); return true; }

  this.timer -= dt;
  var opacity = this.timer < 0.5 ? (this.timer / 0.5).toFixed(3) : '1';
  if (this.elA) this.elA.style.opacity = opacity;
  if (this.elB) this.elB.style.opacity = opacity;

  this._position();

  if (this.timer <= 0) { this._destroy(); return false; }
  return true;
};

ChatBubble.prototype._position = function() {
  var canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  var rect = canvas.getBoundingClientRect();
  if (this.elA && this.vA) _posEl(this.elA, this.vA, rect, this.vB ? -1 : 0);
  if (this.elB && this.vB) _posEl(this.elB, this.vB, rect, 1);
};

function _posEl(el, v, cr, side) {
  var sc  = perspScale(v.y) * (v._typeScale || 1);
  var hx  = cr.left + v.x   + side * 28;
  var hy  = cr.top  + v.y   - 40 * sc;
  var elW = el.offsetWidth  || 160;
  var elH = el.offsetHeight || 50;
  el.style.left = Math.round(Math.max(cr.left + 4, Math.min(hx - elW / 2, cr.right - elW - 4))) + 'px';
  el.style.top  = Math.round(hy - elH - 2) + 'px';
}

ChatBubble.prototype._destroy = function() {
  if (this.elA && this.elA.parentNode) this.elA.parentNode.removeChild(this.elA);
  if (this.elB && this.elB.parentNode) this.elB.parentNode.removeChild(this.elB);
  this.elA = null; this.elB = null;
};

ChatBubble.prototype.draw = function(ctx) { /* DOM-rendered — no canvas draw */ };

/* ══════════════════════════════════════════════════════════════
   AI DIALOGUE GENERATION
   Uses Gemini API if ENABLE_GEMINI is true, otherwise fallbacks
══════════════════════════════════════════════════════════════ */
function _stateDesc(v) {
  var parts = [];
  if ((v.hunger  || 0) > 60)  parts.push('gutom ' + Math.round(v.hunger) + '%');
  if ((v.health  || 80) < 40) parts.push('may sakit');
  if ((v.anger   || 0) > 50)  parts.push('galit');
  if ((v.govTrust|| 50) < 25) parts.push('hindi nagtitiwala sa gobyerno');
  return parts.join(', ');
}

export async function generateDialogue(vA, vB, currentHour) {
  var tod   = getTimeOfDay(currentHour);
  var typeA = vA._typeDef || { role: 'Villager' };
  
  var styleA = ((vA.hunger||0) > 65 || (vA.anger||0) > 55) ? 'stressed' : '';
  var styleB = ((vB?.hunger||0) > 65 || (vB?.anger||0) > 55) ? 'stressed' : '';

  /* ── PLAYER GREETING (no Gemini needed) ─────────────────── */
  if (!vB) {
    var greet = PLAYER_GREETS[randInt(0, PLAYER_GREETS.length - 1)];
    return new ChatBubble(vA, null, greet, null, 'greet');
  }

  /* ── GEMINI DISABLED — use fallback only ────────────────── */
  if (!ENABLE_GEMINI) {
    var fb = _fallback(vA);
    return new ChatBubble(vA, vB, fb[0], fb[1], styleA, styleB);
  }

  /* ── GEMINI ENABLED — try API call ──────────────────────── */
  var typeB  = vB._typeDef || { role: 'Villager' };
  var stateA = _stateDesc(vA);
  var stateB = _stateDesc(vB);

  var prompt =
    'Two Filipino villagers talking in a simple village.\n' +
    'A: ' + typeA.role + ', mood: ' + vA.mood + ', personality: ' + vA.personality +
      (stateA ? ', estado: ' + stateA : '') + '\n' +
    'B: ' + typeB.role + ', mood: ' + vB.mood + ', personality: ' + vB.personality +
      (stateB ? ', estado: ' + stateB : '') + '\n' +
    'Oras: ' + tod + '\n\n' +
    'Panuntunan: max 7 salita bawat linya, pamilya-friendly, natural na Tagalog/English mix.\n' +
    'Kung gutom o galit ang isang villager, banggitin ito nang natural.\n' +
    'Walang label, walang quotes, walang prefix.\n' +
    'Sumagot ng EXACTLY dalawang linya:\n[sinabi ni A]\n[sagot ni B]';

  try {
    if (!_canRequest()) {
      var fb2 = _fallback(vA);
      return new ChatBubble(vA, vB, fb2[0], fb2[1], styleA, styleB);
    }
    var result = await _getModel().generateContent(prompt);
    var raw    = result.response.text().trim();
    var parts  = raw.split('\n')
      .map(function(l) {
        return l.replace(/^(line\s*\d+\s*[:.—\-]\s*)/i, '')
                .replace(/^["""''«»]/g, '').replace(/["""''«»]$/g, '').trim();
      })
      .filter(function(l) { return l.length > 0; });

    return new ChatBubble(
      vA, vB,
      parts[0] || 'Magandang araw!',
      parts[1] || 'Sige, ingat ka!',
      styleA, styleB
    );
  } catch(err) {
    console.warn('[aiInteraction] Gemini error:', err.message || err);
    var fb3 = _fallback(vA);
    return new ChatBubble(vA, vB, fb3[0], fb3[1], styleA, styleB);
  }
}

/* ══════════════════════════════════════════════════════════════
   PLAYER GREETING — called when player clicks a villager
   Uses the floating head quip (villagerQuips.js) for the
   fourth-wall "you clicked me, boss" response.
   Gemini dialogue is reserved for ambient villager-to-villager
   conversations only.
══════════════════════════════════════════════════════════════ */
export function triggerPlayerGreeting(villager, currentHour, activeBubbles) {
  /* Remove any existing DOM chat bubbles for this villager */
  for (var i = activeBubbles.length - 1; i >= 0; i--) {
    if (activeBubbles[i].vA === villager || activeBubbles[i].vB === villager) {
      activeBubbles[i]._destroy();
      activeBubbles.splice(i, 1);
    }
  }
  /* Spawn a floating head quip (transparent bg, gold border, fourth-wall line) */
  spawnPlayerQuip(villager);
}

/* ══════════════════════════════════════════════════════════════
   BIRTH ANNOUNCEMENT
   Called from main.js _spawnFromParents after a baby is born.
   Pans camera to baby, shows happy bubbles over both parents.
══════════════════════════════════════════════════════════════ */
export function triggerBirthAnnouncement(baby, parentA, parentB) {
  if (typeof window !== 'undefined' && window.playSound) {
    window.playSound('sfx-birth');
  }
  /* Quip over parent A */
  if (parentA) {
    _setQuip(parentA, '👶 Ipinanganak si ' + baby.label + '! 🎉', 7);
  }
  /* Quip over parent B — stagger slightly */
  if (parentB) {
    setTimeout(function() {
      _setQuip(parentB, 'Maligayang buhay, ' + baby.label + '! 💕', 6);
    }, 800);
  }
  /* Soft pan to baby's location — 5 second hold */
  if (window.softPan) {
    window.softPan(baby.x, baby.y, 5);
  }
}

/* ══════════════════════════════════════════════════════════════
   PROTEST / WELGA GATHERING
   When triggered, a group of angry villagers walk toward the
   main hall (or center if none exists), stop there, and shout.
   Camera soft-pans to the crowd.
══════════════════════════════════════════════════════════════ */
var _protestCooldown   = 0;
var _protestDuration   = 0;
var _protestVillagers  = [];   /* villagers currently in protest */
var _protestCenter     = null; /* {x, y} rally point */

export function triggerProtestGathering(VS) {
  if (_protestCooldown > 0) return;
  _protestCooldown  = 90;   /* don't re-trigger for 90 real seconds */
  _protestDuration  = 25;   /* protest lasts 25 seconds */

  if (typeof window !== 'undefined' && window.playSound) {
    window.playSound('sfx-protest');
  }

  /* Rally point: main hall if it exists, else center of map */
  var hall = null;
  for (var i = 0; i < VS.buildings.length; i++) {
    if (VS.buildings[i].type === 'mainHall') { hall = VS.buildings[i]; break; }
  }
  var cx = hall ? hall.x : (window._VW || 800) / 2;
  var cy = hall ? hall.y + 40 : (window._VH || 600) / 2;
  _protestCenter = { x: cx, y: cy };

  /* Pick 3–6 of the angriest villagers */
  var sorted = VS.villagers.slice().sort(function(a, b) {
    return ((b.anger || 0) + (100 - (b.govTrust || 50))) -
           ((a.anger || 0) + (100 - (a.govTrust || 50)));
  });
  _protestVillagers = sorted.slice(0, Math.min(6, Math.max(3, sorted.length)));

  /* Send them walking to the rally point */
  _protestVillagers.forEach(function(v, idx) {
    v.waitT   = 0;
    v.destX   = cx + randRange(-30, 30);
    v.destY   = cy + randRange(-20, 20);
    /* Stagger their arrival so they don't all snap at once */
    setTimeout(function() {
      if (v) {
        var line = PROTEST_LINES[randInt(0, PROTEST_LINES.length - 1)];
        _setQuip(v, line, 4 + Math.random() * 3);
      }
    }, idx * 1200);
  });

  /* Soft pan to the rally point — camera shifts but player can take over */
  if (window.softPan) {
    window.softPan(cx, cy - 40, 8);
  }
}

export function updateProtest(dt, VS) {
  if (_protestCooldown > 0) _protestCooldown -= dt;
  if (_protestDuration <= 0 || _protestVillagers.length === 0) return;

  _protestDuration -= dt;

  /* Periodic new protest shouts while active */
  if (Math.random() < dt * 0.3) {
    var shouter = _protestVillagers[randInt(0, _protestVillagers.length - 1)];
    if (shouter && !shouter._quip) {
      var line = PROTEST_LINES[randInt(0, PROTEST_LINES.length - 1)];
      _setQuip(shouter, line, 3.5);
    }
  }

  /* When protest ends, release villagers */
  if (_protestDuration <= 0) {
    _protestVillagers.forEach(function(v) {
      v.waitT = randRange(0.5, 2);
    });
    _protestVillagers = [];
    _protestCenter    = null;
  }
}

/* ══════════════════════════════════════════════════════════════
   MAIN INTERACTION CHECKER
   Called from main.js update() every tick.
══════════════════════════════════════════════════════════════ */
var _grid             = new SpatialGrid(80);
var _playerGreetTimer = 20;

export function checkVillagerInteractions(villagers, dt, currentHour, activeBubbles, VS) {
  /* Tick per-villager cooldowns */
  for (var i = 0; i < villagers.length; i++) {
    if (villagers[i].collisionCooldown > 0) villagers[i].collisionCooldown -= dt;
  }

  /* Tick protest system */
  if (VS) updateProtest(dt, VS);

  /* Periodic random player-awareness greeting — floating quip, no DOM bubble */
  _playerGreetTimer -= dt;
  if (_playerGreetTimer <= 0 && villagers.length > 0) {
    _playerGreetTimer = 18 + Math.random() * 14;
    var greeter = villagers[randInt(0, villagers.length - 1)];
    if (greeter && !greeter.isInsideBuilding && greeter.collisionCooldown <= 0 && !greeter._quip) {
      greeter.collisionCooldown = 10.0;
      greeter.waitT = 4.5;
      spawnPlayerQuip(greeter);
    }
  }

  /* Proximity pair chat */
  _grid.clear();
  for (var j = 0; j < villagers.length; j++) {
    if (!villagers[j].isInsideBuilding) _grid.insert(villagers[j]); // skip hidden
  }
  var pairs = _grid.queryPairs(26);

  for (var p = 0; p < pairs.length; p++) {
    var a = pairs[p][0], b = pairs[p][1];
    if (a.isInsideBuilding || b.isInsideBuilding) continue; // double-guard
    if (a.collisionCooldown > 0 || b.collisionCooldown > 0) continue;
    if (activeBubbles.length >= 5) continue;
    if (Math.random() > 0.012) continue;

    a.collisionCooldown = 9.0;
    b.collisionCooldown = 9.0;
    a.waitT = Math.max(a.waitT, 5.0);
    b.waitT = Math.max(b.waitT, 5.0);

    (function(va, vb) {
      generateDialogue(va, vb, currentHour).then(function(bubble) {
        activeBubbles.push(bubble);
      });
    })(a, b);
  }
}

/* ══════════════════════════════════════════════════════════════
   REQUEST REACTION BUBBLES
   Called from citizenNeeds.js or requestPanel.js when requests
   are created, fulfilled, or ignored.
══════════════════════════════════════════════════════════════ */

/* Trigger reaction when a new request appears */
export function triggerRequestReaction(request, type, VS) {
  if (!VS || !VS.villagers || VS.villagers.length === 0) return;
  
  var reactionQuips = {
    appear: ['May problema sa nayon!', 'Sana pansinin!', 'Kailangan namin ng tulong!', 'Naku, ganito na naman!'],
    fulfilled_building: ['May trabaho na! 🙌', 'Salamat sa gusali!', 'Buti naman!', 'Tulong ay dumating!'],
    fulfilled_ayuda_good: ['Salamat sa tulong!', 'Buti naman!', 'May pag-asa pa!'],
    ignored: ['Binalewala nila tayo...', 'Walang nakinig!', 'Sana hindi na lang!', 'Galit na ako!'],
    expired: ['Walang nangyari...', 'Sana pala inasikaso nila!', 'Nakakaiyak naman!']
  };
  
  var quips = reactionQuips[type] || reactionQuips.appear;
  var count = Math.min(3, VS.villagers.length);
  var selected = [];
  
  // Select random villagers to react
  for (var i = 0; i < count; i++) {
    var idx = randInt(0, VS.villagers.length - 1);
    var v = VS.villagers[idx];
    if (!selected.includes(v) && !v._quip) {
      selected.push(v);
      _spawnRequestBubble(v, quips[randInt(0, quips.length - 1)], type);
    }
  }
}

/* Trigger reaction when ayuda is given */
export function triggerAyudaReaction(amount, min, max, VS) {
  if (!VS || !VS.villagers || VS.villagers.length === 0) return;
  
  var reaction = '';
  var style = '';
  
  if (amount < min) {
    reaction = 'Ang baba naman! 🤨';
    style = 'angry';
  } else if (amount > max) {
    reaction = 'Sobra naman! 😲 Sana lagi ganyan.';
    style = 'surprised';
  } else {
    reaction = 'Salamat po! 🙏';
    style = 'happy';
  }
  
  // Show reaction bubbles on random villagers
  var count = Math.min(4, VS.villagers.length);
  for (var i = 0; i < count; i++) {
    var v = VS.villagers[randInt(0, VS.villagers.length - 1)];
    if (!v._quip) {
      _spawnRequestBubble(v, reaction, 'ayuda_' + style);
    }
  }
}

/* Trigger reaction when jobs are created */
export function triggerJobCreatedReaction(profession, count, VS) {
  if (!VS || !VS.villagers || count === 0) return;
  
  var quips = [
    'May trabaho na! 🙌',
    'Salamat sa pagkakataon!',
    'Kita na ulit!',
    'Masaya na ang pamilya!'
  ];
  
  // Find villagers of that profession to react
  var professionVillagers = VS.villagers.filter(function(v) {
    var role = (v._typeDef && v._typeDef.role) || '';
    return role.includes(profession) || (profession === 'manggagawa' && !v.workBuilding);
  });
  
  var reactCount = Math.min(count * 2, professionVillagers.length, 5);
  for (var i = 0; i < reactCount; i++) {
    var v = professionVillagers[randInt(0, professionVillagers.length - 1)];
    if (!v._quip) {
      _spawnRequestBubble(v, quips[randInt(0, quips.length - 1)], 'job_created');
    }
  }
}

/* Spawn a DOM bubble for request reactions */
function _spawnRequestBubble(villager, text, type, duration) {
  var layer = _getBubbleLayer();
  if (!layer) return;
  duration = (duration !== undefined) ? duration : 2800;

  var styleClass = '';
  if (type === 'angry' || type === 'ignored' || type === 'expired') styleClass = 'stressed';
  else if (type === 'surprised') styleClass = 'greet';
  else if (type === 'happy' || type === 'birth' || type === 'job_created' || type === 'fulfilled_ayuda_good') styleClass = 'birth';
  else if (type === 'protest') styleClass = 'protest';
  
  var bubble = document.createElement('div');
  bubble.className = 'chat-bubble request-bubble ' + styleClass;
  bubble.textContent = text;
  bubble.style.opacity = '0';
  layer.appendChild(bubble);
  
  // Position the bubble
  function positionBubble() {
    var canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    var sc = perspScale(villager.y) * (villager._typeScale || 1);
    var x = rect.left + villager.x;
    var y = rect.top + villager.y - 45 * sc;
    var w = bubble.offsetWidth || 140;
    bubble.style.left = Math.round(Math.max(rect.left + 5, Math.min(x - w/2, rect.right - w - 5))) + 'px';
    bubble.style.top = Math.round(y - 50) + 'px';
  }
  
  positionBubble();
  
  // Fade in
  requestAnimationFrame(function() {
    bubble.style.transition = 'opacity 0.2s ease';
    bubble.style.opacity = '1';
  });
  
  // Fade out and remove after duration ms
  setTimeout(function() {
    bubble.style.opacity = '0';
    setTimeout(function() {
      if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
    }, 300);
  }, duration);
}