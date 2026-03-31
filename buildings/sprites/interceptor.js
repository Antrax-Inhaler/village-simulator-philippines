/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/sprites/interceptor.js

   Interceptor Battery — Level 1–5 sprites
   Short-range anti-missile / anti-air defense system with
   rapid-fire interceptor missiles and tracking radars.

   Features:
   - Multiple interceptor launch tubes (2-6 tubes based on level)
   - Missiles visible inside open tubes
   - Tracking radar array (rotating)
   - Control bunker with status displays
   - Support equipment and reloader vehicles
   - Warning lights and flagpole
   - Perimeter defenses

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
  
  // Number of interceptor tubes increases with level
  const tubeCount = level === 1 ? 2 : level === 2 ? 3 : level === 3 ? 4 : level === 4 ? 5 : 6;
  
  // Tracking radar angles
  const trackingAngle = (t * 1.2) % (Math.PI * 2);
  const secondaryAngle = (t * 0.9) % (Math.PI * 2);
  
  // Launch tubes cycle open/closed
  const launchTubesOpen = Math.sin(t * 0.8) > 0;
  
  // Alert level increases with building level
  const alertLevel = level;
  const alertBlinkSpeed = 2 + (alertLevel / 3);
  
  // Base dimensions
  const platformWidth = 140 + (level - 1) * 15;
  const bunkerWidth = 60 + (level - 1) * 5;
  
  // Helper: draw shadow
  const drawShadow = (rx, ry) => {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 3 * sc, rx || w * 0.62, ry || h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  
  drawShadow(platformWidth * 0.55 * sc, 8 * sc);
  
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, -h * 0.8, 0, h * 0.2);
  skyGrad.addColorStop(0, '#0a1018');
  skyGrad.addColorStop(0.5, '#141a24');
  skyGrad.addColorStop(1, '#1a202c');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(-w/2, -h/2, w, h);
  
  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  for (let st = 0; st < 12; st++) {
    const sx = -w/2 + 40 + (st * 50) % w;
    const sy = -h/2 + 20 + (st * 28) % (h * 0.35);
    ctx.beginPath();
    ctx.arc(sx, sy, 1 * sc, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Ground
  ctx.fillStyle = '#1a1c1e';
  ctx.fillRect(-w/2, 0, w, h/2);
  ctx.fillStyle = '#2a2c2e';
  ctx.fillRect(-w/2, 0, w, 3 * sc);
  
  // Ground texture
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 0.5 * sc;
  for (let xi = -w/2; xi < w/2; xi += 15 * sc) {
    ctx.beginPath();
    ctx.moveTo(xi, 0);
    ctx.lineTo(xi + 3 * sc, h/2);
    ctx.stroke();
  }
  
  // ============================================================
  // MAIN LAUNCH PLATFORM
  // ============================================================
  
  ctx.fillStyle = '#4a4840';
  ctx.fillRect(-platformWidth/2 * sc, -12 * sc, platformWidth * sc, 14 * sc);
  ctx.fillStyle = '#3a3830';
  ctx.fillRect(-(platformWidth/2 + 2) * sc, -14 * sc, (platformWidth + 4) * sc, 4 * sc);
  ctx.fillStyle = '#2a2820';
  ctx.fillRect(-(platformWidth/2 + 1) * sc, -16 * sc, (platformWidth + 2) * sc, 4 * sc);
  
  // Platform support pillars
  ctx.fillStyle = '#5a5850';
  for (let pi = 0; pi < 6; pi++) {
    ctx.fillRect(-(platformWidth/2 - 15 + pi * 35) * sc, -22 * sc, 6 * sc, 12 * sc);
    ctx.fillStyle = '#4a4840';
    ctx.fillRect(-(platformWidth/2 - 14 + pi * 35) * sc, -24 * sc, 4 * sc, 4 * sc);
    ctx.fillStyle = '#5a5850';
  }
  
  // Cross-bracing under platform
  ctx.strokeStyle = '#6a6860';
  ctx.lineWidth = 1.2 * sc;
  for (let cb = 0; cb < 5; cb++) {
    const cx = -(platformWidth/2 - 25 + cb * 38) * sc;
    ctx.beginPath();
    ctx.moveTo(cx, -22 * sc);
    ctx.lineTo(cx + 19 * sc, -12 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 19 * sc, -22 * sc);
    ctx.lineTo(cx, -12 * sc);
    ctx.stroke();
  }
  
  // Platform surface grid
  ctx.fillStyle = '#6a6860';
  for (let gi = 0; gi < 14; gi++) {
    ctx.fillRect(-(platformWidth/2 - 10 + gi * 18) * sc, -10 * sc, 2 * sc, 6 * sc);
  }
  ctx.fillStyle = '#7a7868';
  for (let gi = 0; gi < 14; gi++) {
    ctx.fillRect(-platformWidth/2 * sc, -10 * sc + gi * 1.2 * sc, platformWidth * sc, 1 * sc);
  }
  
  // Safety stripes
  ctx.save();
  ctx.beginPath();
  ctx.rect(-(platformWidth/2 + 2) * sc, -16 * sc, (platformWidth + 4) * sc, 4 * sc);
  ctx.clip();
  for (let si = 0; si < 38; si++) {
    ctx.fillStyle = si % 2 === 0 ? 'rgba(245,200,66,0.7)' : 'rgba(0,0,0,0.4)';
    ctx.fillRect(-(platformWidth/2 + 2) * sc + si * 12 * sc, -16 * sc, 6 * sc, 4 * sc);
  }
  ctx.restore();
  
  // ============================================================
  // INTERCEPTOR LAUNCH TUBES
  // ============================================================
  
  const drawLaunchTube = (x, y, isOpen, tubeIndex) => {
    // Tube housing
    ctx.fillStyle = '#5a6858';
    ctx.fillRect(x - 10 * sc, y - 28 * sc, 20 * sc, 32 * sc);
    ctx.fillStyle = '#4a5848';
    ctx.fillRect(x - 8 * sc, y - 26 * sc, 16 * sc, 28 * sc);
    
    // Tube numbering
    ctx.fillStyle = '#a0b090';
    ctx.font = `${6 * sc}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(tubeIndex + 1, x, y - 18 * sc);
    
    if (isOpen) {
      // Open position - doors slid to sides
      ctx.fillStyle = '#3a4838';
      ctx.fillRect(x - 14 * sc, y - 26 * sc, 6 * sc, 28 * sc);
      ctx.fillRect(x + 8 * sc, y - 26 * sc, 6 * sc, 28 * sc);
      
      // Interceptor missile visible inside
      // Missile nose cone
      ctx.fillStyle = '#8a8880';
      ctx.beginPath();
      ctx.moveTo(x - 5 * sc, y - 26 * sc);
      ctx.lineTo(x, y - 38 * sc);
      ctx.lineTo(x + 5 * sc, y - 26 * sc);
      ctx.closePath();
      ctx.fill();
      
      // Missile body
      ctx.fillStyle = '#c8c6be';
      ctx.fillRect(x - 5 * sc, y - 24 * sc, 10 * sc, 20 * sc);
      
      // Red band
      ctx.fillStyle = '#cc2222';
      ctx.fillRect(x - 5 * sc, y - 16 * sc, 10 * sc, 3 * sc);
      
      // Gold band
      ctx.fillStyle = '#f5c842';
      ctx.fillRect(x - 5 * sc, y - 8 * sc, 10 * sc, 2 * sc);
      
      // Fins
      ctx.fillStyle = '#8a8880';
      ctx.beginPath();
      ctx.moveTo(x - 5 * sc, y - 6 * sc);
      ctx.lineTo(x - 10 * sc, y - 2 * sc);
      ctx.lineTo(x - 5 * sc, y - 2 * sc);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 5 * sc, y - 6 * sc);
      ctx.lineTo(x + 10 * sc, y - 2 * sc);
      ctx.lineTo(x + 5 * sc, y - 2 * sc);
      ctx.closePath();
      ctx.fill();
      
      // Exhaust glow (pulsing)
      const pulse = 0.4 + Math.sin(t * 8 + tubeIndex) * 0.3;
      ctx.fillStyle = `rgba(255,100,30,${pulse})`;
      ctx.beginPath();
      ctx.ellipse(x, y - 2 * sc, 4 * sc, 6 * sc, 0, 0, Math.PI * 2);
      ctx.fill();
      
    } else {
      // Closed position - armored cap
      ctx.fillStyle = '#6a7868';
      ctx.fillRect(x - 8 * sc, y - 26 * sc, 16 * sc, 6 * sc);
      ctx.fillStyle = '#7a8878';
      ctx.fillRect(x - 6 * sc, y - 28 * sc, 12 * sc, 4 * sc);
      
      // Warning light on cap
      const blink = Math.sin(t * 4 + tubeIndex) > 0;
      ctx.fillStyle = blink ? '#ff4444' : '#440000';
      ctx.beginPath();
      ctx.arc(x, y - 26 * sc, 2 * sc, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  
  // Position tubes evenly across the platform
  const tubeSpacing = platformWidth / (tubeCount + 1);
  for (let ti = 0; ti < tubeCount; ti++) {
    const tubeX = -(platformWidth/2 - tubeSpacing * (ti + 1)) * sc;
    drawLaunchTube(tubeX, -5 * sc, launchTubesOpen, ti);
  }
  
  // ============================================================
  // TRACKING RADAR ARRAY
  // ============================================================
  
  const drawTrackingRadar = (cx, cy, size, angle, isPrimary = true) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    
    // Support mast
    ctx.fillStyle = '#7a8878';
    ctx.fillRect(-3 * sc, -size * 1.4 * sc, 6 * sc, size * 1.4 * sc);
    
    // Pivot base
    ctx.fillStyle = '#8a9888';
    ctx.beginPath();
    ctx.arc(0, 0, 6 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6a7868';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    // Radar array panel (phased array)
    ctx.fillStyle = 'rgba(100,180,120,0.7)';
    ctx.fillRect(-size * sc, -size * 0.5 * sc, size * 2 * sc, size * sc);
    ctx.fillStyle = 'rgba(80,160,100,0.5)';
    ctx.fillRect(-(size - 2) * sc, -(size * 0.5 - 2) * sc, (size * 2 - 4) * sc, (size - 4) * sc);
    
    // Array elements grid
    ctx.strokeStyle = 'rgba(200,255,200,0.4)';
    ctx.lineWidth = 0.5 * sc;
    for (let el = 0; el < 4; el++) {
      ctx.beginPath();
      ctx.moveTo(-(size - 4) * sc, -(size * 0.5 - 4) * sc + el * 6 * sc);
      ctx.lineTo((size - 4) * sc, -(size * 0.5 - 4) * sc + el * 6 * sc);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-(size - 4) * sc + el * 7 * sc, -(size * 0.5 - 4) * sc);
      ctx.lineTo(-(size - 4) * sc + el * 7 * sc, (size * 0.5 - 4) * sc);
      ctx.stroke();
    }
    
    // Tracking beam effect
    const beamIntensity = 0.2 + Math.sin(t * 10) * 0.15;
    ctx.fillStyle = `rgba(80,255,80,${beamIntensity})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 1.2 * sc, size * 0.8 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  };
  
  // Main tracking radar (left side)
  drawTrackingRadar(-(platformWidth/2 + 15) * sc, -38 * sc, 16, trackingAngle, true);
  
  // Secondary tracking radar (right side)
  if (level >= 2) {
    drawTrackingRadar((platformWidth/2 + 15) * sc, -38 * sc, 13, secondaryAngle, false);
  }
  
  // Third radar (center, higher level)
  if (level >= 4) {
    drawTrackingRadar(0, -55 * sc, 12, -trackingAngle * 0.7, false);
  }
  
  // ============================================================
  // CONTROL BUNKER
  // ============================================================
  
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
  
  // Command windows
  const windowCount = level === 1 ? 2 : level === 2 ? 3 : 4;
  for (let wi = 0; wi < windowCount; wi++) {
    const wx = -(bunkerWidth/2 - 15 + wi * 20) * sc;
    
    ctx.fillStyle = 'rgba(80,140,200,0.3)';
    ctx.fillRect(wx, -35 * sc, 12 * sc, 10 * sc);
    ctx.fillStyle = 'rgba(80,140,200,0.15)';
    ctx.fillRect(wx + 1 * sc, -34 * sc, 10 * sc, 8 * sc);
    
    // Window glow
    const glowIntensity = 0.1 + Math.sin(t * 2 + wi) * 0.05;
    ctx.fillStyle = `rgba(100,160,220,${glowIntensity})`;
    ctx.fillRect(wx + 2 * sc, -33 * sc, 8 * sc, 5 * sc);
    
    ctx.strokeStyle = '#6a6860';
    ctx.lineWidth = 0.5 * sc;
    ctx.strokeRect(wx, -35 * sc, 12 * sc, 10 * sc);
    
    // Cross bars
    ctx.beginPath();
    ctx.moveTo(wx + 6 * sc, -35 * sc);
    ctx.lineTo(wx + 6 * sc, -25 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wx, -30 * sc);
    ctx.lineTo(wx + 12 * sc, -30 * sc);
    ctx.stroke();
  }
  
  // Bunker door
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
  
  // Door handle
  ctx.fillStyle = '#8a8878';
  ctx.fillRect(5 * sc, -12 * sc, 3 * sc, 2 * sc);
  
  // Warning stripes on bunker
  ctx.save();
  ctx.beginPath();
  ctx.rect(-bunkerWidth/2 * sc, -6 * sc, bunkerWidth * sc, 6 * sc);
  ctx.clip();
  for (let si = 0; si < 25; si++) {
    ctx.fillStyle = si % 2 === 0 ? 'rgba(245,200,66,0.55)' : 'rgba(0,0,0,0.3)';
    ctx.fillRect(-bunkerWidth/2 * sc + si * 12 * sc, -6 * sc, 6 * sc, 6 * sc);
  }
  ctx.restore();
  
  // ============================================================
  // STATUS INDICATOR PANEL
  // ============================================================
  
  if (level >= 2) {
    const panelX = bunkerWidth/2 - 35;
    
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect((panelX - 25) * sc, -20 * sc, 50 * sc, 18 * sc);
    ctx.strokeStyle = '#6a8860';
    ctx.lineWidth = 0.8 * sc;
    ctx.strokeRect((panelX - 25) * sc, -20 * sc, 50 * sc, 18 * sc);
    
    // Status lights
    const statusLights = [
      { label: 'PWR', active: true, color: '#44ff44', x: -18 },
      { label: 'TRK', active: true, color: '#44ff44', x: -8 },
      { label: 'ARM', active: launchTubesOpen, color: '#f5c842', x: 2 },
      { label: 'ALRT', active: Math.sin(t * alertBlinkSpeed) > 0, color: '#ff4444', x: 12 }
    ];
    
    for (let sl = 0; sl < statusLights.length; sl++) {
      const light = statusLights[sl];
      const lx = (panelX + light.x) * sc;
      const ly = -14 * sc;
      
      ctx.fillStyle = light.active ? light.color : '#2a2a1a';
      ctx.beginPath();
      ctx.arc(lx, ly, 2.5 * sc, 0, Math.PI * 2);
      ctx.fill();
      
      if (light.active && light.color === '#ff4444') {
        ctx.fillStyle = 'rgba(255,68,68,0.3)';
        ctx.beginPath();
        ctx.arc(lx, ly, 5 * sc, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.fillStyle = '#6a8860';
      ctx.font = `${4.5 * sc}px monospace`;
      ctx.fillText(light.label, lx - 3 * sc, ly - 4 * sc);
    }
  }
  
  // ============================================================
  // SUPPORT VEHICLE / RELOADER (level 3+)
  // ============================================================
  
  if (level >= 3) {
    // Reloader truck on left
    ctx.fillStyle = '#5a6858';
    ctx.fillRect(-(platformWidth/2 + 25) * sc, -8 * sc, 28 * sc, 12 * sc);
    ctx.fillStyle = '#4a5848';
    ctx.fillRect(-(platformWidth/2 + 23) * sc, -14 * sc, 24 * sc, 6 * sc);
    
    // Wheels
    ctx.fillStyle = '#2a2820';
    ctx.beginPath();
    ctx.arc(-(platformWidth/2 + 18) * sc, -2 * sc, 3 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-(platformWidth/2 + 2) * sc, -2 * sc, 3 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    // Cargo bed with spare missiles
    ctx.fillStyle = '#c8c6be';
    ctx.fillRect(-(platformWidth/2 + 22) * sc, -10 * sc, 22 * sc, 4 * sc);
    
    // Spare missiles in truck
    for (let sm = 0; sm < 3; sm++) {
      ctx.fillStyle = '#cc2222';
      ctx.fillRect(-(platformWidth/2 + 20 + sm * 7) * sc, -12 * sc, 2 * sc, 3 * sc);
      ctx.fillStyle = '#8a8880';
      ctx.fillRect(-(platformWidth/2 + 20 + sm * 7) * sc, -13 * sc, 2 * sc, 2 * sc);
    }
    
    // Ammo container on right (level 4+)
    if (level >= 4) {
      ctx.fillStyle = '#6a6860';
      ctx.fillRect((platformWidth/2 + 10) * sc, -12 * sc, 25 * sc, 15 * sc);
      ctx.fillStyle = '#5a5850';
      ctx.fillRect((platformWidth/2 + 12) * sc, -14 * sc, 21 * sc, 4 * sc);
      ctx.fillStyle = '#4a4840';
      ctx.fillRect((platformWidth/2 + 14) * sc, -8 * sc, 17 * sc, 8 * sc);
      
      // Hazard marking
      ctx.fillStyle = '#f5c842';
      ctx.fillRect((platformWidth/2 + 14) * sc, -8 * sc, 17 * sc, 2 * sc);
    }
  }
  
  // ============================================================
  // SENSOR MASTS
  // ============================================================
  
  const drawSensorMast = (x, y, height) => {
    ctx.strokeStyle = '#7a8878';
    ctx.lineWidth = 1.2 * sc;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - height);
    ctx.stroke();
    
    // Sensor head
    ctx.fillStyle = '#8a9888';
    ctx.fillRect(x - 4 * sc, y - height - 3 * sc, 8 * sc, 6 * sc);
    ctx.fillStyle = '#6a7868';
    ctx.fillRect(x - 3 * sc, y - height - 2 * sc, 6 * sc, 4 * sc);
    
    // Scanning light
    const scan = Math.sin(t * 5) > 0;
    ctx.fillStyle = scan ? '#44ff44' : '#226622';
    ctx.beginPath();
    ctx.arc(x, y - height - 1 * sc, 1.5 * sc, 0, Math.PI * 2);
    ctx.fill();
  };
  
  drawSensorMast(-(platformWidth/2 + 20) * sc, -12 * sc, 30 * sc);
  drawSensorMast((platformWidth/2 + 20) * sc, -12 * sc, 30 * sc);
  
  if (level >= 4) {
    drawSensorMast(0, -20 * sc, 25 * sc);
  }
  
  // ============================================================
  // ANTENNA MAST ON BUNKER
  // ============================================================
  
  ctx.strokeStyle = '#8a9888';
  ctx.lineWidth = 1.2 * sc;
  ctx.beginPath();
  ctx.moveTo(0, -58 * sc);
  ctx.lineTo(0, -75 * sc);
  ctx.stroke();
  
  const beacon = Math.sin(t * 4) > 0;
  ctx.fillStyle = beacon ? '#ff4444' : '#440000';
  ctx.beginPath();
  ctx.arc(0, -77 * sc, 2 * sc, 0, Math.PI * 2);
  ctx.fill();
  
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
  
  warningLight(-(platformWidth/2 + 10) * sc, -45 * sc, alertBlinkSpeed);
  warningLight((platformWidth/2 + 10) * sc, -45 * sc, alertBlinkSpeed);
  warningLight(0, -65 * sc, alertBlinkSpeed - 0.5);
  
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
  
  flagpole(-(platformWidth/2 + 30) * sc, -45 * sc, 48 * sc);
  
  // ============================================================
  // CONCRETE BARRIERS AND SANDBAGS
  // ============================================================
  
  // Concrete barriers
  ctx.fillStyle = '#6a6860';
  for (let br = 0; br < 6; br++) {
    ctx.fillRect(-(platformWidth/2 + 30 + br * 18) * sc, -6 * sc, 8 * sc, 10 * sc);
    ctx.fillStyle = '#5a5850';
    ctx.fillRect(-(platformWidth/2 + 29 + br * 18) * sc, -8 * sc, 6 * sc, 4 * sc);
    ctx.fillStyle = '#6a6860';
  }
  
  for (let br = 0; br < 6; br++) {
    ctx.fillRect((platformWidth/2 + 10 + br * 18) * sc, -6 * sc, 8 * sc, 10 * sc);
    ctx.fillStyle = '#5a5850';
    ctx.fillRect((platformWidth/2 + 11 + br * 18) * sc, -8 * sc, 6 * sc, 4 * sc);
    ctx.fillStyle = '#6a6860';
  }
  
  // Sandbags
  for (let sb = 0; sb < 14; sb++) {
    const bx = -(platformWidth/2 + 20 + sb * 12) * sc;
    if (Math.abs(bx) < platformWidth/2 * sc) continue;
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
  for (let dr = 0; dr < 25; dr++) {
    const rx = -(platformWidth/2 + 35 + dr * 12) * sc;
    if (Math.abs(rx) < platformWidth/2 * sc) continue;
    ctx.beginPath();
    ctx.ellipse(rx, 3 * sc + (dr % 6) * sc, 1.5 * sc, 1 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}