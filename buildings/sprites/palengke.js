/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/sprites/palengke.js

   Palengke (Market) — Level 1–5 sprites
   MODIFIED: 7-Eleven Style Conversion
   Each level now represents a 7-Eleven convenience store with
   iconic orange/white/green/red branding.
   Level 1: Small 7-Eleven kiosk
   Level 2: Standard 7-Eleven store
   Level 3: 7-Eleven with gas station canopy
   Level 4: Two-storey 7-Eleven with signage tower
   Level 5: Grand 7-Eleven flagship with digital signage and coffee bar
═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   drawSprite — main entry point for buildingSprites.js
──────────────────────────────────────────────────────────────── */
export function drawSprite(ctx, sc, w, h, def, level, now) {
  const t = now * 0.001;

  // Helper: draw shadow ellipse at ground level
  const drawShadow = (radiusX, radiusY) => {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 3, radiusX || w * 0.62, radiusY || h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  // Helper: standard window with crossbars (7-Eleven style tinted)
  const stdWin = (x, y, winW, winH) => {
    ctx.fillStyle = 'rgba(70,130,200,0.65)';
    ctx.fillRect(x, y, winW, winH);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.7 * sc;
    ctx.beginPath();
    ctx.moveTo(x + winW / 2, y);
    ctx.lineTo(x + winW / 2, y + winH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + winH / 2);
    ctx.lineTo(x + winW, y + winH / 2);
    ctx.stroke();
  };

  // Helper: 7-Eleven awning (striped red/green/orange)
  const sevenAwning = (x, y, awW, awH, hasStripes = true) => {
    // Base awning
    ctx.fillStyle = '#e6332a';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + awW, y);
    ctx.lineTo(x + awW + 3 * sc, y + awH);
    ctx.lineTo(x - 3 * sc, y + awH);
    ctx.closePath();
    ctx.fill();
    
    if (hasStripes) {
      // 7-Eleven stripes
      const stripeColors = ['#e6332a', '#ff8c00', '#2c9e3d'];
      for (let s = 0; s < 6; s++) {
        const sx = x + s * (awW / 6);
        ctx.fillStyle = stripeColors[s % 3];
        ctx.beginPath();
        ctx.moveTo(sx, y);
        ctx.lineTo(sx + awW / 6, y);
        ctx.lineTo(sx + awW / 6 + 3 * sc, y + awH);
        ctx.lineTo(sx + 3 * sc, y + awH);
        ctx.closePath();
        ctx.fill();
      }
    }
  };

  // Helper: 7-Eleven sign
  const sevenSign = (x, y, signW, signH, isVertical = false) => {
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, signW, signH);
    ctx.strokeStyle = '#e6332a';
    ctx.lineWidth = 1.2 * sc;
    ctx.strokeRect(x, y, signW, signH);
    
    // 7-ELEVEN text
    ctx.fillStyle = '#e6332a';
    const fontSize = Math.max(9, signH * 0.55);
    ctx.font = `bold ${fontSize}px 'Bebas Neue', 'Arial Black', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('7', x + signW * 0.3, y + signH / 2);
    ctx.fillStyle = '#2c9e3d';
    ctx.fillText('ELEVEN', x + signW * 0.65, y + signH / 2);
    
    ctx.textBaseline = 'alphabetic';
  };

  // Helper: 7-Eleven logo (simplified)
  const sevenLogo = (x, y, size) => {
    ctx.fillStyle = '#e6332a';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 1.2}px 'Bebas Neue', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('7', x, y + 1);
    ctx.textBaseline = 'alphabetic';
  };

  // Helper: gas pump (for level 3+)
  const gasPump = (x, y) => {
    ctx.fillStyle = '#2c6e9e';
    ctx.fillRect(x, y - 10 * sc, 6 * sc, 14 * sc);
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(x + 1 * sc, y - 8 * sc, 4 * sc, 5 * sc);
    ctx.fillStyle = '#e6332a';
    ctx.beginPath();
    ctx.arc(x + 3 * sc, y - 2 * sc, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
  };

  // Helper: coffee cup (for level 5)
  const coffeeCup = (x, y) => {
    ctx.fillStyle = '#f5f5dc';
    ctx.fillRect(x, y - 6 * sc, 5 * sc, 8 * sc);
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(x + 1 * sc, y - 8 * sc, 3 * sc, 3 * sc);
    ctx.fillStyle = '#2c9e3d';
    ctx.beginPath();
    ctx.arc(x + 2.5 * sc, y - 3 * sc, 1.5 * sc, 0, Math.PI * 2);
    ctx.fill();
  };

  // Helper: draw base and ground shadow
  const drawBase = () => {
    drawShadow(w * 0.62, h * 0.12);
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.fillRect(-w / 2 - 4, 0, w + 8, 4 * sc);
  };

  switch (level) {
    case 1:
      drawSevenLv1(ctx, sc, w, h, def, t, { drawBase, stdWin, sevenAwning, sevenSign, sevenLogo });
      break;
    case 2:
      drawSevenLv2(ctx, sc, w, h, def, t, { drawBase, stdWin, sevenAwning, sevenSign, sevenLogo, gasPump });
      break;
    case 3:
      drawSevenLv3(ctx, sc, w, h, def, t, { drawBase, stdWin, sevenAwning, sevenSign, sevenLogo, gasPump });
      break;
    case 4:
      drawSevenLv4(ctx, sc, w, h, def, t, { drawBase, stdWin, sevenAwning, sevenSign, sevenLogo, gasPump });
      break;
    case 5:
      drawSevenLv5(ctx, sc, w, h, def, t, { drawBase, stdWin, sevenAwning, sevenSign, sevenLogo, gasPump, coffeeCup });
      break;
    default:
      drawSevenLv1(ctx, sc, w, h, def, t, { drawBase, stdWin, sevenAwning, sevenSign, sevenLogo });
  }
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 1 — 7-Eleven Kiosk
   Small corner store with signature slanted roof and branding
═══════════════════════════════════════════════════════════════ */
function drawSevenLv1(ctx, sc, w, h, def, t, helpers) {
  const { drawBase, stdWin, sevenAwning, sevenSign, sevenLogo } = helpers;
  drawBase();

  // Main wall (white with orange accent)
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(-w / 2, -h * 0.55, w, h * 0.67);
  
  // Orange accent stripe at bottom
  ctx.fillStyle = '#e6332a';
  ctx.fillRect(-w / 2, 0, w, 5 * sc);
  
  // Slanted roof (modern style)
  ctx.fillStyle = '#2c6e9e';
  ctx.beginPath();
  ctx.moveTo(-w * 0.58, -h * 0.55);
  ctx.lineTo(0, -h * 1.08);
  ctx.lineTo(w * 0.58, -h * 0.55);
  ctx.closePath();
  ctx.fill();
  
  // Roof trim
  ctx.fillStyle = '#ff8c00';
  ctx.fillRect(-w * 0.6, -h * 0.555, w * 1.2, 4 * sc);
  
  // Door with glass
  ctx.fillStyle = 'rgba(100,180,255,0.5)';
  const dw = 12 * sc;
  const dh = h * 0.38;
  ctx.fillRect(-dw / 2, -dh, dw, dh);
  ctx.strokeStyle = '#e6332a';
  ctx.lineWidth = 1.2 * sc;
  ctx.strokeRect(-dw / 2, -dh, dw, dh);
  
  // Windows
  stdWin(-w * 0.42, -h * 0.48, 10 * sc, 9 * sc);
  stdWin(w * 0.22, -h * 0.48, 10 * sc, 9 * sc);
  
  // 7-Eleven awning above door
  sevenAwning(-12 * sc, -h * 0.38, 24 * sc, 7 * sc, true);
  
  // Signage
  sevenSign(-w * 0.35, -h * 0.58, w * 0.7, 9 * sc);
  
  // Logo on roof
  sevenLogo(0, -h * 0.85, 8 * sc);
  
  // Slurpee cup outside
  ctx.fillStyle = '#e6332a';
  ctx.fillRect(-w * 0.48, -4 * sc, 5 * sc, 6 * sc);
  ctx.fillStyle = '#ff8c00';
  ctx.beginPath();
  ctx.arc(-w * 0.455, -5 * sc, 3 * sc, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#2c9e3d';
  ctx.font = `bold ${7 * sc}px 'Bebas Neue',sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('SLURPEE', -w * 0.455, -2 * sc);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 2 — Standard 7-Eleven Store
   Full convenience store with gas pumps and wide awning
═══════════════════════════════════════════════════════════════ */
function drawSevenLv2(ctx, sc, w, h, def, t, helpers) {
  const { drawBase, stdWin, sevenAwning, sevenSign, sevenLogo, gasPump } = helpers;
  drawBase();

  // White main building
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(-w / 2, -h * 0.55, w, h * 0.72);
  
  // Orange lower band
  ctx.fillStyle = '#e6332a';
  ctx.fillRect(-w / 2, -h * 0.2, w, 6 * sc);
  
  // Green upper band
  ctx.fillStyle = '#2c9e3d';
  ctx.fillRect(-w / 2, -h * 0.55, w, 5 * sc);
  
  // Flat roof with parapet
  ctx.fillStyle = '#2c6e9e';
  ctx.fillRect(-w * 0.55, -h * 0.58, w * 1.1, 8 * sc);
  
  // Large front awning
  sevenAwning(-w / 2, -h * 0.42, w, 11 * sc, true);
  
  // Glass storefront with multiple doors
  const doorCount = 3;
  const doorW = (w * 0.7) / doorCount;
  for (let i = 0; i < doorCount; i++) {
    const doorX = -w * 0.35 + i * doorW;
    ctx.fillStyle = 'rgba(100,180,255,0.55)';
    ctx.fillRect(doorX, -h * 0.38, doorW - 2 * sc, h * 0.38);
    ctx.strokeStyle = '#e6332a';
    ctx.strokeRect(doorX, -h * 0.38, doorW - 2 * sc, h * 0.38);
  }
  
  // Windows on sides
  stdWin(-w * 0.48, -h * 0.5, 12 * sc, 10 * sc);
  stdWin(w * 0.26, -h * 0.5, 12 * sc, 10 * sc);
  
  // Main sign
  sevenSign(-w * 0.38, -h * 0.6, w * 0.76, 12 * sc);
  
  // Gas pumps
  if (gasPump) {
    gasPump(-w * 0.3, 2 * sc);
    gasPump(w * 0.1, 2 * sc);
  }
  
  // Canopy over pumps
  ctx.fillStyle = 'rgba(44,110,158,0.7)';
  ctx.fillRect(-w * 0.45, -2 * sc, w * 0.9, 6 * sc);
  
  // Logo on roof
  sevenLogo(w * 0.35, -h * 0.52, 7 * sc);
  sevenLogo(-w * 0.35, -h * 0.52, 7 * sc);
  
  // Hotdog cart
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(w * 0.4, -3 * sc, 8 * sc, 5 * sc);
  ctx.fillStyle = '#e6332a';
  ctx.fillRect(w * 0.42, -5 * sc, 6 * sc, 3 * sc);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 3 — 7-Eleven with Gas Station Canopy
   Large store with extended fuel canopy and convenience store
═══════════════════════════════════════════════════════════════ */
function drawSevenLv3(ctx, sc, w, h, def, t, helpers) {
  const { drawBase, stdWin, sevenAwning, sevenSign, sevenLogo, gasPump } = helpers;
  drawBase();

  // Main building (taller)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-w / 2, -h * 0.6, w, h * 0.75);
  
  // Brand stripes
  ctx.fillStyle = '#e6332a';
  ctx.fillRect(-w / 2, -h * 0.22, w, 7 * sc);
  ctx.fillStyle = '#2c9e3d';
  ctx.fillRect(-w / 2, -h * 0.29, w, 7 * sc);
  ctx.fillStyle = '#ff8c00';
  ctx.fillRect(-w / 2, -h * 0.36, w, 7 * sc);
  
  // Parapet roof with sign tower
  ctx.fillStyle = '#2c6e9e';
  ctx.fillRect(-w * 0.55, -h * 0.63, w * 1.1, 9 * sc);
  
  // Tall sign tower
  ctx.fillStyle = '#e6332a';
  ctx.fillRect(-10 * sc, -h * 0.9, 20 * sc, 30 * sc);
  sevenSign(-13 * sc, -h * 0.88, 26 * sc, 11 * sc);
  sevenLogo(0, -h * 0.68, 9 * sc);
  
  // Large gas canopy over pumps
  ctx.fillStyle = 'rgba(44,110,158,0.85)';
  ctx.fillRect(-w * 0.7, -8 * sc, w * 1.4, 12 * sc);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(-w * 0.6 + i * (w * 1.2 / 5), -6 * sc, 6 * sc, 8 * sc);
  }
  
  // Four gas pumps
  if (gasPump) {
    gasPump(-w * 0.45, 3 * sc);
    gasPump(-w * 0.15, 3 * sc);
    gasPump(w * 0.05, 3 * sc);
    gasPump(w * 0.35, 3 * sc);
  }
  
  // Glass storefront
  ctx.fillStyle = 'rgba(100,180,255,0.6)';
  ctx.fillRect(-w * 0.45, -h * 0.4, w * 0.9, h * 0.4);
  
  // Awning
  sevenAwning(-w / 2, -h * 0.42, w, 10 * sc, true);
  
  // Windows upstairs
  stdWin(-w * 0.38, -h * 0.75, 14 * sc, 12 * sc);
  stdWin(w * 0.14, -h * 0.75, 14 * sc, 12 * sc);
  
  // Price sign
  ctx.fillStyle = '#000000';
  ctx.fillRect(w * 0.45, -h * 0.3, 12 * sc, 18 * sc);
  ctx.fillStyle = '#ff8c00';
  ctx.font = `bold ${8 * sc}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('GAS', w * 0.51, -h * 0.22);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('₱58.90', w * 0.51, -h * 0.12);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 4 — Two-Storey 7-Eleven with Drive-Thru
   Flagship store with second floor seating and drive-thru window
═══════════════════════════════════════════════════════════════ */
function drawSevenLv4(ctx, sc, w, h, def, t, helpers) {
  const { drawBase, stdWin, sevenAwning, sevenSign, sevenLogo, gasPump } = helpers;
  drawBase();

  const secondFloorY = -h * 0.6;
  const secondFloorH = h * 0.4;
  
  // Ground floor (white with glass)
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(-w / 2, -h * 0.55, w, h * 0.65);
  
  // Second floor (green accent)
  ctx.fillStyle = '#2c9e3d';
  ctx.fillRect(-w / 2, secondFloorY, w, secondFloorH);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-w * 0.48, secondFloorY + 5 * sc, w * 0.96, secondFloorH - 10 * sc);
  
  // Brand band between floors
  ctx.fillStyle = '#e6332a';
  ctx.fillRect(-w / 2, -h * 0.53, w, 8 * sc);
  
  // Large rooftop sign
  ctx.fillStyle = '#2c6e9e';
  ctx.fillRect(-w * 0.45, -h * 0.95, w * 0.9, 18 * sc);
  sevenSign(-w * 0.38, -h * 0.93, w * 0.76, 12 * sc);
  sevenLogo(0, -h * 0.78, 10 * sc);
  
  // Drive-thru window (right side)
  ctx.fillStyle = 'rgba(100,180,255,0.7)';
  ctx.fillRect(w * 0.35, -h * 0.35, 12 * sc, 12 * sc);
  ctx.fillStyle = '#e6332a';
  ctx.font = `${7 * sc}px sans-serif`;
  ctx.fillText('DRIVE THRU', w * 0.41, -h * 0.28);
  
  // Drive-thru lane
  ctx.fillStyle = '#555555';
  ctx.fillRect(w * 0.25, -3 * sc, 30 * sc, 6 * sc);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(w * 0.27 + i * 5 * sc, -1 * sc, 3 * sc, 2 * sc);
  }
  
  // Second floor windows
  stdWin(-w * 0.42, secondFloorY + 15 * sc, 14 * sc, 12 * sc);
  stdWin(-w * 0.18, secondFloorY + 15 * sc, 14 * sc, 12 * sc);
  stdWin(w * 0.04, secondFloorY + 15 * sc, 14 * sc, 12 * sc);
  stdWin(w * 0.28, secondFloorY + 15 * sc, 14 * sc, 12 * sc);
  
  // Outdoor seating area
  ctx.fillStyle = '#ccccaa';
  ctx.fillRect(-w * 0.35, -2 * sc, w * 0.7, 5 * sc);
  for (let i = 0; i < 4; i++) {
    const tableX = -w * 0.25 + i * 18 * sc;
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(tableX, -4 * sc, 8 * sc, 4 * sc);
    ctx.fillStyle = '#cd853f';
    ctx.beginPath();
    ctx.arc(tableX + 4 * sc, -6 * sc, 3 * sc, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Main awning
  sevenAwning(-w / 2, -h * 0.42, w, 10 * sc, true);
  
  // Gas pumps
  if (gasPump) {
    gasPump(-w * 0.3, 2 * sc);
    gasPump(w * 0.1, 2 * sc);
  }
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 5 — Grand 7-Eleven Flagship
   Ultimate 7-Eleven with digital signage, coffee bar, and modern design
═══════════════════════════════════════════════════════════════ */
function drawSevenLv5(ctx, sc, w, h, def, t, helpers) {
  const { drawBase, stdWin, sevenAwning, sevenSign, sevenLogo, gasPump, coffeeCup } = helpers;
  drawBase();

  const thirdFloorY = -h * 0.82;
  const thirdFloorH = h * 0.28;
  
  // Modern glass facade building
  ctx.fillStyle = '#eef4ff';
  ctx.fillRect(-w / 2, -h * 0.7, w, h * 0.85);
  
  // Green base
  ctx.fillStyle = '#2c9e3d';
  ctx.fillRect(-w / 2, 0, w, 8 * sc);
  
  // Vertical accent stripes
  ctx.fillStyle = '#e6332a';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(-w * 0.45 + i * (w * 0.9 / 4), -h * 0.65, 4 * sc, h * 0.8);
  }
  
  // Glass curtain wall (simulated)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 6; col++) {
      const glassX = -w * 0.45 + col * (w * 0.9 / 6);
      const glassY = -h * 0.55 + row * (h * 0.45 / 3);
      ctx.fillStyle = 'rgba(70,150,220,0.5)';
      ctx.fillRect(glassX + 1 * sc, glassY + 1 * sc, (w * 0.9 / 6) - 2 * sc, (h * 0.45 / 3) - 2 * sc);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(glassX + 1 * sc, glassY + 1 * sc, (w * 0.9 / 6) - 2 * sc, (h * 0.45 / 3) - 2 * sc);
    }
  }
  
  // Grand entrance with double doors
  ctx.fillStyle = 'rgba(100,180,255,0.8)';
  ctx.fillRect(-15 * sc, -h * 0.42, 30 * sc, h * 0.42);
  ctx.strokeStyle = '#e6332a';
  ctx.lineWidth = 2 * sc;
  ctx.strokeRect(-15 * sc, -h * 0.42, 30 * sc, h * 0.42);
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.42);
  ctx.lineTo(0, 0);
  ctx.stroke();
  
  // Digital sign board (LED)
  ctx.fillStyle = '#000000';
  ctx.fillRect(-w * 0.48, -h * 0.72, w * 0.96, 10 * sc);
  const blink = Math.sin(t * 3) > 0;
  ctx.fillStyle = blink ? '#ff3300' : '#ff8844';
  ctx.font = `bold ${8 * sc}px monospace`;
  ctx.fillText('NOW OPEN 24/7  •  COFFEE PROMO ₱49', 0, -h * 0.68);
  
  // Main illuminated sign
  ctx.fillStyle = '#e6332a';
  ctx.fillRect(-w * 0.42, -h * 0.92, w * 0.84, 16 * sc);
  sevenSign(-w * 0.38, -h * 0.9, w * 0.76, 13 * sc);
  
  // Rooftop 3D sign
  ctx.fillStyle = '#2c6e9e';
  ctx.fillRect(-20 * sc, -h * 1.08, 40 * sc, 10 * sc);
  ctx.fillStyle = '#ff8c00';
  ctx.fillRect(-18 * sc, -h * 1.1, 36 * sc, 4 * sc);
  sevenLogo(0, -h * 1.02, 12 * sc);
  
  // Coffee bar area (left side)
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(-w * 0.48, -h * 0.32, 16 * sc, 10 * sc);
  ctx.fillStyle = '#f5deb3';
  ctx.fillRect(-w * 0.47, -h * 0.3, 14 * sc, 6 * sc);
  if (coffeeCup) {
    coffeeCup(-w * 0.42, -h * 0.27);
    coffeeCup(-w * 0.35, -h * 0.27);
  }
  
  // Slurpee station (right side)
  ctx.fillStyle = '#e6332a';
  ctx.fillRect(w * 0.32, -h * 0.32, 16 * sc, 10 * sc);
  ctx.fillStyle = '#ff8c00';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(w * 0.34 + i * 4 * sc, -h * 0.3, 3 * sc, 7 * sc);
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(w * 0.355 + i * 4 * sc, -h * 0.32, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff8c00';
  }
  
  // Gas pumps with canopy
  ctx.fillStyle = 'rgba(44,110,158,0.9)';
  ctx.fillRect(-w * 0.65, -8 * sc, w * 1.3, 14 * sc);
  if (gasPump) {
    for (let i = 0; i < 6; i++) {
      gasPump(-w * 0.5 + i * 20 * sc, 3 * sc);
    }
  }
  
  // LED strip animation
  ctx.fillStyle = blink ? '#ff5500' : '#ffaa33';
  ctx.fillRect(-w / 2, -h * 0.64, w, 3 * sc);
  
  // Large awning
  sevenAwning(-w / 2, -h * 0.43, w, 12 * sc, true);
  
  // Outdoor lounge
  for (let i = 0; i < 6; i++) {
    const chairX = -w * 0.4 + i * 18 * sc;
    ctx.fillStyle = '#2c9e3d';
    ctx.fillRect(chairX, -2 * sc, 6 * sc, 4 * sc);
    ctx.fillStyle = '#ff8c00';
    ctx.fillRect(chairX + 1 * sc, -4 * sc, 4 * sc, 3 * sc);
  }
  
  // Digital price board
  ctx.fillStyle = '#000000';
  ctx.fillRect(w * 0.42, -h * 0.18, 12 * sc, 14 * sc);
  ctx.fillStyle = '#ff8c00';
  ctx.font = `${6 * sc}px monospace`;
  ctx.fillText('GAS', w * 0.48, -h * 0.12);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('₱54.90', w * 0.48, -h * 0.05);
  ctx.fillText('DIESEL', w * 0.48, -h * 0.02);
  ctx.fillText('₱52.50', w * 0.48, -h * 0.11);
  
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `bold ${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('7-ELEVEN • ALWAYS OPEN', 0, h * 0.18);
}