/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — attack/attackUtils.js
   
   Utility functions for attack mode:
   - Building placement validation
   - Overlap detection
   - Random name generation
   - Waypoint generation
═══════════════════════════════════════════════════════════════ */

import { BUILDING_DEFS } from '../buildings/building.js';
import { DEF_WORLD_W, DEF_WORLD_H } from './attack.js';

/* ═══════════════════════════════════════════════════════════════
   Building Placement Helpers
═══════════════════════════════════════════════════════════════ */
export function checkBuildingOverlap(buildings, cx, cy, w, h) {
    for (var i = 0; i < buildings.length; i++) {
        var b = buildings[i];
        var bw = BUILDING_DEFS[b.type] ? BUILDING_DEFS[b.type].w : b.w;
        var bh = BUILDING_DEFS[b.type] ? BUILDING_DEFS[b.type].h : b.h;
        
        if (Math.abs(b.x - cx) < (bw + w) * 0.55 &&
            Math.abs(b.y - cy) < (bh + h) * 0.55) {
            return true;
        }
    }
    return false;
}

export function isValidBuildingPosition(buildings, type, x, y, existingBuildings) {
    var def = BUILDING_DEFS[type];
    if (!def) return false;
    
    var padding = 28;
    return !checkBuildingOverlap(buildings, x, y, def.w + padding, def.h + padding);
}

/* ═══════════════════════════════════════════════════════════════
   Random Name Generation
═══════════════════════════════════════════════════════════════ */
var MALE_NAMES = [
    'Jose','Pedro','Juan','Miguel','Carlos','Antonio','Roberto',
    'Eduardo','Fernando','Mario','Ramon','Luis','Manuel','Diego'
];
var FEMALE_NAMES = [
    'Maria','Ana','Rosa','Elena','Carmen','Luz','Gloria','Nena',
    'Lita','Cora','Perla','Delia','Norma','Alma','Linda'
];
var SURNAMES = [
    'Reyes','Cruz','Santos','Garcia','Torres','Flores','Ramos','Dela Cruz',
    'Aquino','Mendoza','Lopez','Ocampo','Castillo','Bautista','Villanueva'
];

export function getRandomName() {
    var gender = Math.random() < 0.5 ? 'male' : 'female';
    var first = gender === 'male' 
        ? MALE_NAMES[Math.floor(Math.random() * MALE_NAMES.length)]
        : FEMALE_NAMES[Math.floor(Math.random() * FEMALE_NAMES.length)];
    var surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
    return first + ' ' + surname;
}

export function getRandomVillageName() {
    var names = [
        'Nayon ng Bagumbayan','Barangay Masagana','Nayon ng Dalisay',
        'Barangay Magiting','Nayon ng Tagumpay','Barangay Malakas',
        'Nayon ng Bayani','Barangay Maliwanag','Nayon ng Kalayaan','Barangay Mabuti'
    ];
    return names[Math.floor(Math.random() * names.length)];
}

export function getRandomLeaderName() {
    var leaders = [
        'Datu Maginoo','Pinuno Matapang','Lakan Bayani',
        'Datu Malusog','Rajah Mabait','Pinuno Matalino'
    ];
    return leaders[Math.floor(Math.random() * leaders.length)];
}

/* ═══════════════════════════════════════════════════════════════
   Waypoint Generation
═══════════════════════════════════════════════════════════════ */
export function generateWaypoints(buildings) {
    var waypoints = { all: [], mines: [], buildings: [] };
    var W = DEF_WORLD_W;
    var H = DEF_WORLD_H;
    
    // Grid waypoints
    for (var gy = 0.12; gy <= 0.88; gy += 0.13) {
        for (var gx = 0.08; gx <= 0.92; gx += 0.10) {
            waypoints.all.push({ wx: W * gx, wy: H * gy });
        }
    }
    
    // Building waypoints
    buildings.forEach(function(b) {
        waypoints.buildings.push({ wx: b.x, wy: b.y + 22 });
        waypoints.all.push({ wx: b.x, wy: b.y + 22 });
    });
    
    return waypoints;
}

/* ═══════════════════════════════════════════════════════════════
   Village Level Configuration
═══════════════════════════════════════════════════════════════ */
export function getBuildingRosterForLevel(level) {
    var roster = ['mainHall', 'house', 'house', 'farm', 'farm', 'palengke', 'storage'];
    
    if (level >= 2) {
        roster = roster.concat(['kuta', 'kuta', 'mine', 'moog', 'moog']);
    }
    if (level >= 3) {
        roster = roster.concat(['bantayan', 'moog', 'templo', 'kuta', 'house', 'pulisya']);
    }
    if (level >= 4) {
        roster = roster.concat(['bantayan', 'moog', 'moog', 'kuta', 'cuartel', 'paaralan', 'bantayan', 'ospital', 'minalangis']);
    }
    
    return roster;
}

export function getBuildingLevelForDifficulty(villageLevel, buildingType) {
    // Main hall matches village level
    if (buildingType === 'mainHall') return villageLevel;
    
    // Defence buildings get higher levels
    var defTypes = ['moog', 'bantayan', 'kuta', 'pulisya', 'cuartel'];
    if (defTypes.indexOf(buildingType) >= 0) {
        return Math.min(villageLevel, Math.max(1, Math.floor(villageLevel * 0.7 + Math.random())));
    }
    
    // Economy buildings get lower levels
    return Math.min(villageLevel, Math.max(1, Math.floor(villageLevel * 0.5 + Math.random())));
}