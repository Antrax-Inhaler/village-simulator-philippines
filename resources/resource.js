/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — resources/resource.js  (modified)

   CHANGES FROM ORIGINAL
   ─────────────────────────────────────────────────────────────
   PROPER RICE CONSUMPTION SYSTEM:
   - Citizens consume rice from storage (VS.res.rice)
   - Hunger increases when rice storage is low
   - Food pool is now the RICE storage, not separate
   - Removed separate food pool system
   - Farms and resource nodes add rice directly to storage
   
   Hunger Level Effects:
   - 0-30:  Normal speed
   - 31-60: Speed reduced by 20%
   - 61-80: Speed reduced by 50%
   - 81-100: Speed reduced by 80%, cannot work
═══════════════════════════════════════════════════════════════ */

import { perspScale, clamp, hpCol } from '../utils/perspective.js';
import { drawResourceSprite }        from '../utils/sprites.js';
import { isPolicyActive }            from '../government/policy.js';

/* ── Resource type definitions ────────────────────────────── */
var RESOURCE_DEFS = {
  forest: {
    label:      'Kagubatan',
    capacity:   300,
    regenRate:  8,
    giveRes:    'rice',
    giveAmt:    5,
    color:      '#2d7a3a',
    colorDepleted: '#7a5c2d',
    wMin: 80, wMax: 100,
    h: 38,
  },
  river: {
    label:      'Ilog',
    capacity:   200,
    regenRate:  12,
    giveRes:    'rice',
    giveAmt:    3,
    color:      '#3a8fc4',
    colorDepleted: '#7aafb4',
    w: 54, h: 20,
  },
  mine: {
    label:      'Minahan',
    capacity:   400,
    regenRate:  4,
    giveRes:    'gold',
    giveAmt:    8,
    color:      '#8c7a5a',
    colorDepleted: '#5a5a5a',
    w: 54, h: 38,
  },
  langis: {
    label:      'Tigaban ng Langis',
    capacity:   250,
    regenRate:  2.5,
    giveRes:    'langis',
    giveAmt:    4,
    color:      '#2a3a1a',
    colorDepleted: '#3a2a1a',
    w: 52, h: 28,
  },
};

/* ── Food consumption constants ──────────────────────────── */
var RICE_CONSUMPTION_PER_CITIZEN_PER_SEC = 0.008;  // Rice units consumed per citizen per second
var MIN_RICE_FOR_FULL_SPEED = 100;  // Minimum rice storage to avoid hunger
var HUNGER_INCREASE_RATE = 0.5;  // Hunger increase per second when rice is 0

// Hunger level speed multipliers
var HUNGER_SPEED_MULTIPLIERS = {
  NORMAL:     { min: 0,   max: 30,  mult: 1.0,   desc: 'Normal' },
  SLOW_20:    { min: 31,  max: 60,  mult: 0.8,   desc: 'Medyo gutom' },
  SLOW_50:    { min: 61,  max: 80,  mult: 0.5,   desc: 'Gutom na gutom' },
  SLOW_80:    { min: 81,  max: 100, mult: 0.2,   desc: 'Halos mamatay sa gutom' }
};

/* ── Counter for unique IDs ───────────────────────────────── */
var _nodeCounter = 0;

/* ══════════════════════════════════════════════════════════════
   tickFoodConsumption - New function that consumes rice from storage
   Call this from main.js update() every tick
══════════════════════════════════════════════════════════════ */
export function tickFoodConsumption(dt, VS) {
  var pop = VS.villagers.length;
  if (pop === 0) return;

  // Calculate total rice consumption for this tick
  var totalConsumption = pop * RICE_CONSUMPTION_PER_CITIZEN_PER_SEC * dt;
  
  // Get current rice storage
  var currentRice = VS.res.rice || 0;
  
  // Consume rice from storage
  var riceConsumed = Math.min(totalConsumption, currentRice);
  VS.res.rice = Math.max(0, currentRice - riceConsumed);
  
  // Calculate rice availability ratio (0 to 1)
  var riceRatio = (VS.res.rice + riceConsumed) / Math.max(MIN_RICE_FOR_FULL_SPEED, totalConsumption);
  riceRatio = clamp(riceRatio, 0, 1);
  
  // Track consumption stats for UI
  if (!VS.food) VS.food = { consumption: 0, riceRatio: 1 };
  VS.food.consumption = riceConsumed / dt;  // Rate per second
  VS.food.riceRatio = riceRatio;
  
  // Apply hunger effects to each citizen
  var hungerMult = isPolicyActive('programaPagkain', VS) ? 0.6 : 1.0;
  
  VS.villagers.forEach(function(v) {
    if (v.hunger === undefined) v.hunger = 20;
    
    // Update hunger based on how much rice was available
    if (riceConsumed < totalConsumption) {
      // Not enough rice - hunger increases
      var shortage = (totalConsumption - riceConsumed) / totalConsumption;
      var hungerIncrease = HUNGER_INCREASE_RATE * dt * shortage * hungerMult * 100;
      v.hunger = clamp(v.hunger + hungerIncrease, 0, 100);
    } else {
      // Enough rice - hunger decreases slowly
      var hungerDecrease = 0.02 * dt * 100;
      v.hunger = clamp(v.hunger - hungerDecrease, 0, 100);
    }
    
    // Apply speed multiplier based on hunger level
    v._hungerSpeedMult = getHungerSpeedMultiplier(v.hunger);
    
    // Apply work ability flag (cannot work if hunger > 80)
    v._canWork = v.hunger <= 80;
    
    // Extreme hunger causes health damage
    if (v.hunger >= 90) {
      if (v.health === undefined) v.health = 80;
      v.health = clamp(v.health - 0.005 * dt * 100, 0, 100);
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   tickFoodPool - Legacy function for backward compatibility
   Calls tickFoodConsumption
══════════════════════════════════════════════════════════════ */
export function tickFoodPool(dt, VS) {
  tickFoodConsumption(dt, VS);
}

/* Get speed multiplier based on hunger level */
export function getHungerSpeedMultiplier(hunger) {
  if (hunger <= 30) return HUNGER_SPEED_MULTIPLIERS.NORMAL.mult;
  if (hunger <= 60) return HUNGER_SPEED_MULTIPLIERS.SLOW_20.mult;
  if (hunger <= 80) return HUNGER_SPEED_MULTIPLIERS.SLOW_50.mult;
  return HUNGER_SPEED_MULTIPLIERS.SLOW_80.mult;
}

/* Get hunger effect description for UI */
export function getHungerEffectDescription(hunger) {
  if (hunger <= 30) return HUNGER_SPEED_MULTIPLIERS.NORMAL.desc;
  if (hunger <= 60) return HUNGER_SPEED_MULTIPLIERS.SLOW_20.desc;
  if (hunger <= 80) return HUNGER_SPEED_MULTIPLIERS.SLOW_50.desc;
  return HUNGER_SPEED_MULTIPLIERS.SLOW_80.desc;
}

/* Get food consumption stats for dashboard */
export function getFoodStats(VS) {
  if (!VS.food) return { consumption: 0, riceRatio: 1 };
  return {
    consumption: VS.food.consumption || 0,
    riceRatio: VS.food.riceRatio || 1
  };
}

/* Get food pool state - legacy function for compatibility */
export function getFoodPoolState(VS) {
  return getFoodStats(VS);
}

/* ══════════════════════════════════════════════════════════════
   ResourceNode Class
══════════════════════════════════════════════════════════════ */
export function ResourceNode(type, x, y) {
  var def       = RESOURCE_DEFS[type] || RESOURCE_DEFS.forest;
  this.id       = 'res_' + (_nodeCounter++);
  this.type     = type;
  this.x        = x;
  this.y        = y;
  this.capacity = def.capacity;
  this.amount   = def.capacity;
  this.regenRate  = def.regenRate;
  this.regenAccum = 0;
  this.giveRes  = def.giveRes;
  this.giveAmt  = def.giveAmt;
  this.animOffset = Math.random() * Math.PI * 2;

  if (type === 'forest') {
    var span = def.wMax - def.wMin;
    this.w = def.wMin + Math.floor(Math.random() * (span + 1));
    this.h = def.h;
  } else {
    this.w = def.w;
    this.h = def.h;
  }
}

ResourceNode.prototype.gather = function(amount, VS) {
  var taken   = Math.min(this.amount, amount);
  this.amount = Math.max(0, this.amount - taken);

  if (taken > 0 && VS) {
    if (this.giveRes === 'langis') {
      if (!VS.res.langis) VS.res.langis = 0;
      VS.res.langis = Math.min(VS.resCap.langis || 9999, VS.res.langis + taken * this.giveAmt);
    } else if (this.giveRes === 'rice') {
      // Add rice directly to storage
      if (!VS.res.rice) VS.res.rice = 0;
      VS.res.rice = Math.min(VS.resCap.rice || 9999, VS.res.rice + taken * this.giveAmt);
    } else if (this.giveRes === 'gold') {
      if (!VS.res.gold) VS.res.gold = 0;
      VS.res.gold = Math.min(VS.resCap.gold || 9999, VS.res.gold + taken * this.giveAmt);
    }
  }

  return taken;
};

ResourceNode.prototype.isEmpty    = function() { return this.amount <= 0; };
ResourceNode.prototype.getRatio   = function() { return clamp(this.amount / this.capacity, 0, 1); };

ResourceNode.prototype.update = function(dt) {
  if (this.amount < this.capacity) {
    this.regenAccum += dt * this.regenRate;
    if (this.regenAccum >= 1) {
      var add         = Math.floor(this.regenAccum);
      this.amount     = Math.min(this.capacity, this.amount + add);
      this.regenAccum -= add;
    }
  }
};

/* ══════════════════════════════════════════════════════════════
   RENDERING functions
══════════════════════════════════════════════════════════════ */
ResourceNode.prototype.draw = function(ctx, now) {
  var def    = RESOURCE_DEFS[this.type] || RESOURCE_DEFS.forest;
  var sc     = perspScale(this.y);
  var ratio  = this.getRatio();
  var col    = ratio > 0.35 ? def.color : def.colorDepleted;
  var t      = now ? now / 1000 : 0;
  var w      = this.w * sc;
  var h      = this.h * sc;

  ctx.save();
  ctx.translate(this.x, this.y);

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, h * 0.15, w * 0.65, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  if      (this.type === 'forest') _drawForest(ctx, sc, w, h, col, ratio, t + this.animOffset);
  else if (this.type === 'river')  _drawRiver(ctx, sc, w, h, col, ratio, t + this.animOffset);
  else if (this.type === 'mine')   _drawMine(ctx, sc, w, h, col, ratio, t + this.animOffset);
  else if (this.type === 'langis') _drawLangis(ctx, sc, w, h, col, ratio, t + this.animOffset);
  else                             _drawMine(ctx, sc, w, h, col, ratio, t + this.animOffset);

  drawResourceSprite(ctx, this.type, ratio, w, h);

  if (ratio < 0.99) {
    var barW = w * 0.9, barX = -barW / 2, barY = h * 0.38;
    ctx.fillStyle = '#111'; ctx.fillRect(barX, barY, barW, 3 * sc);
    ctx.fillStyle = hpCol(ratio); ctx.fillRect(barX, barY, barW * ratio, 3 * sc);
  }

  ctx.fillStyle = 'rgba(255,230,160,0.75)';
  ctx.font      = (10.5 * sc) + 'px Crimson Pro, serif';
  ctx.textAlign = 'center';
  ctx.fillText(def.label, 0, h * 0.56);

  ctx.restore();
};

/* ── Drawing functions ───────────────────────────────────── */
function _drawForest(ctx, sc, w, h, col, ratio, t) {
  var treeCount = Math.max(5, Math.floor(w / (10 * sc)));
  var backCount = Math.ceil(treeCount * 0.6);
  for (var bi = 0; bi < backCount; bi++) {
    var bfrac = (bi + 0.5) / backCount;
    var bx    = (bfrac - 0.5) * w * 0.92;
    var sway  = Math.sin(t * 0.65 + bi * 1.3) * 0.9 * sc;
    var bs    = 0.72 + 0.15 * ((bi * 5) % 3) / 3;
    var bTrunkH = 9 * sc * bs, bCanopy = 11 * sc * bs;
    ctx.fillStyle = '#5a3c1a';
    ctx.fillRect(bx - 1.8*sc*bs, -bTrunkH*0.1, 3.6*sc*bs, bTrunkH);
    ctx.fillStyle = _blendColor(col, '#1a3a1a', 0.4);
    ctx.beginPath();
    ctx.moveTo(bx + sway, -bTrunkH - bCanopy);
    ctx.lineTo(bx - bCanopy*0.92 + sway*0.5, -bTrunkH);
    ctx.lineTo(bx + bCanopy*0.92 + sway*0.5, -bTrunkH);
    ctx.closePath(); ctx.fill();
  }
  var frontCount = Math.ceil(treeCount * 0.55);
  for (var fi = 0; fi < frontCount; fi++) {
    var ffrac = (fi + 0.5) / frontCount;
    var fx    = (ffrac - 0.5) * w * 0.80 + (((fi%2)*2-1)*w*0.04);
    var sway2 = Math.sin(t * 0.75 + fi*0.9 + 1.5) * 1.1 * sc;
    var fs    = 0.85 + 0.22 * ((fi*3)%4) / 4;
    var fTrunkH = 12*sc*fs, fCanopy = 14*sc*fs;
    ctx.fillStyle = '#6b4c2a';
    ctx.fillRect(fx - 2.2*sc*fs, -fTrunkH*0.1, 4.4*sc*fs, fTrunkH);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(fx + sway2, -fTrunkH - fCanopy);
    ctx.lineTo(fx - fCanopy*0.95 + sway2*0.5, -fTrunkH);
    ctx.lineTo(fx + fCanopy*0.95 + sway2*0.5, -fTrunkH);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,180,0.10)';
    ctx.beginPath();
    ctx.moveTo(fx + sway2, -fTrunkH - fCanopy);
    ctx.lineTo(fx + sway2*0.5, -fTrunkH - fCanopy*0.38);
    ctx.lineTo(fx - fCanopy*0.28 + sway2*0.5, -fTrunkH);
    ctx.closePath(); ctx.fill();
    if (fs > 0.95) {
      ctx.fillStyle = _blendColor(col, '#3a8a3a', 0.3);
      ctx.beginPath();
      ctx.moveTo(fx + sway2*1.2, -fTrunkH - fCanopy*0.55);
      ctx.lineTo(fx - fCanopy*0.6 + sway2, -fTrunkH + fCanopy*0.18);
      ctx.lineTo(fx + fCanopy*0.6 + sway2, -fTrunkH + fCanopy*0.18);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(30,80,25,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 0, w*0.52, h*0.22, 0, 0, Math.PI*2); ctx.fill();
  if (ratio < 0.5) {
    ctx.fillStyle = 'rgba(120,80,30,' + (0.4*(1-ratio*2)) + ')';
    ctx.beginPath(); ctx.ellipse(0, -h*0.3, w*0.45, h*0.5, 0, 0, Math.PI*2); ctx.fill();
  }
}

function _drawMine(ctx, sc, w, h, col, ratio, t) {
  var glowAlpha = ratio > 0.25 ? (0.18 + Math.sin(t*1.8)*0.09)*ratio : 0.04;
  var glowR = ctx.createRadialGradient(0,-h*0.3,2*sc,0,-h*0.3,w*0.7);
  glowR.addColorStop(0,'rgba(255,210,50,'+(glowAlpha*1.6)+')');
  glowR.addColorStop(0.5,'rgba(255,160,20,'+glowAlpha+')');
  glowR.addColorStop(1,'rgba(255,100,0,0)');
  ctx.fillStyle=glowR; ctx.beginPath(); ctx.ellipse(0,-h*0.3,w*0.7,h*0.9,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#5a5040';
  ctx.beginPath(); ctx.moveTo(-w*0.52,h*0.18); ctx.lineTo(-w*0.18,-h*0.72); ctx.lineTo(w*0.18,-h*0.72); ctx.lineTo(w*0.52,h*0.18); ctx.closePath(); ctx.fill();
  var rockGrad=ctx.createLinearGradient(-w*0.5,0,w*0.5,0);
  rockGrad.addColorStop(0,'rgba(0,0,0,0.3)'); rockGrad.addColorStop(0.4,'rgba(0,0,0,0)'); rockGrad.addColorStop(1,'rgba(0,0,0,0.25)');
  ctx.fillStyle=rockGrad;
  ctx.beginPath(); ctx.moveTo(-w*0.52,h*0.18); ctx.lineTo(-w*0.18,-h*0.72); ctx.lineTo(w*0.18,-h*0.72); ctx.lineTo(w*0.52,h*0.18); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=0.8*sc;
  ctx.beginPath(); ctx.moveTo(-w*0.35,-h*0.15); ctx.lineTo(w*0.35,-h*0.22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-w*0.42,h*0.05);  ctx.lineTo(w*0.40,h*0.00);  ctx.stroke();
  var crystals=[
    {cx:0,cy:-0.55,bw:0.12,bh:0.52,tilt:0.05,face:0.9},
    {cx:0.06,cy:-0.48,bw:0.09,bh:0.40,tilt:0.10,face:0.7},
    {cx:-0.07,cy:-0.46,bw:0.08,bh:0.38,tilt:-0.08,face:0.8},
    {cx:-0.22,cy:-0.35,bw:0.09,bh:0.32,tilt:-0.15,face:0.75},
    {cx:-0.30,cy:-0.28,bw:0.07,bh:0.26,tilt:-0.20,face:0.65},
    {cx:0.22,cy:-0.35,bw:0.09,bh:0.30,tilt:0.15,face:0.72},
    {cx:0.31,cy:-0.26,bw:0.07,bh:0.24,tilt:0.22,face:0.62},
    {cx:-0.14,cy:-0.22,bw:0.055,bh:0.20,tilt:-0.05,face:0.85},
    {cx:0.14,cy:-0.20,bw:0.05,bh:0.18,tilt:0.06,face:0.80},
  ];
  var pulse=ratio>0.25?(0.85+Math.sin(t*2.2)*0.15):0.4;
  crystals.forEach(function(c){
    var cx=c.cx*w,cy=c.cy*h,cbw=c.bw*w,cbh=c.bh*h,tlt=c.tilt;
    ctx.fillStyle=ratio>0.25?('rgba(140,90,5,'+(0.9*pulse)+')'):'rgba(80,75,55,0.8)';
    ctx.beginPath(); ctx.moveTo(cx-cbw*0.5+tlt*cbh,cy-cbh); ctx.lineTo(cx-cbw*0.18+tlt*cbh,cy-cbh*1.22); ctx.lineTo(cx-cbw*0.18,cy); ctx.lineTo(cx-cbw*0.5,cy); ctx.closePath(); ctx.fill();
    var brightAlpha=c.face*pulse;
    ctx.fillStyle=ratio>0.25?('rgba(255,200,30,'+brightAlpha+')'):'rgba(160,150,100,'+(brightAlpha*0.6)+')';
    ctx.beginPath(); ctx.moveTo(cx-cbw*0.18+tlt*cbh,cy-cbh*1.22); ctx.lineTo(cx+cbw*0.5+tlt*cbh,cy-cbh); ctx.lineTo(cx+cbw*0.5,cy); ctx.lineTo(cx-cbw*0.18,cy); ctx.closePath(); ctx.fill();
    ctx.fillStyle=ratio>0.25?('rgba(255,240,140,'+(0.7*pulse)+')'):'rgba(200,190,150,0.3)';
    ctx.beginPath(); ctx.moveTo(cx-cbw*0.18+tlt*cbh,cy-cbh*1.22); ctx.lineTo(cx-cbw*0.5+tlt*cbh,cy-cbh); ctx.lineTo(cx+cbw*0.5+tlt*cbh,cy-cbh); ctx.closePath(); ctx.fill();
    if(ratio>0.25){ctx.strokeStyle='rgba(255,255,200,'+(0.45*pulse)+')'; ctx.lineWidth=0.8*sc; ctx.beginPath(); ctx.moveTo(cx-cbw*0.18+tlt*cbh,cy-cbh*1.22); ctx.lineTo(cx+cbw*0.25+tlt*cbh*0.5,cy-cbh*0.5); ctx.stroke();}
  });
  if(ratio>0.2){var gp=[{gx:-w*0.28,gy:-h*0.08},{gx:w*0.30,gy:-h*0.05},{gx:-w*0.10,gy:h*0.05},{gx:w*0.12,gy:-h*0.18}]; gp.forEach(function(g,gi){var gp2=0.4+Math.sin(t*2.8+gi*1.7)*0.35; ctx.fillStyle='rgba(255,210,60,'+(gp2*ratio)+')'; ctx.beginPath(); ctx.arc(g.gx,g.gy,2.2*sc,0,Math.PI*2); ctx.fill();});}
  if(ratio>0.25){var cg=ctx.createRadialGradient(0,-h*0.45,0,0,-h*0.45,w*0.18); var ca=(0.35+Math.sin(t*2.5)*0.15)*ratio; cg.addColorStop(0,'rgba(255,240,100,'+ca+')'); cg.addColorStop(1,'rgba(255,180,30,0)'); ctx.fillStyle=cg; ctx.beginPath(); ctx.ellipse(0,-h*0.45,w*0.18,h*0.22,0,0,Math.PI*2); ctx.fill();}
  ctx.fillStyle='#1a0e06'; ctx.beginPath(); ctx.arc(0,h*0.08,7*sc,Math.PI,0); ctx.fillRect(-7*sc,h*0.08,14*sc,6*sc); ctx.fill();
  ctx.strokeStyle='#6b4020'; ctx.lineWidth=1.5*sc; ctx.beginPath(); ctx.moveTo(-7*sc,h*0.14); ctx.lineTo(-7*sc,h*0.06); ctx.arc(0,h*0.06,7*sc,Math.PI,0); ctx.lineTo(7*sc,h*0.14); ctx.stroke();
  if(ratio>0.1){ctx.fillStyle='rgba(255,200,80,0.5)'; ctx.beginPath(); ctx.arc(0,h*0.05,2*sc,0,Math.PI*2); ctx.fill();}
}

function _drawRiver(ctx, sc, w, h, col, ratio, t) {
  var wave = Math.sin(t * 1.2) * 2 * sc;
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(0, 0, w*0.9, h*0.42, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.2*sc;
  for (var i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(i*14*sc+wave,0,10*sc,3.5*sc,0,0,Math.PI*2); ctx.stroke(); }
  if (ratio > 0.4) { ctx.fillStyle='rgba(180,240,180,0.5)'; ctx.beginPath(); ctx.arc(8*sc+wave*0.5,-2*sc,3.5*sc,0,Math.PI*2); ctx.fill(); }
}

function _drawLangis(ctx, sc, w, h, col, ratio, t) {
  ctx.fillStyle = '#1a2a0a';
  ctx.beginPath(); ctx.ellipse(0, 0, w*0.85, h*0.65, 0, 0, Math.PI*2); ctx.fill();
  var sheen = Math.sin(t * 0.8) * 0.2 + 0.3;
  ctx.fillStyle = `rgba(40, 50, 20, ${sheen * 0.5})`;
  ctx.beginPath(); ctx.ellipse(0, -2*sc, w*0.7, h*0.45, 0, 0, Math.PI*2); ctx.fill();
  for (var i = 0; i < 8; i++) {
    var angle = (i / 8) * Math.PI * 2 + t * 0.5;
    var ox = Math.sin(angle) * w * 0.3;
    var oy = Math.cos(angle) * h * 0.2 - 3*sc;
    var size = (Math.sin(t * 1.5 + i) * 0.5 + 1) * 1.5 * sc;
    ctx.fillStyle = ratio > 0.3 ? 'rgba(30, 40, 10, 0.7)' : 'rgba(20, 25, 8, 0.5)';
    ctx.beginPath(); ctx.ellipse(ox, oy, size, size * 0.7, 0, 0, Math.PI*2); ctx.fill();
  }
  if (ratio > 0.5) {
    var slick = ctx.createLinearGradient(-w*0.4, 0, w*0.4, 0);
    slick.addColorStop(0, 'rgba(100, 70, 20, 0.3)');
    slick.addColorStop(0.33, 'rgba(80, 60, 30, 0.4)');
    slick.addColorStop(0.66, 'rgba(60, 80, 40, 0.3)');
    slick.addColorStop(1, 'rgba(40, 60, 20, 0.2)');
    ctx.fillStyle = slick;
    ctx.beginPath(); ctx.ellipse(0, -2*sc, w*0.8, h*0.55, 0, 0, Math.PI*2); ctx.fill();
  }
  if (ratio < 0.2) {
    ctx.fillStyle = '#5a4a2a';
    ctx.font = `${8 * sc}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⛽', 0, -5*sc);
  } else {
    var bob = Math.sin(t * 1.2) * 2 * sc;
    ctx.fillStyle = '#3a2a0a';
    ctx.fillRect(-6*sc, -h*0.4 + bob, 12*sc, 7*sc);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(-5*sc, -h*0.38 + bob, 10*sc, 2*sc);
    ctx.fillStyle = '#f5c842';
    ctx.font = `${7 * sc}px monospace`;
    ctx.fillText('⛽', 0, -h*0.36 + bob);
  }
  ctx.strokeStyle = '#2a2a0a';
  ctx.lineWidth = 1.5 * sc;
  ctx.beginPath(); ctx.ellipse(0, 0, w*0.85, h*0.65, 0, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, h*0.28, w*0.65, h*0.15, 0, 0, Math.PI*2); ctx.fill();
}

function _blendColor(hexA, hexB, t) {
  var ar=parseInt(hexA.slice(1,3),16), ag=parseInt(hexA.slice(3,5),16), ab=parseInt(hexA.slice(5,7),16);
  var br=parseInt(hexB.slice(1,3),16), bg=parseInt(hexB.slice(3,5),16), bb=parseInt(hexB.slice(5,7),16);
  var r=Math.round(ar+(br-ar)*t), g=Math.round(ag+(bg-ag)*t), b=Math.round(ab+(bb-ab)*t);
  return '#'+('0'+r.toString(16)).slice(-2)+('0'+g.toString(16)).slice(-2)+('0'+b.toString(16)).slice(-2);
}

/* ── Factory helpers ──────────────────────────────────────── */
export function createDefaultResourceNodes(VW, VH) {
  return [
    new ResourceNode('forest', VW*0.38, VH*0.42),
    new ResourceNode('river',  VW*0.62, VH*0.44),
    new ResourceNode('forest', VW*0.12, VH*0.18),
    new ResourceNode('river',  VW*0.50, VH*0.12),
    new ResourceNode('mine',   VW*0.85, VH*0.50),
    new ResourceNode('mine',   VW*0.15, VH*0.68),
    new ResourceNode('langis', VW*0.50, VH*0.85),
    new ResourceNode('langis', VW*0.78, VH*0.75),
    new ResourceNode('forest', VW*0.82, VH*0.82),
  ];
}

export function getResourceDef(type) {
  return RESOURCE_DEFS[type] || RESOURCE_DEFS.forest;
}