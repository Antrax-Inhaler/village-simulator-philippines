/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — world/roads.js
   Organic Road System - SMALLER roads (2x smaller) with rounded corners
   Roads appear on unlocked expansion stages only
═══════════════════════════════════════════════════════════════ */

import { WORLD_W, WORLD_H } from '../render/camera.js';

/* Road Configuration - 2x SMALLER than before */
export var ROAD_CONFIG = {
  width: 11,              /* Road width: 22px → 11px (2x smaller) */
  mainRoadWidth: 14,      /* Main roads: 28px → 14px (2x smaller) */
  spacing: 180,           /* Distance between main roads */
  color: '#CDBE9F',       /* Road base color - warm beige */
  borderColor: '#B5A585', /* Road border - darker beige */
  dashColor: 'rgba(140,120,90,0.5)',  /* Center dashed line - darker for contrast */
  edgeColor: 'rgba(221,206,175,0.4)',  /* Road edges - lighter cream (#DDCEAF) */
  cornerRadius: 7,        /* Rounded corner radius (15px → 7px) */
};

/* Define road positions - organic placement */
export var ROADS = {
  horizontal: [],  /* Array of {y, type, width, startX, endX} */
  vertical: [],    /* Array of {x, type, width, startY, endY} */
};

/* Initialize road system with organic placement */
export function initRoads() {
  ROADS.horizontal = [];
  ROADS.vertical = [];
  
  /* Main horizontal roads - fewer, narrower */
  var mainYPositions = [
    WORLD_H * 0.35,
    WORLD_H * 0.50,
    WORLD_H * 0.65,
  ];
  
  mainYPositions.forEach(function(y) {
    ROADS.horizontal.push({
      y: y,
      type: 'main',
      width: ROAD_CONFIG.mainRoadWidth,
    });
  });
  
  /* Main vertical roads */
  var mainXPositions = [
    WORLD_W * 0.35,
    WORLD_W * 0.50,
    WORLD_W * 0.65,
  ];
  
  mainXPositions.forEach(function(x) {
    ROADS.vertical.push({
      x: x,
      type: 'main',
      width: ROAD_CONFIG.mainRoadWidth,
    });
  });
  
  /* Add smaller connecting paths */
  addOrganicPaths();
}

/* Add smaller organic paths between main roads */
function addOrganicPaths() {
  var smallPaths = [
    /* Horizontal small paths */
    { type: 'h', pos: WORLD_H * 0.42, start: WORLD_W * 0.20, end: WORLD_W * 0.45, width: 9 },
    { type: 'h', pos: WORLD_H * 0.58, start: WORLD_W * 0.55, end: WORLD_W * 0.80, width: 9 },
    
    /* Vertical small paths */
    { type: 'v', pos: WORLD_W * 0.42, start: WORLD_H * 0.25, end: WORLD_H * 0.45, width: 9 },
    { type: 'v', pos: WORLD_W * 0.58, start: WORLD_H * 0.55, end: WORLD_H * 0.75, width: 9 },
  ];
  
  smallPaths.forEach(function(path) {
    if (path.type === 'h') {
      ROADS.horizontal.push({
        y: path.pos,
        type: 'small',
        width: path.width,
        startX: path.start,
        endX: path.end,
      });
    } else {
      ROADS.vertical.push({
        x: path.pos,
        type: 'small',
        width: path.width,
        startY: path.start,
        endY: path.end,
      });
    }
  });
}

/* Check if a point is on a road */
export function isPointOnRoad(wx, wy) {
  var tolerance = 8; /* Smaller tolerance for narrower roads */
  
  /* Check horizontal roads */
  for (var i = 0; i < ROADS.horizontal.length; i++) {
    var road = ROADS.horizontal[i];
    var halfWidth = (road.width || ROAD_CONFIG.width) / 2;
    
    if (road.startX !== undefined && road.endX !== undefined) {
      if (wx >= road.startX && wx <= road.endX) {
        if (wy >= road.y - halfWidth && wy <= road.y + halfWidth) {
          return true;
        }
      }
    } else {
      if (wy >= road.y - halfWidth && wy <= road.y + halfWidth) {
        return true;
      }
    }
  }
  
  /* Check vertical roads */
  for (var j = 0; j < ROADS.vertical.length; j++) {
    var vRoad = ROADS.vertical[j];
    var halfWidth = (vRoad.width || ROAD_CONFIG.width) / 2;
    
    if (vRoad.startY !== undefined && vRoad.endY !== undefined) {
      if (wy >= vRoad.startY && wy <= vRoad.endY) {
        if (wx >= vRoad.x - halfWidth && wx <= vRoad.x + halfWidth) {
          return true;
        }
      }
    } else {
      if (wx >= vRoad.x - halfWidth && wx <= vRoad.x + halfWidth) {
        return true;
      }
    }
  }
  
  return false;
}

/* Get building slot for a position */
export function getBuildingSlot(wx, wy) {
  var minHDist = Infinity, minVDist = Infinity;
  var nearestH = null, nearestV = null;
  
  ROADS.horizontal.forEach(function(road) {
    var dist = Math.abs(wy - road.y);
    if (dist < minHDist) {
      minHDist = dist;
      nearestH = road;
    }
  });
  
  ROADS.vertical.forEach(function(road) {
    var dist = Math.abs(wx - road.x);
    if (dist < minVDist) {
      minVDist = dist;
      nearestV = road;
    }
  });
  
  var slot = {
    row: nearestH ? (wy < nearestH.y ? -1 : 1) : 0,
    col: nearestV ? (wx < nearestV.x ? -1 : 1) : 0,
    nearestH: nearestH,
    nearestV: nearestV,
  };
  
  return slot;
}

/* ══════════════════════════════════════════════════════════════
   Draw rounded corner at intersection
   ══════════════════════════════════════════════════════════════ */
function drawRoundedCorner(ctx, x, y, radius, quadrant, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(quadrant * Math.PI / 2);
  
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius, Math.PI, Math.PI * 1.5);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════════
   Draw roads on canvas - organic style with rounded corners
   Only draws on unlocked expansion stages
   ══════════════════════════════════════════════════════════════ */
export function drawRoads(ctx, VS) {
  ctx.save();
  
  /* Get current expansion stage to determine which roads to show */
  var currentStage = VS ? (VS.expansionStages || 0) : 0;
  
  /* Get stage data to know bounds */
  var stageData = null;
  if (typeof EXPANSION_STAGES !== 'undefined') {
    stageData = EXPANSION_STAGES['stage' + currentStage];
  }
  
  /* Helper: Check if road segment is within unlocked area */
  function isRoadUnlocked(x, y) {
    if (!stageData || !stageData.rect) return true;
    return x >= stageData.rect.x1 && x <= stageData.rect.x2 &&
           y >= stageData.rect.y1 && y <= stageData.rect.y2;
  }
  
  /* ── Draw horizontal roads with rounded ends ─────────────── */
  ROADS.horizontal.forEach(function(road) {
    var width = road.width || ROAD_CONFIG.width;
    var halfW = width / 2;
    var cornerRadius = ROAD_CONFIG.cornerRadius;
    
    /* Determine draw bounds */
    var startX = road.startX !== undefined ? road.startX : 0;
    var endX = road.endX !== undefined ? road.endX : WORLD_W;
    
    /* Clip to unlocked area */
    if (stageData && stageData.rect) {
      startX = Math.max(startX, stageData.rect.x1);
      endX = Math.min(endX, stageData.rect.x2);
    }
    
    /* Skip if outside unlocked area */
    if (startX >= endX) return;
    
    /* Road base */
    ctx.fillStyle = ROAD_CONFIG.color;
    ctx.fillRect(startX, road.y - halfW, endX - startX, width);
    
    /* Rounded corners at ends */
    ctx.fillStyle = ROAD_CONFIG.color;
    
    /* Left end cap (rounded) */
    ctx.beginPath();
    ctx.arc(startX, road.y, halfW, Math.PI * 0.5, Math.PI * 1.5);
    ctx.closePath();
    ctx.fill();
    
    /* Right end cap (rounded) */
    ctx.beginPath();
    ctx.arc(endX, road.y, halfW, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
    ctx.fill();
    
    /* Road edges - THINNER for smaller roads */
    ctx.strokeStyle = ROAD_CONFIG.edgeColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(startX, road.y - halfW + 1);
    ctx.lineTo(endX, road.y - halfW + 1);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(startX, road.y + halfW - 1);
    ctx.lineTo(endX, road.y + halfW - 1);
    ctx.stroke();
    
    /* Center dashed line for main roads - SMALLER dashes */
    if (road.type === 'main') {
      ctx.strokeStyle = ROAD_CONFIG.dashColor;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 3]);  /* Smaller dashes: 2px on, 3px off */
      ctx.beginPath();
      ctx.moveTo(startX, road.y);
      ctx.lineTo(endX, road.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
  
  /* ── Draw vertical roads with rounded ends ───────────────── */
  ROADS.vertical.forEach(function(road) {
    var width = road.width || ROAD_CONFIG.width;
    var halfW = width / 2;
    var cornerRadius = ROAD_CONFIG.cornerRadius;
    
    /* Determine draw bounds */
    var startY = road.startY !== undefined ? road.startY : 0;
    var endY = road.endY !== undefined ? road.endY : WORLD_H;
    
    /* Clip to unlocked area */
    if (stageData && stageData.rect) {
      startY = Math.max(startY, stageData.rect.y1);
      endY = Math.min(endY, stageData.rect.y2);
    }
    
    /* Skip if outside unlocked area */
    if (startY >= endY) return;
    
    /* Road base */
    ctx.fillStyle = ROAD_CONFIG.color;
    ctx.fillRect(road.x - halfW, startY, width, endY - startY);
    
    /* Rounded corners at ends */
    ctx.fillStyle = ROAD_CONFIG.color;
    
    /* Top end cap (rounded) */
    ctx.beginPath();
    ctx.arc(road.x, startY, halfW, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    
    /* Bottom end cap (rounded) */
    ctx.beginPath();
    ctx.arc(road.x, endY, halfW, Math.PI * 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    
    /* Road edges - THINNER */
    ctx.strokeStyle = ROAD_CONFIG.edgeColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(road.x - halfW + 1, startY);
    ctx.lineTo(road.x - halfW + 1, endY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(road.x + halfW - 1, startY);
    ctx.lineTo(road.x + halfW - 1, endY);
    ctx.stroke();
    
    /* Center dashed line for main roads - SMALLER dashes */
    if (road.type === 'main') {
      ctx.strokeStyle = ROAD_CONFIG.dashColor;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(road.x, startY);
      ctx.lineTo(road.x, endY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
  
  /* ── Draw intersection corners (rounded) ─────────────────── */
  ROADS.horizontal.forEach(function(hRoad) {
    ROADS.vertical.forEach(function(vRoad) {
      var ix = vRoad.x;
      var iy = hRoad.y;
      
      /* Check if intersection is in unlocked area */
      if (!isRoadUnlocked(ix, iy)) return;
      
      var hHalfW = (hRoad.width || ROAD_CONFIG.width) / 2;
      var vHalfW = (vRoad.width || ROAD_CONFIG.width) / 2;
      var cornerRadius = Math.min(hHalfW, vHalfW, ROAD_CONFIG.cornerRadius);
      
      /* Draw filled corner at each quadrant */
      ctx.fillStyle = ROAD_CONFIG.color;
      
      /* Top-right quadrant */
      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.arc(ix, iy, cornerRadius, Math.PI * 1.5, Math.PI * 2);
      ctx.lineTo(ix + vHalfW, iy);
      ctx.lineTo(ix + vHalfW, iy - hHalfW);
      ctx.lineTo(ix, iy - hHalfW);
      ctx.closePath();
      ctx.fill();
      
      /* Bottom-right quadrant */
      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.arc(ix, iy, cornerRadius, Math.PI * 2, Math.PI * 0.5);
      ctx.lineTo(ix + vHalfW, iy);
      ctx.lineTo(ix + vHalfW, iy + hHalfW);
      ctx.lineTo(ix, iy + hHalfW);
      ctx.closePath();
      ctx.fill();
      
      /* Bottom-left quadrant */
      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.arc(ix, iy, cornerRadius, Math.PI * 0.5, Math.PI);
      ctx.lineTo(ix - vHalfW, iy);
      ctx.lineTo(ix - vHalfW, iy + hHalfW);
      ctx.lineTo(ix, iy + hHalfW);
      ctx.closePath();
      ctx.fill();
      
      /* Top-left quadrant */
      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.arc(ix, iy, cornerRadius, Math.PI, Math.PI * 1.5);
      ctx.lineTo(ix - vHalfW, iy);
      ctx.lineTo(ix - vHalfW, iy - hHalfW);
      ctx.lineTo(ix, iy - hHalfW);
      ctx.closePath();
      ctx.fill();
    });
  });
  
  ctx.restore();
}

/* Snap position to nearest building area */
export function snapToSlot(wx, wy) {
  var minHDist = Infinity, minVDist = Infinity;
  var nearestH = null, nearestV = null;
  
  ROADS.horizontal.forEach(function(road) {
    var dist = Math.abs(wy - road.y);
    if (dist < minHDist) {
      minHDist = dist;
      nearestH = road;
    }
  });
  
  ROADS.vertical.forEach(function(road) {
    var dist = Math.abs(wx - road.x);
    if (dist < minVDist) {
      minVDist = dist;
      nearestV = road;
    }
  });
  
  var slotX = wx;
  var slotY = wy;
  
  if (nearestH) {
    var halfRoadH = (nearestH.width || ROAD_CONFIG.width) / 2;
    var snapDist = 45;
    
    if (wy < nearestH.y) {
      slotY = nearestH.y - halfRoadH - snapDist;
    } else {
      slotY = nearestH.y + halfRoadH + snapDist;
    }
  }
  
  if (nearestV) {
    var halfRoadV = (nearestV.width || ROAD_CONFIG.width) / 2;
    var snapDist = 45;
    
    if (wx < nearestV.x) {
      slotX = nearestV.x - halfRoadV - snapDist;
    } else {
      slotX = nearestV.x + halfRoadV + snapDist;
    }
  }
  
  return { x: slotX, y: slotY };
}

/* Get available building areas */
export function getAvailableSlots(buildings) {
  var slots = [];
  var minDist = 70;
  
  for (var row = 0; row < 4; row++) {
    for (var col = 0; col < 4; col++) {
      var baseX = WORLD_W * (0.15 + col * 0.25);
      var baseY = WORLD_H * (0.15 + row * 0.25);
      
      var x = baseX + (Math.random() - 0.5) * 30;
      var y = baseY + (Math.random() - 0.5) * 25;
      
      if (!isPointOnRoad(x, y)) {
        var tooClose = buildings.some(function(b) {
          var dx = b.x - x;
          var dy = b.y - y;
          return Math.sqrt(dx * dx + dy * dy) < minDist;
        });
        
        if (!tooClose) {
          slots.push({ x: x, y: y, row: row, col: col });
        }
      }
    }
  }
  
  return slots;
}

/* Check if road segment should be visible based on expansion stage */
export function isRoadVisible(road, VS) {
  if (!VS || !VS.expansionStages) return true;
  
  var currentStage = VS.expansionStages;
  var stageData = EXPANSION_STAGES['stage' + currentStage];
  
  if (!stageData || !stageData.rect) return true;
  
  if (road.type === 'h' || road.y !== undefined) {
    var y = road.y;
    return y >= stageData.rect.y1 && y <= stageData.rect.y2;
  } else {
    var x = road.x;
    return x >= stageData.rect.x1 && x <= stageData.rect.x2;
  }
}

/* ══════════════════════════════════════════════════════════════
   USAGE
   ──────────────────────────────────────────────────────────────
   renderer.js — after drawGround():
     import { drawRoads, initRoads } from '../world/roads.js';
     initRoads();
     drawRoads(ctx, VS);

   building.js / canPlaceBuilding():
     import { isPointOnRoad, snapToSlot } from '../world/roads.js';
     if (isPointOnRoad(wx, wy)) return { ok:false, msg:'Nasa daan!' };
     var snapped = snapToSlot(wx, wy);
══════════════════════════════════════════════════════════════ */