/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/sprites/radarstation.js

   Radar Station — Level 1–5 sprites
   Early warning and tracking facility with rotating radar dishes,
   command center, and detection equipment.

   Features:
   - Main rotating radar dish (size increases with level)
   - Secondary tracking radars
   - Radar screen display with sweep and blips
   - Control bunker with windows
   - Antenna masts with warning lights
   - Support equipment and perimeter defenses
   - Flagpole with Philippine flag

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
  
  // Radar sweep angle (continuous rotation)
  const sweepAngle = (t * 1.2) % (Math.PI * 2);
  const secondaryAngle = (t * 0.8) % (Math.PI * 2);
  const tertiaryAngle = (t * 1.5) % (Math.PI * 2);
  
  // Level determines complexity
  const hasLargeDish = level >= 3;
  const hasSecondaryDish = level >= 2;
  const hasTertiaryDish = level >= 4;
  const hasRadarScreen = level >= 2;
  const hasSideBuildings = level >= 3;
  const hasHelipad = level >= 5;
  
  // Base dimensions scale with level
  const buildingWidth = 100 + (level - 1) * 10;
  const dishSize = 18 + (level - 1) * 3;
  const antennaHeight = 45 + (level - 1) * 5;
  
  // Helper: draw shadow
  const drawShadow = (rx, ry) => {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 3 * sc, rx || w * 0.62, ry || h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  
  drawShadow(buildingWidth * 0.6 * sc, 8 * sc);
  
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, -h * 0.8, 0, h * 0.2);
  skyGrad.addColorStop(0, '#0e1420');
  skyGrad.addColorStop(0.5, '#181e28');
  skyGrad.addColorStop(1, '#222634');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(-w/2, -h/2, w, h);
  
  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let st = 0; st < 15; st++) {
    const sx = -w/2 + 50 + (st * 40) % w;
    const sy = -h/2 + 20 + (st * 23) % (h * 0.4);
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
  // MAIN BUILDING BASE (Concrete bunker)
  // ============================================================
  
  // Main building
  ctx.fillStyle = '#4a4840';
  ctx.fillRect(-buildingWidth/2 * sc, -42 * sc, buildingWidth * sc, 45 * sc);
  ctx.fillStyle = '#3a3830';
  ctx.fillRect(-(buildingWidth/2 + 2) * sc, -45 * sc, (buildingWidth + 4) * sc, 6 * sc);
  ctx.fillStyle = '#2a2820';
  ctx.fillRect(-(buildingWidth/2 + 1) * sc, -48 * sc, (buildingWidth + 2) * sc, 6 * sc);
  
  // Building roof with angle
  ctx.fillStyle = '#5a5850';
  ctx.beginPath();
  ctx.moveTo(-(buildingWidth/2 + 4) * sc, -45 * sc);
  ctx.lineTo(0, -60 * sc);
  ctx.lineTo((buildingWidth/2 + 4) * sc, -45 * sc);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4a4840';
  ctx.beginPath();
  ctx.moveTo(-buildingWidth/2 * sc, -45 * sc);
  ctx.lineTo(0, -57 * sc);
  ctx.lineTo(buildingWidth/2 * sc, -45 * sc);
  ctx.closePath();
  ctx.fill();
  
  // Panel lines on building
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 0.8 * sc;
  for (let pl = 0; pl < 6; pl++) {
    ctx.beginPath();
    ctx.moveTo(-(buildingWidth/2 - 15 + pl * 25) * sc, -42 * sc);
    ctx.lineTo(-(buildingWidth/2 - 15 + pl * 25) * sc, 0);
    ctx.stroke();
  }
  
  // ============================================================
  // WINDOWS (Control room)
  // ============================================================
  
  const windowCount = level === 1 ? 3 : level === 2 ? 4 : 5;
  for (let wi = 0; wi < windowCount; wi++) {
    const wx = -(buildingWidth/2 - 20 + wi * 25) * sc;
    
    // Window frame
    ctx.fillStyle = 'rgba(80,140,200,0.3)';
    ctx.fillRect(wx, -32 * sc, 14 * sc, 10 * sc);
    ctx.fillStyle = 'rgba(80,140,200,0.15)';
    ctx.fillRect(wx + 1 * sc, -31 * sc, 12 * sc, 8 * sc);
    
    // Window glow (pulsing)
    const glowIntensity = 0.1 + Math.sin(t * 2 + wi) * 0.05;
    ctx.fillStyle = `rgba(100,160,220,${glowIntensity})`;
    ctx.fillRect(wx + 2 * sc, -30 * sc, 10 * sc, 6 * sc);
    
    // Window frame outline
    ctx.strokeStyle = '#6a6860';
    ctx.lineWidth = 0.5 * sc;
    ctx.strokeRect(wx, -32 * sc, 14 * sc, 10 * sc);
    
    // Cross bars
    ctx.beginPath();
    ctx.moveTo(wx + 7 * sc, -32 * sc);
    ctx.lineTo(wx + 7 * sc, -22 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wx, -27 * sc);
    ctx.lineTo(wx + 14 * sc, -27 * sc);
    ctx.stroke();
  }
  
  // ============================================================
  // MAIN ENTRANCE DOOR
  // ============================================================
  
  ctx.fillStyle = '#3a3830';
  ctx.fillRect(-12 * sc, -22 * sc, 24 * sc, 25 * sc);
  ctx.fillStyle = '#2a2820';
  ctx.fillRect(-10 * sc, -20 * sc, 20 * sc, 21 * sc);
  ctx.strokeStyle = '#6a6860';
  ctx.lineWidth = 0.8 * sc;
  ctx.strokeRect(-10 * sc, -20 * sc, 20 * sc, 21 * sc);
  
  // Door center line
  ctx.beginPath();
  ctx.moveTo(0, -20 * sc);
  ctx.lineTo(0, 1 * sc);
  ctx.stroke();
  
  // Door handle
  ctx.fillStyle = '#8a8878';
  ctx.fillRect(5 * sc, -10 * sc, 3 * sc, 2 * sc);
  
  // Warning stripes on building base
  ctx.save();
  ctx.beginPath();
  ctx.rect(-buildingWidth/2 * sc, -6 * sc, buildingWidth * sc, 6 * sc);
  ctx.clip();
  for (let si = 0; si < 30; si++) {
    ctx.fillStyle = si % 2 === 0 ? 'rgba(245,200,66,0.55)' : 'rgba(0,0,0,0.3)';
    ctx.fillRect(-buildingWidth/2 * sc + si * 12 * sc, -6 * sc, 6 * sc, 6 * sc);
  }
  ctx.restore();
  
  // ============================================================
  // MAIN ROTATING RADAR DISH
  // ============================================================
  
  const drawRadarDish = (cx, cy, size, angle, hasGrid = true) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    
    // Support mast
    ctx.fillStyle = '#7a8878';
    ctx.fillRect(-4 * sc, -size * 1.5 * sc, 8 * sc, size * 1.5 * sc);
    
    // Pivot base
    ctx.fillStyle = '#8a9888';
    ctx.beginPath();
    ctx.arc(0, 0, 7 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6a7868';
    ctx.beginPath();
    ctx.arc(0, 0, 4 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    // Main dish (parabolic)
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.5 * sc, size * sc, size * 0.35 * sc, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(160,180,150,0.5)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.5 * sc, size * 0.85 * sc, size * 0.3 * sc, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200,210,190,0.6)';
    ctx.fill();
    
    // Dish grid lines
    if (hasGrid) {
      ctx.strokeStyle = 'rgba(100,120,90,0.4)';
      ctx.lineWidth = 0.6 * sc;
      for (let gl = 0; gl < 4; gl++) {
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.5 * sc + gl * 3 * sc, size * 0.9 * sc, size * 0.05 * sc, -0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    
    // Feed horn / receiver
    ctx.fillStyle = '#aaa898';
    ctx.beginPath();
    ctx.rect(-4 * sc, -size * 0.9 * sc, 8 * sc, 9 * sc);
    ctx.fill();
    ctx.fillStyle = '#f5c842';
    ctx.beginPath();
    ctx.arc(0, -size * 0.85 * sc, 2.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    // Blinking receiver light
    const blip = Math.sin(t * 5) > 0;
    ctx.fillStyle = blip ? '#ff4444' : '#440000';
    ctx.beginPath();
    ctx.arc(0, -size * 0.85 * sc, 1.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  };
  
  // Main dish (center roof)
  const dishY = -52 - (level - 1) * 2;
  drawRadarDish(0, dishY * sc, dishSize, sweepAngle, level >= 2);
  
  // ============================================================
  // SECONDARY RADAR DISHES
  // ============================================================
  
  if (hasSecondaryDish) {
    // Left secondary dish
    drawRadarDish(-45 * sc, -48 * sc, dishSize - 4, secondaryAngle, level >= 3);
    
    // Right secondary dish
    drawRadarDish(45 * sc, -48 * sc, dishSize - 4, -secondaryAngle, level >= 3);
  }
  
  if (hasTertiaryDish) {
    // Third dish on left side
    drawRadarDish(-70 * sc, -40 * sc, dishSize - 8, tertiaryAngle, false);
    
    // Fourth dish on right side
    drawRadarDish(70 * sc, -40 * sc, dishSize - 8, -tertiaryAngle, false);
  }
  
  // ============================================================
  // RADAR SCREEN DISPLAY (on building wall)
  // ============================================================
  
  if (hasRadarScreen) {
    const screenY = -22;
    const screenX = buildingWidth/2 - 35;
    
    // Screen background
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect((screenX - 25) * sc, screenY * sc, 50 * sc, 24 * sc);
    ctx.strokeStyle = '#6a8860';
    ctx.lineWidth = 1 * sc;
    ctx.strokeRect((screenX - 25) * sc, screenY * sc, 50 * sc, 24 * sc);
    
    // Screen glow
    ctx.fillStyle = 'rgba(80,200,80,0.08)';
    ctx.fillRect((screenX - 24) * sc, (screenY + 1) * sc, 48 * sc, 22 * sc);
    
    // Radar sweep line on screen
    ctx.save();
    ctx.translate(screenX * sc, (screenY + 12) * sc);
    const screenAngle = sweepAngle * 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(screenAngle) * 22 * sc, Math.sin(screenAngle) * 11 * sc);
    ctx.lineTo(Math.cos(screenAngle + 0.2) * 22 * sc, Math.sin(screenAngle + 0.2) * 11 * sc);
    ctx.closePath();
    ctx.fillStyle = 'rgba(80,255,80,0.25)';
    ctx.fill();
    ctx.restore();
    
    // Blips on radar screen (target dots)
    const blipPositions = [
      [-15, -5], [-8, -2], [-3, -8], [5, -4], [12, -6], [18, -1]
    ];
    for (let bp = 0; bp < blipPositions.length; bp++) {
      const blipAlpha = 0.3 + Math.sin(t * 3 + bp) * 0.2;
      ctx.fillStyle = `rgba(80,255,80,${blipAlpha})`;
      ctx.beginPath();
      ctx.arc((screenX + blipPositions[bp][0]) * sc, (screenY + 12 + blipPositions[bp][1]) * sc, 2 * sc, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Screen grid rings
    ctx.strokeStyle = 'rgba(80,200,80,0.2)';
    ctx.lineWidth = 0.5 * sc;
    for (let gl = 0; gl < 3; gl++) {
      ctx.beginPath();
      ctx.ellipse(screenX * sc, (screenY + 12) * sc, 8 * sc + gl * 7 * sc, 4 * sc + gl * 3.5 * sc, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Crosshairs
    ctx.beginPath();
    ctx.moveTo((screenX - 20) * sc, (screenY + 12) * sc);
    ctx.lineTo((screenX + 20) * sc, (screenY + 12) * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(screenX * sc, (screenY + 2) * sc);
    ctx.lineTo(screenX * sc, (screenY + 22) * sc);
    ctx.stroke();
    
    // Screen label indicator
    ctx.fillStyle = '#6a8860';
    ctx.fillRect((screenX - 22) * sc, (screenY - 3) * sc, 44 * sc, 3 * sc);
    
    // Status text
    ctx.fillStyle = '#8aff8a';
    ctx.font = `${5 * sc}px monospace`;
    ctx.fillText('ACTIVE', (screenX - 10) * sc, (screenY - 1) * sc);
  }
  
  // ============================================================
  // ANTENNA MASTS
  // ============================================================
  
  const drawAntenna = (x, y, height, hasBeacon = true) => {
    ctx.strokeStyle = '#8a9888';
    ctx.lineWidth = 1.5 * sc;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - height);
    ctx.stroke();
    
    // Cross elements
    ctx.beginPath();
    ctx.moveTo(x - 5 * sc, y - height * 0.4);
    ctx.lineTo(x + 5 * sc, y - height * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 4 * sc, y - height * 0.6);
    ctx.lineTo(x + 4 * sc, y - height * 0.6);
    ctx.stroke();
    
    if (hasBeacon) {
      const beacon = Math.sin(t * 4) > 0;
      ctx.fillStyle = beacon ? '#ff4444' : '#440000';
      ctx.beginPath();
      ctx.arc(x, y - height - 2 * sc, 2 * sc, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = beacon ? 'rgba(255,68,68,0.3)' : 'rgba(255,68,68,0.05)';
      ctx.beginPath();
      ctx.arc(x, y - height - 2 * sc, 6 * sc, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  
  // Main antenna on roof
  drawAntenna(-25 * sc, -55 * sc, antennaHeight, true);
  drawAntenna(25 * sc, -55 * sc, antennaHeight - 10, true);
  
  // Extra antennas for higher levels
  if (level >= 4) {
    drawAntenna(-50 * sc, -48 * sc, antennaHeight - 15, false);
    drawAntenna(50 * sc, -48 * sc, antennaHeight - 15, false);
  }
  
  // ============================================================
  // SIDE BUILDINGS / EQUIPMENT SHELTERS
  // ============================================================
  
  if (hasSideBuildings) {
    // Left equipment shelter
    ctx.fillStyle = '#5a5850';
    ctx.fillRect(-(buildingWidth/2 + 20) * sc, -25 * sc, 20 * sc, 25 * sc);
    ctx.fillStyle = '#4a4840';
    ctx.fillRect(-(buildingWidth/2 + 19) * sc, -28 * sc, 18 * sc, 5 * sc);
    
    // Equipment vents
    ctx.fillStyle = '#3a3830';
    for (let vt = 0; vt < 3; vt++) {
      ctx.fillRect(-(buildingWidth/2 + 16 + vt * 5) * sc, -18 * sc, 3 * sc, 10 * sc);
    }
    
    // Right equipment shelter
    ctx.fillStyle = '#5a5850';
    ctx.fillRect((buildingWidth/2) * sc, -25 * sc, 20 * sc, 25 * sc);
    ctx.fillStyle = '#4a4840';
    ctx.fillRect((buildingWidth/2 + 1) * sc, -28 * sc, 18 * sc, 5 * sc);
    
    // Equipment vents
    ctx.fillStyle = '#3a3830';
    for (let vt = 0; vt < 3; vt++) {
      ctx.fillRect((buildingWidth/2 + 3 + vt * 5) * sc, -18 * sc, 3 * sc, 10 * sc);
    }
  }
  
  // ============================================================
  // HELIPAD (level 5)
  // ============================================================
  
  if (hasHelipad) {
    ctx.fillStyle = '#4a4840';
    ctx.fillRect(-35 * sc, -78 * sc, 70 * sc, 10 * sc);
    ctx.fillStyle = '#3a3830';
    ctx.fillRect(-33 * sc, -80 * sc, 66 * sc, 5 * sc);
    
    // Helipad H marking
    ctx.strokeStyle = '#f5c842';
    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    ctx.moveTo(-12 * sc, -75 * sc);
    ctx.lineTo(-12 * sc, -69 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12 * sc, -75 * sc);
    ctx.lineTo(12 * sc, -69 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12 * sc, -72 * sc);
    ctx.lineTo(12 * sc, -72 * sc);
    ctx.stroke();
    
    // Helipad edge lights
    const heliBlink = Math.sin(t * 3) > 0;
    ctx.fillStyle = heliBlink ? '#44ff44' : '#226622';
    ctx.beginPath();
    ctx.arc(-30 * sc, -73 * sc, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(30 * sc, -73 * sc, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
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
  
  warningLight(-(buildingWidth/2 + 10) * sc, -50 * sc, 3);
  warningLight((buildingWidth/2 + 10) * sc, -50 * sc, 3);
  warningLight(0, -68 * sc, 2);
  
  if (level >= 4) {
    warningLight(-70 * sc, -45 * sc, 2.5);
    warningLight(70 * sc, -45 * sc, 2.5);
  }
  
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
  
  flagpole(-(buildingWidth/2 + 15) * sc, -45 * sc, 50 * sc);
  
  // ============================================================
  // PERIMETER FENCE POSTS
  // ============================================================
  
  ctx.strokeStyle = '#6a7868';
  ctx.lineWidth = 1 * sc;
  for (let fp = 0; fp < 12; fp++) {
    const fx = -(buildingWidth/2 + 25 + fp * 20) * sc;
    ctx.fillStyle = '#5a6858';
    ctx.fillRect(fx - 1 * sc, -10 * sc, 2 * sc, 14 * sc);
    ctx.beginPath();
    ctx.moveTo(fx - 3 * sc, -10 * sc);
    ctx.lineTo(fx + 3 * sc, -10 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx - 3 * sc, -6 * sc);
    ctx.lineTo(fx + 3 * sc, -6 * sc);
    ctx.stroke();
  }
  
  // ============================================================
  // CONCRETE BARRIERS AND SANDBAGS
  // ============================================================
  
  // Concrete barriers
  ctx.fillStyle = '#6a6860';
  for (let br = 0; br < 5; br++) {
    ctx.fillRect(-(buildingWidth/2 + 30 + br * 18) * sc, -5 * sc, 8 * sc, 10 * sc);
    ctx.fillStyle = '#5a5850';
    ctx.fillRect(-(buildingWidth/2 + 29 + br * 18) * sc, -7 * sc, 6 * sc, 4 * sc);
    ctx.fillStyle = '#6a6860';
  }
  
  for (let br = 0; br < 5; br++) {
    ctx.fillRect((buildingWidth/2 + 10 + br * 18) * sc, -5 * sc, 8 * sc, 10 * sc);
    ctx.fillStyle = '#5a5850';
    ctx.fillRect((buildingWidth/2 + 11 + br * 18) * sc, -7 * sc, 6 * sc, 4 * sc);
    ctx.fillStyle = '#6a6860';
  }
  
  // Sandbags
  for (let sb = 0; sb < 14; sb++) {
    const bx = -(buildingWidth/2 + 20 + sb * 12) * sc;
    if (Math.abs(bx) < buildingWidth/2 * sc) continue;
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
  
  // Small rocks / debris
  ctx.fillStyle = 'rgba(100,98,94,0.5)';
  for (let dr = 0; dr < 25; dr++) {
    const rx = -(buildingWidth/2 + 35 + dr * 12) * sc;
    if (Math.abs(rx) < buildingWidth/2 * sc) continue;
    ctx.beginPath();
    ctx.ellipse(rx, 3 * sc + (dr % 6) * sc, 1.5 * sc, 1 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}