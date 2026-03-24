/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — government/election.js

   ELECTION SYSTEM
   ─────────────────────────────────────────────────────────────
   Elections happen every TERM_DURATION real-seconds.
   Citizens vote based on their individual stats — there's no
   single "happiness meter" the player can game with one action.

   VOTE FORMULA (per citizen)
   ─────────────────────────────────────────────────────────────
   voteScore = (govTrust * 0.45)
             + (happiness * 0.30)
             + (health * 0.10)
             + (100 - hunger) * 0.10
             - (corruptionExposure * 0.05 per scandal)

   A citizen votes FOR you if their voteScore > 50.
   Result: votes_for / total_citizens → approval %.
   Win condition: approval >= WIN_THRESHOLD (default 51%).

   SPECIAL CITIZENS (leaders)
   ─────────────────────────────────────────────────────────────
   Citizens with isLeader = true count as 3× votes each.
   politics.js sets isLeader based on high govTrust or protest history.

   OUTCOMES
   ─────────────────────────────────────────────────────────────
   Win  → Term renewed. exposureLevel partially decays. Day resets.
   Lose → Game over screen triggered via notifyFn('game_over').

   EXPORTS
   ─────────────────────────────────────────────────────────────
   tickElection(dt, VS, notifyFn)   — call from main.js update()
   forceElection(VS, notifyFn)      — for testing / events
   getElectionState(VS)             — snapshot for UI timer / HUD
   resetTerm(VS)                    — called internally on win
═══════════════════════════════════════════════════════════════ */

import { clamp } from '../utils/perspective.js';
import { resetTermCorruption } from './corruption.js';

/* ── Constants ────────────────────────────────────────────── */
var TERM_DURATION    = 720;   /* real seconds per term (~12 min at 1× speed)  */
var WIN_THRESHOLD    = 0.51;  /* fraction of votes needed to win              */
var LEADER_WEIGHT    = 3;     /* leader citizen vote multiplier               */
var MIN_VOTERS       = 3;     /* need at least this many citizens to hold election */

/* ── Ensure VS.election sub-state ─────────────────────────── */
function _ensureState(VS) {
  if (!VS.election) {
    VS.election = {
      termTimer:      TERM_DURATION,   /* counts down to 0 */
      termNumber:     1,
      lastApproval:   1.0,             /* 0–1, used for UI */
      lastVotesFor:   0,
      lastVotesTotal: 0,
      electionPending:false,           /* true while result screen is showing */
      terminated:     false,           /* true on game over */
    };
  }
}

/* ══════════════════════════════════════════════════════════════
   tickElection
   Call every update() tick. Counts down and fires election
   when the timer hits zero.
══════════════════════════════════════════════════════════════ */
export function tickElection(dt, VS, notifyFn) {
  _ensureState(VS);
  var E = VS.election;

  if (E.electionPending || E.terminated) return;

  E.termTimer -= dt;

  /* Warn at 60 real seconds remaining */
  if (E.termTimer <= 60 && E.termTimer + dt > 60) {
    if (notifyFn) notifyFn('Isang minuto na lang bago ang eleksyon!', 'warning');
  }

  if (E.termTimer <= 0) {
    forceElection(VS, notifyFn);
  }
}

/* ══════════════════════════════════════════════════════════════
   forceElection
   Can be called immediately (for testing or event triggers).
══════════════════════════════════════════════════════════════ */
export function forceElection(VS, notifyFn) {
  _ensureState(VS);
  var E = VS.election;
  E.electionPending = true;

  if (VS.villagers.length < MIN_VOTERS) {
    /* Not enough citizens — auto-win but warn */
    if (notifyFn) notifyFn('Eleksyon: Walang sapat na botante. Nanalo ka pa rin.', 'info');
    _winTerm(VS, notifyFn, 1.0, 0, 0);
    return;
  }

  var result   = _countVotes(VS);
  var approval = result.total > 0 ? result.votesFor / result.total : 0;

  E.lastApproval    = approval;
  E.lastVotesFor    = result.votesFor;
  E.lastVotesTotal  = result.total;
  E.lastBreakdown   = result.breakdown;
  E.lastEmployedPct = result.employedPct;

  if (approval >= WIN_THRESHOLD) {
    _winTerm(VS, notifyFn, approval, result.votesFor, result.total, result.breakdown);
  } else {
    _loseTerm(VS, notifyFn, approval, result.votesFor, result.total, result.breakdown);
  }
}

/* ── Internal: compute village-wide employment rate (0–100) ── */
function _getEmploymentRate(VS) {
  var adults = VS.villagers.filter(function(v) {
    return v.typeIdx !== 4;   /* exclude babies */
  });
  if (adults.length === 0) return 0;
  var working = adults.filter(function(v) {
    return v.isInsideWork || v.isTraining;
  }).length;
  return Math.round((working / adults.length) * 100);
}

/* ── Internal: tally votes across all adult citizens ────────── */
function _countVotes(VS) {
  var exposure     = VS.corruption ? (VS.corruption.exposureLevel || 0) : 0;
  var employedPct  = _getEmploymentRate(VS);  /* 0–100, shared by all voters */

  var votesFor  = 0;
  var total     = 0;
  var breakdown = { trust: 0, happy: 0, food: 0, employ: 0, health: 0, n: 0 };

  VS.villagers.forEach(function(v) {
    /* Children and students don't vote */
    if (v.typeIdx === 4 || v.typeIdx === 10) return;

    var weight = v.isLeader ? LEADER_WEIGHT : 1;
    total += weight;

    var trust  = clamp(v.govTrust  !== undefined ? v.govTrust  : 40, 0, 100);
    var happy  = clamp(v.happiness !== undefined ? v.happiness : 45, 0, 100);
    var health = clamp(v.health    !== undefined ? v.health    : 80, 0, 100);
    var hunger = clamp(v.hunger    !== undefined ? v.hunger    : 20, 0, 100);
    var fed    = 100 - hunger;  /* 0=starving, 100=full */

    /* Four pillars — weighted sum, threshold at 50 */
    var score = (trust      * 0.30)   /* Tiwala sa Gobyerno  */
              + (happy      * 0.25)   /* Kasiyahan           */
              + (fed        * 0.20)   /* Pagkain / Hunger    */
              + (employedPct* 0.15)   /* Trabaho             */
              + (health     * 0.10)   /* Kalusugan           */
              - (exposure   * 0.05);  /* Corruption penalty  */

    /* Accumulate breakdown for UI display */
    breakdown.trust  += trust;
    breakdown.happy  += happy;
    breakdown.food   += fed;
    breakdown.employ += employedPct;
    breakdown.health += health;
    breakdown.n      += 1;

    if (score > 50) votesFor += weight;
  });

  /* Average breakdown for display */
  var n = Math.max(1, breakdown.n);
  return {
    votesFor:  votesFor,
    total:     total,
    employedPct: employedPct,
    breakdown: {
      trust:  Math.round(breakdown.trust  / n),
      happy:  Math.round(breakdown.happy  / n),
      food:   Math.round(breakdown.food   / n),
      employ: Math.round(breakdown.employ / n),
      health: Math.round(breakdown.health / n),
    },
  };
}

/* ── Internal: term won ───────────────────────────────────── */
function _winTerm(VS, notifyFn, approval, votesFor, total, bd) {
  var pct = Math.round(approval * 100);
  if (notifyFn) {
    var detail = bd
      ? ' | Tiwala:' + bd.trust + ' Kasiyahan:' + bd.happy +
        ' Pagkain:' + bd.food + ' Trabaho:' + bd.employ + '%'
      : '';
    notifyFn(
      '🗳️ NANALO! ' + pct + '% ng boto (' + Math.round(votesFor) + '/' + Math.round(total) + ').' +
      detail + ' Bagong termino!',
      'success'
    );
  }
  resetTerm(VS);
}

/* ── Internal: term lost → game over ─────────────────────── */
function _loseTerm(VS, notifyFn, approval, votesFor, total, bd) {
  VS.election.terminated = true;
  var pct = Math.round(approval * 100);
  if (notifyFn) {
    var detail = bd
      ? ' | Tiwala:' + bd.trust + ' Kasiyahan:' + bd.happy +
        ' Pagkain:' + bd.food + ' Trabaho:' + bd.employ + '%'
      : '';
    notifyFn(
      '🗳️ NATALO! ' + pct + '% ng boto.' + detail +
      ' Tinanggal ka ng mamamayan.',
      'game_over'
    );
  }
}

/* ══════════════════════════════════════════════════════════════
   resetTerm
   Resets the timer and decays corruption exposure for a new term.
══════════════════════════════════════════════════════════════ */
export function resetTerm(VS) {
  _ensureState(VS);
  var E = VS.election;
  E.termTimer      = TERM_DURATION;
  E.termNumber    += 1;
  E.electionPending = false;

  /* Partial corruption exposure decay — past sins fade but don't vanish */
  resetTermCorruption(VS);
}

/* ══════════════════════════════════════════════════════════════
   getElectionState
   Safe read for HUD and request panel.
══════════════════════════════════════════════════════════════ */
export function getElectionState(VS) {
  _ensureState(VS);
  var E = VS.election;
  /* Live preview: compute current approval so HUD can show it in real-time */
  var liveResult   = VS.villagers.length >= MIN_VOTERS ? _countVotes(VS) : null;
  var liveApproval = liveResult && liveResult.total > 0
    ? liveResult.votesFor / liveResult.total : (E.lastApproval || 0.5);

  return {
    termTimer:       E.termTimer,
    termTimerMax:    TERM_DURATION,
    termNumber:      E.termNumber,
    lastApproval:    E.lastApproval,
    lastVotesFor:    E.lastVotesFor,
    lastVotesTotal:  E.lastVotesTotal,
    lastBreakdown:   E.lastBreakdown || null,
    employedPct:     liveResult ? liveResult.employedPct : 0,
    liveApproval:    liveApproval,
    liveBreakdown:   liveResult ? liveResult.breakdown : null,
    electionPending: E.electionPending,
    terminated:      E.terminated,
    secondsLeft:     Math.max(0, Math.ceil(E.termTimer)),
    minutesLeft:     Math.max(0, Math.ceil(E.termTimer / 60)),
  };
}