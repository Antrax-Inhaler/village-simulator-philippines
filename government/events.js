/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — government/events.js

   AUTO-RESOLVE EVENTS
   ─────────────────────────────────────────────────────────────
   Events resolve automatically. Each log entry now stores a
   rich `detail` object with affected buildings / villagers so
   the UI can show a modal report (via window.showEventModal).

   window.showEventModal(entry)  — called from index.html log panel
     entry.detail = {
       affectedBuildings: [{ label, fromLevel, toLevel }],
       affectedVillagers: [],   // future use
       goldLost, riceLost, healthHit, …
     }
═══════════════════════════════════════════════════════════════ */

import { clamp, randRange, randInt } from '../utils/perspective.js';
import { isPolicyActive }             from './policy.js';
import { canScandalFire, triggerScandal } from './corruption.js';

var BASE_ROLL_CHANCE = 0.00006;
var EVENT_COOLDOWN   = 90;
var _lastEventTime   = 0;
var _eventIdCounter  = 0;

function _ensureState(VS) {
  if (!VS.events) VS.events = { log: [], cooldown: 0 };
  if (!VS.events.calamity) VS.events.calamity = null;
}

function _setCalamity(VS, type, durationTicks) {
  VS.events.calamity = {
    type:      type,
    intensity: 1.0,
    remaining: durationTicks,
    total:     durationTicks,
  };
  if (typeof window !== 'undefined' && window.playSound) {
    window.playSound('sfx-calamity-' + type, { loop: true });
  }
}

function _countBld(VS, type) {
  return VS.buildings.filter(function(b) { return b.type === type; }).length;
}
function _hasBld(VS, type)  { return _countBld(VS, type) > 0; }

function _hitAll(VS, field, delta) {
  VS.villagers.forEach(function(v) {
    if (v[field] !== undefined) v[field] = clamp(v[field] + delta, 0, 100);
  });
}
function _drainGold(VS, amount) {
  var actual = Math.min(VS.res.gold, amount);
  VS.res.gold = Math.max(0, VS.res.gold - actual);
  return actual;
}
function _drainRice(VS, amount) {
  var actual = Math.min(VS.res.rice, amount);
  VS.res.rice = Math.max(0, VS.res.rice - actual);
  return actual;
}

/* ── Building damage — returns list of affected entries ────── */
function _damageBuildings(VS, calamityName) {
  var targets = VS.buildings.filter(function(b) {
    return b.type !== 'mainHall' && b.level > 1 && !b.underConstruction;
  });
  if (targets.length === 0) return [];

  var pct      = randRange(0.20, 0.40);
  var numHit   = Math.max(1, Math.round(targets.length * pct));
  var shuffled = targets.slice();
  for (var i = shuffled.length - 1; i > 0; i--) {
    var j = randInt(0, i);
    var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
  }

  var affected = [];
  for (var k = 0; k < numHit; k++) {
    var b = shuffled[k];
    var fromLevel = b.level;
    b.level = Math.max(1, b.level - 1);
    var label = b.getDef ? b.getDef().label : b.type;
    affected.push({ label: label, fromLevel: fromLevel, toLevel: b.level });
  }
  return affected;
}

/* ══════════════════════════════════════════════════════════════
   EVENT RESOLVERS — each returns { msg, detail }
══════════════════════════════════════════════════════════════ */

function _resolveBagyo(VS) {
  var hasSakuna  = isPolicyActive('tulong_sakuna', VS);
  var ospCount   = _countBld(VS, 'ospital');
  var healthHit  = hasSakuna ? randRange(3, 8)   : randRange(12, 25);
  var goldDrain  = hasSakuna ? 0                 : randRange(60, 120);
  var mitigation = ospCount > 0 ? 0.5 : 1.0;
  var actualHealth = Math.round(healthHit * mitigation);

  _hitAll(VS, 'health', -actualHealth);
  _hitAll(VS, 'happiness', -8);
  var goldLost = _drainGold(VS, goldDrain);

  var affected = hasSakuna ? [] : _damageBuildings(VS, 'Bagyo');
  _setCalamity(VS, 'bagyo', 360);

  var msg;
  if (hasSakuna && ospCount > 0) msg = 'Bagyo! Ang Ospital at Tulong sa Sakuna ay nagbigay ng proteksyon. Kaunting pinsala lang.';
  else if (hasSakuna)             msg = 'Bagyo! Naibsan ng Patakaran ng Sakuna ang epekto.';
  else if (ospCount > 0)          msg = 'Bagyo! Ang ospital ay tumulong. -' + actualHealth + ' kalusugan.';
  else                            msg = 'Bagyo! Maraming nasugatan. -' + actualHealth + ' kalusugan, -' + Math.round(goldLost) + ' ginto.';

  return { msg: msg, detail: { affectedBuildings: affected, goldLost: Math.round(goldLost), healthHit: actualHealth, riceLost: 0 } };
}

function _resolveLindol(VS) {
  var bldCount  = VS.buildings.length;
  var hasSakuna = isPolicyActive('tulong_sakuna', VS);
  var healthHit = hasSakuna ? randRange(5, 12)  : randRange(15, 30);
  var goldHit   = Math.floor(bldCount * (hasSakuna ? 8 : 20));
  var riceLost  = randRange(20, 60);

  _hitAll(VS, 'health', -healthHit);
  _hitAll(VS, 'govTrust', -5);
  var goldLost = _drainGold(VS, goldHit);
  _drainRice(VS, riceLost);

  var affected = _damageBuildings(VS, 'Lindol');
  _setCalamity(VS, 'lindol', 10);

  return {
    msg: 'Lindol! Ang ' + bldCount + ' gusali ay naapektuhan. -' + healthHit + ' kalusugan, -' + Math.round(goldLost) + ' ginto.',
    detail: { affectedBuildings: affected, goldLost: Math.round(goldLost), healthHit: healthHit, riceLost: Math.round(riceLost) },
  };
}

function _resolveTagtuyot(VS) {
  var farmCount = _countBld(VS, 'farm');
  var severity  = Math.max(1, farmCount);
  var riceHit   = Math.floor(severity * randRange(40, 80));
  var foodHit   = Math.floor(severity * randRange(50, 100));

  VS.res.rice = Math.max(0, VS.res.rice - riceHit);
  if (VS.food) VS.food.pool = Math.max(0, (VS.food.pool || 0) - foodHit);
  _hitAll(VS, 'hunger', 15);
  _setCalamity(VS, 'tagtuyot', 180);

  return {
    msg: 'Tagtuyot! -' + riceHit + ' bigas at -' + foodHit + ' pagkain na nawala sa bukid.',
    detail: { affectedBuildings: [], goldLost: 0, riceLost: riceHit, healthHit: 0, foodLost: foodHit },
  };
}

function _resolveImplasyon(VS) {
  var goldHit = Math.floor(VS.res.gold * randRange(0.08, 0.18));
  _drainGold(VS, goldHit);
  _hitAll(VS, 'happiness', -10);
  _hitAll(VS, 'anger', 12);

  var hasTax = isPolicyActive('pagbabaTax', VS);
  if (hasTax) _hitAll(VS, 'anger', -5);

  return {
    msg: hasTax
      ? 'Implasyon! -' + goldHit + ' ginto. Ang mababang buwis ay nakatulong sa mga mamamayan.'
      : 'Implasyon! -' + goldHit + ' ginto nawala sa ekonomiya. Nagtataas ang mga presyo!',
    detail: { affectedBuildings: [], goldLost: goldHit, riceLost: 0, healthHit: 0 },
  };
}

function _resolveWelga(VS) {
  var hasPulisya = _hasBld(VS, 'pulisya');
  var hasCuartel = _hasBld(VS, 'cuartel');
  var goldLost   = 0;
  VS.buildings.forEach(function(b) {
    if (b.getDef && b.getDef().prodRes) goldLost += Math.floor(b.level * 15);
  });
  var trustLoss = hasPulisya ? 3 : (hasCuartel ? 6 : 12);
  _drainGold(VS, goldLost);
  _hitAll(VS, 'govTrust', -trustLoss);
  _hitAll(VS, 'anger', hasPulisya ? -5 : 8);

  return {
    msg: hasPulisya
      ? 'Welga! Ang Pulisya ay nagpanatili ng kaayusan. -' + goldLost + ' ginto, mababang epekto.'
      : 'Welga! Tumigil ang produksyon. -' + goldLost + ' ginto, -' + trustLoss + ' tiwala.',
    detail: { affectedBuildings: [], goldLost: goldLost, riceLost: 0, healthHit: 0, trustLoss: trustLoss },
  };
}

function _resolveIskandalo(VS) {
  if (!canScandalFire(VS)) return null;
  triggerScandal(VS);
  return {
    msg: 'Iskandalo! Nalantad ang katiwalian. Malaking pagbaba ng tiwala ng mamamayan!',
    detail: { affectedBuildings: [], goldLost: 0, riceLost: 0, healthHit: 0, trustLoss: 20 },
  };
}

function _resolveProtesta(VS) {
  var hasPulisya = _hasBld(VS, 'pulisya');
  var angerDelta = hasPulisya ? -10 : 15;
  _hitAll(VS, 'anger', angerDelta);
  _hitAll(VS, 'govTrust', hasPulisya ? 3 : -10);
  if (hasPulisya) _drainGold(VS, 30);
  if (typeof window !== 'undefined' && window.triggerProtest) window.triggerProtest();

  return {
    msg: hasPulisya
      ? 'Protesta! Pinayapa ng Pulisya ang mga nagrereklamo. Kaunting epekto.'
      : 'Protesta ng mamamayan! Walang Pulisya na pumigil. Mataas na galit!',
    detail: { affectedBuildings: [], goldLost: hasPulisya ? 30 : 0, riceLost: 0, healthHit: 0 },
  };
}

function _resolveBiganiAni(VS) {
  var farmCount = _countBld(VS, 'farm');
  if (farmCount === 0) return null;
  var bonus = farmCount * randRange(40, 80);
  VS.res.rice = Math.min(VS.resCap.rice, VS.res.rice + bonus);
  if (VS.food) VS.food.pool = Math.min(2000, (VS.food.pool || 0) + bonus * 0.5);
  _hitAll(VS, 'happiness', 8);

  return {
    msg: 'Masaganang ani! +' + Math.floor(bonus) + ' bigas mula sa ' + farmCount + ' bukid.',
    detail: { affectedBuildings: [], goldLost: 0, riceLost: -Math.floor(bonus), healthHit: 0 },
  };
}

function _resolveTukonggMiner(VS) {
  var mineCount = _countBld(VS, 'mine');
  if (mineCount === 0) return null;
  var goldLost = Math.floor(mineCount * randRange(30, 70));
  _drainGold(VS, goldLost);
  _hitAll(VS, 'health', _hasBld(VS, 'ospital') ? -5 : -15);

  return {
    msg: 'Gumuho ang minahan! -' + goldLost + ' ginto. ' +
      (_hasBld(VS, 'ospital') ? 'Ang ospital ay nakatulong sa mga nasugatan.' : 'Maraming nasugatan.'),
    detail: { affectedBuildings: [], goldLost: goldLost, riceLost: 0, healthHit: _hasBld(VS, 'ospital') ? 5 : 15 },
  };
}

/* ── Event catalogue ──────────────────────────────────────── */
var EVENT_CATALOGUE = [
  { key:'bagyo',        category:'natural',   severity:2, minDay:3,  chance:0.00008, fn:_resolveBagyo },
  { key:'lindol',       category:'natural',   severity:3, minDay:5,  chance:0.00004, fn:_resolveLindol },
  { key:'tagtuyot',     category:'natural',   severity:2, minDay:4,  chance:0.00007, fn:_resolveTagtuyot },
  { key:'biganiAni',    category:'natural',   severity:1, minDay:2,  chance:0.0001,  fn:_resolveBiganiAni },
  { key:'tukonggMiner', category:'natural',   severity:2, minDay:6,  chance:0.00005, fn:_resolveTukonggMiner },
  { key:'implasyon',    category:'economic',  severity:2, minDay:5,  chance:0.00006, fn:_resolveImplasyon },
  { key:'welga',        category:'economic',  severity:2, minDay:4,  chance:0.00007, fn:_resolveWelga },
  { key:'iskandalo',    category:'political', severity:3, minDay:8,  chance:0.00005, fn:_resolveIskandalo },
  { key:'protesta',     category:'political', severity:2, minDay:4,  chance:0.00006, fn:_resolveProtesta },
];

function _logEvent(VS, key, category, severity, message, detail) {
  if (!VS.events.log) VS.events.log = [];
  VS.events.log.unshift({
    id:       'ev_' + (_eventIdCounter++),
    key:      key,
    category: category,
    severity: severity,
    message:  message,
    detail:   detail || { affectedBuildings: [], goldLost: 0, riceLost: 0, healthHit: 0 },
    time:     Date.now(),
  });
  if (VS.events.log.length > 12) VS.events.log.pop();
}

/* ══════════════════════════════════════════════════════════════
   tickEvents
══════════════════════════════════════════════════════════════ */
export function tickEvents(dt, VS, notifyFn) {
  _ensureState(VS);

  if (VS.events.calamity) {
    VS.events.calamity.remaining -= dt;
    VS.events.calamity.intensity  = clamp(VS.events.calamity.remaining / VS.events.calamity.total, 0, 1);
    if (VS.events.calamity.remaining <= 0) {
      if (typeof window !== 'undefined' && window.stopAllCalamitySounds) {
        window.stopAllCalamitySounds();
      }
      VS.events.calamity = null;
    }
  }

  VS.events.cooldown = Math.max(0, (VS.events.cooldown || 0) - dt);
  if (VS.events.cooldown > 0) return;

  for (var i = 0; i < EVENT_CATALOGUE.length; i++) {
    var tpl = EVENT_CATALOGUE[i];
    if (VS.events._dayCount && VS.events._dayCount < tpl.minDay) continue;
    if (Math.random() > tpl.chance) continue;

    var result = tpl.fn(VS);
    if (!result) continue;

    _logEvent(VS, tpl.key, tpl.category, tpl.severity, result.msg, result.detail);
    VS.events.cooldown = EVENT_COOLDOWN + randRange(0, 60);

    if (notifyFn) {
      var prefix = tpl.severity >= 3 ? '🚨 ' : tpl.severity === 2 ? '⚠️ ' : 'ℹ️ ';
      notifyFn(prefix + result.msg, tpl.severity >= 3 ? 'danger' : tpl.severity === 2 ? 'warning' : 'info');
    }
    break;
  }
}

export function setEventDayCount(dayCount, VS) {
  _ensureState(VS);
  VS.events._dayCount = dayCount;
}

export function getEventLog(VS) {
  _ensureState(VS);
  return (VS.events.log || []).slice(0, 8);
}

export function getActiveCalamity(VS) {
  _ensureState(VS);
  return VS.events.calamity || null;
}

export function getActiveEvents(VS)     { return []; }
export function clearResolvedEvents(VS) { /* no-op */ }