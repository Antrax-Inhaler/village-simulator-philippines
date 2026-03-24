/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/sprites/templo.js

   Simbahan / Templo (Church) — Level 1–5 sprites
   Faithful recreation of the designs from simbahan-levels.html
   with proper perspective scaling (sc) and positioning relative
   to building origin (x=0, y=0 at ground level).

   LEVEL 1 — Kapilya (small bamboo/wood chapel)
   LEVEL 2 — Parokya (stone walls, bell tower, rose window)
   LEVEL 3 — Simbahang Bato (colonial stone church, twin bell towers)
   LEVEL 4 — Basilika (grand baroque basilica with dome)
   LEVEL 5 — Katedral (full Gothic cathedral with flying buttresses)

   Each level uses dimensions proportional to the building's
   def.w / def.h scaled by `sc` parameter for consistent sizing.
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

  // Helper: draw shadow ellipse at ground level
  const drawShadow = (radiusX, radiusY) => {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 3 * sc, radiusX || w * 0.62, radiusY || h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  // Helper: wall block with shading
  const wall = (x, y, blockW, blockH, color, flipShade) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, blockW, blockH);
    const sg = ctx.createLinearGradient(x, 0, x + blockW, 0);
    if (flipShade) {
      sg.addColorStop(0, 'rgba(0,0,0,0.18)');
      sg.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      sg.addColorStop(0, 'rgba(255,255,255,0.05)');
      sg.addColorStop(0.7, 'rgba(0,0,0,0)');
      sg.addColorStop(1, 'rgba(0,0,0,0.2)');
    }
    ctx.fillStyle = sg;
    ctx.fillRect(x, y, blockW, blockH);
  };

  // Helper: rose window (stained glass)
  const roseWindow = (cx, cy, r, animTime) => {
    const tAnim = animTime * 0.001;
    // Outer ring
    ctx.fillStyle = '#1a1030';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2 * sc, 0, Math.PI * 2);
    ctx.fill();
    // Petals
    const petals = ['#8833cc', '#cc3388', '#3388cc', '#ccaa22', '#33cc88', '#cc5522'];
    for (let pi = 0; pi < 6; pi++) {
      const pa = pi * (Math.PI / 3);
      ctx.fillStyle = petals[pi];
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(pa) * r * 0.5, cy + Math.sin(pa) * r * 0.5, r * 0.38, r * 0.22, pa, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Center
    ctx.fillStyle = '#f5c842';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    // Glow pulse
    const pulse = 0.06 + Math.sin(tAnim * 1.2) * 0.03;
    const gg = ctx.createRadialGradient(cx, cy, 1 * sc, cx, cy, r * 1.8);
    gg.addColorStop(0, `rgba(180,120,255,${pulse})`);
    gg.addColorStop(1, 'rgba(180,120,255,0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Spokes
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 0.7 * sc;
    for (let si = 0; si < 12; si++) {
      const sa = si * (Math.PI / 6);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sa) * r, cy + Math.sin(sa) * r);
      ctx.stroke();
    }
    // Outer rim
    ctx.strokeStyle = 'rgba(255,220,100,0.4)';
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  };

  // Helper: gothic arch window
  const gothicWin = (x, y, winW, winH, lit, animTime) => {
    const tAnim = animTime * 0.001;
    // Frame
    ctx.fillStyle = '#1a1430';
    ctx.fillRect(x - 1 * sc, y - 1 * sc, winW + 2 * sc, winH + 2 * sc);
    // Arch shape
    ctx.fillStyle = lit ? 'rgba(200,150,255,0.55)' : 'rgba(80,50,140,0.45)';
    ctx.beginPath();
    ctx.moveTo(x, y + winH);
    ctx.lineTo(x, y + winH * 0.4);
    ctx.arc(x + winW / 2, y + winH * 0.4, winW / 2, Math.PI, 0, false);
    ctx.lineTo(x + winW, y + winH);
    ctx.closePath();
    ctx.fill();
    // Colored panes
    if (lit) {
      const cols = ['rgba(200,100,255,0.4)', 'rgba(100,180,255,0.4)', 'rgba(255,200,80,0.4)'];
      for (let ci = 0; ci < 3; ci++) {
        ctx.fillStyle = cols[ci];
        ctx.fillRect(x + ci * (winW / 3) + 0.5 * sc, y + winH * 0.45, winW / 3 - 1 * sc, winH * 0.45);
      }
      // Glow
      const pulse = 0.3 + Math.sin(tAnim * 0.8 + x * 0.02) * 0.1;
      ctx.fillStyle = `rgba(200,150,255,${pulse})`;
      ctx.beginPath();
      ctx.moveTo(x, y + winH);
      ctx.lineTo(x, y + winH * 0.4);
      ctx.arc(x + winW / 2, y + winH * 0.4, winW / 2, Math.PI, 0, false);
      ctx.lineTo(x + winW, y + winH);
      ctx.closePath();
      ctx.fill();
    }
    // Mullion cross
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.7 * sc;
    ctx.beginPath();
    ctx.moveTo(x + winW / 2, y + winH * 0.4);
    ctx.lineTo(x + winW / 2, y + winH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + winH * 0.7);
    ctx.lineTo(x + winW, y + winH * 0.7);
    ctx.stroke();
  };

  // Helper: bell
  const bell = (cx, cy, r, animTime) => {
    const tAnim = animTime * 0.001;
    const swing = Math.sin(tAnim * 3) * 0.18;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(swing);
    // Yoke
    ctx.fillStyle = '#5a4010';
    ctx.fillRect(-r * 0.6, -r * 0.3, r * 1.2, r * 0.3);
    // Bell body
    ctx.fillStyle = '#c89020';
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, 0);
    ctx.bezierCurveTo(-r * 0.9, r * 0.5, -r * 1.1, r * 0.8, -r, r);
    ctx.lineTo(r, r);
    ctx.bezierCurveTo(r * 1.1, r * 0.8, r * 0.9, r * 0.5, r * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    // Shine
    ctx.fillStyle = 'rgba(255,255,200,0.2)';
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, r * 0.1);
    ctx.bezierCurveTo(-r * 0.5, r * 0.5, -r * 0.4, r * 0.8, -r * 0.2, r * 0.9);
    ctx.lineTo(-r * 0.1, r * 0.9);
    ctx.bezierCurveTo(-r * 0.3, r * 0.7, -r * 0.2, r * 0.4, -r * 0.05, r * 0.1);
    ctx.closePath();
    ctx.fill();
    // Clapper
    ctx.fillStyle = '#8a6010';
    ctx.beginPath();
    ctx.arc(swing * r * 2, r * 0.75, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    // Rim
    ctx.strokeStyle = '#a07818';
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.moveTo(-r, r);
    ctx.lineTo(r, r);
    ctx.stroke();
    ctx.restore();
    // Sound waves when swinging
    if (Math.abs(swing) > 0.08) {
      ctx.strokeStyle = 'rgba(255,220,100,0.15)';
      ctx.lineWidth = 0.8 * sc;
      for (let wi = 1; wi <= 2; wi++) {
        ctx.beginPath();
        ctx.arc(cx, cy + r * 0.5, r * wi * 1.4, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();
      }
    }
  };

  // Helper: cross
  const cross = (cx, cy, crossH, crossW, glowColor, animTime) => {
    const tAnim = animTime * 0.001;
    const glow = 0.5 + Math.sin(tAnim * 1.5) * 0.2;
    // Glow aura
    const gg = ctx.createRadialGradient(cx, cy, 1 * sc, cx, cy, crossH);
    gg.addColorStop(0, (glowColor || 'rgba(255,220,100,') + glow + ')');
    gg.addColorStop(1, 'rgba(255,220,100,0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(cx, cy, crossH, 0, Math.PI * 2);
    ctx.fill();
    // Vertical bar
    ctx.fillStyle = '#f5c842';
    ctx.fillRect(cx - crossW / 2, cy - crossH, crossW, crossH * 2);
    // Horizontal bar
    ctx.fillRect(cx - crossH * 0.6, cy - crossH * 0.35, crossH * 1.2, crossW);
    // Shimmer
    ctx.fillStyle = 'rgba(255,255,200,0.4)';
    ctx.fillRect(cx - crossW / 2 + 1 * sc, cy - crossH, crossW / 2 - 1 * sc, crossH * 2);
  };

  // Helper: candle
  const candle = (x, y, animTime) => {
    const tAnim = animTime * 0.001;
    // Body
    ctx.fillStyle = '#e8e0c0';
    ctx.fillRect(x - 2 * sc, y - 12 * sc, 4 * sc, 12 * sc);
    // Wax drips
    ctx.fillStyle = '#d8d0b0';
    ctx.fillRect(x - 3 * sc, y - 2 * sc, 2 * sc, 3 * sc);
    ctx.fillRect(x + 1 * sc, y - 5 * sc, 2 * sc, 4 * sc);
    // Flame
    const flicker = Math.sin(tAnim * 8 + x * 0.02) * 0.8;
    ctx.fillStyle = 'rgba(255,180,40,0.9)';
    ctx.beginPath();
    ctx.moveTo(x - 2 * sc, y - 12 * sc);
    ctx.quadraticCurveTo(x + flicker * sc, y - 18 * sc, x, y - 20 * sc);
    ctx.quadraticCurveTo(x - flicker * sc, y - 18 * sc, x + 2 * sc, y - 12 * sc);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,240,180,0.7)';
    ctx.beginPath();
    ctx.moveTo(x - 1 * sc, y - 12 * sc);
    ctx.quadraticCurveTo(x + flicker * 0.5 * sc, y - 16 * sc, x, y - 18 * sc);
    ctx.quadraticCurveTo(x - flicker * 0.5 * sc, y - 16 * sc, x + 1 * sc, y - 12 * sc);
    ctx.closePath();
    ctx.fill();
    // Glow
    const cg = ctx.createRadialGradient(x, y - 16 * sc, 1 * sc, x, y - 16 * sc, 12 * sc);
    cg.addColorStop(0, 'rgba(255,200,60,0.25)');
    cg.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(x, y - 16 * sc, 12 * sc, 0, Math.PI * 2);
    ctx.fill();
  };

  // Helper: pillar
  const pillar = (x, y, pillarH, pillarW) => {
    // Base
    ctx.fillStyle = '#2c2840';
    ctx.fillRect(x - pillarW / 2 - 2 * sc, y - 3 * sc, pillarW + 4 * sc, 4 * sc);
    // Shaft
    ctx.fillStyle = '#342e50';
    ctx.fillRect(x - pillarW / 2, y - pillarH, pillarW, pillarH);
    // Fluting
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(x - pillarW / 2 + 2 * sc, y - pillarH, pillarW / 3, pillarH);
    // Capital
    ctx.fillStyle = '#2c2840';
    ctx.fillRect(x - pillarW / 2 - 3 * sc, y - pillarH - 3 * sc, pillarW + 6 * sc, 4 * sc);
    ctx.fillRect(x - pillarW / 2 - 1 * sc, y - pillarH - 6 * sc, pillarW + 2 * sc, 3 * sc);
  };

  // Helper: buttress
  const buttress = (x, y, buttressH, side) => {
    const dir = side < 0 ? 1 : -1;
    ctx.fillStyle = '#2a2440';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - buttressH * 0.6);
    ctx.lineTo(x + dir * 14 * sc, y - buttressH);
    ctx.lineTo(x + dir * 18 * sc, y - buttressH);
    ctx.lineTo(x + dir * 8 * sc, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.beginPath();
    ctx.moveTo(x, y - buttressH * 0.6);
    ctx.lineTo(x + dir * 14 * sc, y - buttressH);
    ctx.lineTo(x + dir * 12 * sc, y - buttressH);
    ctx.lineTo(x + 2 * dir * sc, y - buttressH * 0.6);
    ctx.closePath();
    ctx.fill();
  };

  // Helper: holy particles / stars
  const holyParticles = (cx, cy, r, animTime) => {
    const tAnim = animTime * 0.001;
    for (let pi = 0; pi < 8; pi++) {
      const pa = pi * (Math.PI / 4) + tAnim * 0.3;
      const pr = r + Math.sin(tAnim * 1.5 + pi) * 4 * sc;
      const px = cx + Math.cos(pa) * pr;
      const py = cy + Math.sin(pa) * pr;
      const alpha = 0.4 + Math.sin(tAnim * 2 + pi) * 0.3;
      ctx.fillStyle = `rgba(255,220,100,${alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, 1.2 * sc, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Dispatch based on level
  switch (level) {
    case 1:
      drawLv1(ctx, sc, w, h, def, t, {
        drawShadow, wall, roseWindow, gothicWin, bell, cross, candle, pillar, buttress, holyParticles
      });
      break;
    case 2:
      drawLv2(ctx, sc, w, h, def, t, {
        drawShadow, wall, roseWindow, gothicWin, bell, cross, candle, pillar, buttress, holyParticles
      });
      break;
    case 3:
      drawLv3(ctx, sc, w, h, def, t, {
        drawShadow, wall, roseWindow, gothicWin, bell, cross, candle, pillar, buttress, holyParticles
      });
      break;
    case 4:
      drawLv4(ctx, sc, w, h, def, t, {
        drawShadow, wall, roseWindow, gothicWin, bell, cross, candle, pillar, buttress, holyParticles
      });
      break;
    case 5:
      drawLv5(ctx, sc, w, h, def, t, {
        drawShadow, wall, roseWindow, gothicWin, bell, cross, candle, pillar, buttress, holyParticles
      });
      break;
    default:
      drawLv1(ctx, sc, w, h, def, t, {
        drawShadow, wall, roseWindow, gothicWin, bell, cross, candle, pillar, buttress, holyParticles
      });
  }
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 1 — Kapilya (small bamboo/wood chapel)
   Based on HTML LV1
═══════════════════════════════════════════════════════════════ */
function drawLv1(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, cross, bell, candle } = helpers;

  drawShadow(30 * sc, 5 * sc);

  // Bamboo walls
  ctx.fillStyle = '#3a2e18';
  ctx.fillRect(-24 * sc, -38 * sc, 48 * sc, 38 * sc);
  // Bamboo texture
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.7 * sc;
  for (let bi = 0; bi < 6; bi++) {
    ctx.beginPath();
    ctx.moveTo(-24 * sc + bi * 8 * sc, -38 * sc);
    ctx.lineTo(-24 * sc + bi * 8 * sc, 0);
    ctx.stroke();
  }
  // Gable roof (thatch)
  ctx.fillStyle = '#2a1e0a';
  ctx.beginPath();
  ctx.moveTo(-30 * sc, -38 * sc);
  ctx.lineTo(0, -62 * sc);
  ctx.lineTo(30 * sc, -38 * sc);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.beginPath();
  ctx.moveTo(-3 * sc, -38 * sc);
  ctx.lineTo(0, -62 * sc);
  ctx.lineTo(3 * sc, -38 * sc);
  ctx.closePath();
  ctx.fill();
  // Thatch lines
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 0.8 * sc;
  for (let ti = 0; ti < 7; ti++) {
    const ty = -38 * sc - ti * 3.4 * sc;
    const tx = 30 * sc - ti * 3 * sc;
    ctx.beginPath();
    ctx.moveTo(-tx, ty);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  }
  // Ridge board
  ctx.fillStyle = '#3a2a08';
  ctx.fillRect(-2 * sc, -64 * sc, 4 * sc, 4 * sc);

  // Door
  ctx.fillStyle = 'rgba(10,8,4,0.88)';
  ctx.fillRect(-7 * sc, -26 * sc, 14 * sc, 26 * sc);
  ctx.strokeStyle = 'rgba(180,140,255,0.25)';
  ctx.lineWidth = 0.8 * sc;
  ctx.strokeRect(-7 * sc, -26 * sc, 14 * sc, 26 * sc);
  // Arch top on door
  ctx.fillStyle = 'rgba(10,8,4,0.88)';
  ctx.beginPath();
  ctx.arc(0, -26 * sc, 7 * sc, Math.PI, 0, false);
  ctx.fill();

  // Small windows
  ctx.fillStyle = 'rgba(80,50,140,0.5)';
  ctx.fillRect(-20 * sc, -30 * sc, 8 * sc, 8 * sc);
  ctx.strokeStyle = 'rgba(180,140,255,0.3)';
  ctx.lineWidth = 0.6 * sc;
  ctx.strokeRect(-20 * sc, -30 * sc, 8 * sc, 8 * sc);
  ctx.fillRect(12 * sc, -30 * sc, 8 * sc, 8 * sc);
  ctx.strokeRect(12 * sc, -30 * sc, 8 * sc, 8 * sc);

  // Small cross on peak
  cross(0, -68 * sc, 8 * sc, 2 * sc, 'rgba(255,220,100,', t);

  // Bell hung from eave
  bell(20 * sc, -40 * sc, 5 * sc, t);

  // Two candles by door
  candle(-12 * sc, -1 * sc, t);
  candle(12 * sc, -1 * sc, t);

  // Label
  ctx.fillStyle = 'rgba(200,160,255,0.75)';
  ctx.font = `${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Kapilya', 0, h * 0.16);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 2 — Parokya (stone walls, bell tower, rose window)
   Based on HTML LV2
═══════════════════════════════════════════════════════════════ */
function drawLv2(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, wall, roseWindow, gothicWin, bell, cross, candle } = helpers;

  drawShadow(44 * sc, 6 * sc);

  // BELL TOWER left
  wall(-54 * sc, -68 * sc, 20 * sc, 68 * sc, '#282440', true);
  // Tower top
  ctx.fillStyle = '#1e1a38';
  ctx.fillRect(-56 * sc, -72 * sc, 24 * sc, 5 * sc);
  ctx.fillRect(-54 * sc, -78 * sc, 20 * sc, 7 * sc);
  // Belfry opening
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(-50 * sc, -66 * sc, 12 * sc, 14 * sc);
  ctx.beginPath();
  ctx.arc(-44 * sc, -66 * sc, 6 * sc, Math.PI, 0, false);
  ctx.fill();
  bell(-44 * sc, -58 * sc, 6 * sc, t);
  // Tower cross
  cross(-44 * sc, -82 * sc, 7 * sc, 2 * sc, 'rgba(255,220,100,', t);

  // MAIN NAVE
  wall(-34 * sc, -52 * sc, 68 * sc, 52 * sc, '#2e2848', false);
  // Nave roof — gabled
  ctx.fillStyle = '#1e1838';
  ctx.beginPath();
  ctx.moveTo(-38 * sc, -52 * sc);
  ctx.lineTo(0, -78 * sc);
  ctx.lineTo(38 * sc, -52 * sc);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.beginPath();
  ctx.moveTo(-3 * sc, -52 * sc);
  ctx.lineTo(0, -78 * sc);
  ctx.lineTo(3 * sc, -52 * sc);
  ctx.closePath();
  ctx.fill();
  // Ridge
  ctx.fillStyle = '#2a2050';
  ctx.fillRect(-2 * sc, -80 * sc, 4 * sc, 5 * sc);
  cross(0, -86 * sc, 9 * sc, 2.5 * sc, 'rgba(255,220,100,', t);

  // Door arch
  ctx.fillStyle = 'rgba(8,6,16,0.92)';
  ctx.beginPath();
  ctx.rect(-10 * sc, -38 * sc, 20 * sc, 38 * sc);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -38 * sc, 10 * sc, Math.PI, 0, false);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,160,255,0.3)';
  ctx.lineWidth = 1 * sc;
  ctx.beginPath();
  ctx.moveTo(-10 * sc, -38 * sc);
  ctx.lineTo(-10 * sc, 0);
  ctx.lineTo(10 * sc, 0);
  ctx.lineTo(10 * sc, -38 * sc);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -38 * sc, 10 * sc, Math.PI, 0, false);
  ctx.stroke();

  // Gothic windows
  gothicWin(-30 * sc, -46 * sc, 12 * sc, 20 * sc, true, t);
  gothicWin(18 * sc, -46 * sc, 12 * sc, 20 * sc, true, t);

  // Small rose window above door
  roseWindow(0, -52 * sc, 8 * sc, t);

  // Candles at steps
  candle(-16 * sc, -1 * sc, t);
  candle(16 * sc, -1 * sc, t);

  // Stone steps
  ctx.fillStyle = '#222040';
  ctx.fillRect(-20 * sc, 0, 40 * sc, 4 * sc);
  ctx.fillRect(-16 * sc, -4 * sc, 32 * sc, 4 * sc);

  // Label
  ctx.fillStyle = 'rgba(200,160,255,0.8)';
  ctx.font = `${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Parokya', 0, h * 0.15);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 3 — Simbahang Bato (colonial stone church, twin bell towers)
   Based on HTML LV3
═══════════════════════════════════════════════════════════════ */
function drawLv3(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, wall, roseWindow, gothicWin, bell, cross, candle, buttress } = helpers;

  drawShadow(60 * sc, 7 * sc);

  // LEFT BELL TOWER
  wall(-72 * sc, -86 * sc, 24 * sc, 86 * sc, '#242040', true);
  ctx.fillStyle = '#1c1838';
  ctx.fillRect(-74 * sc, -90 * sc, 28 * sc, 5 * sc);
  ctx.fillRect(-72 * sc, -98 * sc, 24 * sc, 9 * sc);
  // Belfry
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(-68 * sc, -87 * sc, 16 * sc, 18 * sc);
  ctx.beginPath();
  ctx.arc(-60 * sc, -87 * sc, 8 * sc, Math.PI, 0, false);
  ctx.fill();
  bell(-60 * sc, -76 * sc, 7 * sc, t);
  // Conical spire
  ctx.fillStyle = '#181430';
  ctx.beginPath();
  ctx.moveTo(-74 * sc, -98 * sc);
  ctx.lineTo(-60 * sc, -120 * sc);
  ctx.lineTo(-46 * sc, -98 * sc);
  ctx.closePath();
  ctx.fill();
  cross(-60 * sc, -124 * sc, 8 * sc, 2.2 * sc, 'rgba(255,220,100,', t);

  // RIGHT BELL TOWER
  wall(48 * sc, -86 * sc, 24 * sc, 86 * sc, '#262244', false);
  ctx.fillStyle = '#1c1838';
  ctx.fillRect(46 * sc, -90 * sc, 28 * sc, 5 * sc);
  ctx.fillRect(48 * sc, -98 * sc, 24 * sc, 9 * sc);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(52 * sc, -87 * sc, 16 * sc, 18 * sc);
  ctx.beginPath();
  ctx.arc(60 * sc, -87 * sc, 8 * sc, Math.PI, 0, false);
  ctx.fill();
  bell(60 * sc, -76 * sc, 7 * sc, t);
  ctx.fillStyle = '#181430';
  ctx.beginPath();
  ctx.moveTo(46 * sc, -98 * sc);
  ctx.lineTo(60 * sc, -120 * sc);
  ctx.lineTo(74 * sc, -98 * sc);
  ctx.closePath();
  ctx.fill();
  cross(60 * sc, -124 * sc, 8 * sc, 2.2 * sc, 'rgba(255,220,100,', t);

  // MAIN FACADE
  wall(-48 * sc, -72 * sc, 96 * sc, 72 * sc, '#2c2848', false);
  // Facade step-back
  ctx.fillStyle = '#242044';
  ctx.fillRect(-44 * sc, -80 * sc, 88 * sc, 10 * sc);
  ctx.fillRect(-40 * sc, -86 * sc, 80 * sc, 8 * sc);

  // Buttresses on facade sides
  buttress(-48 * sc, -1 * sc, 50 * sc, -1);
  buttress(48 * sc, -1 * sc, 50 * sc, 1);

  // LARGE ROSE WINDOW center
  roseWindow(0, -52 * sc, 18 * sc, t);

  // Triple door arches
  [-22, 0, 22].forEach((dx, di) => {
    ctx.fillStyle = 'rgba(6,4,14,0.92)';
    ctx.beginPath();
    ctx.rect(dx * sc - 8 * sc, -32 * sc, 16 * sc, 32 * sc);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dx * sc, -32 * sc, 8 * sc, Math.PI, 0, false);
    ctx.fill();
    ctx.strokeStyle = `rgba(200,160,255,${di === 1 ? 0.45 : 0.25})`;
    ctx.lineWidth = 0.9 * sc;
    ctx.beginPath();
    ctx.arc(dx * sc, -32 * sc, 8 * sc, Math.PI, 0, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dx * sc - 8 * sc, -32 * sc);
    ctx.lineTo(dx * sc - 8 * sc, 0);
    ctx.lineTo(dx * sc + 8 * sc, 0);
    ctx.lineTo(dx * sc + 8 * sc, -32 * sc);
    ctx.stroke();
  });

  // Gothic side windows
  gothicWin(-46 * sc, -66 * sc, 10 * sc, 18 * sc, true, t);
  gothicWin(36 * sc, -66 * sc, 10 * sc, 18 * sc, true, t);
  gothicWin(-46 * sc, -44 * sc, 10 * sc, 16 * sc, Math.sin(t * 0.5) > 0, t);
  gothicWin(36 * sc, -44 * sc, 10 * sc, 16 * sc, Math.sin(t * 0.5 + 1) > 0, t);

  // Candles at grand steps
  [-28, -14, 14, 28].forEach((cx2) => {
    candle(cx2 * sc, -1 * sc, t);
  });

  // Grand steps
  ctx.fillStyle = '#201e3a';
  ctx.fillRect(-42 * sc, 0, 84 * sc, 4 * sc);
  ctx.fillRect(-38 * sc, -4 * sc, 76 * sc, 4 * sc);
  ctx.fillRect(-34 * sc, -8 * sc, 68 * sc, 4 * sc);

  // Label
  ctx.fillStyle = 'rgba(200,160,255,0.82)';
  ctx.font = `${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Simbahang Bato', 0, h * 0.14);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 4 — Basilika (grand baroque basilica with dome)
   Based on HTML LV4
═══════════════════════════════════════════════════════════════ */
function drawLv4(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, wall, roseWindow, gothicWin, bell, cross, candle, buttress, holyParticles } = helpers;

  drawShadow(78 * sc, 8 * sc);

  // SIDE CHAPELS
  [-1, 1].forEach((side) => {
    const sx = side * 80 * sc;
    const scw = 26 * sc;
    const sch = 52 * sc;
    wall(sx - (side > 0 ? scw : 0), -sch, scw, sch, side < 0 ? '#1e1c38' : '#222040', side < 0);
    ctx.fillStyle = '#181630';
    ctx.beginPath();
    ctx.moveTo(sx - (side > 0 ? scw : 0), -sch);
    ctx.lineTo(sx - (side > 0 ? scw : 0) + scw / 2, -sch - 18 * sc);
    ctx.lineTo(sx - (side > 0 ? scw : 0) + scw, -sch);
    ctx.closePath();
    ctx.fill();
    // Chapel window
    gothicWin(sx - (side > 0 ? scw : 0) + 4 * sc, -sch + 8 * sc, scw - 8 * sc, 20 * sc, Math.sin(t * 0.6 + side) > 0, t);
    // Chapel cross
    cross(sx - (side > 0 ? scw : 0) + scw / 2, -sch - 22 * sc, 7 * sc, 2 * sc, 'rgba(255,220,100,', t);
    // Buttress on outer side
    buttress(sx - (side > 0 ? 0 : scw), 0, sch * 0.6, side);
    buttress(sx - (side > 0 ? 0 : scw), -sch * 0.38, sch * 0.45, side);
  });

  // TWIN TALL SPIRES
  [-1, 1].forEach((side) => {
    const tx = side * 52 * sc;
    wall(tx - (side > 0 ? 20 * sc : 0), -98 * sc, 20 * sc, 98 * sc, side < 0 ? '#1e1c3c' : '#222044', side < 0);
    // Spire
    ctx.fillStyle = '#14102c';
    ctx.beginPath();
    ctx.moveTo(tx - (side > 0 ? 20 * sc : 0), -98 * sc);
    ctx.lineTo(tx - (side > 0 ? 10 * sc : 10 * sc), -136 * sc);
    ctx.lineTo(tx - (side > 0 ? 0 : 20 * sc), -98 * sc);
    ctx.closePath();
    ctx.fill();
    // Belfry
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(tx - (side > 0 ? 17 * sc : 3 * sc), -88 * sc, 14 * sc, 18 * sc);
    ctx.beginPath();
    ctx.arc(tx - (side > 0 ? 10 * sc : 10 * sc), -88 * sc, 7 * sc, Math.PI, 0, false);
    ctx.fill();
    bell(tx - (side > 0 ? 10 * sc : 10 * sc), -76 * sc, 7 * sc, t);
    // Windows on tower
    gothicWin(tx - (side > 0 ? 18 * sc : 2 * sc), -94 * sc, 12 * sc, 16 * sc, true, t);
    gothicWin(tx - (side > 0 ? 18 * sc : 2 * sc), -70 * sc, 12 * sc, 16 * sc, Math.sin(t * 0.4 + side) > 0, t);
    cross(tx - (side > 0 ? 10 * sc : 10 * sc), -140 * sc, 9 * sc, 2.5 * sc, 'rgba(255,220,100,', t);
    // Buttresses
    buttress(tx - (side > 0 ? 0 : 20 * sc), -1 * sc, 60 * sc, side);
    buttress(tx - (side > 0 ? 0 : 20 * sc), -42 * sc, 44 * sc, side);
  });

  // MAIN NAVE & FACADE
  wall(-52 * sc, -88 * sc, 104 * sc, 88 * sc, '#2c2850', false);
  // Cornice bands
  ctx.fillStyle = '#222048';
  ctx.fillRect(-54 * sc, -92 * sc, 108 * sc, 6 * sc);
  ctx.fillRect(-52 * sc, -98 * sc, 104 * sc, 8 * sc);
  ctx.fillStyle = '#1e1c40';
  ctx.fillRect(-50 * sc, -104 * sc, 100 * sc, 8 * sc);

  // CENTRAL DOME
  ctx.fillStyle = '#242050';
  ctx.fillRect(-22 * sc, -88 * sc, 44 * sc, 10 * sc);
  // Dome base drum
  ctx.fillStyle = '#2a2658';
  ctx.fillRect(-18 * sc, -110 * sc, 36 * sc, 22 * sc);
  // Dome cap
  ctx.fillStyle = '#20185a';
  ctx.beginPath();
  ctx.ellipse(0, -110 * sc, 18 * sc, 8 * sc, 0, Math.PI, 0, true);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -118 * sc, 14 * sc, 20 * sc, 0, Math.PI, 0, true);
  ctx.fill();
  // Lantern on dome
  ctx.fillStyle = '#181440';
  ctx.fillRect(-4 * sc, -138 * sc, 8 * sc, 20 * sc);
  ctx.fillRect(-6 * sc, -140 * sc, 12 * sc, 4 * sc);
  cross(0, -144 * sc, 10 * sc, 2.5 * sc, 'rgba(255,220,100,', t);
  holyParticles(0, -138 * sc, 14 * sc, t);

  // GRAND ROSE WINDOW
  roseWindow(0, -62 * sc, 20 * sc, t);

  // Facade windows
  gothicWin(-48 * sc, -80 * sc, 12 * sc, 22 * sc, true, t);
  gothicWin(36 * sc, -80 * sc, 12 * sc, 22 * sc, true, t);
  gothicWin(-48 * sc, -52 * sc, 12 * sc, 20 * sc, Math.sin(t * 0.5) > 0, t);
  gothicWin(36 * sc, -52 * sc, 12 * sc, 20 * sc, Math.sin(t * 0.5 + 1) > 0, t);

  // TRIPLE GRAND DOORS
  [-24, 0, 24].forEach((dx, di) => {
    const dw = (di === 1 ? 20 : 14) * sc;
    const dh = (di === 1 ? 44 : 36) * sc;
    ctx.fillStyle = 'rgba(6,4,14,0.94)';
    ctx.beginPath();
    ctx.rect(dx * sc - dw / 2, -dh, dw, dh);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dx * sc, -dh, dw / 2, Math.PI, 0, false);
    ctx.fill();
    ctx.strokeStyle = `rgba(200,160,255,${di === 1 ? 0.5 : 0.28})`;
    ctx.lineWidth = (di === 1 ? 1.2 : 0.9) * sc;
    ctx.beginPath();
    ctx.arc(dx * sc, -dh, dw / 2, Math.PI, 0, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dx * sc - dw / 2, -dh);
    ctx.lineTo(dx * sc - dw / 2, 0);
    ctx.lineTo(dx * sc + dw / 2, 0);
    ctx.lineTo(dx * sc + dw / 2, -dh);
    ctx.stroke();
  });

  // Gilded sign
  ctx.fillStyle = '#f5c842';
  ctx.fillRect(-30 * sc, -106 * sc, 60 * sc, 10 * sc);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.5 * sc;
  ctx.strokeRect(-30 * sc, -106 * sc, 60 * sc, 10 * sc);
  ctx.fillStyle = '#0a0812';
  ctx.font = `bold ${5 * sc}px 'Bebas Neue',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BASILIKA', 0, -101 * sc);
  ctx.textBaseline = 'alphabetic';

  // Candles
  [-34, -20, 20, 34].forEach((cx2) => {
    candle(cx2 * sc, -1 * sc, t);
  });

  // Grand steps
  ctx.fillStyle = '#1e1c38';
  ctx.fillRect(-56 * sc, 0, 112 * sc, 4 * sc);
  ctx.fillRect(-52 * sc, -4 * sc, 104 * sc, 4 * sc);
  ctx.fillRect(-48 * sc, -8 * sc, 96 * sc, 4 * sc);
  ctx.fillRect(-44 * sc, -12 * sc, 88 * sc, 4 * sc);

  // Label
  ctx.fillStyle = 'rgba(210,170,255,0.85)';
  ctx.font = `${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Basilika', 0, h * 0.13);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 5 — Katedral (full Gothic cathedral with flying buttresses)
   Based on HTML LV5
═══════════════════════════════════════════════════════════════ */
function drawLv5(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, wall, roseWindow, gothicWin, bell, cross, candle, buttress, holyParticles } = helpers;

  drawShadow(96 * sc, 10 * sc);

  // OUTER SIDE AISLES
  [-1, 1].forEach((side) => {
    const ax = side * 96 * sc;
    const aw = 28 * sc;
    const ah = 58 * sc;
    wall(ax - (side > 0 ? aw : 0), -ah, aw, ah, side < 0 ? '#1a1836' : '#1e1c3a', side < 0);
    ctx.fillStyle = '#14102e';
    ctx.beginPath();
    ctx.moveTo(ax - (side > 0 ? aw : 0), -ah);
    ctx.lineTo(ax - (side > 0 ? aw / 2 : aw / 2), -ah - 16 * sc);
    ctx.lineTo(ax - (side > 0 ? 0 : aw), -ah);
    ctx.closePath();
    ctx.fill();
    gothicWin(ax - (side > 0 ? aw : 0) + 4 * sc, -ah + 6 * sc, aw - 8 * sc, 24 * sc, Math.sin(t * 0.5 + side * 2) > 0, t);
    gothicWin(ax - (side > 0 ? aw : 0) + 4 * sc, -ah + 34 * sc, aw - 8 * sc, 16 * sc, Math.sin(t * 0.4 + side) > 0, t);
    cross(ax - (side > 0 ? aw / 2 : aw / 2), -ah - 20 * sc, 6 * sc, 1.5 * sc, 'rgba(255,220,100,', t);
    // Flying buttress arcs
    ctx.strokeStyle = 'rgba(180,160,255,0.2)';
    ctx.lineWidth = 1.5 * sc;
    ctx.beginPath();
    ctx.moveTo(ax - (side > 0 ? 0 : aw), -ah * 0.55);
    ctx.quadraticCurveTo(ax - (side > 0 ? -10 * sc : aw + 10 * sc), -ah * 0.8, ax - (side > 0 ? -18 * sc : aw + 18 * sc), -ah * 0.65);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax - (side > 0 ? 0 : aw), -ah * 0.25);
    ctx.quadraticCurveTo(ax - (side > 0 ? -10 * sc : aw + 10 * sc), -ah * 0.5, ax - (side > 0 ? -18 * sc : aw + 18 * sc), -ah * 0.35);
    ctx.stroke();
    // Outer buttress piers
    ctx.fillStyle = '#18163a';
    ctx.fillRect(ax - (side > 0 ? -16 * sc : aw + 12 * sc), -ah * 0.7, 6 * sc, ah * 0.7);
  });

  // INNER TRANSEPT WINGS
  [-1, 1].forEach((side) => {
    const tx2 = side * 68 * sc;
    const tw = 24 * sc;
    const th = 74 * sc;
    wall(tx2 - (side > 0 ? tw : 0), -th, tw, th, side < 0 ? '#1e1c40' : '#222044', side < 0);
    ctx.fillStyle = '#181640';
    ctx.beginPath();
    ctx.moveTo(tx2 - (side > 0 ? tw : 0), -th);
    ctx.lineTo(tx2 - (side > 0 ? tw / 2 : tw / 2), -th - 20 * sc);
    ctx.lineTo(tx2 - (side > 0 ? 0 : tw), -th);
    ctx.closePath();
    ctx.fill();
    // Transept windows
    gothicWin(tx2 - (side > 0 ? tw : 0) + 3 * sc, -th + 6 * sc, tw - 6 * sc, 26 * sc, true, t);
    gothicWin(tx2 - (side > 0 ? tw : 0) + 3 * sc, -th + 36 * sc, tw - 6 * sc, 22 * sc, Math.sin(t * 0.5 + side) > 0, t);
    cross(tx2 - (side > 0 ? tw / 2 : tw / 2), -th - 24 * sc, 7 * sc, 2 * sc, 'rgba(255,220,100,', t);
    // Flying buttresses inner
    ctx.strokeStyle = 'rgba(180,160,255,0.18)';
    ctx.lineWidth = 1.5 * sc;
    [-0.6, -0.3].forEach((frac) => {
      ctx.beginPath();
      ctx.moveTo(tx2 - (side > 0 ? 0 : tw), -th * Math.abs(frac));
      ctx.quadraticCurveTo(tx2 - (side > 0 ? -8 * sc : tw + 8 * sc), -th * (Math.abs(frac) + 0.15), tx2 - (side > 0 ? -14 * sc : tw + 14 * sc), -th * Math.abs(frac));
      ctx.stroke();
    });
  });

  // GRAND TWIN SPIRES
  [-1, 1].forEach((side) => {
    const sx = side * 44 * sc;
    wall(sx - (side > 0 ? 22 * sc : 0), -110 * sc, 22 * sc, 110 * sc, side < 0 ? '#201e42' : '#242246', side < 0);
    // Spire
    ctx.fillStyle = '#120e2e';
    ctx.beginPath();
    ctx.moveTo(sx - (side > 0 ? 22 * sc : 0), -110 * sc);
    ctx.lineTo(sx - (side > 0 ? 11 * sc : 11 * sc), -158 * sc);
    ctx.lineTo(sx - (side > 0 ? 0 : 22 * sc), -110 * sc);
    ctx.closePath();
    ctx.fill();
    // Spire highlight
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.moveTo(sx - (side > 0 ? 11 * sc : 11 * sc), -158 * sc);
    ctx.lineTo(sx - (side > 0 ? 5 * sc : 11 * sc), -110 * sc);
    ctx.lineTo(sx - (side > 0 ? 6 * sc : 12 * sc), -110 * sc);
    ctx.closePath();
    ctx.fill();
    // Belfry
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(sx - (side > 0 ? 19 * sc : 3 * sc), -100 * sc, 16 * sc, 20 * sc);
    ctx.beginPath();
    ctx.arc(sx - (side > 0 ? 11 * sc : 11 * sc), -100 * sc, 8 * sc, Math.PI, 0, false);
    ctx.fill();
    bell(sx - (side > 0 ? 11 * sc : 11 * sc), -88 * sc, 8 * sc, t);
    // Tower windows
    gothicWin(sx - (side > 0 ? 20 * sc : 2 * sc), -108 * sc, 14 * sc, 20 * sc, true, t);
    gothicWin(sx - (side > 0 ? 20 * sc : 2 * sc), -82 * sc, 14 * sc, 18 * sc, Math.sin(t * 0.4 + side) > 0, t);
    gothicWin(sx - (side > 0 ? 20 * sc : 2 * sc), -56 * sc, 14 * sc, 18 * sc, Math.sin(t * 0.3 + side * 2) > 0, t);
    cross(sx - (side > 0 ? 11 * sc : 11 * sc), -162 * sc, 11 * sc, 3 * sc, 'rgba(255,220,100,', t);
    holyParticles(sx - (side > 0 ? 11 * sc : 11 * sc), -158 * sc, 10 * sc, t);
    // Buttress piers
    buttress(sx - (side > 0 ? 0 : 22 * sc), -1 * sc, 70 * sc, side);
    buttress(sx - (side > 0 ? 0 : 22 * sc), -48 * sc, 54 * sc, side);
    buttress(sx - (side > 0 ? 0 : 22 * sc), -88 * sc, 38 * sc, side);
  });

  // MAIN NAVE
  wall(-44 * sc, -96 * sc, 88 * sc, 96 * sc, '#2e2a58', false);
  // Cornice layers
  ctx.fillStyle = '#242054';
  ctx.fillRect(-46 * sc, -100 * sc, 92 * sc, 6 * sc);
  ctx.fillRect(-44 * sc, -108 * sc, 88 * sc, 10 * sc);
  ctx.fillRect(-42 * sc, -114 * sc, 84 * sc, 8 * sc);

  // GRAND DOME / CROSSING TOWER
  ctx.fillStyle = '#262260';
  ctx.fillRect(-20 * sc, -96 * sc, 40 * sc, 14 * sc);
  // Drum
  ctx.fillStyle = '#2e2868';
  ctx.fillRect(-16 * sc, -118 * sc, 32 * sc, 22 * sc);
  // Dome
  ctx.fillStyle = '#1e1850';
  ctx.beginPath();
  ctx.ellipse(0, -118 * sc, 16 * sc, 7 * sc, 0, Math.PI, 0, true);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -128 * sc, 12 * sc, 18 * sc, 0, Math.PI, 0, true);
  ctx.fill();
  // Lantern
  ctx.fillStyle = '#16124a';
  ctx.fillRect(-5 * sc, -148 * sc, 10 * sc, 20 * sc);
  ctx.fillRect(-7 * sc, -150 * sc, 14 * sc, 4 * sc);
  // Lantern windows glowing
  ctx.fillStyle = 'rgba(255,220,100,0.6)';
  ctx.fillRect(-4 * sc, -146 * sc, 3 * sc, 6 * sc);
  ctx.fillRect(1 * sc, -146 * sc, 3 * sc, 6 * sc);
  cross(0, -155 * sc, 12 * sc, 3 * sc, 'rgba(255,220,100,', t);
  holyParticles(0, -150 * sc, 16 * sc, t);

  // MASSIVE ROSE WINDOW
  roseWindow(0, -68 * sc, 24 * sc, t);

  // Facade windows
  [-38, -20, 20, 38].forEach((wx) => {
    gothicWin(wx * sc - 6 * sc, -92 * sc, 12 * sc, 24 * sc, true, t);
    gothicWin(wx * sc - 6 * sc, -60 * sc, 12 * sc, 22 * sc, Math.sin(t * 0.5 + wx * 0.005) > 0, t);
    gothicWin(wx * sc - 6 * sc, -30 * sc, 12 * sc, 20 * sc, Math.sin(t * 0.4 + wx * 0.004 + 1) > 0, t);
  });

  // GRAND 5-DOOR PORTAL
  [-32, -16, 0, 16, 32].forEach((dx, di) => {
    const dw = (di === 2 ? 22 : di === 1 || di === 3 ? 16 : 12) * sc;
    const dh = (di === 2 ? 50 : di === 1 || di === 3 ? 42 : 34) * sc;
    ctx.fillStyle = 'rgba(4,2,12,0.95)';
    ctx.beginPath();
    ctx.rect(dx * sc - dw / 2, -dh, dw, dh);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dx * sc, -dh, dw / 2, Math.PI, 0, false);
    ctx.fill();
    ctx.strokeStyle = `rgba(200,160,255,${di === 2 ? 0.55 : 0.3})`;
    ctx.lineWidth = (di === 2 ? 1.3 : 0.9) * sc;
    ctx.beginPath();
    ctx.arc(dx * sc, -dh, dw / 2, Math.PI, 0, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dx * sc - dw / 2, -dh);
    ctx.lineTo(dx * sc - dw / 2, 0);
    ctx.lineTo(dx * sc + dw / 2, 0);
    ctx.lineTo(dx * sc + dw / 2, -dh);
    ctx.stroke();
  });

  // Gilded grand sign
  ctx.fillStyle = '#f5c842';
  ctx.fillRect(-34 * sc, -116 * sc, 68 * sc, 12 * sc);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 0.5 * sc;
  ctx.strokeRect(-34 * sc, -116 * sc, 68 * sc, 12 * sc);
  ctx.fillStyle = '#08060e';
  ctx.font = `bold ${5.5 * sc}px 'Bebas Neue',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('KATEDRAL NG MINI BAYAN', 0, -110 * sc);
  ctx.textBaseline = 'alphabetic';

  // Candles row
  [-40, -26, -12, 12, 26, 40].forEach((cx2) => {
    candle(cx2 * sc, -1 * sc, t);
  });

  // GRAND STEPS
  ctx.fillStyle = '#1c1a38';
  ctx.fillRect(-62 * sc, 0, 124 * sc, 4 * sc);
  ctx.fillRect(-58 * sc, -4 * sc, 116 * sc, 4 * sc);
  ctx.fillRect(-54 * sc, -8 * sc, 108 * sc, 4 * sc);
  ctx.fillRect(-50 * sc, -12 * sc, 100 * sc, 4 * sc);
  ctx.fillRect(-46 * sc, -16 * sc, 92 * sc, 4 * sc);

  // Divine light ray from cross
  const rayAlpha = 0.04 + Math.sin(t * 0.8) * 0.02;
  const rayG = ctx.createLinearGradient(0, -162 * sc, 0, 0);
  rayG.addColorStop(0, `rgba(255,220,100,${rayAlpha * 3})`);
  rayG.addColorStop(1, 'rgba(255,220,100,0)');
  ctx.fillStyle = rayG;
  ctx.beginPath();
  ctx.moveTo(-3 * sc, -162 * sc);
  ctx.lineTo(-80 * sc, 0);
  ctx.lineTo(80 * sc, 0);
  ctx.lineTo(3 * sc, -162 * sc);
  ctx.closePath();
  ctx.fill();

  // Label
  ctx.fillStyle = 'rgba(220,180,255,0.9)';
  ctx.font = `bold ${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Katedral ng Mini Bayan', 0, h * 0.11);
}