/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — main/gameState.js

   The shape of the single live game-state object (VS). Pulled out
   of main.js so the "what does the game track" question has one
   answer independent of "how does the update loop run" — main.js
   still owns creating exactly one VS and mutating it every tick.
═══════════════════════════════════════════════════════════════ */

export var BASE_RES_CAP = { gold: 2000, rice: 1500, langis: 800 };

export function createInitialState() {
  return {
    villagers: [],
    buildings: [],
    resourceNodes: [],
    waypoints: { all: [], mines: [], buildings: [] },
    res: { gold: 800, rice: 500, langis: 1000 },
    resCap: { gold: 2000, rice: 1500, langis: 800 },
    pop: { cur: 0, max: 30 },
    time: 12,
    corruption: null,
    policies: null,
    election: null,
    events: null,
    needs: null,
    politics: null,
    trade: null,
    economy: null,
    unlockedZones: [],
    food: { pool: 200, consumption: 0, buffer: 0 },
    debt: null,
    rank: {
      score: 0,
      history: [],
      lastRankId: 1,
      previousDayStats: null
    },
    // Missile Warfare System (v7)
    missiles: {
      outgoing: [],    // Active outgoing missiles
      incoming: [],    // Active incoming missiles (simulated attacks)
      history: []      // Last 50 missile events
    },
    warState: {
      attacksMade: [],           // Track attacks for spam detection
      attacksReceived: [],       // Track received attacks
      lastAttackTime: 0,         // Timestamp of last attack made
      lastRetaliationTime: 0,    // Timestamp of last retaliation
      trustPenalties: 0,         // Accumulated trust penalties
      rankPenalties: 0,          // Accumulated rank penalties
      dailyAttackCount: 0,       // Attacks made today
      dailyAttackReset: 0,       // Day when daily count resets
      weeklyAttacks: [],         // Attacks this week for weekly limit
      lastLoginTime: Date.now()  // For offline protection
    },
    missileInventory: {          // Player's missile stock
      basic: 0,
      precision: 0,
      ballistic: 0,
      mirv: 0,
      interceptor: 0
    },
    scoutHistory: []             // Scanned enemy coordinates
  };
}
