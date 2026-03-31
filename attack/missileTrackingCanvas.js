/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — attack/missileTrackingCanvas.js
   Small Canvas Animation for Missile Travel Tracking
   
   Features:
   - Animated missile flight path with trail particles
   - Progress bar showing ETA countdown
   - Target info display (name, zone, missile type)
   - Cancel button (active for first 10 seconds)
   - Lightweight, embeddable in UI panels
   - Reuses attack.js drawing utilities
═══════════════════════════════════════════════════════════════ */

import { 
  perspScale, 
  clamp, 
  dist,
  randRange 
} from '../utils/perspective.js';

import { 
  MISSILE_COSTS 
} from '../resources/economy.js';

/* ══════════════════════════════════════════════════════════════
   Constants & Configuration
══════════════════════════════════════════════════════════════ */
var CONFIG = {
  canvasWidth: 320,
  canvasHeight: 180,
  backgroundColor: 'rgba(10, 15, 30, 0.95)',
  borderColor: '#4a6aff',
  trailColor: {
    basic: '#88ccff',
    precision: '#ffcc44',
    ballistic: '#ff6644',
    mirv: '#ff44ff'
  },
  missileColor: '#ffffff',
  progressColor: '#4a8aff',
  progressBgColor: 'rgba(74, 106, 255, 0.2)',
  textColor: '#e8d8a0',
  accentColor: '#f5c842',
  dangerColor: '#ff6666',
  successColor: '#44ff88',
  
  // Animation settings
  trailParticleCount: 20,
  trailParticleLife: 30,  // frames
  trailParticleSpeed: 0.8,
  missileBobAmplitude: 2,
  missileBobFrequency: 0.1,
  
  // UI layout
  padding: 12,
  headerHeight: 40,
  footerHeight: 50,
  progressBarHeight: 8,
  cancelBtnWidth: 80,
  cancelBtnHeight: 28,
  
  // Cancel window
  cancelWindowSeconds: 10
};

/* ══════════════════════════════════════════════════════════════
   MissileTrailParticle Class
   Individual particle in the missile's trail
══════════════════════════════════════════════════════════════ */
function MissileTrailParticle(x, y, color, speed, life) {
  this.x = x;
  this.y = y;
  this.color = color;
  this.speed = speed;
  this.life = life;
  this.maxLife = life;
  this.size = randRange(1.5, 4);
  this.alpha = 1;
  this.vx = randRange(-0.3, 0.3);
  this.vy = randRange(-0.2, 0.2);
}

MissileTrailParticle.prototype.update = function(dt) {
  this.x += this.vx * this.speed;
  this.y += this.vy * this.speed;
  this.life -= dt * 60;  // Convert to frames
  this.alpha = this.life / this.maxLife;
  return this.life > 0;
};

MissileTrailParticle.prototype.draw = function(ctx) {
  ctx.save();
  ctx.globalAlpha = this.alpha * 0.8;
  ctx.fillStyle = this.color;
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

/* ══════════════════════════════════════════════════════════════
   MissileTrackingCanvas Class
   Main class for the tracking animation
══════════════════════════════════════════════════════════════ */
export function MissileTrackingCanvas(containerElement, options) {
  this.container = containerElement;
  this.options = options || {};
  
  // Missile data
  this.missile = options.missile || null;
  this.target = options.target || { name: 'Unknown', zone: '???' };
  this.missileType = options.missileType || 'basic';
  this.launchTime = options.launchTime || Date.now();
  this.impactTime = options.impactTime || this.launchTime + 60000;
  this.eta = options.eta || 60;
  
  // State
  this.running = false;
  this.cancelled = false;
  this.completed = false;
  this.onCancel = options.onCancel || null;
  this.onComplete = options.onComplete || null;
  this.onUpdate = options.onUpdate || null;
  
  // Canvas setup
  this.canvas = null;
  this.ctx = null;
  this.width = CONFIG.canvasWidth;
  this.height = CONFIG.canvasHeight;
  
  // Animation state
  this.particles = [];
  this.missileX = 0;
  this.missileY = 0;
  this.progress = 0;
  this.lastTime = 0;
  this.frameCount = 0;
  
  // UI elements
  this.cancelBtn = null;
  this.statusText = null;
  
  this._init();
}

/* ══════════════════════════════════════════════════════════════
   Initialize the tracking canvas
══════════════════════════════════════════════════════════════ */
MissileTrackingCanvas.prototype._init = function() {
  // Create canvas element
  this.canvas = document.createElement('canvas');
  this.canvas.width = this.width;
  this.canvas.height = this.height;
  this.canvas.style.cssText = [
    'display: block;',
    'border: 2px solid ' + CONFIG.borderColor + ';',
    'border-radius: 8px;',
    'background: ' + CONFIG.backgroundColor + ';',
    'cursor: default;'
  ].join('');
  
  this.ctx = this.canvas.getContext('2d');
  
  // Create cancel button
  this.cancelBtn = document.createElement('button');
  this.cancelBtn.textContent = 'Cancel';
  this.cancelBtn.style.cssText = [
    'position: absolute;',
    'bottom: 12px;',
    'right: 12px;',
    'width: ' + CONFIG.cancelBtnWidth + 'px;',
    'height: ' + CONFIG.cancelBtnHeight + 'px;',
    'background: linear-gradient(135deg, #ff6666, #cc3333);',
    'color: white;',
    'border: none;',
    'border-radius: 6px;',
    'font-family: "Oldenburg", serif;',
    'font-size: 12px;',
    'font-weight: bold;',
    'cursor: pointer;',
    'transition: opacity 0.2s, transform 0.1s;',
    'opacity: 1;'
  ].join('');
  
  this.cancelBtn.addEventListener('click', this._handleCancel.bind(this));
  this.cancelBtn.addEventListener('mouseenter', function() {
    this.style.transform = 'scale(1.05)';
    this.style.opacity = '0.9';
  });
  this.cancelBtn.addEventListener('mouseleave', function() {
    this.style.transform = 'scale(1)';
    this.style.opacity = '1';
  });
  
  // Create status text element
  this.statusText = document.createElement('div');
  this.statusText.style.cssText = [
    'position: absolute;',
    'bottom: 12px;',
    'left: 12px;',
    'color: ' + CONFIG.textColor + ';',
    'font-family: "Oldenburg", serif;',
    'font-size: 11px;',
    'pointer-events: none;'
  ].join('');
  
  // Assemble container
  this.container.style.position = 'relative';
  this.container.style.width = this.width + 'px';
  this.container.style.height = this.height + 'px';
  this.container.appendChild(this.canvas);
  this.container.appendChild(this.cancelBtn);
  this.container.appendChild(this.statusText);
  
  // Initial draw
  this._drawStaticElements();
};

/* ══════════════════════════════════════════════════════════════
   Start the animation loop
══════════════════════════════════════════════════════════════ */
MissileTrackingCanvas.prototype.start = function() {
  if (this.running) return;
  
  this.running = true;
  this.cancelled = false;
  this.completed = false;
  this.lastTime = performance.now();
  this.frameCount = 0;
  
  // Initialize particles
  this._initParticles();
  
  // Show/hide cancel button based on time window
  this._updateCancelButton();
  
  // Start animation loop
  this._animate();
  
  if (this.options.onStart) {
    this.options.onStart();
  }
};

/* ══════════════════════════════════════════════════════════════
   Stop the animation
══════════════════════════════════════════════════════════════ */
MissileTrackingCanvas.prototype.stop = function() {
  this.running = false;
  if (this._rafId) {
    cancelAnimationFrame(this._rafId);
    this._rafId = null;
  }
};

/* ══════════════════════════════════════════════════════════════
   Cancel the missile (user action)
══════════════════════════════════════════════════════════════ */
MissileTrackingCanvas.prototype._handleCancel = function() {
  var now = Date.now();
  var elapsed = (now - this.launchTime) / 1000;
  
  if (elapsed > CONFIG.cancelWindowSeconds) {
    // Too late to cancel
    if (this.options.onCancelTooLate) {
      this.options.onCancelTooLate();
    }
    return;
  }
  
  this.cancelled = true;
  this.running = false;
  
  // Visual feedback
  this._drawCancelledState();
  
  // Hide cancel button
  this.cancelBtn.style.opacity = '0';
  this.cancelBtn.style.pointerEvents = 'none';
  
  // Update status
  this.statusText.textContent = '✗ Cancelled';
  this.statusText.style.color = CONFIG.dangerColor;
  
  if (this.onCancel) {
    this.onCancel(this.missile);
  }
};

/* ══════════════════════════════════════════════════════════════
   Initialize trail particles
══════════════════════════════════════════════════════════════ */
MissileTrackingCanvas.prototype._initParticles = function() {
  this.particles = [];
  var color = CONFIG.trailColor[this.missileType] || CONFIG.trailColor.basic;
  
  for (var i = 0; i < CONFIG.trailParticleCount; i++) {
    // Start particles along the flight path
    var t = i / CONFIG.trailParticleCount;
    var px = this._calculateMissileX(t);
    var py = this._calculateMissileY(t);
    
    this.particles.push(new MissileTrailParticle(
      px, py, color,
      CONFIG.trailParticleSpeed,
      CONFIG.trailParticleLife * (0.5 + Math.random() * 0.5)
    ));
  }
};

/* ══════════════════════════════════════════════════════════════
   Calculate missile X position at progress t (0-1)
══════════════════════════════════════════════════════════════ */
MissileTrackingCanvas.prototype._calculateMissileX = function(t) {
  var startX = CONFIG.padding + 40;
  var endX = this.width - CONFIG.padding - 40;
  var bob = Math.sin(this.frameCount * CONFIG.missileBobFrequency) * CONFIG.missileBobAmplitude;
  return startX + (endX - startX) * t + bob;
};

/* ══════════════════════════════════════════════════════════════
   Calculate missile Y position at progress t (0-1)
══════════════════════════════════════════════════════════════ */
MissileTrackingCanvas.prototype._calculateMissileY = function(t) {
  var startY = this.height / 2;
  var apexY = startY - 40;  // Arc upward
  var endY = startY;
  
  // Parabolic arc
  if (t < 0.5) {
    return startY + (apexY - startY) * (t * 2);
  } else {
    return apexY + (endY - apexY) * ((t - 0.5) * 2);
  }
};

/* ══════════════════════════════════════════════════════════════
   Main animation loop
══════════════════════════════════════════════════════════════ */
MissileTrackingCanvas.prototype._animate = function(timestamp) {
  if (!this.running) return;
  
  var dt = (timestamp - this.lastTime) / 1000;
  this.lastTime = timestamp;
  this.frameCount++;
  
  // Update progress
  var now = Date.now();
  var totalTime = this.impactTime - this.launchTime;
  var elapsed = now - this.launchTime;
  this.progress = clamp(elapsed / totalTime, 0, 1);
  
  // Update missile position
  this.missileX = this._calculateMissileX(this.progress);
  this.missileY = this._calculateMissileY(this.progress);
  
  // Update and spawn particles
  this._updateParticles(dt);
  
  // Draw frame
  this._drawFrame();
  
  // Update UI elements
  this._updateUI();
  
  // Check for completion
  if (this.progress >= 1 && !this.completed) {
    this._handleComplete();
    return;
  }
  
  // Continue animation
  this._rafId = requestAnimationFrame(this._animate.bind(this));
};

/* ══════════════════════════════════════════════════════════════
   Update trail particles
══════════════════════════════════════════════════════════════ */
MissileTrackingCanvas.prototype._updateParticles = function(dt) {
  var color = CONFIG.trailColor[this.missileType] || CONFIG.trailColor.basic;
  
  // Update existing particles
  this.particles = this.particles.filter(function(p) {
    return p.update(dt);
  });
  
  // Spawn new particle at missile position
  if (this.frameCount % 2 === 0 && this.progress < 1) {
    this.particles.push(new MissileTrailParticle(
      this.missileX + randRange(-3, 3),
      this.missileY + randRange(-3, 3),
      color,
      CONFIG.trailParticleSpeed * 0.8,
      CONFIG.trailParticleLife * 0.8
    ));
  }
  
  // Limit particle count
  if (this.particles.length > CONFIG.trailParticleCount * 2) {
    this.particles.shift();
  }
};

/* ══════════════════════════════════════════════════════════════
   Draw static UI elements (header, footer, labels)
══════════════════════════════════════════════════════════════ */
MissileTrackingCanvas.prototype._drawStaticElements = function() {
  var ctx = this.ctx;
  
  // Clear canvas
  ctx.clearRect(0, 0, this.width, this.height);
  
  // Background gradient
  var gradient = ctx.createLinearGradient(0, 0, 0, this.height);
  gradient.addColorStop(0, 'rgba(20, 30, 60, 0.9)');
  gradient.addColorStop(1, 'rgba(10, 15, 30, 0.95)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, this.width, this.height);
  
  // Border glow
  ctx.strokeStyle = CONFIG.borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, this.width - 2, this.height - 2);
  
  // Header: Target info
  ctx.fillStyle = CONFIG.textColor;
  ctx.font = 'bold 13px "Oldenburg", serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎯 Target: ' + this.target.name, CONFIG.padding, CONFIG.headerHeight / 2);
  
  ctx.font = '11px "Crimson Pro", serif';
  ctx.fillStyle = '#88aacc';
  ctx.fillText('Zone: ' + this.target.zone, CONFIG.padding, CONFIG.headerHeight / 2 + 16);
  
  // Missile type badge
  var badgeText = this.missileType.toUpperCase();
  var badgeColor = CONFIG.trailColor[this.missileType] || CONFIG.trailColor.basic;
  ctx.fillStyle = badgeColor;
  ctx.font = 'bold 10px "Oldenburg", serif';
  ctx.fillText('✈ ' + badgeText, this.width - CONFIG.padding - 80, CONFIG.headerHeight / 2);
  
  // Footer: Progress label
  ctx.font = '11px "Crimson Pro", serif';
  ctx.fillStyle = CONFIG.textColor;
  ctx.fillText('Flight Progress', CONFIG.padding, this.height - CONFIG.footerHeight / 2 + 4);
  
  // Progress bar background
  var barX = CONFIG.padding;
  var barY = this.height - CONFIG.footerHeight / 2 + 12;
  var barW = this.width - CONFIG.padding * 2;
  var barH = CONFIG.progressBarHeight;
  
  ctx.fillStyle = CONFIG.progressBgColor;
  _rrect(ctx, barX, barY, barW, barH, 4);
  ctx.fill();
};

/* ══════════════════════════════════════════════════════════════
   Draw the animated frame
══════════════════════════════════════════════════════════════ */
MissileTrackingCanvas.prototype._drawFrame = function() {
  var ctx = this.ctx;
  
  // Redraw static elements
  this._drawStaticElements();
  
  // Draw flight path line (subtle)
  ctx.save();
  ctx.strokeStyle = 'rgba(74, 106, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(CONFIG.padding + 40, this.height / 2);
  
  // Draw curved path
  var steps = 20;
  for (var i = 0; i <= steps; i++) {
    var t = i / steps;
    var px = this._calculateMissileX(t);
    var py = this._calculateMissileY(t);
    ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  
  // Draw trail particles
  this.particles.forEach(function(p) {
    p.draw(ctx);
  });
  
  // Draw missile
  this._drawMissile(ctx);
  
  // Draw progress bar fill
  var barX = CONFIG.padding;
  var barY = this.height - CONFIG.footerHeight / 2 + 12;
  var barW = this.width - CONFIG.padding * 2;
  var barH = CONFIG.progressBarHeight;
  
  ctx.fillStyle = CONFIG.progressColor;
  _rrect(ctx, barX, barY, barW * this.progress, barH, 4);
  ctx.fill();
};

/* ══════════════════════════════════════════════════════════════
   Draw the missile sprite
══════════════════════════════════════════════════════════════ */
MissileTrackingCanvas.prototype._drawMissile = function(ctx) {
  ctx.save();
  
  var sc = 1;
  var bob = Math.sin(this.frameCount * CONFIG.missileBobFrequency) * CONFIG.missileBobAmplitude;
  
  // Missile body
  ctx.translate(this.missileX, this.missileY + bob);
  
  // Glow effect
  var gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
  gradient.addColorStop(0, CONFIG.trailColor[this.missileType] || '#88ccff');
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  
  // Missile body
  ctx.fillStyle = CONFIG.missileColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8 * sc, 3 * sc, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Nose cone
  ctx.fillStyle = '#ff8844';
  ctx.beginPath();
  ctx.moveTo(8 * sc, 0);
  ctx.lineTo(14 * sc, 0);
  ctx.lineTo(8 * sc, -2 * sc);
  ctx.closePath();
  ctx.fill();
  
  // Fins
  ctx.fillStyle = '#6688aa';
  ctx.beginPath();
  ctx.moveTo(-4 * sc, 0);
  ctx.lineTo(-8 * sc, -4 * sc);
  ctx.lineTo(-8 * sc, -1 * sc);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-4 * sc, 0);
  ctx.lineTo(-8 * sc, 4 * sc);
  ctx.lineTo(-8 * sc, 1 * sc);
  ctx.closePath();
  ctx.fill();
  
  // Engine flame
  ctx.fillStyle = '#ffaa44';
  ctx.beginPath();
  ctx.moveTo(-8 * sc, 0);
  ctx.lineTo(-14 * sc - Math.random() * 4, randRange(-2, 2));
  ctx.lineTo(-8 * sc, 0);
  ctx.fill();
  
  ctx.restore();
};

/* ══════════════════════════════════════════════════════════════
   Update UI elements (ETA, cancel button state)
══════════════════════════════════════════════════════════════ */
MissileTrackingCanvas.prototype._updateUI = function() {
  var now = Date.now();
  var remaining = Math.max(0, Math.floor((this.impactTime - now) / 1000));
  
  // Update status text with ETA
  var statusText = 'ETA: ' + remaining + 's';
  if (this.progress > 0.9) {
    statusText = '🎯 Approaching...';
  }
  this.statusText.textContent = statusText;
  this.statusText.style.color = CONFIG.textColor;
  
  // Update cancel button
  this._updateCancelButton();
  
  // Callback for external updates
  if (this.onUpdate) {
    this.onUpdate({
      progress: this.progress,
      eta: remaining,
      cancelled: this.cancelled,
      completed: this.completed
    });
  }
};

/* ══════════════════════════════════════════════════════════════
   Update cancel button visibility/state
══════════════════════════════════════════════════════════════ */
MissileTrackingCanvas.prototype._updateCancelButton = function() {
  var now = Date.now();
  var elapsed = (now - this.launchTime) / 1000;
  
  if (elapsed >= CONFIG.cancelWindowSeconds || this.cancelled || this.completed) {
    // Fade out cancel button
    this.cancelBtn.style.opacity = '0';
    this.cancelBtn.style.pointerEvents = 'none';
    this.cancelBtn.disabled = true;
  } else {
    // Show cancel button with countdown
    var remaining = Math.ceil(CONFIG.cancelWindowSeconds - elapsed);
    this.cancelBtn.textContent = 'Cancel (' + remaining + 's)';
    this.cancelBtn.style.opacity = '1';
    this.cancelBtn.style.pointerEvents = 'auto';
    this.cancelBtn.disabled = false;
  }
};

/* ══════════════════════════════════════════════════════════════
   Handle missile completion (impact)
══════════════════════════════════════════════════════════════ */
MissileTrackingCanvas.prototype._handleComplete = function() {
  this.completed = true;
  this.running = false;
  
  // Visual feedback
  this._drawImpactEffect();
  
  // Hide cancel button
  this.cancelBtn.style.opacity = '0';
  this.cancelBtn.style.pointerEvents = 'none';
  
  // Update status
  this.statusText.textContent = '✓ Impact!';
  this.statusText.style.color = CONFIG.successColor;
  
  if (this.onComplete) {
    this.onComplete(this.missile);
  }
};

/* ══════════════════════════════════════════════════════════════
   Draw impact explosion effect
══════════════════════════════════════════════════════════════ */
MissileTrackingCanvas.prototype._drawImpactEffect = function() {
  var ctx = this.ctx;
  var endX = this.width - CONFIG.padding - 40;
  var endY = this.height / 2;
  
  // Draw explosion particles
  for (var i = 0; i < 30; i++) {
    var angle = (Math.PI * 2 * i) / 30;
    var dist = randRange(10, 40);
    var x = endX + Math.cos(angle) * dist;
    var y = endY + Math.sin(angle) * dist * 0.5;
    var size = randRange(2, 6);
    var alpha = randRange(0.3, 0.9);
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = i % 2 === 0 ? '#ffaa44' : '#ff6644';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  
  // Draw impact flash
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(endX, endY, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

/* ══════════════════════════════════════════════════════════════
   Draw cancelled state visual
══════════════════════════════════════════════════════════════ */
MissileTrackingCanvas.prototype._drawCancelledState = function() {
  var ctx = this.ctx;
  
  // Red overlay
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = CONFIG.dangerColor;
  ctx.fillRect(0, 0, this.width, this.height);
  
  // X mark
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(this.width / 2 - 30, this.height / 2 - 30);
  ctx.lineTo(this.width / 2 + 30, this.height / 2 + 30);
  ctx.moveTo(this.width / 2 + 30, this.height / 2 - 30);
  ctx.lineTo(this.width / 2 - 30, this.height / 2 + 30);
  ctx.stroke();
  ctx.restore();
};

/* ══════════════════════════════════════════════════════════════
   Update missile data (for external state sync)
══════════════════════════════════════════════════════════════ */
MissileTrackingCanvas.prototype.updateMissile = function(missileData) {
  this.missile = missileData;
  if (missileData.eta !== undefined) {
    this.eta = missileData.eta;
  }
  if (missileData.impactTime !== undefined) {
    this.impactTime = missileData.impactTime;
  }
  if (missileData.cancelled) {
    this.cancelled = true;
    this.stop();
    this._drawCancelledState();
  }
};

/* ══════════════════════════════════════════════════════════════
   Destroy and cleanup
══════════════════════════════════════════════════════════════ */
MissileTrackingCanvas.prototype.destroy = function() {
  this.stop();
  if (this.canvas && this.canvas.parentNode) {
    this.canvas.parentNode.removeChild(this.canvas);
  }
  if (this.cancelBtn && this.cancelBtn.parentNode) {
    this.cancelBtn.parentNode.removeChild(this.cancelBtn);
  }
  if (this.statusText && this.statusText.parentNode) {
    this.statusText.parentNode.removeChild(this.statusText);
  }
};

/* ══════════════════════════════════════════════════════════════
   Helper: Rounded rectangle path
══════════════════════════════════════════════════════════════ */
function _rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/* ══════════════════════════════════════════════════════════════
   Factory Function: Create a tracking canvas instance
══════════════════════════════════════════════════════════════ */
export function createMissileTracking(container, options) {
  return new MissileTrackingCanvas(container, options);
}

/* ══════════════════════════════════════════════════════════════
   Utility: Format ETA for display
══════════════════════════════════════════════════════════════ */
export function formatETA(seconds) {
  if (seconds < 60) {
    return seconds + 's';
  } else if (seconds < 3600) {
    var mins = Math.floor(seconds / 60);
    var secs = seconds % 60;
    return mins + 'm ' + secs + 's';
  } else {
    var hours = Math.floor(seconds / 3600);
    var mins = Math.floor((seconds % 3600) / 60);
    return hours + 'h ' + mins + 'm';
  }
}

/* ══════════════════════════════════════════════════════════════
   Utility: Get missile type display info
══════════════════════════════════════════════════════════════ */
export function getMissileDisplayInfo(missileType) {
  var info = {
    basic: {
      label: 'Basic',
      icon: '✈',
      color: CONFIG.trailColor.basic,
      description: 'Standard missile, interceptable'
    },
    precision: {
      label: 'Precision',
      icon: '🎯',
      color: CONFIG.trailColor.precision,
      description: 'Accurate strike, interceptable'
    },
    ballistic: {
      label: 'Ballistic',
      icon: '☄️',
      color: CONFIG.trailColor.ballistic,
      description: 'Heavy payload, hard to intercept'
    },
    mirv: {
      label: 'MIRV',
      icon: '💥',
      color: CONFIG.trailColor.mirv,
      description: 'Multiple warheads, very hard to intercept'
    }
  };
  return info[missileType] || info.basic;
}

/* ══════════════════════════════════════════════════════════════
   Export Public API
══════════════════════════════════════════════════════════════ */
// export {
//   MissileTrackingCanvas,
//   createMissileTracking,
//   formatETA,
// //   getMissileDisplayInfo,
//   CONFIG as MissileTrackingConfig
// };