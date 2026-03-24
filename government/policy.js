/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — government/policy.js

   POLICY SYSTEM
   ─────────────────────────────────────────────────────────────
   Policies are long-term solutions the player activates.
   Each policy has:
     - A one-time activation cost (gold + rice)
     - A recurring monthly budget drain (gold / real-second rate)
     - A passive bonus applied to citizens or resources each tick
     - A govTrust effect — well-funded policies raise trust;
       active policies with unpaid maintenance lower it

   POLICY CATALOGUE
   ─────────────────────────────────────────────────────────────
   librengPagamot    — Free Healthcare      — health regen up, death risk down
   programaPagkain   — Food Program         — hunger decay slowed, food buffer
   pagbabaTax        — Tax Reduction        — citizen income up, less anger
   pondongEdukasyon  — Education Fund       — skills up, better job chances
   tulong_sakuna     — Disaster Relief Fund — faster recovery from events
   antiKorapsyon     — Anti-Corruption Act  — risk decay faster, trust up

   EXPORTS
   ─────────────────────────────────────────────────────────────
   POLICY_DEFS                         — catalogue object
   activatePolicy(key, VS, notifyFn)   — spend cost and enable policy
   deactivatePolicy(key, VS, notifyFn) — disable, stop budget drain
   applyPolicies(dt, VS)               — tick from main.js update()
   getPolicyState(VS)                  — snapshot for UI
   isPolicyActive(key, VS)             — boolean check
═══════════════════════════════════════════════════════════════ */

import { clamp } from '../utils/perspective.js';

/* ══════════════════════════════════════════════════════════════
   POLICY CATALOGUE
══════════════════════════════════════════════════════════════ */
export var POLICY_DEFS = {

  librengPagamot: {
    label:       'Libreng Pagamot',
    description: 'Libre ang gamot para sa lahat. Bumababa ang panganib ng kamatayan.',
    icon:        'health',
    activateCost:  { gold: 300, rice: 50 },
    /* gold drained per real second (≈ monthly budget drain) */
    drainPerSec:   0.12,
    /* Applied each tick to each citizen: health regen rate multiplier */
    effects: {
      healthRegenBonus:  0.04,   // +health/sec per citizen
      deathRiskMult:     0.5,    // halves death probability check
      trustPerSec:       0.002,  // slow trust gain per citizen per sec
    },
    minHallLevel: 2,
  },

  programaPagkain: {
    label:       'Programa sa Pagkain',
    description: 'Naibababa ang gutom ng mamamayan. Mas mataas ang produktibidad.',
    icon:        'food',
    activateCost:  { gold: 200, rice: 200 },
    drainPerSec:   0.10,
    effects: {
      hungerDecayMult:   0.6,    // hunger depletes 40% slower
      foodBufferBonus:   50,     // adds flat food buffer to pool
      trustPerSec:       0.0015,
    },
    minHallLevel: 1,
  },

  pagbabaTax: {
    label:       'Pagbaba ng Buwis',
    description: 'Bumababa ang buwis. Mas masaya ang mamamayan pero mas maliit ang kita.',
    icon:        'tax',
    activateCost:  { gold: 100, rice: 0 },
    drainPerSec:   0.0,          // no ongoing cost — revenue is just reduced
    effects: {
      taxRateMultiplier: 0.75,   // 25% less tax collected from citizens
      angerDecayBonus:   0.05,   // anger drops faster per citizen per sec
      trustPerSec:       0.003,
    },
    minHallLevel: 1,
  },

  pondongEdukasyon: {
    label:       'Pondo sa Edukasyon',
    description: 'Mas maraming paaralan ang natatayo. Mas mataas ang kasanayan.',
    icon:        'education',
    activateCost:  { gold: 400, rice: 100 },
    drainPerSec:   0.15,
    effects: {
      trainingSpeedBonus: 1.3,   // training completes 30% faster
      incomeBonusFlat:    2,     // +2 base income to all citizens
      trustPerSec:        0.001,
    },
    minHallLevel: 2,
  },

  tulong_sakuna: {
    label:       'Pondo sa Sakuna',
    description: 'Mas mabilis ang pagbawi mula sa mga kalamidad.',
    icon:        'disaster',
    activateCost:  { gold: 250, rice: 80 },
    drainPerSec:   0.08,
    effects: {
      eventRecoveryMult: 0.5,    // recovery time from disasters halved
      reliefCostMult:    0.6,    // disaster aid costs 40% less gold
      trustPerSec:       0.001,
    },
    minHallLevel: 3,
  },

  antiKorapsyon: {
    label:       'Batas Kontra-Korapsyon',
    description: 'Bumababa ang panganib ng iskandalo. Tumataas ang tiwala.',
    icon:        'anti_corruption',
    activateCost:  { gold: 350, rice: 0 },
    drainPerSec:   0.10,
    effects: {
      riskDecayBonus:    0.8,    // additional risk decay per sec (stacks with base)
      exposureDecayRate: 0.001,  // slowly reduces existing exposure each tick
      trustPerSec:       0.004,
    },
    minHallLevel: 3,
  },
};

/* ── Ensure VS has policy sub-state ───────────────────────── */
function _ensureState(VS) {
  if (!VS.policies) {
    VS.policies = {
      active:        {},   // { [key]: true }
      maintenanceDue: 0,   // gold owed this tick for active policies
      totalSpent:    0,    // audit trail
    };
  }
}

/* ══════════════════════════════════════════════════════════════
   activatePolicy
   Checks affordability and hall level, then enables the policy.
══════════════════════════════════════════════════════════════ */
export function activatePolicy(key, VS, notifyFn) {
  _ensureState(VS);
  var def = POLICY_DEFS[key];
  if (!def) return { ok: false, msg: 'Hindi kilala ang patakaran.' };

  if (VS.policies.active[key]) {
    return { ok: false, msg: def.label + ' ay aktibo na.' };
  }

  /* Hall level check */
  var mhLevel = 1;
  VS.buildings.forEach(function(b) {
    if (b.type === 'mainHall') mhLevel = Math.max(mhLevel, b.level);
  });
  if (mhLevel < def.minHallLevel) {
    return {
      ok: false,
      msg: 'Kailangan ng Bahay-Bayan Lv' + def.minHallLevel + ' para dito.'
    };
  }

  /* Afford check */
  if (VS.res.gold < def.activateCost.gold || VS.res.rice < def.activateCost.rice) {
    return {
      ok: false,
      msg: 'Kulang! ' + def.activateCost.gold + ' ginto at ' + def.activateCost.rice + ' bigas.'
    };
  }

  VS.res.gold            -= def.activateCost.gold;
  VS.res.rice            -= def.activateCost.rice;
  VS.policies.active[key] = true;
  VS.policies.totalSpent += def.activateCost.gold;

  if (notifyFn) notifyFn(def.label + ' ay inaktibo na!', 'success');
  return { ok: true, msg: def.label + ' ay inaktibo na!' };
}

/* ══════════════════════════════════════════════════════════════
   deactivatePolicy
   Stops the policy and its budget drain. Trust may dip slightly
   from the sudden removal (citizens notice).
══════════════════════════════════════════════════════════════ */
export function deactivatePolicy(key, VS, notifyFn) {
  _ensureState(VS);
  var def = POLICY_DEFS[key];
  if (!def || !VS.policies.active[key]) {
    return { ok: false, msg: 'Hindi aktibo ang patakaran na ito.' };
  }

  delete VS.policies.active[key];

  /* Small trust hit — citizens dislike sudden policy removal */
  VS.villagers.forEach(function(v) {
    if (v.govTrust !== undefined) {
      v.govTrust = clamp(v.govTrust - 4, 0, 100);
    }
  });

  if (notifyFn) notifyFn(def.label + ' ay tinanggal. Kaunting pagbaba ng tiwala.', 'warning');
  return { ok: true, msg: def.label + ' ay tinanggal.' };
}

/* ══════════════════════════════════════════════════════════════
   applyPolicies
   Called every tick from main.js.
   Drains budget, applies effects to citizens and resources.
══════════════════════════════════════════════════════════════ */
export function applyPolicies(dt, VS) {
  _ensureState(VS);
  var active = VS.policies.active;
  var keys   = Object.keys(active);
  if (keys.length === 0) return;

  var totalDrain = 0;
  var effects    = _aggregateEffects(keys);

  /* Budget drain */
  keys.forEach(function(key) {
    var def = POLICY_DEFS[key];
    if (def) totalDrain += def.drainPerSec * dt;
  });

  /* Deduct from gold — if broke, policies still apply but trust suffers */
  if (VS.res.gold >= totalDrain) {
    VS.res.gold -= totalDrain;
  } else {
    /* Can't afford maintenance — skip this tick's benefits, hurt trust */
    VS.villagers.forEach(function(v) {
      if (v.govTrust !== undefined) {
        v.govTrust = clamp(v.govTrust - 0.02 * dt, 0, 100);
      }
    });
    return;
  }

  /* Apply citizen-level effects */
  VS.villagers.forEach(function(v) {
    /* Health regen from Libreng Pagamot */
    if (effects.healthRegenBonus && v.health !== undefined) {
      v.health = clamp(v.health + effects.healthRegenBonus * dt, 0, 100);
    }
    /* Hunger decay slowdown from Programa sa Pagkain */
    if (effects.hungerDecayMult !== undefined && v._hungerDecayMult !== undefined) {
      v._policyHungerMult = effects.hungerDecayMult;
    }
    /* Trust gain from all active policies */
    if (effects.trustPerSec && v.govTrust !== undefined) {
      v.govTrust = clamp(v.govTrust + effects.trustPerSec * dt, 0, 100);
    }
    /* Anger decay boost from Pagbaba ng Buwis */
    if (effects.angerDecayBonus && v.anger !== undefined) {
      v.anger = clamp(v.anger - effects.angerDecayBonus * dt, 0, 100);
    }
    /* Income bonus from Pondo sa Edukasyon */
    if (effects.incomeBonusFlat && v.income !== undefined) {
      v._policyIncomeBonus = effects.incomeBonusFlat;
    }
  });

  /* Anti-corruption policy: extra risk decay handled via VS.corruption */
  if (effects.riskDecayBonus && VS.corruption) {
    VS.corruption.riskLevel = clamp(
      VS.corruption.riskLevel - effects.riskDecayBonus * dt, 0, 100
    );
    if (effects.exposureDecayRate) {
      VS.corruption.exposureLevel = clamp(
        VS.corruption.exposureLevel - effects.exposureDecayRate * dt, 0, 100
      );
    }
  }

  /* Food buffer from Programa sa Pagkain */
  if (effects.foodBufferBonus && VS.food !== undefined) {
    VS.food.buffer = (VS.food.buffer || 0) + effects.foodBufferBonus * dt * 0.01;
  }
}

/* ── Internal: merge effects from all active policies ─────── */
function _aggregateEffects(keys) {
  var out = {};
  keys.forEach(function(key) {
    var def = POLICY_DEFS[key];
    if (!def) return;
    Object.keys(def.effects).forEach(function(ek) {
      var v = def.effects[ek];
      if (out[ek] === undefined) {
        out[ek] = v;
      } else {
        /* Additive for bonuses, minimum for multipliers < 1 */
        if (ek.indexOf('Mult') !== -1 || ek.indexOf('Rate') !== -1) {
          out[ek] = Math.min(out[ek], v);
        } else {
          out[ek] = out[ek] + v;
        }
      }
    });
  });
  return out;
}

/* ══════════════════════════════════════════════════════════════
   getPolicyState
   Safe snapshot for UI rendering.
══════════════════════════════════════════════════════════════ */
export function getPolicyState(VS) {
  _ensureState(VS);
  var active = VS.policies.active;
  return Object.keys(POLICY_DEFS).map(function(key) {
    var def = POLICY_DEFS[key];
    return {
      key:        key,
      label:      def.label,
      description:def.description,
      icon:       def.icon,
      isActive:   !!active[key],
      cost:       def.activateCost,
      drainPerSec:def.drainPerSec,
      minHallLevel: def.minHallLevel,
      canAfford:  false, /* filled in by UI after reading VS.res */
    };
  });
}

/* ══════════════════════════════════════════════════════════════
   isPolicyActive
   Quick boolean used by other systems (economy, events, etc.)
══════════════════════════════════════════════════════════════ */
export function isPolicyActive(key, VS) {
  _ensureState(VS);
  return !!VS.policies.active[key];
}

/* ══════════════════════════════════════════════════════════════
   getEffectiveTrainingSpeed
   Helper for villager.js training system.
══════════════════════════════════════════════════════════════ */
export function getEffectiveTrainingSpeed(VS) {
  if (!isPolicyActive('pondongEdukasyon', VS)) return 1.0;
  return POLICY_DEFS.pondongEdukasyon.effects.trainingSpeedBonus;
}
