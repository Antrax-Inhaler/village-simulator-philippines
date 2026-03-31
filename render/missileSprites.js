/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — render/missileSprites.js
   Missile Visual Assets & Animation System
   
   Features:
   - 4 missile type sprites (Basic, Precision, Ballistic, MIRV)
   - Launch trail particles
   - Impact explosion effects
   - Color-coded per missile type
   - Optimized for canvas 2D rendering
═══════════════════════════════════════════════════════════════ */

import { perspScale, clamp, randRange } from '../utils/perspective.js';

/* ══════════════════════════════════════════════════════════════
   Missile Type Configuration
══════════════════════════════════════════════════════════════ */
export var MISSILE_SPRITE_CONFIG = {
  basic: {
    bodyColor: '#88ccff',
    tipColor: '#ff8844',
    finColor: '#6688aa',
    trailColor: '#88ccff',
    trailWidth: 2,
    trailLength: 40,
    glowColor: 'rgba(136, 204, 255, 0.6)',
    size: { width: 16, height: 6 }
  },
  precision: {
    bodyColor: '#ffcc44',
    tipColor: '#ff6644',
    finColor: '#aa8844',
    trailColor: '#ffcc44',
    trailWidth: 2.5,
    trailLength: 50,
    glowColor: 'rgba(255, 204, 68, 0.6)',
    size: { width: 18, height: 7 }
  },
  ballistic: {
    bodyColor: '#ff6644',
    tipColor: '#ff3322',
    finColor: '#884433',
    trailColor: '#ff6644',
    trailWidth: 3.5,
    trailLength: 70,
    glowColor: 'rgba(255, 102, 68, 0.7)',
    size: { width: 24, height: 9 }
  },
  mirv: {
    bodyColor: '#ff44ff',
    tipColor: '#ff22aa',
    finColor: '#883388',
    trailColor: '#ff44ff',
    trailWidth: 4,
    trailLength: 90,
    glowColor: 'rgba(255, 68, 255, 0.7)',
    size: { width: 28, height: 10 },
    warheadCount: 3  // For MIRV split effect
  }
};

/* ══════════════════════════════════════════════════════════════
   MissileTrailParticle Class
   Individual particle in missile trail
══════════════════════════════════════════════════════════════ */
export function MissileTrailParticle(x, y, config, angle) {
  this.x = x;
  this.y = y;
  this.color = config.trailColor;
  this.size = randRange(config.trailWidth * 0.5, config.trailWidth * 1.5);
  this.life = 1.0;
  this.decay = randRange(0.02, 0.05);
  this.vx = Math.cos(angle + Math.PI) * randRange(0.5, 2);
  this.vy = Math.sin(angle + Math.PI) * randRange(0.5, 2);
  this.wobble = randRange(-0.1, 0.1);
}

MissileTrailParticle.prototype.update = function(dt) {
  this.x += this.vx;
  this.y += this.vy;
  this.vy += 0.02; // Gravity
  this.life -= this.decay;
  this.size *= 0.95; // Shrink over time
  return this.life > 0;
};

MissileTrailParticle.prototype.draw = function(ctx, sc) {
  ctx.save();
  ctx.globalAlpha = this.life * 0.8;
  ctx.fillStyle = this.color;
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.size * sc, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

/* ══════════════════════════════════════════════════════════════
   drawMissile
   Main missile sprite drawing function
   @param ctx - Canvas 2D context
   @param x, y - Position (world coordinates, already transformed)
   @param missileType - 'basic' | 'precision' | 'ballistic' | 'mirv'
   @param angle - Flight angle in radians
   @param sc - Scale factor (perspScale)
   @param frame - Animation frame (for bobbing effect)
══════════════════════════════════════════════════════════════ */
export function drawMissile(ctx, x, y, missileType, angle, sc, frame) {
  var config = MISSILE_SPRITE_CONFIG[missileType] || MISSILE_SPRITE_CONFIG.basic;
  var size = config.size;
  var w = size.width * sc;
  var h = size.height * sc;
  
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  
  // Bobbing animation
  var bob = Math.sin(frame * 0.15) * 2 * sc;
  ctx.translate(0, bob);
  
  // Draw glow effect
  var gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 1.5);
  gradient.addColorStop(0, config.glowColor);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, w * 1.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw missile body
  ctx.fillStyle = config.bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw tip/nose cone
  ctx.fillStyle = config.tipColor;
  ctx.beginPath();
  ctx.moveTo(w * 0.4, 0);
  ctx.lineTo(w * 0.7, 0);
  ctx.lineTo(w * 0.4, -h * 0.4);
  ctx.lineTo(w * 0.4, h * 0.4);
  ctx.closePath();
  ctx.fill();
  
  // Draw fins
  ctx.fillStyle = config.finColor;
  // Top fin
  ctx.beginPath();
  ctx.moveTo(-w * 0.3, 0);
  ctx.lineTo(-w * 0.6, -h * 0.8);
  ctx.lineTo(-w * 0.5, -h * 0.3);
  ctx.closePath();
  ctx.fill();
  // Bottom fin
  ctx.beginPath();
  ctx.moveTo(-w * 0.3, 0);
  ctx.lineTo(-w * 0.6, h * 0.8);
  ctx.lineTo(-w * 0.5, h * 0.3);
  ctx.closePath();
  ctx.fill();
  
  // Draw engine flame
  var flameLen = w * (0.4 + Math.random() * 0.3);
  var flameGrad = ctx.createLinearGradient(-w * 0.5, 0, -w * 0.5 - flameLen, 0);
  flameGrad.addColorStop(0, '#ffaa44');
  flameGrad.addColorStop(0.5, '#ff6622');
  flameGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(-w * 0.45, 0);
  ctx.lineTo(-w * 0.45 - flameLen, randRange(-h * 0.3, h * 0.3));
  ctx.lineTo(-w * 0.45, 0);
  ctx.fill();
  
  // MIRV: Draw multiple warheads if splitting
  if (missileType === 'mirv' && frame > 100) {
    for (var i = 0; i < config.warheadCount; i++) {
      var offset = (i - 1) * h * 0.8;
      ctx.fillStyle = config.tipColor;
      ctx.beginPath();
      ctx.ellipse(w * 0.2, offset, w * 0.15, h * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════════
   drawMissileTrail
   Draw trail particles behind missile
   @param ctx - Canvas 2D context
   @param particles - Array of MissileTrailParticle
   @param sc - Scale factor
══════════════════════════════════════════════════════════════ */
export function drawMissileTrail(ctx, particles, sc) {
  particles.forEach(function(p) {
    p.draw(ctx, sc);
  });
}

/* ══════════════════════════════════════════════════════════════
   createMissileTrail
   Generate trail particles for a missile
   @param x, y - Missile position
   @param missileType - Missile type for config
   @param angle - Flight angle
   @param count - Number of particles to create
   @returns Array of MissileTrailParticle
══════════════════════════════════════════════════════════════ */
export function createMissileTrail(x, y, missileType, angle, count) {
  var config = MISSILE_SPRITE_CONFIG[missileType] || MISSILE_SPRITE_CONFIG.basic;
  var particles = [];
  
  for (var i = 0; i < count; i++) {
    var t = i / count;
    var px = x - Math.cos(angle) * t * config.trailLength;
    var py = y - Math.sin(angle) * t * config.trailLength;
    particles.push(new MissileTrailParticle(px, py, config, angle));
  }
  
  return particles;
}

/* ══════════════════════════════════════════════════════════════
   drawMissileLaunch
   Draw launch effect from Missile Silo
   @param ctx - Canvas 2D context
   @param x, y - Silo position
   @param missileType - Missile type
   @param sc - Scale factor
   @param progress - Launch progress (0-1)
══════════════════════════════════════════════════════════════ */
export function drawMissileLaunch(ctx, x, y, missileType, sc, progress) {
  var config = MISSILE_SPRITE_CONFIG[missileType] || MISSILE_SPRITE_CONFIG.basic;
  
  ctx.save();
  ctx.translate(x, y);
  
  // Draw smoke cloud at launch point
  var smokeSize = 30 * sc * (1 + progress * 2);
  var smokeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, smokeSize);
  smokeGrad.addColorStop(0, 'rgba(150, 150, 150, 0.8)');
  smokeGrad.addColorStop(0.5, 'rgba(100, 100, 100, 0.4)');
  smokeGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = smokeGrad;
  ctx.beginPath();
  ctx.arc(0, 0, smokeSize, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw launch flame
  var flameHeight = 50 * sc * (1 + Math.random() * 0.3);
  var flameGrad = ctx.createLinearGradient(0, 0, 0, flameHeight);
  flameGrad.addColorStop(0, '#ffaa44');
  flameGrad.addColorStop(0.5, '#ff6622');
  flameGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(-15 * sc, 0);
  ctx.lineTo(0, flameHeight);
  ctx.lineTo(15 * sc, 0);
  ctx.closePath();
  ctx.fill();
  
  // Draw missile at launch position
  var missileY = -progress * 80 * sc;
  drawMissile(ctx, 0, missileY, missileType, -Math.PI / 2, sc, progress * 100);
  
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════════
   drawMissileImpact
   Draw impact explosion effect
   @param ctx - Canvas 2D context
   @param x, y - Impact position
   @param missileType - Missile type
   @param sc - Scale factor
   @param frame - Animation frame (0-60)
══════════════════════════════════════════════════════════════ */
export function drawMissileImpact(ctx, x, y, missileType, sc, frame) {
  var config = MISSILE_SPRITE_CONFIG[missileType] || MISSILE_SPRITE_CONFIG.basic;
  var progress = frame / 60; // 0-1 over 60 frames
  
  ctx.save();
  ctx.translate(x, y);
  
  // Draw shockwave ring
  var ringRadius = 10 * sc * (1 + progress * 8);
  var ringAlpha = 1 - progress;
  ctx.strokeStyle = 'rgba(255, 200, 100, ' + ringAlpha + ')';
  ctx.lineWidth = 3 * sc * (1 - progress);
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw explosion core
  var coreRadius = 20 * sc * progress;
  var coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.3, '#ffaa44');
  coreGrad.addColorStop(0.7, '#ff6622');
  coreGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = coreGrad;
  ctx.globalAlpha = 1 - progress;
  ctx.beginPath();
  ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw debris particles
  var debrisCount = 12;
  for (var i = 0; i < debrisCount; i++) {
    var angle = (Math.PI * 2 * i) / debrisCount;
    var dist = 30 * sc * progress * (1 + Math.random() * 0.5);
    var dx = Math.cos(angle) * dist;
    var dy = Math.sin(angle) * dist;
    var size = randRange(2, 5) * sc * (1 - progress);
    
    ctx.globalAlpha = 1 - progress;
    ctx.fillStyle = i % 2 === 0 ? '#ff8844' : '#ffcc44';
    ctx.beginPath();
    ctx.arc(dx, dy, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // MIRV: Multiple explosion cores
  if (missileType === 'mirv' && progress > 0.3) {
    for (var w = 0; w < config.warheadCount; w++) {
      var offset = (w - 1) * 40 * sc;
      var subCoreRadius = 15 * sc * progress;
      var subGrad = ctx.createRadialGradient(offset, 0, 0, offset, 0, subCoreRadius);
      subGrad.addColorStop(0, '#ffffff');
      subGrad.addColorStop(0.5, '#ff44ff');
      subGrad.addColorStop(1, 'transparent');
      ctx.globalAlpha = (1 - progress) * 0.7;
      ctx.fillStyle = subGrad;
      ctx.beginPath();
      ctx.arc(offset, 0, subCoreRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════════
   MissileImpactEffect Class
   Manages impact explosion animation
══════════════════════════════════════════════════════════════ */
export function MissileImpactEffect(x, y, missileType, sc) {
  this.x = x;
  this.y = y;
  this.missileType = missileType;
  this.sc = sc;
  this.frame = 0;
  this.maxFrames = 60;
  this.active = true;
}

MissileImpactEffect.prototype.update = function(dt) {
  this.frame += dt * 60; // Convert to frames
  if (this.frame >= this.maxFrames) {
    this.active = false;
  }
  return this.active;
};

MissileImpactEffect.prototype.draw = function(ctx) {
  drawMissileImpact(ctx, this.x, this.y, this.missileType, this.sc, this.frame);
};

/* ══════════════════════════════════════════════════════════════
   drawMissileOnMap
   Draw missile traveling on world map (for player village view)
   @param ctx - Canvas 2D context
   @param missile - Missile object from VS.missiles
   @param sc - Scale factor
   @param frame - Animation frame
   @param trailParticles - Array to store/update trail particles
══════════════════════════════════════════════════════════════ */
export function drawMissileOnMap(ctx, missile, sc, frame, trailParticles) {
  if (!missile || missile.status !== 'traveling') return;
  
  var config = MISSILE_SPRITE_CONFIG[missile.type] || MISSILE_SPRITE_CONFIG.basic;
  
  // Calculate current position based on progress
  var progress = missile.progress || 0;
  var startX = missile.startX || (window._VS?.buildings[0]?.x || 0);
  var startY = missile.startY || (window._VS?.buildings[0]?.y || 0);
  var targetX = missile.targetX;
  var targetY = missile.targetY;
  
  var currentX = startX + (targetX - startX) * progress;
  var currentY = startY + (targetY - startY) * progress;
  
  // Calculate flight angle
  var angle = Math.atan2(targetY - startY, targetX - startX);
  
  // Update trail particles
  if (trailParticles && frame % 3 === 0) {
    var newParticles = createMissileTrail(currentX, currentY, missile.type, angle, 5);
    trailParticles.push.apply(trailParticles, newParticles);
  }
  
  // Update and draw trail
  if (trailParticles) {
    trailParticles = trailParticles.filter(function(p) {
      return p.update(1/60);
    });
    drawMissileTrail(ctx, trailParticles, sc);
  }
  
  // Draw missile
  drawMissile(ctx, currentX, currentY, missile.type, angle, sc, frame);
}

/* ══════════════════════════════════════════════════════════════
   Utility: Get missile color by type
══════════════════════════════════════════════════════════════ */
export function getMissileColor(missileType) {
  var config = MISSILE_SPRITE_CONFIG[missileType] || MISSILE_SPRITE_CONFIG.basic;
  return config.bodyColor;
}

/* ══════════════════════════════════════════════════════════════
   Utility: Get missile size by type
══════════════════════════════════════════════════════════════ */
export function getMissileSize(missileType, sc) {
  var config = MISSILE_SPRITE_CONFIG[missileType] || MISSILE_SPRITE_CONFIG.basic;
  return {
    width: config.size.width * sc,
    height: config.size.height * sc
  };
}
