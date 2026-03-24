/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — villagers/citizenNeeds.js

   CITIZEN NEEDS SYSTEM
   ─────────────────────────────────────────────────────────────
   Watches each citizen's stats every tick and generates request
   objects when thresholds are crossed.

   WASTE PENALTIES
   ─────────────────────────────────────────────────────────────
   Every tick, total accumulated waste (gold + rice + langis)
   from economy.js is used to apply a morale penalty:
     govTrust  -= wasteTotal / 10000  (capped at 0.1 per tick)
     happiness -= that value / 2
   This creates real incentive to build and upgrade storage.

   EXPORTS
   ─────────────────────────────────────────────────────────────
   tickNeeds(dt, VS)                   — main.js update()
   checkAndEmit(VS)                    — called by aiInteraction.js
   getActiveRequests(VS)               — ui/requestPanel.js
   resolveRequest(id, action, VS, fn)  — ui/requestPanel.js buttons
   clearResolvedRequests(VS)           — housekeeping
═══════════════════════════════════════════════════════════════ */

import { clamp, randInt } from '../utils/perspective.js';
import { getTaxRate, getWasteStats } from '../resources/economy.js';

/* ── Constants ────────────────────────────────────────────── */
var MAX_ACTIVE_REQUESTS     = 5;
var REQUEST_EXPIRY_SECS     = 180;
var ANGER_DECAY_RATE        = 0.005;
var ANGER_BUILDUP_IGNORED   = 8;
var TRUST_LOSS_PER_IGNORE   = 5;
var TRUST_LOSS_ANGER_RATE   = 0.002;

/* Waste penalty scaling */
var WASTE_TRUST_DIVISOR     = 10000;   /* wasteTotal / this = trust penalty per tick */
var WASTE_TRUST_CAP         = 0.1;     /* max trust loss per tick from waste */
var WASTE_HAPPY_RATIO       = 0.5;     /* happiness penalty = trust penalty × this */

var THRESHOLDS = {
  hunger:  60, health:  35, tax:     50,
  housing: 1,  work:    1,  safety:  65,
};
var CATEGORY_COOLDOWNS = {
  hunger:  60,  health:  90,  tax:    120,
  housing: 180, work:   150,  safety:  80,
};

var _reqIdCounter = 0;

/* ── Ensure VS.needs sub-state ────────────────────────────── */
function _ensureState(VS) {
  if (!VS.needs) {
    VS.needs = {
      requests:  [],
      resolved:  [],
      cooldowns: {},
    };
  }
}

/* ══════════════════════════════════════════════════════════════
   tickNeeds
   Called every update tick.
══════════════════════════════════════════════════════════════ */
export function tickNeeds(dt, VS) {
  _ensureState(VS);
  var N = VS.needs;

  /* ── Age existing requests ─────────────────────────────── */
  for (var i = N.requests.length - 1; i >= 0; i--) {
    var req = N.requests[i];
    if (req.resolved) { N.requests.splice(i, 1); continue; }
    req.timeLeft -= dt;
    if (req.timeLeft <= 0) {
      _applyIgnore(req, VS);
      req.resolved = true;
      N.requests.splice(i, 1);
      _archiveRequest(N, req, 'expired');
    }
  }

  /* ── Passive anger/trust dynamics ─────────────────────── */
  var hasUrgentNeeds = N.requests.some(function(r) { return r.urgency >= 2; });

  VS.villagers.forEach(function(v) {
    if (!hasUrgentNeeds && (v.anger || 0) > 0) {
      v.anger = clamp(v.anger - ANGER_DECAY_RATE * dt * 100, 0, 100);
    }
    if ((v.anger || 0) > 50) {
      v.govTrust = clamp(
        (v.govTrust || 50) - TRUST_LOSS_ANGER_RATE * dt * 100, 0, 100
      );
    }
    if (N.requests.length >= 3 && (v.happiness || 60) > 10) {
      v.happiness = clamp((v.happiness || 60) - 0.001 * dt * 100, 0, 100);
    }
  });

  /* ── Waste penalty ─────────────────────────────────────── */
  var waste     = getWasteStats(VS);
  var wasteTotal = waste.total;

  if (wasteTotal > 0 && VS.villagers.length > 0) {
    /* Scale: modest waste barely noticeable; large waste hurts noticeably */
    var trustPenalty = Math.min(wasteTotal / WASTE_TRUST_DIVISOR * dt, WASTE_TRUST_CAP * dt);
    var happyPenalty = trustPenalty * WASTE_HAPPY_RATIO;

    VS.villagers.forEach(function(v) {
      if (v.govTrust !== undefined) {
        v.govTrust  = clamp(v.govTrust  - trustPenalty * 100, 0, 100);
      }
      if (v.happiness !== undefined) {
        v.happiness = clamp(v.happiness - happyPenalty * 100, 0, 100);
      }
    });
  }
}

/* ══════════════════════════════════════════════════════════════
   checkAndEmit
══════════════════════════════════════════════════════════════ */
export function checkAndEmit(VS) {
  _ensureState(VS);
  var N = VS.needs;
  if (N.requests.length >= MAX_ACTIVE_REQUESTS) return;

  var now = Date.now();

  if (_canEmit('hunger', N, now)) {
    var avgHunger = _avg(VS.villagers, 'hunger', 0);
    if (avgHunger > THRESHOLDS.hunger) _emit('hunger', VS, N, now, avgHunger);
  }
  if (_canEmit('health', N, now)) {
    var sickCount = VS.villagers.filter(function(v) {
      return (v.health || 80) < THRESHOLDS.health;
    }).length;
    if (sickCount > 0) _emit('health', VS, N, now, sickCount);
  }
  if (_canEmit('tax', N, now)) {
    var taxPct = Math.round(getTaxRate(VS) * 100);
    if (taxPct > THRESHOLDS.tax) _emit('tax', VS, N, now, taxPct);
  }
  if (_canEmit('housing', N, now)) {
    var homeless = VS.villagers.filter(function(v) { return !v.homeBuilding; }).length;
    if (homeless > THRESHOLDS.housing) _emit('housing', VS, N, now, homeless);
  }
  if (_canEmit('work', N, now)) {
    var unemployed = VS.villagers.filter(function(v) { return !v.workBuilding; }).length;
    var unempPct   = VS.villagers.length > 0 ? unemployed / VS.villagers.length : 0;
    if (unempPct > 0.30) _emit('work', VS, N, now, unemployed);
  }
  if (_canEmit('safety', N, now)) {
    var avgAnger = _avg(VS.villagers, 'anger', 0);
    if (avgAnger > THRESHOLDS.safety) _emit('safety', VS, N, now, avgAnger);
  }
}

function _canEmit(category, N, now) {
  var last = N.cooldowns[category] || 0;
  return (now - last) / 1000 >= (CATEGORY_COOLDOWNS[category] || 60);
}

function _emit(category, VS, N, now, value) {
  N.cooldowns[category] = now;
  var citizen = VS.villagers.length > 0
    ? VS.villagers[randInt(0, VS.villagers.length - 1)] : null;
  var req = _buildRequest(category, citizen, VS, value);
  if (!req) return;
  N.requests.push(req);
}

function _buildRequest(category, citizen, VS, value) {
  var label = citizen ? citizen.label : 'Isang mamamayan';
  var id    = 'need_' + (_reqIdCounter++);

  var defs = {
    hunger: {
      urgency: value > 80 ? 3 : 2,
      message: 'Nagugutom na kami! Walang sapat na pagkain sa nayon.',
      helpCostGold: 150,
      resolveEffect: function(VS2) {
        VS2.food.pool = Math.min(2000, (VS2.food.pool || 0) + 400);
        _adjustAll(VS2.villagers, 'hunger', -25, 0, 100);
        _adjustAll(VS2.villagers, 'govTrust', 6, 0, 100);
        _adjustAll(VS2.villagers, 'happiness', 8, 0, 100);
      },
      delayEffect:  function(VS2) { _adjustAll(VS2.villagers, 'anger', 8, 0, 100); },
      ignoreEffect: function(VS2) {
        _adjustAll(VS2.villagers, 'anger', 18, 0, 100);
        _adjustAll(VS2.villagers, 'govTrust', -TRUST_LOSS_PER_IGNORE, 0, 100);
        _adjustAll(VS2.villagers, 'happiness', -12, 0, 100);
      },
    },
    health: {
      urgency: value > 3 ? 3 : 2,
      message: 'Maraming maysakit! Kailangan namin ng ospital.',
      helpCostGold: 200,
      resolveEffect: function(VS2) {
        VS2.villagers.forEach(function(v) {
          if ((v.health || 80) < 50) v.health = clamp((v.health || 0) + 30, 0, 100);
        });
        _adjustAll(VS2.villagers, 'govTrust', 8, 0, 100);
      },
      delayEffect:  function(VS2) { _adjustAll(VS2.villagers, 'anger', 5, 0, 100); },
      ignoreEffect: function(VS2) {
        VS2.villagers.forEach(function(v) {
          if ((v.health || 80) < 50) v.health = clamp((v.health || 0) - 10, 0, 100);
        });
        _adjustAll(VS2.villagers, 'govTrust', -TRUST_LOSS_PER_IGNORE, 0, 100);
        _adjustAll(VS2.villagers, 'anger', 15, 0, 100);
      },
    },
    tax: {
      urgency: value > 65 ? 3 : 2,
      message: 'Sobrang taas ng buwis! Hindi na namin kaya, ' + value + '% na!',
      helpCostGold: 0,
      resolveEffect: function(VS2) {
        if (VS2.economy) VS2.economy.taxRate = clamp(VS2.economy.taxRate - 0.10, 0.05, 0.80);
        _adjustAll(VS2.villagers, 'anger', -20, 0, 100);
        _adjustAll(VS2.villagers, 'govTrust', 8, 0, 100);
        _adjustAll(VS2.villagers, 'happiness', 10, 0, 100);
      },
      delayEffect:  function(VS2) { _adjustAll(VS2.villagers, 'anger', 6, 0, 100); },
      ignoreEffect: function(VS2) {
        _adjustAll(VS2.villagers, 'anger', ANGER_BUILDUP_IGNORED + 5, 0, 100);
        _adjustAll(VS2.villagers, 'govTrust', -TRUST_LOSS_PER_IGNORE, 0, 100);
      },
    },
    housing: {
      urgency: value > 5 ? 3 : 2,
      message: value + ' tao ang walang tirahan! Kailangan ng bagong bahay.',
      helpCostGold: 80,
      resolveEffect: function(VS2) {
        VS2.res.gold = clamp(VS2.res.gold - 80, 0, VS2.resCap.gold);
        _adjustAll(VS2.villagers, 'govTrust', 5, 0, 100);
        _adjustAll(VS2.villagers, 'happiness', 6, 0, 100);
      },
      delayEffect:  function(VS2) { _adjustAll(VS2.villagers, 'anger', 4, 0, 100); },
      ignoreEffect: function(VS2) {
        _adjustAll(VS2.villagers, 'anger', ANGER_BUILDUP_IGNORED, 0, 100);
        _adjustAll(VS2.villagers, 'govTrust', -TRUST_LOSS_PER_IGNORE, 0, 100);
      },
    },
    work: {
      urgency: 2,
      message: value + ' walang trabaho. Kailangan ng mas maraming trabaho.',
      helpCostGold: 100,
      resolveEffect: function(VS2) {
        VS2.villagers.forEach(function(v) {
          if (!v.workBuilding) {
            v.income    = Math.max(v.income || 0, 5);
            v.happiness = clamp((v.happiness || 60) + 8, 0, 100);
          }
        });
        _adjustAll(VS2.villagers, 'govTrust', 4, 0, 100);
      },
      delayEffect:  function(VS2) { _adjustAll(VS2.villagers, 'anger', 5, 0, 100); },
      ignoreEffect: function(VS2) {
        _adjustAll(VS2.villagers, 'anger', ANGER_BUILDUP_IGNORED, 0, 100);
        _adjustAll(VS2.villagers, 'govTrust', -TRUST_LOSS_PER_IGNORE, 0, 100);
      },
    },
    safety: {
      urgency: 3,
      message: 'Hindi kami ligtas! Maraming galit na tao sa nayon.',
      helpCostGold: 120,
      resolveEffect: function(VS2) {
        _adjustAll(VS2.villagers, 'anger', -30, 0, 100);
        _adjustAll(VS2.villagers, 'govTrust', 10, 0, 100);
        _adjustAll(VS2.villagers, 'happiness', 8, 0, 100);
      },
      delayEffect:  function(VS2) { _adjustAll(VS2.villagers, 'anger', 5, 0, 100); },
      ignoreEffect: function(VS2) {
        _adjustAll(VS2.villagers, 'anger', 20, 0, 100);
        _adjustAll(VS2.villagers, 'govTrust', -10, 0, 100);
        if (VS2.events && Math.random() < 0.4) {
          if (!VS2.events.queue) VS2.events.queue = [];
        }
      },
    },
  };

  var def = defs[category];
  if (!def) return null;

  return {
    id:            id,
    category:      category,
    message:       def.message,
    citizenLabel:  label,
    citizenId:     citizen ? citizen.id : null,
    urgency:       def.urgency,
    helpCostGold:  def.helpCostGold,
    timeLeft:      REQUEST_EXPIRY_SECS,
    timeMax:       REQUEST_EXPIRY_SECS,
    createdAt:     Date.now(),
    resolved:      false,
    resolveEffect: def.resolveEffect,
    delayEffect:   def.delayEffect,
    ignoreEffect:  def.ignoreEffect,
  };
}

function _applyIgnore(req, VS) {
  if (req.ignoreEffect) req.ignoreEffect(VS);
}
function _archiveRequest(N, req, outcome) {
  N.resolved.unshift({ id: req.id, category: req.category, outcome: outcome });
  if (N.resolved.length > 10) N.resolved.pop();
}
function _adjustAll(villagers, field, delta, lo, hi) {
  villagers.forEach(function(v) {
    if (v[field] !== undefined) v[field] = clamp(v[field] + delta, lo, hi);
  });
}
function _avg(villagers, field, fallback) {
  if (!villagers.length) return fallback;
  var sum = 0, count = 0;
  villagers.forEach(function(v) {
    if (v[field] !== undefined) { sum += v[field]; count++; }
  });
  return count > 0 ? sum / count : fallback;
}

/* ══════════════════════════════════════════════════════════════
   resolveRequest
══════════════════════════════════════════════════════════════ */
export function resolveRequest(requestId, action, VS, notifyFn) {
  _ensureState(VS);
  var N   = VS.needs;
  var idx = -1;
  for (var i = 0; i < N.requests.length; i++) {
    if (N.requests[i].id === requestId) { idx = i; break; }
  }
  if (idx === -1) return { ok: false, msg: 'Hindi nahanap ang kahilingan.' };

  var req = N.requests[idx];

  if (action === 'help') {
    if (VS.res.gold < req.helpCostGold) {
      return { ok: false, msg: 'Kulang! Kailangan: ' + req.helpCostGold + ' ginto.' };
    }
    if (req.helpCostGold > 0) {
      VS.res.gold = clamp(VS.res.gold - req.helpCostGold, 0, VS.resCap.gold);
    }
    if (req.resolveEffect) req.resolveEffect(VS);
    req.resolved = true;
    _archiveRequest(N, req, 'helped');
    N.requests.splice(idx, 1);
    if (notifyFn) notifyFn('Natugunan: ' + req.category + '. Salamat ng mamamayan!', 'success');
    return { ok: true, msg: 'Natugunan ang pangangailangan.' };
  }
  if (action === 'delay') {
    if (req.delayEffect) req.delayEffect(VS);
    req.timeLeft = Math.min(req.timeLeft + 60, REQUEST_EXPIRY_SECS);
    if (notifyFn) notifyFn('Ipinagpaliban. Mag-ingat — maaaring lumala.', 'warning');
    return { ok: true, msg: 'Ipinagpaliban.' };
  }
  if (action === 'ignore') {
    if (req.ignoreEffect) req.ignoreEffect(VS);
    req.resolved = true;
    _archiveRequest(N, req, 'ignored');
    N.requests.splice(idx, 1);
    if (notifyFn) notifyFn('Binalewalain. Galit ang mga tao!', 'danger');
    return { ok: true, msg: 'Binalewalain ang kahilingan.' };
  }
  return { ok: false, msg: 'Hindi kilala ang aksyon.' };
}

/* ══════════════════════════════════════════════════════════════
   getActiveRequests / clearResolvedRequests
══════════════════════════════════════════════════════════════ */
export function getActiveRequests(VS) {
  _ensureState(VS);
  return VS.needs.requests.filter(function(r) { return !r.resolved; });
}

export function clearResolvedRequests(VS) {
  _ensureState(VS);
  VS.needs.requests = VS.needs.requests.filter(function(r) { return !r.resolved; });
  VS.needs.resolved = VS.needs.resolved.slice(0, 10);
}