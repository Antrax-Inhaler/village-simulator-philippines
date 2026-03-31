/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/sprites/missilesilo.js

   Missile Silo / Launch Complex — Level 1–5 sprites
   Industrial launch facility with tower, heat bars, and launch pad.
   Center area is EMPTY — ready for missile launch animations.

   Features:
   - Launch pad with grid pattern and exhaust area
   - Support tower with X-bracing and 5 levels
   - 5 heat bars showing launch readiness
   - Tracking radar dishes
   - Control bunker with windows
   - Warning lights and flagpole
   - Sandbags and debris

   Each level uses dimensions proportional to the building's
   def.w / def.h scaled by `sc` parameter.
═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   drawSprite — main entry point for buildingSprites.js
   @param ctx      Canvas 2D context (already translated to building origin)
   @param sc       perspective scale (from perspScale)
   @param w        scaled building width  (def.w * sc)
   @param h        scaled building height (def.h * sc)
   @param def      BUILDING_DEFS entry
   @param level    building.level (1–5)
   @param now      performance.now() timestamp for animations
──────────────────────────────────────────────────────────────── */
export function drawSprite(ctx, sc, w, h, def, level, now) {
  const t = now * 0.001;
  
  // Heat level increases with building level
  const heatLevel = Math.min(100, level * 20);
  const heatBars = Math.floor(heatLevel / 20);
  
  // Tracking radar angle (rotates continuously)
  const trackingAngle = (t * 1.2) % (Math.PI * 2);
  
  // Launch tube open state cycles
  const launchTubesOpen = Math.sin(t * 0.8) > 0;
  
  // Helper functions
  const drawShadow = (rx, ry) => {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 3 * sc, rx || w * 0.62, ry || h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  
  // ============================================================
  // DRAW BASED ON LEVEL
  // ============================================================
  
  // Level determines complexity
  const hasSideBunkers = level >= 3;
  const hasRadarDish = level >= 2;
  const hasSecondaryTower = level >= 4;
  const hasHelipad = level >= 5;
  
  // Base platform width scales with level
  const platformWidth = 180 + (level - 1) * 20;
  const towerX = 90 + (level - 1) * 5;
  
  drawShadow(platformWidth * 0.5 * sc, 8 * sc);
  
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, -h * 0.8, 0, h * 0.2);
  skyGrad.addColorStop(0, '#0a1018');
  skyGrad.addColorStop(1, '#1a202c');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(-w/2, -h/2, w, h);
  
  // Ground
  ctx.fillStyle = '#1a1c1e';
  ctx.fillRect(-w/2, 0, w, h/2);
  ctx.fillStyle = '#2a2c2e';
  ctx.fillRect(-w/2, 0, w, 3 * sc);
  
  // ============================================================
  // LAUNCH PLATFORM
  // ============================================================
  
  // Main platform
  ctx.fillStyle = '#4a4840';
  ctx.fillRect(-platformWidth/2 * sc, -12 * sc, platformWidth * sc, 14 * sc);
  ctx.fillStyle = '#3a3830';
  ctx.fillRect(-(platformWidth/2 + 2) * sc, -14 * sc, (platformWidth + 4) * sc, 4 * sc);
  ctx.fillStyle = '#2a2820';
  ctx.fillRect(-(platformWidth/2 + 1) * sc, -16 * sc, (platformWidth + 2) * sc, 4 * sc);
  
  // Platform support pillars
  ctx.fillStyle = '#5a5850';
  for (let pi = 0; pi < 7; pi++) {
    ctx.fillRect(-(platformWidth/2 - 20 + pi * 35) * sc, -22 * sc, 6 * sc, 12 * sc);
    ctx.fillStyle = '#4a4840';
    ctx.fillRect(-(platformWidth/2 - 19 + pi * 35) * sc, -24 * sc, 4 * sc, 4 * sc);
    ctx.fillStyle = '#5a5850';
  }
  
  // Cross-bracing under platform
  ctx.strokeStyle = '#6a6860';
  ctx.lineWidth = 1.2 * sc;
  for (let cb = 0; cb < 6; cb++) {
    const cx = -(platformWidth/2 - 30 + cb * 35) * sc;
    ctx.beginPath();
    ctx.moveTo(cx, -22 * sc);
    ctx.lineTo(cx + 17 * sc, -12 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 17 * sc, -22 * sc);
    ctx.lineTo(cx, -12 * sc);
    ctx.stroke();
  }
  
  // Platform surface grid
  ctx.fillStyle = '#6a6860';
  for (let gi = 0; gi < 12; gi++) {
    ctx.fillRect(-(platformWidth/2 - 10 + gi * 18) * sc, -10 * sc, 2 * sc, 6 * sc);
  }
  ctx.fillStyle = '#7a7868';
  for (let gi = 0; gi < 16; gi++) {
    ctx.fillRect(-platformWidth/2 * sc, -10 * sc + gi * 1.2 * sc, platformWidth * sc, 1 * sc);
  }
  
  // Central exhaust area (where missile goes)
  ctx.fillStyle = '#2a2820';
  ctx.beginPath();
  ctx.ellipse(0, -8 * sc, 45 * sc, 12 * sc, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a3830';
  ctx.beginPath();
  ctx.ellipse(0, -8 * sc, 35 * sc, 9 * sc, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Scorch effect
  const glowAlpha = 0.1 + (heatLevel / 500);
  ctx.fillStyle = `rgba(255,100,30,${glowAlpha})`;
  ctx.beginPath();
  ctx.ellipse(0, -5 * sc, 30 * sc, 15 * sc, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Safety stripes around platform
  ctx.save();
  ctx.beginPath();
  ctx.rect(-(platformWidth/2 + 2) * sc, -16 * sc, (platformWidth + 4) * sc, 4 * sc);
  ctx.clip();
  for (let si = 0; si < 40; si++) {
    ctx.fillStyle = si % 2 === 0 ? 'rgba(245,200,66,0.7)' : 'rgba(0,0,0,0.4)';
    ctx.fillRect(-(platformWidth/2 + 2) * sc + si * 12 * sc, -16 * sc, 6 * sc, 4 * sc);
  }
  ctx.restore();
  
  // Side staircases
  ctx.fillStyle = '#6a6860';
  for (let st = 0; st < 5; st++) {
    ctx.fillRect(-(platformWidth/2 + 15) * sc, -12 * sc + st * 5 * sc, 20 * sc, 2 * sc);
    ctx.fillRect(platformWidth/2 - 5 * sc, -12 * sc + st * 5 * sc, 20 * sc, 2 * sc);
  }
  
  // ============================================================
  // LAUNCH TOWER (with heat bars)
  // ============================================================
  
  const towerHeight = 80 + (level - 1) * 5;
  const towerWidth = 30;
  
  // Main tower structure
  ctx.fillStyle = '#7a8878';
  ctx.fillRect(towerX * sc, -towerHeight * sc, towerWidth * sc, towerHeight * sc);
  
  // Vertical beams
  ctx.strokeStyle = '#8a9888';
  ctx.lineWidth = 2 * sc;
  ctx.beginPath();
  ctx.moveTo(towerX * sc, -towerHeight * sc);
  ctx.lineTo(towerX * sc, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo((towerX + towerWidth) * sc, -towerHeight * sc);
  ctx.lineTo((towerX + towerWidth) * sc, 0);
  ctx.stroke();
  
  // Horizontal beams and X-bracing
  for (let lv = 0; lv < 5; lv++) {
    const levelY = -(towerHeight - 10 - lv * 15) * sc;
    ctx.beginPath();
    ctx.moveTo(towerX * sc, levelY);
    ctx.lineTo((towerX + towerWidth) * sc, levelY);
    ctx.stroke();
    
    if (lv < 4) {
      ctx.beginPath();
      ctx.moveTo(towerX * sc, levelY);
      ctx.lineTo((towerX + towerWidth) * sc, levelY - 15 * sc);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo((towerX + towerWidth) * sc, levelY);
      ctx.lineTo(towerX * sc, levelY - 15 * sc);
      ctx.stroke();
    }
  }
  
  // Tower platforms
  for (let pl = 0; pl < 5; pl++) {
    const platY = -(towerHeight - 7 - pl * 15) * sc;
    ctx.fillStyle = '#6a7868';
    ctx.fillRect((towerX - 5) * sc, platY - 2 * sc, (towerWidth + 10) * sc, 4 * sc);
    ctx.strokeStyle = '#8a9888';
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.moveTo((towerX - 5) * sc, platY - 4 * sc);
    ctx.lineTo((towerX - 5) * sc, platY + 2 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo((towerX + towerWidth + 5) * sc, platY - 4 * sc);
    ctx.lineTo((towerX + towerWidth + 5) * sc, platY + 2 * sc);
    ctx.stroke();
  }
  
  // Ladder on tower side
  ctx.strokeStyle = '#8a9888';
  ctx.lineWidth = 1 * sc;
  for (let ld = 0; ld < 8; ld++) {
    const ladderY = -(towerHeight - 5 - ld * 9) * sc;
    ctx.beginPath();
    ctx.moveTo((towerX + towerWidth + 5) * sc, ladderY);
    ctx.lineTo((towerX + towerWidth + 11) * sc, ladderY);
    ctx.stroke();
    if (ld % 2 === 0) {
      ctx.beginPath();
      ctx.moveTo((towerX + towerWidth + 5) * sc, ladderY);
      ctx.lineTo((towerX + towerWidth + 5) * sc, ladderY + 4 * sc);
      ctx.stroke();
    }
  }
  
  // Tower top / antenna
  ctx.fillStyle = '#8a9888';
  ctx.fillRect((towerX + 7) * sc, -(towerHeight + 5) * sc, 15 * sc, 10 * sc);
  ctx.strokeStyle = '#aaa898';
  ctx.lineWidth = 1.5 * sc;
  ctx.beginPath();
  ctx.moveTo((towerX + 15) * sc, -(towerHeight + 5) * sc);
  ctx.lineTo((towerX + 15) * sc, -(towerHeight + 25) * sc);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo((towerX + 15) * sc, -(towerHeight + 25) * sc);
  ctx.lineTo((towerX + 10) * sc, -(towerHeight + 18) * sc);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo((towerX + 15) * sc, -(towerHeight + 25) * sc);
  ctx.lineTo((towerX + 20) * sc, -(towerHeight + 18) * sc);
  ctx.stroke();
  
  // Red beacon on tower
  const beacon = Math.sin(t * 3) > 0;
  ctx.fillStyle = beacon ? '#ff4444' : '#440000';
  ctx.beginPath();
  ctx.arc((towerX + 15) * sc, -(towerHeight + 7) * sc, 2.5 * sc, 0, Math.PI * 2);
  ctx.fill();
  
  // ============================================================
  // 5 HEAT BARS on Launch Tower
  // ============================================================
  
  for (let bar = 0; bar < 5; bar++) {
    const barY = -(towerHeight - 15 - bar * 14) * sc;
    
    // Bar background
    ctx.fillStyle = '#2a2820';
    ctx.fillRect((towerX - 18) * sc, barY - 3 * sc, 12 * sc, 6 * sc);
    ctx.strokeStyle = '#6a6860';
    ctx.lineWidth = 0.5 * sc;
    ctx.strokeRect((towerX - 18) * sc, barY - 3 * sc, 12 * sc, 6 * sc);
    
    // Bar fill based on heat level
    const isLit = bar < heatBars;
    if (isLit) {
      let barColor;
      if (bar < 2) barColor = '#44aa44';
      else if (bar < 4) barColor = '#f5c842';
      else barColor = '#ff4422';
      ctx.fillStyle = barColor;
      ctx.fillRect((towerX - 17) * sc, barY - 2 * sc, 10 * sc, 4 * sc);
      
      // Glow effect
      ctx.fillStyle = bar === 4 ? 'rgba(255,68,34,0.3)' : 'rgba(245,200,66,0.2)';
      ctx.beginPath();
      ctx.ellipse((towerX - 12) * sc, barY, 8 * sc, 6 * sc, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // ============================================================
  // TRACKING RADAR
  // ============================================================
  
  if (hasRadarDish) {
    ctx.save();
    ctx.translate(-(platformWidth/2 - 20) * sc, -45 * sc);
    ctx.rotate(trackingAngle);
    
    ctx.fillStyle = '#7a8878';
    ctx.fillRect(-3 * sc, -25 * sc, 6 * sc, 25 * sc);
    ctx.fillStyle = '#8a9888';
    ctx.beginPath();
    ctx.arc(0, 0, 6 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(100,180,120,0.7)';
    ctx.fillRect(-16 * sc, -12 * sc, 32 * sc, 18 * sc);
    ctx.fillStyle = 'rgba(80,160,100,0.5)';
    ctx.fillRect(-14 * sc, -10 * sc, 28 * sc, 14 * sc);
    
    // Array grid
    ctx.strokeStyle = 'rgba(200,255,200,0.4)';
    ctx.lineWidth = 0.5 * sc;
    for (let el = 0; el < 4; el++) {
      ctx.beginPath();
      ctx.moveTo(-12 * sc, -8 * sc + el * 5 * sc);
      ctx.lineTo(12 * sc, -8 * sc + el * 5 * sc);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-12 * sc + el * 8 * sc, -8 * sc);
      ctx.lineTo(-12 * sc + el * 8 * sc, 6 * sc);
      ctx.stroke();
    }
    
    // Beam effect
    const beamIntensity = 0.2 + Math.sin(t * 10) * 0.15;
    ctx.fillStyle = `rgba(80,255,80,${beamIntensity})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20 * sc, 14 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
  
  // Secondary radar (right side for higher levels)
  if (hasSecondaryTower) {
    ctx.save();
    ctx.translate((platformWidth/2 - 20) * sc, -45 * sc);
    ctx.rotate(-trackingAngle * 0.8);
    
    ctx.fillStyle = '#7a8878';
    ctx.fillRect(-3 * sc, -20 * sc, 6 * sc, 20 * sc);
    ctx.fillStyle = '#8a9888';
    ctx.beginPath();
    ctx.arc(0, 0, 5 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(100,180,120,0.6)';
    ctx.fillRect(-12 * sc, -10 * sc, 24 * sc, 14 * sc);
    ctx.fillStyle = 'rgba(80,160,100,0.4)';
    ctx.fillRect(-10 * sc, -8 * sc, 20 * sc, 10 * sc);
    
    ctx.restore();
  }
  
  // ============================================================
  // CONTROL BUNKER (center building)
  // ============================================================
  
  const bunkerWidth = 60 + (level - 1) * 5;
  
  ctx.fillStyle = '#5a5850';
  ctx.fillRect(-bunkerWidth/2 * sc, -42 * sc, bunkerWidth * sc, 42 * sc);
  ctx.fillStyle = '#4a4840';
  ctx.fillRect(-(bunkerWidth/2 + 2) * sc, -45 * sc, (bunkerWidth + 4) * sc, 6 * sc);
  ctx.fillStyle = '#3a3830';
  ctx.fillRect(-bunkerWidth/2 * sc, -48 * sc, bunkerWidth * sc, 6 * sc);
  
  // Angled roof
  ctx.fillStyle = '#6a6860';
  ctx.beginPath();
  ctx.moveTo(-(bunkerWidth/2 + 4) * sc, -45 * sc);
  ctx.lineTo(0, -58 * sc);
  ctx.lineTo((bunkerWidth/2 + 4) * sc, -45 * sc);
  ctx.closePath();
  ctx.fill();
  
  // Windows
  const windowCount = level === 1 ? 2 : level === 2 ? 3 : 4;
  for (let wi = 0; wi < windowCount; wi++) {
    const wx = -(bunkerWidth/2 - 15 + wi * 20) * sc;
    ctx.fillStyle = 'rgba(80,140,200,0.3)';
    ctx.fillRect(wx, -35 * sc, 12 * sc, 10 * sc);
    ctx.fillStyle = 'rgba(80,140,200,0.15)';
    ctx.fillRect(wx + 1 * sc, -34 * sc, 10 * sc, 8 * sc);
    ctx.strokeStyle = '#6a6860';
    ctx.lineWidth = 0.5 * sc;
    ctx.strokeRect(wx, -35 * sc, 12 * sc, 10 * sc);
  }
  
  // Door
  ctx.fillStyle = '#3a3830';
  ctx.fillRect(-10 * sc, -25 * sc, 20 * sc, 25 * sc);
  ctx.fillStyle = '#2a2820';
  ctx.fillRect(-8 * sc, -23 * sc, 16 * sc, 21 * sc);
  ctx.strokeStyle = '#6a6860';
  ctx.lineWidth = 0.8 * sc;
  ctx.strokeRect(-8 * sc, -23 * sc, 16 * sc, 21 * sc);
  ctx.beginPath();
  ctx.moveTo(0, -23 * sc);
  ctx.lineTo(0, -2 * sc);
  ctx.stroke();
  
  // Warning stripes on bunker
  ctx.save();
  ctx.beginPath();
  ctx.rect(-bunkerWidth/2 * sc, -8 * sc, bunkerWidth * sc, 6 * sc);
  ctx.clip();
  for (let si = 0; si < 20; si++) {
    ctx.fillStyle = si % 2 === 0 ? 'rgba(245,200,66,0.55)' : 'rgba(0,0,0,0.3)';
    ctx.fillRect(-bunkerWidth/2 * sc + si * 12 * sc, -8 * sc, 6 * sc, 6 * sc);
  }
  ctx.restore();
  
  // ============================================================
  // HELIPAD (level 5)
  // ============================================================
  
  if (hasHelipad) {
    ctx.fillStyle = '#4a4840';
    ctx.fillRect(-30 * sc, -75 * sc, 60 * sc, 8 * sc);
    ctx.fillStyle = '#3a3830';
    ctx.fillRect(-28 * sc, -77 * sc, 56 * sc, 4 * sc);
    
    // Helipad H marking
    ctx.strokeStyle = '#f5c842';
    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    ctx.moveTo(-10 * sc, -73 * sc);
    ctx.lineTo(-10 * sc, -67 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10 * sc, -73 * sc);
    ctx.lineTo(10 * sc, -67 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10 * sc, -70 * sc);
    ctx.lineTo(10 * sc, -70 * sc);
    ctx.stroke();
  }
  
  // ============================================================
  // SIDE BUNKERS / EQUIPMENT (level 3+)
  // ============================================================
  
  if (hasSideBunkers) {
    // Left equipment bunker
    ctx.fillStyle = '#5a5850';
    ctx.fillRect(-(platformWidth/2 + 15) * sc, -25 * sc, 18 * sc, 25 * sc);
    ctx.fillStyle = '#4a4840';
    ctx.fillRect(-(platformWidth/2 + 14) * sc, -28 * sc, 16 * sc, 5 * sc);
    ctx.fillStyle = 'rgba(80,140,200,0.25)';
    ctx.fillRect(-(platformWidth/2 + 11) * sc, -20 * sc, 10 * sc, 8 * sc);
    
    // Right equipment bunker
    ctx.fillStyle = '#5a5850';
    ctx.fillRect((platformWidth/2 - 3) * sc, -25 * sc, 18 * sc, 25 * sc);
    ctx.fillStyle = '#4a4840';
    ctx.fillRect((platformWidth/2 - 2) * sc, -28 * sc, 16 * sc, 5 * sc);
    ctx.fillStyle = 'rgba(80,140,200,0.25)';
    ctx.fillRect((platformWidth/2 + 1) * sc, -20 * sc, 10 * sc, 8 * sc);
  }
  
  // ============================================================
  // WARNING LIGHTS
  // ============================================================
  
  const warningLight = (x, y, speed) => {
    const blink = Math.sin(t * (speed || 2.5)) > 0;
    ctx.fillStyle = blink ? '#ff0000' : '#440000';
    ctx.beginPath();
    ctx.arc(x, y, 3 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = blink ? 'rgba(255,0,0,0.4)' : 'rgba(255,0,0,0.05)';
    ctx.beginPath();
    ctx.arc(x, y, 8 * sc, 0, Math.PI * 2);
    ctx.fill();
  };
  
  warningLight(-(platformWidth/2 + 5) * sc, -50 * sc, 3);
  warningLight((platformWidth/2 + 5) * sc, -50 * sc, 3);
  warningLight(0, -70 * sc, 2);
  
  // ============================================================
  // FLAGPOLE
  // ============================================================
  
  const flagpole = (x, y, height) => {
    ctx.strokeStyle = '#8a8878';
    ctx.lineWidth = 1.2 * sc;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - height);
    ctx.stroke();
    
    const fw = 20 * sc, fh = 12 * sc, fy = y - height;
    ctx.save();
    ctx.translate(x, fy);
    ctx.fillStyle = '#3a6abf';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let i = 0; i <= fw; i += 1) {
      ctx.lineTo(i, Math.sin(t * 2 + i * 0.04) * 1.5 * sc);
    }
    ctx.lineTo(fw, fh/2);
    ctx.lineTo(0, fh/2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#cc2222';
    ctx.beginPath();
    ctx.moveTo(0, fh/2);
    for (let i = 0; i <= fw; i += 1) {
      ctx.lineTo(i, fh/2 + Math.sin(t * 2 + i * 0.04) * 1.5 * sc);
    }
    ctx.lineTo(fw, fh);
    ctx.lineTo(0, fh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, fh);
    ctx.lineTo(fh * 0.8, fh/2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f5c842';
    ctx.beginPath();
    ctx.arc(fh * 0.35, fh/2, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    ctx.fillStyle = '#f5c842';
    ctx.beginPath();
    ctx.arc(x, y - height, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
  };
  
  flagpole(-(platformWidth/2 + 10) * sc, -45 * sc, 48 * sc);
  
  // ============================================================
  // CONCRETE BARRIERS AND SANDBAGS
  // ============================================================
  
  // Concrete barriers
  ctx.fillStyle = '#6a6860';
  for (let br = 0; br < 5; br++) {
    ctx.fillRect(-(platformWidth/2 + 25 + br * 20) * sc, -6 * sc, 8 * sc, 10 * sc);
    ctx.fillStyle = '#5a5850';
    ctx.fillRect(-(platformWidth/2 + 24 + br * 20) * sc, -8 * sc, 6 * sc, 4 * sc);
    ctx.fillStyle = '#6a6860';
  }
  
  // Sandbags
  for (let sb = 0; sb < 12; sb++) {
    const bx = -(platformWidth/2 + 20 + sb * 12) * sc;
    ctx.fillStyle = sb % 2 === 0 ? '#8a7a5a' : '#7a6a4a';
    ctx.beginPath();
    ctx.ellipse(bx, -2 * sc, 5 * sc, 3 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.6 * sc;
    ctx.beginPath();
    ctx.moveTo(bx - 4 * sc, -2 * sc);
    ctx.lineTo(bx + 4 * sc, -2 * sc);
    ctx.stroke();
  }
  
  // Debris/rocks
  ctx.fillStyle = 'rgba(100,98,94,0.5)';
  for (let dr = 0; dr < 20; dr++) {
    const rx = -(platformWidth/2 + 30 + dr * 10) * sc;
    ctx.beginPath();
    ctx.ellipse(rx, 4 * sc + (dr % 6) * sc, 1.5 * sc, 1 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}