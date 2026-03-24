/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/wreckBuildings.js

   WRECK BUILDING SYSTEM
   ─────────────────────────────────────────────────────────────
   When a zone is purchased, 2–3 derelict (wreck) buildings are
   spawned within its bounds. Wrecks have level 0 and contribute
   nothing until the player pays a repair cost to restore them
   to level 1, after which they can be upgraded normally.

   A wreck is a standard Building instance with extra fields:
     b.isWreck        = true
     b.originalType   = the real building type (e.g. 'farm')
     b.level          = 0   (no production, no occupancy)

   EXPORTS
   ─────────────────────────────────────────────────────────────
   getRandomBuildingTypeForZone(zoneKey)  — picks from allowedBuildings
   getRepairCost(buildingType)            — 50% of original shopCost
   spawnWrecksForZone(zoneKey, VS, VW, VH) — creates 2–3 wrecks, pushes
                                            to VS.buildings, returns count
═══════════════════════════════════════════════════════════════ */

import { ZONE_DEFS }     from '../world/zones.js';
import { BUILDING_DEFS, Building } from './building.js';
import { randInt, randRange }       from '../utils/perspective.js';

/* Building types that cannot appear as wrecks */
var EXCLUDE_WRECK = ['mainHall', 'bahayBayan'];

/* ── Pick a random building type valid for a zone ────────── */
export function getRandomBuildingTypeForZone(zoneKey) {
  var def = ZONE_DEFS[zoneKey];
  if (!def) return 'house';

  /* sentro allows all buildings (allowedBuildings:null) */
  var pool = def.allowedBuildings
    ? def.allowedBuildings.slice()
    : Object.keys(BUILDING_DEFS).filter(function(k) {
        return BUILDING_DEFS[k].shopCost !== null;
      });

  /* Filter out excluded types */
  pool = pool.filter(function(t) {
    return EXCLUDE_WRECK.indexOf(t) === -1 && BUILDING_DEFS[t];
  });

  if (!pool.length) return 'house';
  return pool[randInt(0, pool.length - 1)];
}

/* ── Repair cost = 50% of original shopCost (rounded up) ── */
export function getRepairCost(buildingType) {
  var def = BUILDING_DEFS[buildingType];
  if (!def || !def.shopCost) return { gold: 40, rice: 10, langis: 0 };
  return {
    gold:   Math.ceil(def.shopCost.gold   * 0.5),
    rice:   Math.ceil(def.shopCost.rice   * 0.5),
    langis: Math.ceil((def.shopCost.langis || 0) * 0.5),
  };
}

/* ── Spawn 2–3 wrecks within a zone's canvas bounds ─────── */
export function spawnWrecksForZone(zoneKey, VS, VW, VH) {
  var def = ZONE_DEFS[zoneKey];
  if (!def) return 0;

  var zW = VW / 3;
  var zH = VH / 3;
  var zx = def.col * zW;   /* zone left edge */
  var zy = def.row * zH;   /* zone top  edge */

  /* Safe inner margin so wrecks don't sit right on zone borders */
  var PAD = 0.14;
  var innerX0 = zx + zW * PAD;
  var innerX1 = zx + zW * (1 - PAD);
  var innerY0 = zy + zH * PAD;
  var innerY1 = zy + zH * (1 - PAD);

  var count = randInt(2, 3);

  for (var i = 0; i < count; i++) {
    var btype = getRandomBuildingTypeForZone(zoneKey);
    var bdef  = BUILDING_DEFS[btype];
    if (!bdef) continue;

    var wx = randRange(innerX0, innerX1);
    var wy = randRange(innerY0, innerY1);

    /* Use Building class so draw(), getStats() etc all work */
    var wreck          = new Building(btype, wx, wy);
    wreck.level        = 0;          /* level 0 = no production */
    wreck.isWreck      = true;
    wreck.originalType = btype;

    VS.buildings.push(wreck);
  }

  return count;
}