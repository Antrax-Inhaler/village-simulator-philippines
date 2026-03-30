/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — attack/projectileSystem.js
   Handles projectile creation, updates, and rendering.
═══════════════════════════════════════════════════════════════ */

import { dist, randRange } from '../utils/perspective.js';
import { BATTLE_CONFIG, getProjectileTrail } from './attackStats.js';

/* ══════════════════════════════════════════════════════════════
   PROJECTILE CREATION
══════════════════════════════════════════════════════════════ */
export function createProjectile(source, target, damage, projectileType, speed, color, size) {
  return {
    id: 'proj_' + Date.now() + '_' + Math.random(),
    x: source.x,
    y: source.y - 12,
    tx: target.x,
    ty: target.y,
    spd: speed,
    dmg: damage,
    dmgTarget: target,
    life: 3,
    type: projectileType,
    color: color,
    r: size,
    trail: [],
    lastX: source.x,
    lastY: source.y - 12
  };
}

/* ══════════════════════════════════════════════════════════════
   UPDATE PROJECTILES
   Returns filtered array of alive projectiles
══════════════════════════════════════════════════════════════ */
export function updateProjectiles(projectiles, dt, hitCallback) {
  var alive = [];
  
  for (var i = 0; i < projectiles.length; i++) {
    var p = projectiles[i];
    var dx = p.tx - p.x;
    var dy = p.ty - p.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    
    // Save position for trail
    p.trail.unshift({ x: p.x, y: p.y });
    if (p.trail.length > (getProjectileTrail(p.type).trailLength || 8)) {
      p.trail.pop();
    }
    
    if (distance < 8) {
      // Impact!
      if (hitCallback) {
        hitCallback(p.dmgTarget, p.dmg);
      }
      continue; // Don't add back to alive
    }
    
    var angle = Math.atan2(dy, dx);
    var moveX = Math.cos(angle) * p.spd * dt;
    var moveY = Math.sin(angle) * p.spd * dt;
    
    p.x += moveX;
    p.y += moveY;
    p.lastX = p.x - moveX;
    p.lastY = p.y - moveY;
    p.life -= dt;
    
    if (p.life > 0) {
      alive.push(p);
    }
  }
  
  return alive;
}

/* ══════════════════════════════════════════════════════════════
   DRAW PROJECTILES WITH TRAILS
══════════════════════════════════════════════════════════════ */
export function drawProjectiles(ctx, projectiles) {
  if (!projectiles || projectiles.length === 0) return;
  
  ctx.save();
  
  for (var i = 0; i < projectiles.length; i++) {
    var p = projectiles[i];
    
    // Draw trail
    if (p.trail && p.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(p.trail[0].x, p.trail[0].y);
      for (var t = 1; t < p.trail.length; t++) {
        ctx.lineTo(p.trail[t].x, p.trail[t].y);
      }
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.r * 0.6;
      ctx.globalAlpha = 0.4;
      ctx.stroke();
    }
    
    // Draw projectile
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    
    // Add glow effect for special projectiles
    if (p.type === 'cannonball') {
      ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════════
   PARTICLE SYSTEMS
══════════════════════════════════════════════════════════════ */
export function spawnExplosion(particles, x, y) {
  var colors = ['#ff8800', '#ff4400', '#ffcc00', '#ff2200', '#ffffff'];
  
  // Explosion particles
  for (var i = 0; i < BATTLE_CONFIG.explosionParticles; i++) {
    var ang = Math.random() * Math.PI * 2;
    var spd = 60 + Math.random() * 130;
    particles.push({
      id: 'exp_' + Date.now() + '_' + i,
      type: 'exp',
      x: x, y: y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 90,
      r: 4 + Math.random() * 11,
      life: 1,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
  
  // Smoke particles
  for (var j = 0; j < BATTLE_CONFIG.smokeParticles; j++) {
    particles.push({
      id: 'smk_' + Date.now() + '_' + j,
      type: 'smoke',
      x: x + (Math.random() - 0.5) * 20,
      y: y - 6,
      vx: (Math.random() - 0.5) * 14,
      vy: -26 - Math.random() * 40,
      r: 10 + Math.random() * 14,
      life: 1.5
    });
  }
}

export function spawnHitSpark(particles, x, y) {
  for (var i = 0; i < BATTLE_CONFIG.hitSparkParticles; i++) {
    var ang = Math.random() * Math.PI * 2;
    particles.push({
      id: 'spk_' + Date.now() + '_' + i,
      type: 'spark',
      x: x, y: y,
      vx: Math.cos(ang) * 60,
      vy: Math.sin(ang) * 60 - 30,
      r: 2 + Math.random() * 3,
      life: 0.4,
      color: '#ffee88'
    });
  }
}

export function spawnBloodPuff(particles, x, y) {
  for (var i = 0; i < 6; i++) {
    var ang = Math.random() * Math.PI * 2;
    particles.push({
      id: 'bld_' + Date.now() + '_' + i,
      type: 'spark',
      x: x, y: y,
      vx: Math.cos(ang) * 40,
      vy: Math.sin(ang) * 40,
      r: 2 + Math.random() * 2,
      life: 0.5,
      color: '#cc3333'
    });
  }
}

/* ══════════════════════════════════════════════════════════════
   UPDATE PARTICLES
══════════════════════════════════════════════════════════════ */
export function updateParticles(particles, dt) {
  var alive = [];
  
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    
    // Gravity for explosion particles
    if (p.type === 'exp') {
      p.vy += 80 * dt;
    }
    
    // Smoke rises slower
    if (p.type === 'smoke') {
      p.vy -= 20 * dt;
      p.life -= dt * 0.5;
    } else {
      p.life -= dt * 0.9;
    }
    
    if (p.life > 0) {
      alive.push(p);
    }
  }
  
  return alive;
}

/* ══════════════════════════════════════════════════════════════
   DRAW PARTICLES
══════════════════════════════════════════════════════════════ */
export function drawParticles(ctx, particles) {
  if (!particles || particles.length === 0) return;
  
  ctx.save();
  
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    ctx.globalAlpha = Math.max(0, p.life);
    
    if (p.type === 'smoke') {
      ctx.fillStyle = 'rgba(90,90,90,' + (p.life * 0.4) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color || '#ff8800';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * Math.max(0, p.life), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  ctx.restore();
}