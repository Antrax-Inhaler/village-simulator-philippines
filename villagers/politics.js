/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — villagers/politics.js  (new)

   POLITICS SYSTEM
   ─────────────────────────────────────────────────────────────
   Aggregates citizen-level stats into village-wide political
   indicators. Drives protest events and feeds election.js.

   WHAT THIS MODULE DOES
   ─────────────────────────────────────────────────────────────
   1. tickPolitics(dt, VS)
      Called each update tick. Checks aggregate anger and ignored
      needs. Fires a protest event when conditions are met.
      Prevents back-to-back protests with a cooldown.

   2. updateLeaders(VS)
      Scans villagers for citizens with high govTrust or persistent
      anger and marks them as isLeader = true. Leaders count 3×
      in elections (election.js) and can suppress or amplify protests.

   3. getVoteWeights(VS)
      Returns the per-citizen vote calculation snapshot used by
      election.js. Separated here so the formula stays in one place.

   4. getPoliticsState(VS)
      Full snapshot: avg trust, avg anger, protest risk, leader
      count. Used by ui/dashboard.js and election.js.

   LEADER CITIZENS
   ─────────────────────────────────────────────────────────────
   A citizen becomes a leader when:
     - govTrust > 75 AND happiness > 70  (community hero)
     - anger > 80 AND govTrust < 25     (opposition leader)
   Max 2 leaders at any time. Leaders are re-evaluated each day.

   PROTEST TRIGGER
   ─────────────────────────────────────────────────────────────
   A protest fires when:
     avgAnger > PROTEST_ANGER_THRESHOLD  (default 72)
     AND avgTrust < PROTEST_TRUST_THRESHOLD (default 30)
   The protest is fired as an event via government/events.js.

   EXPORTS
   ─────────────────────────────────────────────────────────────
   tickPolitics(dt, VS, notifyFn)   — main.js update()
   updateLeaders(VS)                — call from main.js _onNewDay()
   getVoteWeights(VS)               — election.js reads this
   getPoliticsState(VS)             — dashboard + election
   checkProtest(VS, notifyFn)       — called by citizenNeeds.js
═══════════════════════════════════════════════════════════════ */

import { clamp, randInt } from '../utils/perspective.js';

/* ── Constants ────────────────────────────────────────────── */
var PROTEST_ANGER_THRESHOLD   = 72;
var PROTEST_TRUST_THRESHOLD   = 30;
var PROTEST_COOLDOWN_SECS     = 120;   /* min 2 min between protests */
var MAX_LEADERS               = 2;
var HERO_TRUST_MIN            = 75;
var HERO_HAPPY_MIN            = 70;
var OPPOSITION_ANGER_MIN      = 80;
var OPPOSITION_TRUST_MAX      = 25;
var LEADER_WEIGHT             = 3;     /* matches election.js */

/* ── Ensure VS.politics sub-state ─────────────────────────── */
function _ensureState(VS) {
  if (!VS.politics) {
    VS.politics = {
      protestCooldown:   0,
      protestsThisTerm:  0,
      leaderIds:         [],   /* citizen ids currently flagged as leader */
      lastAvgTrust:      50,
      lastAvgAnger:      0,
      lastAvgHappiness:  60,
    };
  }
}

/* ══════════════════════════════════════════════════════════════
   tickPolitics
   Call each update tick from main.js.
══════════════════════════════════════════════════════════════ */
export function tickPolitics(dt, VS, notifyFn) {
  _ensureState(VS);
  var P = VS.politics;

  if (P.protestCooldown > 0) P.protestCooldown -= dt;

  /* Snapshot averages */
  var avgTrust    = _avg(VS.villagers, 'govTrust',  50);
  var avgAnger    = _avg(VS.villagers, 'anger',      0);
  var avgHappy    = _avg(VS.villagers, 'happiness', 60);

  P.lastAvgTrust    = avgTrust;
  P.lastAvgAnger    = avgAnger;
  P.lastAvgHappiness = avgHappy;

  /* Protest trigger */
  if (P.protestCooldown <= 0 &&
      avgAnger    > PROTEST_ANGER_THRESHOLD &&
      avgTrust    < PROTEST_TRUST_THRESHOLD) {
    checkProtest(VS, notifyFn);
  }

  /* Trust recovery: if anger is low AND happiness is high, slow trust rebuild */
  if (avgAnger < 20 && avgHappy > 65) {
    VS.villagers.forEach(function(v) {
      if ((v.govTrust || 50) < 55) {
        v.govTrust = clamp((v.govTrust || 50) + 0.003 * dt * 100, 0, 100);
      }
    });
  }
}

/* ══════════════════════════════════════════════════════════════
   checkProtest
   Can be called directly by citizenNeeds.js ignoreEffect or
   by tickPolitics when thresholds are crossed.
══════════════════════════════════════════════════════════════ */
export function checkProtest(VS, notifyFn) {
  _ensureState(VS);
  var P = VS.politics;

  if (P.protestCooldown > 0) return;   /* already in cooldown */

  P.protestCooldown  = PROTEST_COOLDOWN_SECS;
  P.protestsThisTerm += 1;

  /* Leader-modulated severity */
  var oppositionLeaders = VS.villagers.filter(function(v) {
    return v.isLeader && (v.govTrust || 50) < OPPOSITION_TRUST_MAX;
  }).length;

  var severity    = oppositionLeaders > 0 ? 3 : 2;
  var angerBoost  = oppositionLeaders * 8;

  /* Push a protest event into VS.events.queue */
  if (VS.events) {
    if (!VS.events.queue) VS.events.queue = [];
    VS.events.queue.push({
      id:          'protest_' + Date.now(),
      key:         'protestamamamayan',
      category:    'political',
      severity:    severity,
      title:       'Protesta ng Mamamayan',
      description: 'Lumabas sa lansangan ang mga mamamayan! ' +
                   (oppositionLeaders > 0 ? 'May mga lider ng oposisyon!' : 'Nagrereklamo sa pamahalaan.'),
      responses: [
        {
          label:     'Makipag-usap sa mga lider',
          costGold:  50, costRice: 0,
          fn: function(VS2) {
            _adjustAll(VS2.villagers, 'anger',    -25, 0, 100);
            _adjustAll(VS2.villagers, 'govTrust',  +8, 0, 100);
            return 'Nakipag-usap ang lider. Huminto ang protesta.';
          },
        },
        {
          label:     'Balewalain',
          costGold:  0, costRice: 0,
          fn: function(VS2) {
            _adjustAll(VS2.villagers, 'anger',    +20 + angerBoost, 0, 100);
            _adjustAll(VS2.villagers, 'govTrust', -15,              0, 100);
            return 'Binalewalain ang protesta. Mas lumala ang sitwasyon!';
          },
        },
      ],
      timeLeft: 120,
      timeMax:  120,
      resolved: false,
    });
  }

  if (notifyFn) {
    notifyFn('PROTESTA! Ang mamamayan ay nagmamartsa!', 'danger');
  }
}

/* ══════════════════════════════════════════════════════════════
   updateLeaders
   Re-evaluates who gets the leader flag. Call from _onNewDay().
══════════════════════════════════════════════════════════════ */
export function updateLeaders(VS) {
  _ensureState(VS);
  var P = VS.politics;

  /* Clear existing leaders */
  VS.villagers.forEach(function(v) { v.isLeader = false; });
  P.leaderIds = [];

  var heroes      = [];
  var opposition  = [];

  VS.villagers.forEach(function(v) {
    var trust   = v.govTrust  || 50;
    var happy   = v.happiness || 60;
    var anger   = v.anger     || 0;

    /* Community hero: loyal + happy */
    if (trust >= HERO_TRUST_MIN && happy >= HERO_HAPPY_MIN) {
      heroes.push({ v: v, score: trust + happy });
    }
    /* Opposition leader: angry + distrustful */
    if (anger >= OPPOSITION_ANGER_MIN && trust <= OPPOSITION_TRUST_MAX) {
      opposition.push({ v: v, score: anger + (100 - trust) });
    }
  });

  /* Sort by score descending, pick best */
  heroes.sort(function(a, b) { return b.score - a.score; });
  opposition.sort(function(a, b) { return b.score - a.score; });

  var chosen = [];
  if (heroes.length > 0)     chosen.push(heroes[0].v);
  if (opposition.length > 0) chosen.push(opposition[0].v);
  /* Up to MAX_LEADERS total */
  chosen = chosen.slice(0, MAX_LEADERS);

  chosen.forEach(function(v) {
    v.isLeader = true;
    P.leaderIds.push(v.id);
  });
}

/* ══════════════════════════════════════════════════════════════
   getVoteWeights
   Returns array of { villagerId, weight, score } for election.js.
   Separated here so the formula lives in one place.
══════════════════════════════════════════════════════════════ */
export function getVoteWeights(VS, corruptionExposure) {
  var exposure = corruptionExposure || 0;
  return VS.villagers.map(function(v) {
    var weight    = v.isLeader ? LEADER_WEIGHT : 1;
    var trust     = v.govTrust   !== undefined ? v.govTrust   : 50;
    var happiness = v.happiness  !== undefined ? v.happiness  : 50;
    var health    = v.health     !== undefined ? v.health     : 80;
    var hunger    = v.hunger     !== undefined ? v.hunger     : 20;

    var score = (trust     * 0.45)
              + (happiness * 0.30)
              + (health    * 0.10)
              + ((100 - hunger) * 0.10)
              - (exposure  * 0.05);

    return {
      villagerId: v.id,
      label:      v.label,
      weight:     weight,
      score:      score,
      votesFor:   score > 50,
      isLeader:   v.isLeader || false,
    };
  });
}

/* ══════════════════════════════════════════════════════════════
   getPoliticsState
   Full snapshot for dashboard.js and election.js.
══════════════════════════════════════════════════════════════ */
export function getPoliticsState(VS) {
  _ensureState(VS);
  var P = VS.politics;

  var avgTrust    = _avg(VS.villagers, 'govTrust',  50);
  var avgAnger    = _avg(VS.villagers, 'anger',      0);
  var avgHappy    = _avg(VS.villagers, 'happiness', 60);
  var leaderCount = VS.villagers.filter(function(v) { return v.isLeader; }).length;

  var protestRisk = 0;
  if (avgAnger > 40) {
    protestRisk = clamp(
      (avgAnger - 40) / (PROTEST_ANGER_THRESHOLD - 40) *
      (1 - avgTrust / 100),
      0, 1
    );
  }

  return {
    avgTrust:         Math.round(avgTrust),
    avgAnger:         Math.round(avgAnger),
    avgHappiness:     Math.round(avgHappy),
    protestRisk:      protestRisk,
    protestRiskPct:   Math.round(protestRisk * 100),
    protestCooldown:  Math.max(0, Math.ceil(P.protestCooldown)),
    protestsThisTerm: P.protestsThisTerm,
    leaderCount:      leaderCount,
    leaderIds:        P.leaderIds.slice(),
  };
}

/* ── Helpers ──────────────────────────────────────────────── */
function _avg(villagers, field, fallback) {
  if (!villagers.length) return fallback;
  var sum = 0, count = 0;
  villagers.forEach(function(v) {
    if (v[field] !== undefined) { sum += v[field]; count++; }
  });
  return count > 0 ? sum / count : fallback;
}

function _adjustAll(villagers, field, delta, lo, hi) {
  villagers.forEach(function(v) {
    if (v[field] !== undefined) {
      v[field] = clamp(v[field] + delta, lo, hi);
    }
  });
}