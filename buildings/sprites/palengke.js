/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/sprites/palengke.js

   Palengke (Market) — Level 1–5 sprites
   Faithful recreation of the designs from palengke-levels.html
   with proper perspective scaling (sc) and positioning relative
   to building origin (x=0, y=0 at ground level).

   LEVEL 1 — Tindahan (simple store)
   LEVEL 2 — Palengke (basic market with stalls)
   LEVEL 3 — Palengke Sentral (covered market hall)
   LEVEL 4 — Merkado (two-storey public market)
   LEVEL 5 — Grand Merkado (grand market complex with clock tower)

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
  // Use w/h as primary dimensions — they already include sc scaling
  // The HTML designs used fixed pixel dimensions; we adapt them proportionally.
  // We'll use the same coordinate system as building.js: origin at ground center,
  // positive Y down, negative Y up.
  const t = now * 0.001;

  // Helper: draw shadow ellipse at ground level
  const drawShadow = (radiusX, radiusY) => {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 3, radiusX || w * 0.62, radiusY || h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  // Helper: standard window with crossbars
  const stdWin = (x, y, winW, winH) => {
    ctx.fillStyle = 'rgba(180,220,255,0.55)';
    ctx.fillRect(x, y, winW, winH);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
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

  // Helper: awning over a stall section
  const awning = (x, y, awW, awH, color) => {
    ctx.fillStyle = color || '#cc3322';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + awW, y);
    ctx.lineTo(x + awW + 4 * sc, y + awH);
    ctx.lineTo(x - 4 * sc, y + awH);
    ctx.closePath();
    ctx.fill();
    // stripes
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let s = 0; s < 4; s++) {
      const sx = x + s * (awW / 4);
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.lineTo(sx + awW / 4, y);
      ctx.lineTo(sx + awW / 4 + 4 * sc, y + awH);
      ctx.lineTo(sx + 4 * sc, y + awH);
      ctx.closePath();
      if (s % 2 === 0) ctx.fill();
    }
  };

  // Helper: hanging pennant string
  const pennants = (x1, y1, x2, y2, colors, animTime) => {
    const tAnim = animTime * 0.001;
    ctx.strokeStyle = 'rgba(180,180,180,0.4)';
    ctx.lineWidth = 0.6 * sc;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + 8 * sc, x2, y2);
    ctx.stroke();
    for (let i = 0; i < colors.length; i++) {
      const p = (i + 0.5) / colors.length;
      let px = x1 + (x2 - x1) * p;
      let py = y1 + (y2 - y1) * p + Math.sin(Math.PI * p) * 8 * sc + Math.sin(tAnim * 1.2 + i) * 1.5 * sc;
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.moveTo(px - 3 * sc, py);
      ctx.lineTo(px + 3 * sc, py);
      ctx.lineTo(px, py + 6 * sc);
      ctx.closePath();
      ctx.fill();
    }
  };

  // Helper: sign board
  const sign = (x, y, signW, signH, text, bgc, tc) => {
    ctx.fillStyle = bgc || '#1a3a6a';
    ctx.fillRect(x, y, signW, signH);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.7 * sc;
    ctx.strokeRect(x, y, signW, signH);
    ctx.fillStyle = tc || '#ffffff';
    ctx.font = `bold ${Math.max(8, signH * 0.62)}px 'Bebas Neue',sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + signW / 2, y + signH / 2 + 0.5 * sc);
    ctx.textBaseline = 'alphabetic';
  };

  // Helper: arch over opening
  const arch = (cx, baseY, archW, fill, stroke) => {
    ctx.fillStyle = fill || 'rgba(20,40,80,0.7)';
    ctx.beginPath();
    ctx.rect(cx - archW / 2, baseY, archW, archW * 0.6);
    ctx.arc(cx, baseY, archW / 2, Math.PI, 0, true);
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1 * sc;
      ctx.beginPath();
      ctx.rect(cx - archW / 2, baseY, archW, archW * 0.6);
      ctx.arc(cx, baseY, archW / 2, Math.PI, 0, true);
      ctx.stroke();
    }
  };

  // Helper: draw ground shadow and base platform
  const drawBase = () => {
    drawShadow(w * 0.62, h * 0.12);
    // subtle ground shadow under building
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.fillRect(-w / 2 - 4, 0, w + 8, 4 * sc);
  };

  // Dispatch based on level
  switch (level) {
    case 1:
      drawLv1(ctx, sc, w, h, def, t, { drawBase, stdWin, awning, sign, arch, pennants });
      break;
    case 2:
      drawLv2(ctx, sc, w, h, def, t, { drawBase, stdWin, awning, sign, arch, pennants });
      break;
    case 3:
      drawLv3(ctx, sc, w, h, def, t, { drawBase, stdWin, awning, sign, arch, pennants });
      break;
    case 4:
      drawLv4(ctx, sc, w, h, def, t, { drawBase, stdWin, awning, sign, arch, pennants });
      break;
    case 5:
      drawLv5(ctx, sc, w, h, def, t, { drawBase, stdWin, awning, sign, arch, pennants });
      break;
    default:
      // fallback to generic if level out of range
      drawLv1(ctx, sc, w, h, def, t, { drawBase, stdWin, awning, sign, arch, pennants });
  }
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 1 — Tindahan (simple store)
   Dimensions: w = def.w * sc, h = def.h * sc
   Based on HTML LV1: w=52, h=38 in original fixed pixels
═══════════════════════════════════════════════════════════════ */
function drawLv1(ctx, sc, w, h, def, t, helpers) {
  const { drawBase, stdWin, awning } = helpers;
  drawBase();

  // Wall (color from def: #6090c8)
  ctx.fillStyle = def.wallColor;
  ctx.fillRect(-w / 2, -h * 0.55, w, h * 0.67);
  // Wall shading
  const ws = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  ws.addColorStop(0, 'rgba(0,0,0,0)');
  ws.addColorStop(0.7, 'rgba(0,0,0,0)');
  ws.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = ws;
  ctx.fillRect(-w / 2, -h * 0.55, w, h * 0.67);

  // Roof (gable)
  ctx.fillStyle = def.roofColor;
  ctx.beginPath();
  ctx.moveTo(-w * 0.58, -h * 0.55);
  ctx.lineTo(0, -h * 1.12);
  ctx.lineTo(w * 0.58, -h * 0.55);
  ctx.closePath();
  ctx.fill();

  // Roof ridge highlight
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(-w * 0.1, -h * 0.55);
  ctx.lineTo(0, -h * 1.12);
  ctx.lineTo(w * 0.1, -h * 0.55);
  ctx.closePath();
  ctx.fill();

  // Door
  ctx.fillStyle = 'rgba(20,40,80,0.7)';
  const dw = 10 * sc;
  const dh = h * 0.34;
  ctx.beginPath();
  ctx.rect(-dw / 2, -dh, dw, dh);
  ctx.arc(0, -dh, dw / 2, Math.PI, 0, true);
  ctx.fill();

  // Windows
  stdWin(-w * 0.38, -h * 0.48, 10 * sc, 8 * sc);
  stdWin(w * 0.23, -h * 0.48, 10 * sc, 8 * sc);

  // Small awning above door
  awning(-8 * sc, -h * 0.36, 16 * sc, 6 * sc, '#cc3322');

  // Goods outside
  ctx.fillStyle = '#c8a030';
  ctx.fillRect(-w * 0.5 + 2 * sc, 0, 8 * sc, 4 * sc);
  ctx.fillStyle = '#e8b840';
  ctx.beginPath();
  ctx.arc(-w * 0.5 + 6 * sc, -2 * sc, 4 * sc, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = 'rgba(200,225,255,0.85)';
  ctx.font = `${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Tindahan', 0, h * 0.26);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 2 — Palengke
   Wider structure with front stall awnings and pennant flags
═══════════════════════════════════════════════════════════════ */
function drawLv2(ctx, sc, w, h, def, t, helpers) {
  const { drawBase, stdWin, awning, sign, pennants } = helpers;
  drawBase();

  // Left stall counter
  ctx.fillStyle = '#4a7ab0';
  ctx.fillRect(-w / 2, -h * 0.4, w * 0.32, h * 0.4);
  awning(-w / 2, -h * 0.4, w * 0.32 + 2 * sc, 9 * sc, '#cc3322');
  ctx.fillStyle = '#5080b8';
  ctx.fillRect(-w / 2 + 2 * sc, 0, w * 0.3, 4 * sc);

  // Right stall counter
  ctx.fillStyle = '#4a7ab0';
  ctx.fillRect(w * 0.16, -h * 0.4, w * 0.34, h * 0.4);
  awning(w * 0.16, -h * 0.4, w * 0.34 + 2 * sc, 9 * sc, '#2255aa');
  ctx.fillStyle = '#5080b8';
  ctx.fillRect(w * 0.18, 0, w * 0.3, 4 * sc);

  // Main walls
  ctx.fillStyle = def.wallColor;
  ctx.fillRect(-w / 2, -h * 0.55, w, h * 0.67);
  const ws = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  ws.addColorStop(0, 'rgba(0,0,0,0)');
  ws.addColorStop(0.75, 'rgba(0,0,0,0)');
  ws.addColorStop(1, 'rgba(0,0,0,0.16)');
  ctx.fillStyle = ws;
  ctx.fillRect(-w / 2, -h * 0.55, w, h * 0.67);

  // Gable roof (steeper)
  ctx.fillStyle = def.roofColor;
  ctx.beginPath();
  ctx.moveTo(-w * 0.56, -h * 0.55);
  ctx.lineTo(0, -h * 1.18);
  ctx.lineTo(w * 0.56, -h * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath();
  ctx.moveTo(-w * 0.08, -h * 0.55);
  ctx.lineTo(0, -h * 1.18);
  ctx.lineTo(w * 0.08, -h * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a4080';
  ctx.fillRect(-w * 0.58, -h * 0.555, w * 1.16, h * 0.035);

  // Door
  ctx.fillStyle = 'rgba(20,40,80,0.7)';
  const dw = 11 * sc;
  const dh = h * 0.36;
  ctx.beginPath();
  ctx.rect(-dw / 2, -dh, dw, dh);
  ctx.arc(0, -dh, dw / 2, Math.PI, 0, true);
  ctx.fill();

  // Windows
  stdWin(-w * 0.4, -h * 0.46, 11 * sc, 9 * sc);
  stdWin(w * 0.24, -h * 0.46, 11 * sc, 9 * sc);

  // Pennant string across front
  pennants(-w * 0.5, -h * 0.42, w * 0.5, -h * 0.42,
    ['#cc2222', '#f5c842', '#2255aa', '#44aa44', '#cc2222', '#f5c842'], t);

  // Goods on counters
  ['#e8b840', '#44aa44', '#e84040', '#f5a020'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(-w / 2 + 6 * sc + i * 7 * sc, -2 * sc, 3.5 * sc, 0, Math.PI * 2);
    ctx.fill();
  });

  // Sign
  sign(-w * 0.28, -h * 0.56, w * 0.56, 9 * sc, 'PALENGKE', '#1a3a6a', '#f5c842');

  // Label
  ctx.fillStyle = 'rgba(200,225,255,0.82)';
  ctx.font = `${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Palengke', 0, h * 0.26);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 3 — Palengke Sentral
   Covered market hall: wide hipped roof, two side wings, busy stalls
═══════════════════════════════════════════════════════════════ */
function drawLv3(ctx, sc, w, h, def, t, helpers) {
  const { drawBase, stdWin, awning, sign, arch, pennants } = helpers;
  drawBase();

  const wgW = 20 * sc;
  const wgH = 36 * sc;

  // Side wing function
  const stallWing = (lx) => {
    ctx.fillStyle = '#4060a0';
    ctx.fillRect(lx + 2 * sc, -wgH, 4 * sc, wgH);
    ctx.fillRect(lx + wgW - 6 * sc, -wgH, 4 * sc, wgH);
    ctx.fillStyle = 'rgba(64,90,160,0.4)';
    ctx.fillRect(lx + 6 * sc, -wgH, wgW - 12 * sc, wgH);
    // Canopy roof
    ctx.fillStyle = '#1a3878';
    ctx.beginPath();
    ctx.moveTo(lx, -wgH - 2 * sc);
    ctx.lineTo(lx + wgW + 2 * sc, -wgH + 4 * sc);
    ctx.lineTo(lx + wgW + 2 * sc, 0);
    ctx.lineTo(lx, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,130,220,0.3)';
    ctx.lineWidth = 1 * sc;
    for (let ri = 0; ri < 4; ri++) {
      const ry = -wgH - 2 * sc + ri * (wgH + 6 * sc) / 4;
      ctx.beginPath();
      ctx.moveTo(lx, ry);
      ctx.lineTo(lx + wgW + 2 * sc, ry + (wgH + 6 * sc) / 4 * 0.25);
      ctx.stroke();
    }
    // Goods
    ['#e8b840', '#44aa44', '#e84040'].forEach((c, gi) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(lx + 5 * sc + gi * 6 * sc, -3 * sc, 3 * sc, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#3a5898';
    ctx.fillRect(lx + 2 * sc, -4 * sc, wgW - 4 * sc, 4 * sc);
  };

  stallWing(-w / 2 - wgW + 2 * sc);
  stallWing(w / 2 - 2 * sc);

  // Main hall walls
  ctx.fillStyle = def.wallColor;
  ctx.fillRect(-w / 2, -h * 0.54, w, h * 0.67);
  const ws = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  ws.addColorStop(0, 'rgba(0,0,0,0)');
  ws.addColorStop(0.78, 'rgba(0,0,0,0)');
  ws.addColorStop(1, 'rgba(0,0,0,0.16)');
  ctx.fillStyle = ws;
  ctx.fillRect(-w / 2, -h * 0.54, w, h * 0.67);

  // Horizontal band
  ctx.strokeStyle = 'rgba(30,60,120,0.3)';
  ctx.lineWidth = 0.7 * sc;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h * 0.28);
  ctx.lineTo(w / 2, -h * 0.28);
  ctx.stroke();

  // Hipped roof
  ctx.fillStyle = def.roofColor;
  ctx.beginPath();
  ctx.moveTo(-w * 0.54, -h * 0.54);
  ctx.lineTo(-w * 0.12, -h * 1.18);
  ctx.lineTo(w * 0.12, -h * 1.18);
  ctx.lineTo(w * 0.54, -h * 0.54);
  ctx.closePath();
  ctx.fill();
  // Hip end triangles
  ctx.beginPath();
  ctx.moveTo(-w * 0.54, -h * 0.54);
  ctx.lineTo(-w * 0.12, -h * 1.18);
  ctx.lineTo(-w * 0.54, -h * 1.18);
  ctx.closePath();
  ctx.fillStyle = '#1e4888';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.54, -h * 0.54);
  ctx.lineTo(w * 0.12, -h * 1.18);
  ctx.lineTo(w * 0.54, -h * 1.18);
  ctx.closePath();
  ctx.fill();
  // Ridge
  ctx.fillStyle = '#1a3878';
  ctx.fillRect(-w * 0.12, -h * 1.185, w * 0.24, h * 0.02);
  // Eave
  ctx.fillStyle = '#1a3878';
  ctx.fillRect(-w * 0.56, -h * 0.552, w * 1.12, h * 0.036);

  // Front awning full width
  awning(-w / 2, -h * 0.42, w, 12 * sc, '#cc3322');

  // Center door (arch)
  arch(0, -h * 0.38, 16 * sc, 'rgba(15,30,70,0.75)', 'rgba(100,160,255,0.4)');

  // Windows
  stdWin(-w * 0.44, -h * 0.47, 12 * sc, 10 * sc);
  stdWin(-w * 0.24, -h * 0.47, 12 * sc, 10 * sc);
  stdWin(w * 0.09, -h * 0.47, 12 * sc, 10 * sc);
  stdWin(w * 0.29, -h * 0.47, 12 * sc, 10 * sc);

  // Pennants
  pennants(-w * 0.52, -h * 0.44, w * 0.52, -h * 0.44,
    ['#cc2222', '#f5c842', '#2255aa', '#44aa44', '#cc2222', '#f5c842', '#aa22cc'], t);

  // Sign
  sign(-w * 0.3, -h * 0.56, w * 0.6, 10 * sc, 'PALENGKE SENTRAL', '#1a3a6a', '#f5c842');

  ctx.fillStyle = 'rgba(200,225,255,0.82)';
  ctx.font = `${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Palengke Sentral', 0, h * 0.26);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 4 — Merkado
   Two-storey main block, colonnade arcade, big sign, side wings
═══════════════════════════════════════════════════════════════ */
function drawLv4(ctx, sc, w, h, def, t, helpers) {
  const { drawBase, stdWin, awning, sign, arch, pennants } = helpers;
  drawBase();

  const wgW = 24 * sc;
  const wgH = 46 * sc;

  // Side market wings
  const mw4 = (lx) => {
    ctx.fillStyle = '#5080b8';
    ctx.fillRect(lx, -wgH, wgW, wgH);
    const wsg = ctx.createLinearGradient(lx, 0, lx + wgW, 0);
    wsg.addColorStop(0, lx < 0 ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0)');
    wsg.addColorStop(1, lx < 0 ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.12)');
    ctx.fillStyle = wsg;
    ctx.fillRect(lx, -wgH, wgW, wgH);
    // Flat roof
    ctx.fillStyle = '#1a3878';
    ctx.fillRect(lx - 2 * sc, -wgH - 3 * sc, wgW + 4 * sc, 4 * sc);
    ctx.fillStyle = '#243a88';
    ctx.fillRect(lx - 3 * sc, -wgH - 7 * sc, wgW + 6 * sc, 5 * sc);
    ctx.fillStyle = '#162e68';
    ctx.fillRect(lx - 4 * sc, -wgH - 9 * sc, wgW + 8 * sc, 2.5 * sc);
    // Arched opening GF
    arch(lx + wgW / 2, -wgH * 0.46, 16 * sc, 'rgba(15,30,70,0.7)', 'rgba(100,160,255,0.35)');
    stdWin(lx + 4 * sc, -wgH * 0.82, wgW - 8 * sc, 10 * sc, 'rgba(180,220,255,0.55)');
    awning(lx + 1 * sc, -wgH * 0.47, wgW - 2 * sc, 8 * sc, '#cc3322');
    // Goods
    ['#f5c842', '#e84040', '#44bb44'].forEach((c, gi) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(lx + 5 * sc + gi * 6 * sc, -3 * sc, 3 * sc, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#3a5898';
    ctx.fillRect(lx + 1 * sc, -4 * sc, wgW - 2 * sc, 4 * sc);
  };
  mw4(-w / 2 - wgW + 2 * sc);
  mw4(w / 2 - 2 * sc);

  // Main block GF
  ctx.fillStyle = def.wallColor;
  ctx.fillRect(-w / 2, -h * 0.52, w, h * 0.65);
  const ms = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  ms.addColorStop(0, 'rgba(0,0,0,0)');
  ms.addColorStop(0.8, 'rgba(0,0,0,0)');
  ms.addColorStop(1, 'rgba(0,0,0,0.16)');
  ctx.fillStyle = ms;
  ctx.fillRect(-w / 2, -h * 0.52, w, h * 0.65);

  // Floor slab
  ctx.fillStyle = '#1a3878';
  ctx.fillRect(-w / 2 - 2 * sc, -h * 0.52 - 3 * sc, w + 4 * sc, 4 * sc);
  ctx.fillStyle = '#2a4888';
  ctx.fillRect(-w / 2 - 3 * sc, -h * 0.52 - 6 * sc, w + 6 * sc, 3.5 * sc);

  // 2F
  const f2H = h * 0.44;
  ctx.fillStyle = '#7098d0';
  ctx.fillRect(-w / 2, -h * 0.52 - f2H, w, f2H);
  const ms2 = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  ms2.addColorStop(0, 'rgba(255,255,255,0.04)');
  ms2.addColorStop(0.8, 'rgba(0,0,0,0)');
  ms2.addColorStop(1, 'rgba(0,0,0,0.14)');
  ctx.fillStyle = ms2;
  ctx.fillRect(-w / 2, -h * 0.52 - f2H, w, f2H);

  // 2F cornice
  ctx.fillStyle = '#1a3878';
  ctx.fillRect(-w / 2 - 3 * sc, -h * 0.52 - f2H - 3 * sc, w + 6 * sc, 4 * sc);
  ctx.fillStyle = '#243a88';
  ctx.fillRect(-w / 2 - 4 * sc, -h * 0.52 - f2H - 7 * sc, w + 8 * sc, 5 * sc);

  // GF colonnade arcade
  const numArch = 5;
  const aW = w / numArch;
  for (let ai = 0; ai < numArch; ai++) {
    const ax = -w / 2 + ai * aW + aW / 2;
    if (Math.abs(ax) < aW * 0.4) continue;
    arch(ax, -h * 0.38, aW * 0.62, 'rgba(15,30,70,0.5)', 'rgba(80,130,220,0.3)');
    if (ai > 0) {
      const cx2 = -w / 2 + ai * aW;
      ctx.fillStyle = '#5888c0';
      ctx.fillRect(cx2 - 2 * sc, -h * 0.52, 4 * sc, h * 0.52);
    }
  }

  // Center grand door
  arch(0, -h * 0.44, 20 * sc, 'rgba(10,20,60,0.85)', 'rgba(120,180,255,0.5)');

  // GF windows (above arcade)
  stdWin(-w * 0.44, -h * 0.47, 12 * sc, 9 * sc);
  stdWin(-w * 0.26, -h * 0.47, 12 * sc, 9 * sc);
  stdWin(w * 0.11, -h * 0.47, 12 * sc, 9 * sc);
  stdWin(w * 0.29, -h * 0.47, 12 * sc, 9 * sc);

  // 2F windows
  const f2y = -h * 0.52 - f2H * 0.72;
  for (let wi = 0; wi < 5; wi++) {
    const wx = -w / 2 + 8 * sc + wi * (w - 16 * sc) / 4;
    stdWin(wx, f2y, 13 * sc, 10 * sc);
  }

  // Big sign
  sign(-w * 0.32, -h * 0.52 - f2H * 0.25, w * 0.64, 13 * sc, 'MERKADO', '#0a2050', '#f5c842');

  // Wide front awning
  awning(-w / 2, -h * 0.42, w, 11 * sc, '#cc2211');

  // Pennants
  pennants(-w * 0.54, -h * 0.44, w * 0.54, -h * 0.44,
    ['#cc2222', '#f5c842', '#2255aa', '#44aa44', '#cc2222', '#f5c842', '#aa22cc', '#cc2222'], t);

  // Steps
  ctx.fillStyle = '#405888';
  ctx.fillRect(-w / 2 - 4 * sc, 0, w + 8 * sc, 4 * sc);
  ctx.fillStyle = '#4a6898';
  ctx.fillRect(-w / 2 - 8 * sc, -4 * sc, w + 16 * sc, 4 * sc);

  ctx.fillStyle = 'rgba(200,225,255,0.82)';
  ctx.font = `${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Merkado', 0, h * 0.24);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 5 — Grand Merkado
   Majestic market complex: 3-storey central hall with clock tower,
   colonnaded wings, flags, bustling front plaza
═══════════════════════════════════════════════════════════════ */
function drawLv5(ctx, sc, w, h, def, t, helpers) {
  const { drawBase, stdWin, awning, sign, arch, pennants } = helpers;
  drawBase();

  const owW = 22 * sc;
  const owH = 42 * sc;

  // Outer wings 1F
  const ow5 = (lx) => {
    ctx.fillStyle = '#4878b0';
    ctx.fillRect(lx, -owH, owW, owH);
    ctx.fillStyle = lx < 0 ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(lx, -owH, owW, owH);
    ctx.fillStyle = '#1a3878';
    ctx.fillRect(lx - 2 * sc, -owH - 3 * sc, owW + 4 * sc, 4 * sc);
    ctx.fillStyle = '#243a88';
    ctx.fillRect(lx - 3 * sc, -owH - 7 * sc, owW + 6 * sc, 4 * sc);
    ctx.fillStyle = '#162e68';
    ctx.fillRect(lx - 4 * sc, -owH - 9 * sc, owW + 8 * sc, 2 * sc);
    arch(lx + owW / 2, -owH * 0.44, 16 * sc, 'rgba(15,30,70,0.7)', 'rgba(80,140,255,0.35)');
    awning(lx, -owH * 0.45, owW, 8 * sc, '#cc3322');
    ['#f5c842', '#e84040', '#44bb44'].forEach((c, gi) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(lx + 4 * sc + gi * 6 * sc, -3 * sc, 3 * sc, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#3a5898';
    ctx.fillRect(lx + 1 * sc, -4 * sc, owW - 2 * sc, 4 * sc);
  };
  ow5(-w / 2 - owW);
  ow5(w / 2);

  // Inner wings 2F
  const iwW = 30 * sc;
  const iwH = 56 * sc;
  const iw5 = (lx) => {
    ctx.fillStyle = '#5888c0';
    ctx.fillRect(lx, -iwH, iwW, iwH);
    ctx.fillStyle = lx < 0 ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(lx, -iwH, iwW, iwH);
    ctx.fillStyle = '#1a3060';
    ctx.fillRect(lx - 1 * sc, -iwH * 0.5 - 1.5 * sc, iwW + 2 * sc, 3 * sc);
    ctx.fillStyle = '#1a3878';
    ctx.fillRect(lx - 2 * sc, -iwH - 3 * sc, iwW + 4 * sc, 4 * sc);
    ctx.fillStyle = '#243a88';
    ctx.fillRect(lx - 3 * sc, -iwH - 7 * sc, iwW + 6 * sc, 4 * sc);
    arch(lx + iwW / 2, -iwH * 0.44, 18 * sc, 'rgba(12,25,65,0.75)', 'rgba(100,160,255,0.4)');
    stdWin(lx + 4 * sc, -iwH * 0.82, iwW - 8 * sc, 11 * sc, 'rgba(180,220,255,0.58)');
    awning(lx + 1 * sc, -iwH * 0.45, iwW - 2 * sc, 9 * sc, '#2255aa');
    ctx.fillStyle = '#6898c8';
    ctx.fillRect(lx + 2 * sc, -iwH, 3 * sc, iwH);
    ctx.fillRect(lx + iwW - 5 * sc, -iwH, 3 * sc, iwH);
  };
  iw5(-w / 2 + owW * 0.0);
  iw5(w / 2 - iwW);

  // Main central hall dimensions
  const mbW = 66 * sc;
  const mbH = h * 0.5;
  const mb2H = h * 0.44;
  const mb3H = h * 0.3;

  // GF
  ctx.fillStyle = def.wallColor;
  ctx.fillRect(-mbW / 2, -mbH, mbW, mbH);
  const ms1 = ctx.createLinearGradient(-mbW / 2, 0, mbW / 2, 0);
  ms1.addColorStop(0, 'rgba(0,0,0,0)');
  ms1.addColorStop(0.8, 'rgba(0,0,0,0)');
  ms1.addColorStop(1, 'rgba(0,0,0,0.14)');
  ctx.fillStyle = ms1;
  ctx.fillRect(-mbW / 2, -mbH, mbW, mbH);
  ctx.fillStyle = '#1a3878';
  ctx.fillRect(-mbW / 2 - 2 * sc, -mbH - 2 * sc, mbW + 4 * sc, 4 * sc);
  ctx.fillStyle = '#2a4888';
  ctx.fillRect(-mbW / 2 - 3 * sc, -mbH - 5.5 * sc, mbW + 6 * sc, 3.5 * sc);

  // 2F
  ctx.fillStyle = '#7098d0';
  ctx.fillRect(-mbW / 2, -mbH - mb2H, mbW, mb2H);
  const ms2 = ctx.createLinearGradient(-mbW / 2, 0, mbW / 2, 0);
  ms2.addColorStop(0, 'rgba(255,255,255,0.04)');
  ms2.addColorStop(0.8, 'rgba(0,0,0,0)');
  ms2.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = ms2;
  ctx.fillRect(-mbW / 2, -mbH - mb2H, mbW, mb2H);
  ctx.fillStyle = '#1a3060';
  ctx.fillRect(-mbW / 2 - 2 * sc, -mbH - mb2H - 2 * sc, mbW + 4 * sc, 4 * sc);
  ctx.fillStyle = '#243070';
  ctx.fillRect(-mbW / 2 - 3 * sc, -mbH - mb2H - 6 * sc, mbW + 6 * sc, 4 * sc);

  // 3F
  ctx.fillStyle = '#78a0d8';
  ctx.fillRect(-mbW / 2, -mbH - mb2H - mb3H, mbW, mb3H);
  ctx.fillStyle = '#162e68';
  ctx.fillRect(-mbW / 2 - 3 * sc, -mbH - mb2H - mb3H - 3 * sc, mbW + 6 * sc, 4 * sc);
  ctx.fillStyle = '#1e3878';
  ctx.fillRect(-mbW / 2 - 4 * sc, -mbH - mb2H - mb3H - 7 * sc, mbW + 8 * sc, 5 * sc);

  // Clock tower
  const twH = mb3H * 1.7;
  const twW = 18 * sc;
  const twBase = -mbH - mb2H - mb3H;
  ctx.fillStyle = '#80a8d8';
  ctx.fillRect(-twW / 2, twBase - twH, twW, twH);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(twW / 2 - 4 * sc, twBase - twH, 4 * sc, twH);
  ctx.fillStyle = '#162e68';
  ctx.beginPath();
  ctx.moveTo(-twW / 2 - 2 * sc, twBase - twH);
  ctx.lineTo(0, twBase - twH - 24 * sc);
  ctx.lineTo(twW / 2 + 2 * sc, twBase - twH);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath();
  ctx.moveTo(-3 * sc, twBase - twH);
  ctx.lineTo(0, twBase - twH - 24 * sc);
  ctx.lineTo(3 * sc, twBase - twH);
  ctx.closePath();
  ctx.fill();

  const clkY = twBase - twH * 0.45;
  ctx.fillStyle = '#e8f4ff';
  ctx.beginPath();
  ctx.arc(0, clkY, 7 * sc, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a3878';
  ctx.lineWidth = 0.8 * sc;
  ctx.beginPath();
  ctx.arc(0, clkY, 7 * sc, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#1a3878';
  ctx.lineWidth = 1 * sc;
  ctx.beginPath();
  ctx.moveTo(0, clkY);
  ctx.lineTo(0, clkY - 5 * sc);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, clkY);
  ctx.lineTo(4 * sc, clkY + 2 * sc);
  ctx.stroke();
  stdWin(-4 * sc, twBase - twH * 0.82, 8 * sc, 6 * sc, 'rgba(180,220,255,0.7)');
  ctx.fillStyle = '#1a3060';
  ctx.fillRect(-twW / 2 - 1 * sc, twBase - twH * 0.6, twW + 2 * sc, 2.5 * sc);
  ctx.fillRect(-twW / 2 - 1 * sc, twBase, twW + 2 * sc, 2.5 * sc);

  // GF colonnade
  const nA = 5;
  const aW2 = mbW / nA;
  for (let ai = 0; ai < nA; ai++) {
    const ax = -mbW / 2 + ai * aW2 + aW2 / 2;
    if (Math.abs(ax) < aW2 * 0.45) continue;
    arch(ax, -mbH * 0.46, aW2 * 0.65, 'rgba(12,24,60,0.55)', 'rgba(80,140,255,0.28)');
    if (ai > 0) {
      ctx.fillStyle = '#5888c0';
      ctx.fillRect(-mbW / 2 + ai * aW2 - 2 * sc, -mbH, 4 * sc, mbH);
    }
  }
  arch(0, -mbH * 0.5, 22 * sc, 'rgba(8,16,50,0.88)', 'rgba(120,190,255,0.55)');

  // GF windows
  stdWin(-mbW * 0.44, -mbH * 0.46, 12 * sc, 9 * sc);
  stdWin(-mbW * 0.26, -mbH * 0.46, 12 * sc, 9 * sc);
  stdWin(mbW * 0.11, -mbH * 0.46, 12 * sc, 9 * sc);
  stdWin(mbW * 0.29, -mbH * 0.46, 12 * sc, 9 * sc);

  // 2F windows
  const f2y = -mbH - mb2H * 0.74;
  for (let wi = 0; wi < 5; wi++) {
    const wx = -mbW / 2 + 6 * sc + wi * (mbW - 12 * sc) / 4;
    stdWin(wx, f2y, 13 * sc, 10 * sc);
  }

  // 3F windows
  const f3y = -mbH - mb2H - mb3H * 0.72;
  stdWin(-mbW * 0.36, f3y, 11 * sc, 8 * sc);
  stdWin(-mbW * 0.18, f3y, 11 * sc, 8 * sc);
  stdWin(mbW * 0.04, f3y, 11 * sc, 8 * sc);
  stdWin(mbW * 0.22, f3y, 11 * sc, 8 * sc);

  // Big illuminated sign
  sign(-mbW * 0.36, -mbH - mb2H * 0.28, mbW * 0.72, 15 * sc, 'GRAND MERKADO', '#0a1840', '#f5c842');

  // Wide awning across center
  awning(-mbW / 2, -mbH * 0.42, mbW, 13 * sc, '#cc2211');

  // Dense pennants
  const pColors = ['#cc2222', '#f5c842', '#2255aa', '#44aa44', '#cc2222', '#f5c842', '#aa22cc', '#cc2222', '#f5c842', '#44aa44'];
  pennants(-w * 0.56, -h * 0.44, w * 0.56, -h * 0.44, pColors, t);

  // Grand steps
  ctx.fillStyle = '#304868';
  ctx.fillRect(-mbW / 2 - 2 * sc, 0, mbW + 4 * sc, 4 * sc);
  ctx.fillStyle = '#3a5878';
  ctx.fillRect(-mbW / 2 - 6 * sc, -4 * sc, mbW + 12 * sc, 4 * sc);
  ctx.fillStyle = '#304868';
  ctx.fillRect(-mbW / 2 - 10 * sc, -8 * sc, mbW + 20 * sc, 4 * sc);

  // Flags on tower
  const flagBase = twBase - twH - 24 * sc;
  ctx.strokeStyle = '#3a6090';
  ctx.lineWidth = 1.2 * sc;
  ctx.beginPath();
  ctx.moveTo(0, flagBase);
  ctx.lineTo(0, flagBase - 16 * sc);
  ctx.stroke();
  ctx.fillStyle = '#cc2222';
  ctx.beginPath();
  ctx.moveTo(0, flagBase - 16 * sc);
  ctx.lineTo(16 * sc, flagBase - 10 * sc);
  ctx.lineTo(0, flagBase - 4 * sc);
  ctx.closePath();
  ctx.fill();

  // Blinking light atop tower
  const bl = Math.sin(t * 2.8) > 0;
  ctx.fillStyle = bl ? 'rgba(255,50,50,1)' : 'rgba(255,50,50,0.08)';
  ctx.beginPath();
  ctx.arc(0, flagBase - 16 * sc, 2 * sc, 0, Math.PI * 2);
  ctx.fill();

  // Final label
  ctx.fillStyle = 'rgba(200,225,255,0.88)';
  ctx.font = `bold ${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Grand Merkado', 0, h * 0.2);
}