/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — attack/attackVillagerCombat.js
   
   Villager combat animations and projectile system for attack mode.
   Handles ranged attacks, weapon trails, and attack animations.
═══════════════════════════════════════════════════════════════ */

import { perspScale, dist, clamp } from '../utils/perspective.js';

/* ═══════════════════════════════════════════════════════════════
   Weapon Types & Configurations
═══════════════════════════════════════════════════════════════ */
export var WEAPON_CONFIG = {
  bantay: {
    type: 'spear',
    range: 55,
    damage: 8,
    attackSpeed: 1.2,
    projectileSpeed: 200,
    projectileColor: '#ccccaa',
    trailColor: '#aa8866',
    sound: 'sfx-spear-throw',
    animation: 'thrust'
  },
  bayani: {
    type: 'sword',
    range: 50,
    damage: 18,
    attackSpeed: 1.5,
    projectileSpeed: 0,  // Melee
    trailColor: '#ffaa66',
    sound: 'sfx-sword-swing',
    animation: 'slash'
  },
  marine: {
    type: 'rifle',
    range: 120,
    damage: 28,
    attackSpeed: 0.9,
    projectileSpeed: 350,
    projectileColor: '#ffaa44',
    trailColor: '#ff8844',
    muzzleFlash: true,
    sound: 'sfx-rifle-shot',
    animation: 'shoot'
  },
  airforce: {
    type: 'rocket',
    range: 150,
    damage: 38,
    attackSpeed: 0.7,
    projectileSpeed: 400,
    projectileColor: '#ff6644',
    trailColor: '#ff4422',
    explosionRadius: 15,
    sound: 'sfx-rocket',
    animation: 'launch'
  }
};

/* ═══════════════════════════════════════════════════════════════
   Projectile Class for Villagers
═══════════════════════════════════════════════════════════════ */
export class VillagerProjectile {
  constructor(source, target, weaponType, damage) {
    this.x = source.x;
    this.y = source.y - 15;  // Offset from villager chest
    this.targetX = target.x;
    this.targetY = target.y;
    this.damage = damage;
    this.weaponType = weaponType;
    
    var config = WEAPON_CONFIG[weaponType] || WEAPON_CONFIG.bantay;
    this.speed = config.projectileSpeed || 200;
    this.color = config.projectileColor || '#ffccaa';
    this.radius = 4;
    this.life = 3.0;
    this.target = target;
    this.trail = [];
    
    // For rocket explosion
    this.explosionRadius = config.explosionRadius || 0;
  }
  
  update(dt) {
    // Store trail position
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.pop();
    
    var dx = this.targetX - this.x;
    var dy = this.targetY - this.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    
    if (d < 8) {
      // Hit target
      return { hit: true, target: this.target, damage: this.damage, explosionRadius: this.explosionRadius };
    }
    
    var move = this.speed * dt;
    var ratio = move / d;
    this.x += dx * ratio;
    this.y += dy * ratio;
    this.life -= dt;
    
    return { hit: false, lifeRemaining: this.life > 0 };
  }
  
  draw(ctx) {
    ctx.save();
    
    // Draw trail
    for (var i = 0; i < this.trail.length; i++) {
      var t = this.trail[i];
      var alpha = 0.4 * (1 - i / this.trail.length);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw projectile
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // For rockets, add flame trail
    if (this.weaponType === 'airforce') {
      ctx.fillStyle = '#ff8844';
      ctx.beginPath();
      ctx.ellipse(this.x - 8, this.y, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}

/* ═══════════════════════════════════════════════════════════════
   Muzzle Flash Effect
═══════════════════════════════════════════════════════════════ */
export class MuzzleFlash {
  constructor(x, y, weaponType) {
    this.x = x;
    this.y = y;
    this.life = 0.1;  // 100ms flash
    this.weaponType = weaponType;
    this.size = 8;
  }
  
  update(dt) {
    this.life -= dt;
    return this.life > 0;
  }
  
  draw(ctx) {
    var alpha = clamp(this.life / 0.1, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = '#ffaa66';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * (1 - this.life), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff8844';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.6 * (1 - this.life), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* ═══════════════════════════════════════════════════════════════
   Attack Animation State
   
   Each weapon type gets a distinct multi-phase animation:
   
   SPEAR (bantay)  — wind-up raise → snap thrust forward → recoil back
   SWORD (bayani)  — overhead raise → wide diagonal slash arc → hold pose
   RIFLE (marine)  — aim-up → shoot (recoil jerk + muzzle bloom) → lower
   ROCKET (airforce)— shoulder-raise → fire (exhaust bloom + shake) → lower
═══════════════════════════════════════════════════════════════ */
export class AttackAnimation {
  constructor(villager, weaponType, target) {
    this.villager    = villager;
    this.weaponType  = weaponType;
    this.target      = target;
    this.progress    = 0;

    var config = WEAPON_CONFIG[weaponType] || WEAPON_CONFIG.bantay;
    var animType = config.animation || 'thrust';

    this.duration = animType === 'slash'  ? 0.40
                  : animType === 'shoot'  ? 0.30
                  : animType === 'launch' ? 0.42
                  : 0.32; // thrust

    /* ── Target angle: locked at construction time so it
       doesn't drift if the target moves mid-swing.          */
    this.targetAngle = 0;   // angle from villager → target (radians)
    this._computeTargetAngle();

    /* ── Values read by _drawArmedBody every frame ── */
    this.aimAngle      = 0;  // whole-arm world-rotation toward target
    this.swingOffset   = 0;  // extra perpendicular swing for slash
    this.recoilBack    = 0;  // pushback along the OPPOSITE of aim dir
    this.bodyLean      = 0;  // torso shear
    this.flashAlpha    = 0;  // muzzle/impact glow
    this.kickAngle     = 0;  // recoil tilt of the weapon itself

    /* ── World-space muzzle position (written each update, read by draw) */
    this.muzzleX = villager ? villager.x : 0;
    this.muzzleY = villager ? villager.y : 0;

    /* Sword slash arc trail */
    this.slashArc = [];
  }

  _computeTargetAngle() {
    if (!this.villager || !this.target) {
      this.targetAngle = -Math.PI / 2; // default: straight up
      return;
    }
    var dx = this.target.x - this.villager.x;
    var dy = this.target.y - this.villager.y;
    this.targetAngle = Math.atan2(dy, dx);
  }

  update(dt) {
    this.progress += dt / this.duration;
    var t    = clamp(this.progress, 0, 1);
    var cfg  = WEAPON_CONFIG[this.weaponType] || WEAPON_CONFIG.bantay;
    var anim = cfg.animation || 'thrust';

    /* Keep target angle live for the first half (unit may retarget) */
    if (t < 0.5) this._computeTargetAngle();

    var ta = this.targetAngle;

    // ── SPEAR THRUST ────────────────────────────────────────
    // Arm PULLS BACK then DRIVES straight toward the target.
    if (anim === 'thrust') {
      if (t < 0.28) {
        var p = t / 0.28;
        // Wind-up: arm sweeps perpendicular-backward from aim line
        this.aimAngle    = ta + Math.PI * 0.5 * p;   // rotate away
        this.swingOffset = 0;
        this.bodyLean    = 0.04 * p;
        this.flashAlpha  = 0;
        this.kickAngle   = 0;
      } else if (t < 0.65) {
        var p = (t - 0.28) / 0.37;
        var snap = 1 - Math.pow(1 - p, 3);
        // SNAP: arm swings to align with target, overshoots slightly
        this.aimAngle    = ta + Math.PI * 0.5 * (1 - snap) - 0.15 * Math.sin(snap * Math.PI);
        this.swingOffset = 14 * snap;   // push arm forward along aim
        this.bodyLean    = 0.04 - 0.12 * snap;
        this.flashAlpha  = p > 0.65 ? (1 - (p - 0.65) / 0.35) * 0.55 : 0;
        this.kickAngle   = 0;
        // Sample trail
        if (this.villager && this.slashArc.length < 6) {
          var bx = this.villager.x + Math.cos(ta) * (10 + this.swingOffset);
          var by = this.villager.y + Math.sin(ta) * (10 + this.swingOffset) - 12;
          this.slashArc.push({ x: bx, y: by, a: 0.6 * (1 - p) });
        }
      } else {
        var p = (t - 0.65) / 0.35;
        this.aimAngle    = ta - 0.15 + 0.15 * p;
        this.swingOffset = 14 * (1 - p);
        this.bodyLean    = -0.08 + 0.08 * p;
        this.flashAlpha  = 0;
        this.kickAngle   = 0;
      }
    }

    // ── SWORD SLASH ─────────────────────────────────────────
    // Raises OVERHEAD relative to target direction, sweeps wide DOWN.
    else if (anim === 'slash') {
      if (t < 0.22) {
        var p = t / 0.22;
        // Raise arm opposite to aim (overhead)
        this.aimAngle    = ta - Math.PI * 0.65 * p;
        this.swingOffset = -8 * p;
        this.bodyLean    = 0.05 * p;
        this.kickAngle   = -0.5 * p;
        this.flashAlpha  = 0;
      } else if (t < 0.68) {
        var p = (t - 0.22) / 0.46;
        var swing = 1 - Math.pow(1 - p, 2.2);
        // Slash ARC: sweeps from overhead, THROUGH aim direction, to the other side
        this.aimAngle    = ta - Math.PI * 0.65 * (1 - swing) + Math.PI * 0.55 * swing;
        this.swingOffset = -8 * (1 - swing) + 10 * swing;
        this.bodyLean    = 0.05 - 0.16 * swing;
        this.kickAngle   = -0.5 * (1 - swing) + 0.8 * swing;
        this.flashAlpha  = p < 0.35 ? p / 0.35 * 0.8 : 0.8 * (1 - (p - 0.35) / 0.65);
        // Sample slash trail world-coords
        if (this.villager && this.slashArc.length < 9) {
          var tipDist = 18 + this.swingOffset;
          var bx = this.villager.x + Math.cos(this.aimAngle) * tipDist;
          var by = this.villager.y + Math.sin(this.aimAngle) * tipDist - 12;
          this.slashArc.push({ x: bx, y: by, a: 0.85 * (1 - p * 0.5) });
        }
      } else {
        var p = (t - 0.68) / 0.32;
        this.aimAngle    = ta + Math.PI * 0.55 * (1 - p * 0.4);
        this.swingOffset = 10 * (1 - p);
        this.bodyLean    = -0.11 + 0.11 * p;
        this.kickAngle   = 0.8 * (1 - p);
        this.flashAlpha  = 0;
      }
    }

    // ── RIFLE SHOOT ─────────────────────────────────────────
    // Arm RAISES to aim directly at target, sharp recoil on fire.
    else if (anim === 'shoot') {
      if (t < 0.22) {
        var p = t / 0.22;
        // Smoothly raise from idle carry angle to aim-at-target angle
        var idleAngle = -Math.PI * 0.25;  // arm hangs at ~45deg down
        this.aimAngle    = idleAngle + (ta - idleAngle) * p;
        this.swingOffset = 0;
        this.bodyLean    = 0.03 * p;
        this.kickAngle   = 0;
        this.recoilBack  = 0;
        this.flashAlpha  = 0;
      } else if (t < 0.42) {
        var p = (t - 0.22) / 0.20;
        // Fire: recoil kicks OPPOSITE to aim direction
        var kick = Math.exp(-p * 14) * (1 - Math.exp(-p * 70));
        this.aimAngle    = ta + kick * 0.18;   // barrel kicks up
        this.swingOffset = 0;
        this.bodyLean    = 0.03 - kick * 0.06;
        this.kickAngle   = kick * 0.25;
        this.recoilBack  = kick * 4;           // body pushes back from recoil
        this.flashAlpha  = p < 0.25 ? 1.0 : clamp(1 - (p - 0.25) / 0.75, 0, 1);
        // Compute world-space muzzle tip
        if (this.villager) {
          var barrelLen = 22;
          this.muzzleX = this.villager.x + Math.cos(this.aimAngle) * barrelLen;
          this.muzzleY = this.villager.y + Math.sin(this.aimAngle) * barrelLen - 14;
        }
      } else {
        var p = (t - 0.42) / 0.58;
        this.aimAngle    = ta + 0.18 * (1 - p);
        this.swingOffset = 0;
        this.bodyLean    = 0.03 * (1 - p);
        this.kickAngle   = 0.25 * (1 - p);
        this.recoilBack  = 4 * (1 - p);
        this.flashAlpha  = 0;
      }
    }

    // ── ROCKET LAUNCH ───────────────────────────────────────
    // Shoulder-raises launcher, points AT TARGET, fires with big exhaust.
    else if (anim === 'launch') {
      if (t < 0.22) {
        var p = t / 0.22;
        var idleAngle = -Math.PI * 0.2;
        this.aimAngle    = idleAngle + (ta - idleAngle) * p;
        this.swingOffset = 0;
        this.bodyLean    = 0.04 * p;
        this.kickAngle   = 0;
        this.recoilBack  = 0;
        this.flashAlpha  = 0;
      } else if (t < 0.48) {
        var p = (t - 0.22) / 0.26;
        var blast = Math.exp(-p * 9) * (1 - Math.exp(-p * 55));
        this.aimAngle    = ta + blast * 0.12;
        this.swingOffset = 0;
        this.bodyLean    = 0.04 + blast * 0.10;
        this.kickAngle   = blast * 0.15;
        // Body PUSHED BACKWARD along opposite of aim
        this.recoilBack  = blast * 7;
        this.flashAlpha  = p < 0.35 ? 1.0 : clamp(1 - (p - 0.35) / 0.65, 0, 1);
        // Muzzle tip (front of rocket)
        if (this.villager) {
          var barrelLen = 26;
          this.muzzleX = this.villager.x + Math.cos(this.aimAngle) * barrelLen;
          this.muzzleY = this.villager.y + Math.sin(this.aimAngle) * barrelLen - 14;
        }
      } else {
        var p = (t - 0.48) / 0.52;
        this.aimAngle    = ta + 0.12 * (1 - p);
        this.swingOffset = 0;
        this.bodyLean    = 0.14 * (1 - p);
        this.kickAngle   = 0.15 * (1 - p);
        this.recoilBack  = 7 * (1 - p);
        this.flashAlpha  = 0;
      }
    }

    // Fade slash trail
    for (var i = 0; i < this.slashArc.length; i++) {
      this.slashArc[i].a = Math.max(0, this.slashArc[i].a - dt * 3.5);
    }

    return this.progress < 1;
  }

  /* ── draw() — world-space overlay effects on top of body ─ */
  draw(ctx, sc) {
    if (!this.villager) return;

    var vx  = this.villager.x;
    var vy  = this.villager.y;
    var cfg = WEAPON_CONFIG[this.weaponType] || WEAPON_CONFIG.bantay;
    var anim = cfg.animation || 'thrust';

    ctx.save();

    // ── SLASH ARC (sword + spear trail) ───────────────────
    if (this.slashArc.length > 1) {
      ctx.lineCap  = 'round';
      ctx.lineJoin = 'round';
      for (var i = 0; i < this.slashArc.length - 1; i++) {
        var s0 = this.slashArc[i], s1 = this.slashArc[i + 1];
        var alpha = (s0.a + s1.a) * 0.5;
        if (alpha <= 0.02) continue;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = cfg.trailColor || '#ffaa66';
        ctx.lineWidth   = Math.max(1, (5 - i * 0.5)) * sc;
        ctx.beginPath();
        ctx.moveTo(s0.x, s0.y);
        ctx.lineTo(s1.x, s1.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // ── MUZZLE FLASH (rifle + rocket) ─────────────────────
    if ((anim === 'shoot' || anim === 'launch') && this.flashAlpha > 0.02) {
      var mx = this.muzzleX;
      var my = this.muzzleY;
      var isRocket = anim === 'launch';

      // Outer glow ring
      ctx.globalAlpha = this.flashAlpha * 0.30;
      ctx.fillStyle   = isRocket ? '#ff6633' : '#ffdd44';
      ctx.beginPath();
      ctx.arc(mx, my, (isRocket ? 16 : 10) * sc * this.flashAlpha, 0, Math.PI * 2);
      ctx.fill();

      // Core bright spot
      ctx.globalAlpha = this.flashAlpha * 0.95;
      ctx.fillStyle   = isRocket ? '#ffaa33' : '#ffffff';
      ctx.beginPath();
      ctx.arc(mx, my, (isRocket ? 6 : 3.5) * sc * this.flashAlpha, 0, Math.PI * 2);
      ctx.fill();

      // Directional spike along aim axis (rifle only)
      if (!isRocket && this.flashAlpha > 0.3) {
        ctx.globalAlpha = this.flashAlpha * 0.65;
        ctx.strokeStyle = '#ffffaa';
        ctx.lineWidth   = 2 * sc;
        ctx.lineCap     = 'round';
        var spikeLen = 12 * sc * this.flashAlpha;
        var aimA = this.aimAngle;
        // Forward spike
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(aimA) * spikeLen, my + Math.sin(aimA) * spikeLen);
        ctx.stroke();
        // 4 star spikes
        for (var i = 0; i < 4; i++) {
          var ang = aimA + Math.PI * 0.5 * (i + 1);
          var slen = 6 * sc * this.flashAlpha;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(mx + Math.cos(ang) * slen, my + Math.sin(ang) * slen);
          ctx.stroke();
        }
      }

      // Rocket: exhaust cloud BEHIND the launcher (opposite of aim)
      if (isRocket && this.flashAlpha > 0.25) {
        var backAng = this.aimAngle + Math.PI;
        ctx.globalAlpha = this.flashAlpha * 0.50;
        for (var i = 0; i < 5; i++) {
          var ed = (8 + i * 6) * sc * this.flashAlpha;
          var ex = vx + Math.cos(backAng) * ed;
          var ey = vy + Math.sin(backAng) * ed - 10 * sc;
          var er = (5 - i * 0.7) * sc * this.flashAlpha;
          if (er <= 0) continue;
          ctx.fillStyle = i < 2 ? '#ff6622' : i < 4 ? '#ffaa44' : '#ffdd88';
          ctx.beginPath();
          ctx.arc(ex, ey, er, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // ── SPEAR TIP SHIMMER on release ──────────────────────
    if (anim === 'thrust' && this.flashAlpha > 0.1) {
      var tipX = vx + Math.cos(this.aimAngle) * (18 + this.swingOffset);
      var tipY = vy + Math.sin(this.aimAngle) * (18 + this.swingOffset) - 10 * sc;
      ctx.globalAlpha = this.flashAlpha * 0.7;
      ctx.fillStyle   = '#ddeebb';
      ctx.shadowColor = '#aaccaa';
      ctx.shadowBlur  = 8;
      ctx.beginPath();
      ctx.ellipse(tipX, tipY, 4 * sc, 2 * sc, this.aimAngle, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // ── IMPACT RING on sword slash peak ───────────────────
    if (anim === 'slash' && this.flashAlpha > 0.5 && this.target) {
      ctx.globalAlpha = (this.flashAlpha - 0.5) * 0.9;
      ctx.strokeStyle = cfg.trailColor || '#ffaa66';
      ctx.lineWidth   = 2 * sc;
      ctx.beginPath();
      ctx.arc(this.target.x, this.target.y - 10 * sc,
              8 * sc * this.flashAlpha, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

/* ═══════════════════════════════════════════════════════════════
   Combat Helper Functions
═══════════════════════════════════════════════════════════════ */
export function getWeaponConfig(armedType) {
  return WEAPON_CONFIG[armedType] || WEAPON_CONFIG.bantay;
}

export function getAttackRange(armedType) {
  var config = getWeaponConfig(armedType);
  return config.range;
}

export function getAttackDamage(armedType, level) {
  var config = getWeaponConfig(armedType);
  var baseDamage = config.damage;
  // Scale damage with level (higher level = more damage)
  return baseDamage * (1 + (level - 1) * 0.15);
}

export function createVillagerProjectile(villager, target, armedType, damage) {
  var config = getWeaponConfig(armedType);
  if (config.projectileSpeed > 0) {
    return new VillagerProjectile(villager, target, armedType, damage);
  }
  return null;
}

export function canRangedAttack(armedType) {
  var config = getWeaponConfig(armedType);
  return config.projectileSpeed > 0;
}

export function createMuzzleFlash(villager, armedType) {
  var config = getWeaponConfig(armedType);
  if (config.muzzleFlash) {
    return new MuzzleFlash(villager.x, villager.y - 12, armedType);
  }
  return null;
}

export function createAttackAnimation(villager, armedType, target) {
  return new AttackAnimation(villager, armedType, target);
}

/* ═══════════════════════════════════════════════════════════════
   Area of Effect Damage
═══════════════════════════════════════════════════════════════ */
export function applyAreaDamage(center, radius, damage, troops, particles) {
  var hitCount = 0;
  troops.forEach(function(troop) {
    if (troop.hp <= 0) return;
    var d = dist(center.x, center.y, troop.x, troop.y);
    if (d < radius) {
      var splashDamage = damage * (1 - d / radius);
      troop.hp = Math.max(0, troop.hp - splashDamage);
      hitCount++;
      
      // Add explosion particles for splash damage
      for (var i = 0; i < 3; i++) {
        particles.push({
          x: troop.x, y: troop.y,
          vx: (Math.random() - 0.5) * 50,
          vy: (Math.random() - 0.5) * 50 - 30,
          life: 0.3,
          color: '#ff8844',
          radius: 3,
          update: function(p, dt) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; return p.life > 0; },
          draw: function(p, ctx) { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2); ctx.fill(); }
        });
      }
    }
  });
  return hitCount;
}