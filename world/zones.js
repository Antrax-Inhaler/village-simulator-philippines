/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — world/zones.js

   9-ZONE LAND GRID SYSTEM
   ─────────────────────────────────────────────────────────────
   GRID LAYOUT (col, row):
     [0,0] Kagubatan  │ [1,0] Tabing-Dagat │ [2,0] Lungsod
     [0,1] Bukid      │ [1,1] SENTRO ★     │ [2,1] Bundok
     [0,2] Depensa    │ [1,2] Langis        │ [2,2] Kalye
═══════════════════════════════════════════════════════════════ */

import { clamp } from '../utils/perspective.js';
import { spawnWrecksForZone } from '../buildings/wreckBuildings.js';
import { WORLD_W, WORLD_H } from '../render/camera.js';

/* Use fixed world dimensions for all zone calculations */
var _WW = WORLD_W;
var _WH = WORLD_H;

export var ZONE_DEFS = {

  sentro: {
    col:1, row:1, label:'Sentro ng Nayon', icon:'🏘️',
    desc:'Pangunahing lugar ng nayon. Lahat ng basic na gusali.',
    specialty:'base', wallColor:'#2a3a1a',
    gridColor:'rgba(100,160,60,0.18)', borderColor:'#4a6a2a',
    free:true, cost:{gold:0,rice:0,langis:0}, prereqHall:2,
    allowedBuildings:null, resourceBonus:{},
    flavorHint:'Palaging available.', sign:'★ SENTRO',
  },

  dagat: {
    col:1, row:0, label:'Tabing-Dagat', icon:'🌊',
    desc:'Baybayin na mayaman sa isda. Mag-export at mag-import.',
    specialty:'fishing', wallColor:'#0a1a3a',
    gridColor:'rgba(30,80,180,0.18)', borderColor:'#1a4a8a',
    free:false, cost:{gold:600,rice:0,langis:0}, prereqHall:5,
    allowedBuildings:['daungan','palengke','kalye'],
    resourceBonus:{rice:1.5},
    flavorHint:'Hall Lv2.', sign:'🌊 DAGAT',
  },

  kalikasan: {
    col:0, row:0, label:'Kagubatan', icon:'🌿',
    desc:'Makapal na kagubatan. Kahoy, halamang gamot, at langis.',
    specialty:'forest', wallColor:'#0a2a0a',
    gridColor:'rgba(30,120,30,0.18)', borderColor:'#1a6a1a',
    free:false, cost:{gold:400,rice:50,langis:0}, prereqHall:3,
    allowedBuildings:['farm','ospital'],
    resourceBonus:{rice:1.3,langis:1.2},
    flavorHint:'Hall Lv1.', sign:'🌿 KAGUBATAN',
  },

  lungsod: {
    col:2, row:0, label:'Lungsod', icon:'🏙️',
    desc:'Urban na lugar para sa negosyo, edukasyon, at gobyerno.',
    specialty:'urban', wallColor:'#1a1a2a',
    gridColor:'rgba(80,80,180,0.18)', borderColor:'#3a3a8a',
    free:false, cost:{gold:1000,rice:300,langis:100}, prereqHall:6,
    allowedBuildings:['paaralan','hukuman','templo','ospital','pulisya','house'],
    resourceBonus:{gold:1.5},
    flavorHint:'Hall Lv3.', sign:'🏙️ LUNGSOD',
  },

  bukid: {
    col:0, row:1, label:'Bukid ng Kanluran', icon:'🌾',
    desc:'Masaganang lupa para sa pagsasaka. +100% produksyon ng bigas.',
    specialty:'farm', wallColor:'#1a2a0a',
    gridColor:'rgba(80,160,20,0.18)', borderColor:'#2a6a0a',
    free:false, cost:{gold:300,rice:100,langis:0}, prereqHall:1,
    allowedBuildings:['farm','storage'],
    resourceBonus:{rice:2.0},
    flavorHint:'Hall Lv1.', sign:'🌾 BUKID',
  },

  bundok: {
    col:2, row:1, label:'Bundok ng Silangan', icon:'⛰️',
    desc:'Mabatong lugar na mayaman sa mineral. +80% produksyon ng ginto.',
    specialty:'mining', wallColor:'#2a1a0a',
    gridColor:'rgba(160,100,30,0.18)', borderColor:'#6a3a0a',
    free:false, cost:{gold:500,rice:150,langis:0}, prereqHall:3,
    allowedBuildings:['mine','cuartel','bantayan','kuta','storage'],
    resourceBonus:{gold:1.8},
    flavorHint:'Hall Lv2.', sign:'⛰️ BUNDOK',
  },

  depensa: {
    col:0, row:2, label:'Kuta ng Depensa', icon:'🛡️',
    desc:'Estratehikong lugar para sa pagtatanggol ng nayon.',
    specialty:'defence', wallColor:'#2a0a0a',
    gridColor:'rgba(160,40,40,0.18)', borderColor:'#6a1a1a',
    free:false, cost:{gold:700,rice:200,langis:50}, prereqHall:1,
    allowedBuildings:['cuartel','bantayan','kuta','muog'],
    resourceBonus:{},
    flavorHint:'Hall Lv2.', sign:'🛡️ DEPENSA',
  },

  langis: {
    col:1, row:2, label:'Langis na Lupa', icon:'🛢️',
    desc:'Mayaman sa langis ang ilalim ng lupa. +200% produksyon ng langis.',
    specialty:'oil', wallColor:'#1a1208',
    gridColor:'rgba(120,80,20,0.22)', borderColor:'#5a3a08',
    free:false, cost:{gold:800,rice:200,langis:0}, prereqHall:4,
    allowedBuildings:['muog','storage'],
    resourceBonus:{langis:3.0},
    flavorHint:'Hall Lv2.', sign:'🛢️ LANGIS',
  },

  kalye: {
    col:2, row:2, label:'Kalye at Kalakalan', icon:'🚢',
    desc:'Angkop sa kalakalan. +100% kita sa mga exports.',
    specialty:'trade', wallColor:'#0a1a2a',
    gridColor:'rgba(30,120,160,0.18)', borderColor:'#0a4a6a',
    free:false, cost:{gold:900,rice:250,langis:80}, prereqHall:7,
    allowedBuildings:['palengke','daungan','kalye','storage'],
    resourceBonus:{gold:2.0},
    flavorHint:'Hall Lv3.', sign:'🚢 KALYE',
  },
};

/* ── Get which zone a world point falls into ──────────────── */
export function getZoneAt(wx, wy, VW, VH) {
  /* Always use fixed world dimensions — passed VW/VH kept for API compat */
  var col = clamp(Math.floor(wx / (_WW / 3)), 0, 2);
  var row = clamp(Math.floor(wy / (_WH / 3)), 0, 2);
  for (var key in ZONE_DEFS) {
    var z = ZONE_DEFS[key];
    if (z.col === col && z.row === row) return key;
  }
  return 'sentro';
}

export function isZoneUnlocked(key, VS) {
  if (ZONE_DEFS[key] && ZONE_DEFS[key].free) return true;
  return !!(VS.unlockedZones && VS.unlockedZones.indexOf(key) !== -1);
}

export function canBuildInZone(bldType, wx, wy, VW, VH, VS) {
  var key = getZoneAt(wx, wy, VW, VH);
  if (!isZoneUnlocked(key, VS)) return { ok: false, msg: 'I-unlock muna ang ' + (ZONE_DEFS[key]||{label:'zone'}).label + '.' };
  var z = ZONE_DEFS[key];
  if (!z) return { ok: true };
  if (z.allowedBuildings === null) return { ok: true };
  if (z.allowedBuildings.indexOf(bldType) === -1) {
    return { ok: false, msg: 'Hindi pwede ang ' + bldType + ' sa ' + z.label + '. Espesyalidad: ' + z.specialty + '.' };
  }
  return { ok: true };
}

/* ── Purchase a zone ──────────────────────────────────────── */
export function purchaseZone(key, VS, notifyFn, VW, VH) {
  var def = ZONE_DEFS[key];
  if (!def) return { ok:false, msg:'Hindi kilala ang zone.' };
  if (def.free) return { ok:false, msg:'Sentro ay palaging libre.' };
  if (isZoneUnlocked(key, VS)) return { ok:false, msg:def.label+' ay na-unlock na!' };

  var mhLv = 1;
  (VS.buildings || []).forEach(function(b) { if (b.type === 'mainHall') mhLv = Math.max(mhLv, b.level); });
  if (mhLv < def.prereqHall) {
    return { ok:false, msg:'Kailangan ng Hall Lv'+def.prereqHall+' para sa '+def.label+'.' };
  }
  if ((VS.res.gold||0) < def.cost.gold || (VS.res.rice||0) < def.cost.rice || (VS.res.langis||0) < def.cost.langis) {
    return { ok:false, msg:'Kulang! Kailangan: '+def.cost.gold+'🪙 '+def.cost.rice+'🌾'+(def.cost.langis?' '+def.cost.langis+'💧':'') };
  }

  VS.res.gold   -= def.cost.gold;
  VS.res.rice   -= def.cost.rice;
  VS.res.langis -= def.cost.langis;
  if (!VS.unlockedZones) VS.unlockedZones = [];
  VS.unlockedZones.push(key);

  /* Spawn 2–3 wreck buildings inside the newly unlocked zone */
  var wreckCount = spawnWrecksForZone(key, VS, _WW, _WH);

  var msg = def.icon + ' ' + def.label + ' na-unlock! ' +
            wreckCount + ' na sirang gusali ang natagpuan.';
  if (notifyFn) notifyFn(msg);
  return { ok:true, msg:msg, def:def };
}

/* ── Apply zone resource bonus to production ──────────────── */
export function getZoneProductionMult(res, wx, wy, VW, VH, VS) {
  /* Always resolve zones against fixed world dimensions */
  var key = getZoneAt(wx, wy, _WW, _WH);
  if (!isZoneUnlocked(key, VS)) return 1.0;
  var z = ZONE_DEFS[key];
  return (z && z.resourceBonus && z.resourceBonus[res]) ? z.resourceBonus[res] : 1.0;
}

/* ═══════════════════════════════════════════════════════════════
   drawZoneGrid — canvas overlay, called from renderer each frame.
   Always draws in fixed world space (WORLD_W × WORLD_H).
   The camera transform already maps world → screen, so we just
   draw at world coordinates and the camera handles the rest.
═══════════════════════════════════════════════════════════════ */
export function drawZoneGrid(ctx, VW, VH, VS) {
  /* Use fixed world dimensions — VW/VH kept for API compat only */
  var zW = _WW / 3;
  var zH = _WH / 3;

  /* ── Helper: is the zone at (col, row) owned? ───────────── */
  function _ownedAt(col, row) {
    if (col < 0 || col > 2 || row < 0 || row > 2) return false;
    for (var k in ZONE_DEFS) {
      var z = ZONE_DEFS[k];
      if (z.col === col && z.row === row) return isZoneUnlocked(k, VS);
    }
    return false;
  }

  /* ── Pass 1: Tinted fills for owned zones ───────────────── */
  Object.keys(ZONE_DEFS).forEach(function(key) {
    var z = ZONE_DEFS[key];
    if (!isZoneUnlocked(key, VS)) return;
    var x = z.col * zW, y = z.row * zH;
    ctx.save();
    ctx.fillStyle = z.gridColor;
    ctx.fillRect(x, y, zW, zH);
    ctx.restore();
  });

  /* ── Pass 2: Conditional border lines ───────────────────────
     For each internal grid edge (shared between two cells),
     draw a visible boundary line only when one side is owned
     and the other is NOT. Adjacent owned zones share no line,
     creating a single merged territory appearance.
     Also draw the four outer canvas edges of any owned zone
     that sits on the canvas border.
  ──────────────────────────────────────────────────────────── */
  ctx.save();
  ctx.lineWidth = 2;
  ctx.setLineDash([]);

  /* Internal vertical edges: between col 0–1 and col 1–2 */
  for (var vc = 0; vc < 2; vc++) {        /* vc = left column of the edge */
    for (var vr = 0; vr < 3; vr++) {
      var leftOwned  = _ownedAt(vc,     vr);
      var rightOwned = _ownedAt(vc + 1, vr);
      if (leftOwned === rightOwned) continue; /* same state — no line */
      /* Ownership changes across this edge — draw it */
      var ex = (vc + 1) * zW;
      var ey0 = vr * zH, ey1 = (vr + 1) * zH;
      /* Use the border colour of whichever side is owned */
      var ownedKey = null;
      for (var k in ZONE_DEFS) {
        var zz = ZONE_DEFS[k];
        if (zz.col === (leftOwned ? vc : vc + 1) && zz.row === vr) { ownedKey = k; break; }
      }
      ctx.strokeStyle = ownedKey ? ZONE_DEFS[ownedKey].borderColor : 'rgba(80,50,15,0.35)';
      ctx.beginPath();
      ctx.moveTo(ex, ey0);
      ctx.lineTo(ex, ey1);
      ctx.stroke();
    }
  }

  /* Internal horizontal edges: between row 0–1 and row 1–2 */
  for (var hr = 0; hr < 2; hr++) {        /* hr = top row of the edge */
    for (var hc = 0; hc < 3; hc++) {
      var topOwned    = _ownedAt(hc, hr);
      var bottomOwned = _ownedAt(hc, hr + 1);
      if (topOwned === bottomOwned) continue;
      var ey = (hr + 1) * zH;
      var ex0 = hc * zW, ex1 = (hc + 1) * zW;
      var ownedKey2 = null;
      for (var k2 in ZONE_DEFS) {
        var zz2 = ZONE_DEFS[k2];
        if (zz2.col === hc && zz2.row === (topOwned ? hr : hr + 1)) { ownedKey2 = k2; break; }
      }
      ctx.strokeStyle = ownedKey2 ? ZONE_DEFS[ownedKey2].borderColor : 'rgba(80,50,15,0.35)';
      ctx.beginPath();
      ctx.moveTo(ex0, ey);
      ctx.lineTo(ex1, ey);
      ctx.stroke();
    }
  }

  /* Outer canvas edges for owned border zones */
  Object.keys(ZONE_DEFS).forEach(function(key) {
    var z = ZONE_DEFS[key];
    if (!isZoneUnlocked(key, VS)) return;
    var x = z.col * zW, y = z.row * zH;
    ctx.strokeStyle = z.borderColor;
    ctx.lineWidth   = 2;
    /* Top edge of world */
    if (z.row === 0) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + zW, 0); ctx.stroke(); }
    /* Bottom edge of world */
    if (z.row === 2) { ctx.beginPath(); ctx.moveTo(x, _WH); ctx.lineTo(x + zW, _WH); ctx.stroke(); }
    /* Left edge of world */
    if (z.col === 0) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(0, y + zH); ctx.stroke(); }
    /* Right edge of world */
    if (z.col === 2) { ctx.beginPath(); ctx.moveTo(_WW, y); ctx.lineTo(_WW, y + zH); ctx.stroke(); }
  });

  ctx.restore();
}


/* ═══════════════════════════════════════════════════════════════
   drawZoneArrows — rustic wooden signpost with arrow pointing right.
   Called from renderer each frame, AFTER drawZoneGrid.
   Draws in world-space (camera transform already applied).

   Shows a weathered wooden signpost with a horizontal arrow board
   pointing right, indicating that the zone is available for purchase.
   Only appears for zones that are purchasable (hall requirement met
   and resources sufficient).
═══════════════════════════════════════════════════════════════ */
export function drawZoneArrows(ctx, VW, VH, VS) {
  var now    = performance.now();
  var zW     = _WW / 3;
  var zH     = _WH / 3;

  /* Current main-hall level */
  var mhLv = 1;
  (VS.buildings || []).forEach(function(b) {
    if (b.type === 'mainHall') mhLv = Math.max(mhLv, b.level || 1);
  });

  Object.keys(ZONE_DEFS).forEach(function(key) {
    var z = ZONE_DEFS[key];

    /* Skip sentro (free) and already-unlocked zones */
    if (z.free) return;
    if (isZoneUnlocked(key, VS)) return;

    /* Determine if zone is available for purchase */
    var hallOk = mhLv >= (z.prereqHall || 1);
    var canAfford = hallOk &&
      (VS.res.gold  || 0) >= z.cost.gold &&
      (VS.res.rice  || 0) >= z.cost.rice &&
      (VS.res.langis|| 0) >= z.cost.langis;
    
    /* Only show indicator if zone is actually purchasable */
    if (!canAfford) return;

    /* Zone center world coords */
    var cx = (z.col + 0.5) * zW;
    var cy = (z.row + 0.5) * zH;
    
    /* Position near the center of the zone */
    var baseX = cx;
    var baseY = cy - 12;

    /* Gentle bounce animation */
    var bounce = Math.sin(now / 520) * 2;
    var postY = baseY + bounce;

    /* ── Draw rustic wooden signpost with arrow pointing right ── */
    ctx.save();
    ctx.shadowBlur = 0;
    
    /* Dimensions */
    var postW = 6;
    var postH = 42;
    var boardW = 38;
    var boardH = 12;
    var arrowTipLen = 10;
    
    /* Wood colors - warm browns */
    var woodBase = '#8B5A2B';
    var woodMid = '#A0522D';
    var woodLight = '#C67B3A';
    var woodDark = '#6B3E1A';
    
    /* ── VERTICAL POST (support) ──────────────────────────────── */
    /* Create gradient for post - darker on edges */
    var postGrad = ctx.createLinearGradient(baseX - postW/2, postY, baseX + postW/2, postY);
    postGrad.addColorStop(0, woodDark);
    postGrad.addColorStop(0.3, woodBase);
    postGrad.addColorStop(0.7, woodBase);
    postGrad.addColorStop(1, woodDark);
    ctx.fillStyle = postGrad;
    
    /* Post with slightly uneven edges */
    ctx.beginPath();
    ctx.moveTo(baseX - postW/2 - 0.5, postY);
    ctx.lineTo(baseX + postW/2 + 0.5, postY);
    ctx.lineTo(baseX + postW/2, postY + postH);
    ctx.lineTo(baseX - postW/2, postY + postH);
    ctx.closePath();
    ctx.fill();
    
    /* Vertical wood grain lines */
    ctx.strokeStyle = woodDark;
    ctx.lineWidth = 0.6;
    for (var vg = -2; vg <= 2; vg++) {
      ctx.beginPath();
      ctx.moveTo(baseX + vg * 1.2, postY + 4);
      ctx.lineTo(baseX + vg * 1.2, postY + postH - 4);
      ctx.stroke();
    }
    
    /* Small cracks in post */
    ctx.beginPath();
    ctx.moveTo(baseX - 1, postY + 12);
    ctx.lineTo(baseX - 2, postY + 18);
    ctx.lineTo(baseX - 1, postY + 24);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(baseX + 1, postY + 28);
    ctx.lineTo(baseX + 2, postY + 34);
    ctx.lineTo(baseX + 1, postY + 38);
    ctx.stroke();
    
    /* ── HORIZONTAL ARROW BOARD (pointing right) ───────────────── */
    var boardX = baseX - boardW/3;  /* Offset to left so arrow extends right */
    var boardY = postY + 10;
    
    /* Gradient for board */
    var boardGrad = ctx.createLinearGradient(boardX, boardY, boardX + boardW + arrowTipLen, boardY);
    boardGrad.addColorStop(0, woodDark);
    boardGrad.addColorStop(0.2, woodBase);
    boardGrad.addColorStop(0.6, woodMid);
    boardGrad.addColorStop(1, woodLight);
    ctx.fillStyle = boardGrad;
    
    /* Draw board body with broken left end and arrow tip right end */
    ctx.beginPath();
    /* Start at broken left end (irregular) */
    ctx.moveTo(boardX - 3, boardY + boardH/2);
    /* Jagged left edge */
    ctx.lineTo(boardX - 1, boardY + 2);
    ctx.lineTo(boardX, boardY + 4);
    ctx.lineTo(boardX + 2, boardY + 1);
    ctx.lineTo(boardX + 4, boardY + 3);
    /* Top edge of board */
    ctx.lineTo(boardX + boardW, boardY);
    /* Arrow tip top slope */
    ctx.lineTo(boardX + boardW + arrowTipLen, boardY + boardH/2);
    /* Arrow tip bottom slope */
    ctx.lineTo(boardX + boardW, boardY + boardH);
    /* Bottom edge of board (with slight irregularities) */
    ctx.lineTo(boardX + 2, boardY + boardH - 1);
    ctx.lineTo(boardX, boardY + boardH - 3);
    ctx.lineTo(boardX - 1, boardY + boardH - 5);
    ctx.lineTo(boardX - 2, boardY + boardH - 2);
    ctx.closePath();
    ctx.fill();
    
    /* Add nail/attachment detail where board meets post */
    ctx.fillStyle = '#4A3A2A';
    ctx.beginPath();
    ctx.arc(baseX, boardY + boardH/2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8B6B3A';
    ctx.beginPath();
    ctx.arc(baseX, boardY + boardH/2, 1, 0, Math.PI * 2);
    ctx.fill();
    
    /* Horizontal wood grain on arrow board */
    ctx.strokeStyle = woodDark;
    ctx.lineWidth = 0.8;
    for (var hg = 0; hg < 3; hg++) {
      var grainY = boardY + 3 + hg * 3;
      ctx.beginPath();
      ctx.moveTo(boardX + 2, grainY);
      ctx.lineTo(boardX + boardW + arrowTipLen - 4, grainY);
      ctx.stroke();
    }
    
    /* Wavy grain lines for natural look */
    ctx.beginPath();
    ctx.moveTo(boardX + 5, boardY + 6);
    ctx.quadraticCurveTo(boardX + 15, boardY + 7, boardX + 25, boardY + 5);
    ctx.quadraticCurveTo(boardX + 35, boardY + 4, boardX + boardW + arrowTipLen - 5, boardY + 6);
    ctx.stroke();
    
    /* Small cracks in arrow board */
    ctx.beginPath();
    ctx.moveTo(boardX + 12, boardY + 2);
    ctx.lineTo(boardX + 14, boardY + 5);
    ctx.lineTo(boardX + 13, boardY + 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(boardX + 28, boardY + 1);
    ctx.lineTo(boardX + 30, boardY + 4);
    ctx.lineTo(boardX + 29, boardY + 7);
    ctx.stroke();
    
    /* ── Add zone label on a small wooden tag hanging from board ── */
    var tagX = boardX + boardW - 8;
    var tagY = boardY + boardH + 2;
    
    ctx.fillStyle = '#C9A87B';
    ctx.beginPath();
    ctx.rect(tagX, tagY, 22, 10);
    ctx.fill();
    ctx.fillStyle = '#5A3A1A';
    ctx.font = 'bold ' + (7) + 'px "Oldenburg",serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(z.label, tagX + 11, tagY + 5);
    
    /* Small string tying tag */
    ctx.beginPath();
    ctx.moveTo(tagX + 11, tagY);
    ctx.lineTo(boardX + boardW - 4, boardY + boardH - 2);
    ctx.strokeStyle = '#7A5A2A';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    
    ctx.restore();
  });
}

/* ═══════════════════════════════════════════════════════════════
   getZoneArrowAt — returns zone key if the world point (wx, wy)
   hits any visible zone indicator, otherwise null.
   Used by input.js to detect signpost clicks.
═══════════════════════════════════════════════════════════════ */
export function getZoneArrowAt(wx, wy, VS) {
  var zW   = _WW / 3;
  var zH   = _WH / 3;
  var hitW = 55;
  var hitH = 55;

  var mhLv = 1;
  (VS.buildings || []).forEach(function(b) {
    if (b.type === 'mainHall') mhLv = Math.max(mhLv, b.level || 1);
  });

  var result = null;
  Object.keys(ZONE_DEFS).forEach(function(key) {
    if (result) return;
    var z = ZONE_DEFS[key];
    if (z.free) return;
    if (isZoneUnlocked(key, VS)) return;
    
    /* Check if zone is purchasable */
    var hallOk = mhLv >= (z.prereqHall || 1);
    var canAfford = hallOk &&
      (VS.res.gold  || 0) >= z.cost.gold &&
      (VS.res.rice  || 0) >= z.cost.rice &&
      (VS.res.langis|| 0) >= z.cost.langis;
    
    if (!canAfford) return;

    var cx    = (z.col + 0.5) * zW;
    var cy    = (z.row + 0.5) * zH;
    var signX = cx;
    var signY = cy - 12;

    if (wx >= signX - hitW && wx <= signX + hitW &&
        wy >= signY - 25 && wy <= signY + 35) {
      result = key;
    }
  });
  return result;
}