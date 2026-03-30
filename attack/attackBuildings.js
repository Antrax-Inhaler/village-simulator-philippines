/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — attack/attackBuildings.js
   
   Manages defender buildings with:
   - HP values based on level
   - Attack range rings
   - Click detection for focusing camera
   - Projectile system
═══════════════════════════════════════════════════════════════ */

import { BUILDING_DEFS } from '../buildings/building.js';
import { perspScale, dist } from '../utils/perspective.js';

/* ═══════════════════════════════════════════════════════════════
   Building HP Calculation
═══════════════════════════════════════════════════════════════ */
export function calculateBuildingMaxHp(buildingType, level) {
    var def = BUILDING_DEFS[buildingType];
    if (!def) return 100;
    
    var baseHp = def.defenceHP || 60;
    // HP scales with level: +40% per level
    return Math.floor(baseHp * (1 + (level - 1) * 0.4));
}

export function calculateBuildingAttackRange(buildingType, level) {
    var def = BUILDING_DEFS[buildingType];
    if (!def || !def.attackRange) return 0;
    
    // Range scales +20% per level
    return def.attackRange * (1 + (level - 1) * 0.2);
}

export function calculateBuildingAttackDPS(buildingType, level) {
    var def = BUILDING_DEFS[buildingType];
    if (!def || !def.attackDPS) return 0;
    
    // DPS scales +25% per level
    return def.attackDPS * (1 + (level - 1) * 0.25);
}

export function getBuildingShotCooldown(buildingType) {
    switch(buildingType) {
        case 'bantayan': return 2.2;
        case 'moog':     return 1.8;
        case 'pulisya':  return 2.8;
        default:         return 0;
    }
}

/* ═══════════════════════════════════════════════════════════════
   Defender Building Class
═══════════════════════════════════════════════════════════════ */
export class DefenderBuilding {
    constructor(type, x, y, level) {
        var def = BUILDING_DEFS[type];
        
        this.type = type;
        this.x = x;
        this.y = y;
        this.level = level || 1;
        this.w = def.w;
        this.h = def.h;
        
        // Combat stats
        this.maxHp = calculateBuildingMaxHp(type, this.level);
        this.hp = this.maxHp;
        this.attackRange = calculateBuildingAttackRange(type, this.level);
        this.attackDPS = calculateBuildingAttackDPS(type, this.level);
        this.shotCooldown = getBuildingShotCooldown(type);
        
        // Flags
        this.isDefence = def.category === 'defence';
        this.isMainHall = type === 'mainHall';
        
        // Cooldown tracking
        this.defTimer = 0;
        
        // Store original definition for reference
        this._def = def;
    }
    
    getDef() {
        return this._def;
    }
    
    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
        return this.hp <= 0;
    }
    
    isAlive() {
        return this.hp > 0;
    }
    
    canAttack() {
        return this.isAlive() && this.attackRange > 0 && this.attackDPS > 0;
    }
    
    getAttackRangeWorld() {
        // Return attack range in world units (not scaled by perspective)
        return this.attackRange;
    }
    
    isInRange(tx, ty) {
        var d = dist(this.x, this.y, tx, ty);
        return d <= this.attackRange;
    }
}

/* ═══════════════════════════════════════════════════════════════
   Projectile System
═══════════════════════════════════════════════════════════════ */
export class Projectile {
    constructor(source, target, damage, color) {
        this.x = source.x;
        this.y = source.y - 12;  // Offset from building top
        this.targetX = target.x;
        this.targetY = target.y;
        this.damage = damage;
        this.color = color || '#ff8800';
        this.radius = 4;
        this.speed = 220;
        this.life = 3.0;  // Max lifetime in seconds
        this.target = target;
    }
    
    update(dt) {
        var dx = this.targetX - this.x;
        var dy = this.targetY - this.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        
        if (d < 6) {
            // Hit target
            return { hit: true, target: this.target, damage: this.damage };
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
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/* ═══════════════════════════════════════════════════════════════
   Particle System
═══════════════════════════════════════════════════════════════ */
export class Particle {
    constructor(x, y, type, color) {
        this.x = x;
        this.y = y;
        this.type = type;  // 'explosion', 'spark', 'smoke', 'blood'
        this.life = 1.0;
        
        var angle = Math.random() * Math.PI * 2;
        var speed = 60 + Math.random() * 130;
        
        switch(type) {
            case 'explosion':
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed - 90;
                this.radius = 4 + Math.random() * 11;
                this.color = color || ['#ff8800','#ff4400','#ffcc00','#ff2200','#ffffff'][Math.floor(Math.random() * 5)];
                break;
                
            case 'spark':
                this.vx = Math.cos(angle) * 60;
                this.vy = Math.sin(angle) * 60 - 30;
                this.radius = 2 + Math.random() * 3;
                this.color = color || '#ffee88';
                break;
                
            case 'smoke':
                this.vx = (Math.random() - 0.5) * 14;
                this.vy = -26 - Math.random() * 40;
                this.radius = 10 + Math.random() * 14;
                this.color = 'rgba(90,90,90,0.4)';
                break;
                
            case 'blood':
                this.vx = Math.cos(angle) * 40;
                this.vy = Math.sin(angle) * 40;
                this.radius = 2 + Math.random() * 2;
                this.color = '#cc3333';
                break;
        }
    }
    
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 80 * dt;  // Gravity
        this.life -= dt * (this.type === 'smoke' ? 0.5 : 0.9);
        return this.life > 0;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        
        if (this.type === 'smoke') {
            ctx.fillStyle = 'rgba(90,90,90,' + (this.life * 0.4) + ')';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * Math.max(0, this.life), 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

export function createExplosion(particles, x, y) {
    // Create multiple explosion particles
    for (var i = 0; i < 20; i++) {
        particles.push(new Particle(x, y, 'explosion'));
    }
    for (var i = 0; i < 8; i++) {
        particles.push(new Particle(x + (Math.random() - 0.5) * 20, y - 6, 'smoke'));
    }
}

export function createHitSpark(particles, x, y) {
    for (var i = 0; i < 5; i++) {
        particles.push(new Particle(x, y, 'spark'));
    }
}

export function createBloodPuff(particles, x, y) {
    for (var i = 0; i < 6; i++) {
        particles.push(new Particle(x, y, 'blood'));
    }
}