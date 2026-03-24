/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/sprites/mainHall.js

   Bahay-Bayan (Main Hall) — Level 1–5 sprites
   Faithful recreation of the designs from bahay-bayan-levels.html
   with proper perspective scaling (sc) and positioning relative
   to building origin (x=0, y=0 at ground level).

   LEVEL 1 — Bahay-Bayan (simple hall)
   LEVEL 2 — Bahay-Bayan II (side wings + flag)
   LEVEL 3 — Bahay-Bayan III (colonial style, 4 columns, tile roof)
   LEVEL 4 — Bahay-Bayan IV (2-storey + clock tower + grand portico)
   LEVEL 5 — Bahay-Bayan V (Capitol with grand dome)

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
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 3 * sc, radiusX || w * 0.62, radiusY || h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  // Helper: standard window with crossbars
  const stdWin = (x, y, winW, winH, color) => {
    ctx.fillStyle = color || 'rgba(255,235,160,0.65)';
    ctx.fillRect(x, y, winW, winH);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
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

  // Helper: arched window with rounded top
  const arcWin = (cx, y, aw, ah, color) => {
    ctx.fillStyle = color || 'rgba(255,235,160,0.65)';
    ctx.beginPath();
    ctx.rect(cx - aw / 2, y, aw, ah);
    ctx.arc(cx, y, aw / 2, Math.PI, 0, true);
    ctx.fill();
    ctx.strokeStyle = 'rgba(196,154,78,0.45)';
    ctx.lineWidth = 0.8 * sc;
    ctx.beginPath();
    ctx.rect(cx - aw / 2, y, aw, ah);
    ctx.arc(cx, y, aw / 2, Math.PI, 0, true);
    ctx.stroke();
  };

  // Helper: arched door
  const arcDoor = (cx, y, dw, dh, color) => {
    ctx.fillStyle = color || 'rgba(40,20,5,0.88)';
    ctx.beginPath();
    ctx.rect(cx - dw / 2, y, dw, dh);
    ctx.arc(cx, y, dw / 2, Math.PI, 0, true);
    ctx.fill();
  };

  // Helper: column with capitals
  const col = (cx, yTop, yBottom, wCol) => {
    ctx.fillStyle = '#d4b870';
    ctx.fillRect(cx - wCol / 2, yTop, wCol, yBottom - yTop);
    ctx.fillStyle = '#e8cc88';
    ctx.fillRect(cx - wCol / 2 - 1 * sc, yTop - 2 * sc, wCol + 2 * sc, 3 * sc);
    ctx.fillRect(cx - wCol / 2 - 1 * sc, yBottom - 2 * sc, wCol + 2 * sc, 3 * sc);
    ctx.strokeStyle = 'rgba(100,70,20,0.22)';
    ctx.lineWidth = 0.5 * sc;
    ctx.beginPath();
    ctx.moveTo(cx - 0.8 * sc, yTop);
    ctx.lineTo(cx - 0.8 * sc, yBottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 0.8 * sc, yTop);
    ctx.lineTo(cx + 0.8 * sc, yBottom);
    ctx.stroke();
  };

  // Helper: wall block with shading
  const wallBlock = (x, y, blockW, blockH, color, flipShade) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, blockW, blockH);
    const sg = ctx.createLinearGradient(x, 0, x + blockW, 0);
    if (flipShade) {
      sg.addColorStop(0, 'rgba(0,0,0,0.12)');
      sg.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      sg.addColorStop(0, 'rgba(255,255,255,0.03)');
      sg.addColorStop(0.7, 'rgba(0,0,0,0)');
      sg.addColorStop(1, 'rgba(0,0,0,0.16)');
    }
    ctx.fillStyle = sg;
    ctx.fillRect(x, y, blockW, blockH);
  };

  // Helper: flat roof with layers
  const flatRoof = (x, y, roofW, c1, c2, c3) => {
    ctx.fillStyle = c1 || '#7a5020';
    ctx.fillRect(x - 2 * sc, y - 3 * sc, roofW + 4 * sc, 4 * sc);
    ctx.fillStyle = c2 || '#8a6030';
    ctx.fillRect(x - 3 * sc, y - 7 * sc, roofW + 6 * sc, 5 * sc);
    ctx.fillStyle = c3 || '#6a4818';
    ctx.fillRect(x - 4 * sc, y - 9 * sc, roofW + 8 * sc, 2.5 * sc);
  };

  // Helper: gable roof
  const gableRoof = (x, roofW, baseY, tipY, rc, hlc) => {
    ctx.fillStyle = rc || '#8b5e2a';
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + roofW / 2, tipY);
    ctx.lineTo(x + roofW, baseY);
    ctx.closePath();
    ctx.fill();
    if (hlc) {
      ctx.fillStyle = hlc;
      ctx.beginPath();
      ctx.moveTo(x + roofW / 2 - roofW * 0.07, baseY);
      ctx.lineTo(x + roofW / 2, tipY);
      ctx.lineTo(x + roofW / 2 + roofW * 0.07, baseY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(160,100,40,0.7)';
    ctx.fillRect(x - 2 * sc, baseY - 2 * sc, roofW + 4 * sc, 3 * sc);
  };

  // Dispatch based on level
  switch (level) {
    case 1:
      drawLv1(ctx, sc, w, h, def, t, {
        drawShadow, stdWin, arcWin, arcDoor, col, wallBlock, flatRoof, gableRoof
      });
      break;
    case 2:
      drawLv2(ctx, sc, w, h, def, t, {
        drawShadow, stdWin, arcWin, arcDoor, col, wallBlock, flatRoof, gableRoof
      });
      break;
    case 3:
      drawLv3(ctx, sc, w, h, def, t, {
        drawShadow, stdWin, arcWin, arcDoor, col, wallBlock, flatRoof, gableRoof
      });
      break;
    case 4:
      drawLv4(ctx, sc, w, h, def, t, {
        drawShadow, stdWin, arcWin, arcDoor, col, wallBlock, flatRoof, gableRoof
      });
      break;
    case 5:
      drawLv5(ctx, sc, w, h, def, t, {
        drawShadow, stdWin, arcWin, arcDoor, col, wallBlock, flatRoof, gableRoof
      });
      break;
    default:
      drawLv1(ctx, sc, w, h, def, t, {
        drawShadow, stdWin, arcWin, arcDoor, col, wallBlock, flatRoof, gableRoof
      });
  }
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 1 — Bahay-Bayan (simple hall)
   Based on HTML LV1: w=60, h=46 in original fixed pixels
   Faithful to _drawStandard with correct dimensions
═══════════════════════════════════════════════════════════════ */
function drawLv1(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, stdWin, arcDoor, gableRoof } = helpers;

  drawShadow(w * 0.62, 6 * sc);

  // Walls
  ctx.fillStyle = def.wallColor || '#c49a4e';
  ctx.fillRect(-w / 2, -h * 0.55, w, h * 0.67);
  const ws = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  ws.addColorStop(0, 'rgba(0,0,0,0)');
  ws.addColorStop(0.7, 'rgba(0,0,0,0)');
  ws.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = ws;
  ctx.fillRect(-w / 2, -h * 0.55, w, h * 0.67);

  // Roof (gable)
  ctx.fillStyle = def.roofColor || '#8b5e2a';
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
  arcDoor(0, -h * 0.34, 11 * sc, h * 0.34);

  // Windows
  stdWin(-w * 0.38, -h * 0.48, 10 * sc, 8 * sc);
  stdWin(w * 0.24, -h * 0.48, 10 * sc, 8 * sc);

  // Label
  ctx.fillStyle = 'rgba(255,225,155,0.82)';
  ctx.font = `${10 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Bahay-Bayan', 0, h * 0.26);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 2 — Bahay-Bayan II
   Wider structure with side wings and flag
   Based on HTML LV2: w=78, h=52
═══════════════════════════════════════════════════════════════ */
function drawLv2(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, stdWin, arcDoor, wallBlock, gableRoof } = helpers;

  drawShadow(w * 0.6, 7 * sc);

  const wgW = 17 * sc;
  const wgH = 34 * sc;
  const wgY = -wgH;

  // Side wings
  const wing2 = (lx) => {
    wallBlock(lx, wgY, wgW, wgH, '#ba9042', lx < 0);
    ctx.fillStyle = '#7a5020';
    ctx.beginPath();
    ctx.moveTo(lx - 2 * sc, wgY);
    ctx.lineTo(lx + wgW / 2, wgY - 20 * sc);
    ctx.lineTo(lx + wgW + 2 * sc, wgY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(lx + wgW / 2 - 3 * sc, wgY);
    ctx.lineTo(lx + wgW / 2, wgY - 20 * sc);
    ctx.lineTo(lx + wgW / 2 + 3 * sc, wgY);
    ctx.closePath();
    ctx.fill();
    stdWin(lx + 4 * sc, wgY + 7 * sc, 10 * sc, 8 * sc, 'rgba(255,235,160,0.58)');
    arcDoor(lx + wgW / 2, -wgH * 0.46, 9 * sc, wgH * 0.46);
  };

  wing2(-w / 2 - wgW);
  wing2(w / 2);

  // Main walls
  wallBlock(-w / 2, -h * 0.52, w, h * 0.65, def.wallColor || '#c49a4e', false);
  ctx.strokeStyle = 'rgba(100,70,20,0.18)';
  ctx.lineWidth = 0.6 * sc;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h * 0.26);
  ctx.lineTo(w / 2, -h * 0.26);
  ctx.stroke();

  // Gable roof (steeper)
  ctx.fillStyle = def.roofColor || '#8b5e2a';
  ctx.beginPath();
  ctx.moveTo(-w * 0.56, -h * 0.52);
  ctx.lineTo(0, -h * 1.2);
  ctx.lineTo(w * 0.56, -h * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath();
  ctx.moveTo(-w * 0.08, -h * 0.52);
  ctx.lineTo(0, -h * 1.2);
  ctx.lineTo(w * 0.08, -h * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#a06830';
  ctx.fillRect(-w * 0.58, -h * 0.535, w * 1.16, h * 0.036);

  // Door with decorative outline
  arcDoor(0, -h * 0.38, 13 * sc, h * 0.38);
  ctx.strokeStyle = 'rgba(245,200,66,0.38)';
  ctx.lineWidth = 1 * sc;
  ctx.beginPath();
  ctx.rect(-6.5 * sc, -h * 0.38, 13 * sc, h * 0.38);
  ctx.arc(0, -h * 0.38, 6.5 * sc, Math.PI, 0, true);
  ctx.stroke();

  // Windows
  stdWin(-w * 0.42, -h * 0.45, 11 * sc, 9 * sc);
  stdWin(w * 0.27, -h * 0.45, 11 * sc, 9 * sc);

  // Flag
  ctx.strokeStyle = '#7a6020';
  ctx.lineWidth = 1.2 * sc;
  ctx.beginPath();
  ctx.moveTo(0, -h * 1.2);
  ctx.lineTo(0, -h * 1.6);
  ctx.stroke();
  ctx.fillStyle = '#cc2222';
  ctx.beginPath();
  ctx.moveTo(0, -h * 1.6);
  ctx.lineTo(14 * sc, -h * 1.53);
  ctx.lineTo(0, -h * 1.46);
  ctx.closePath();
  ctx.fill();

  // Label
  ctx.fillStyle = 'rgba(255,225,155,0.8)';
  ctx.font = `${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Bahay-Bayan II', 0, h * 0.26);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 3 — Bahay-Bayan III
   Colonial style: 4 columns, tile roof, 2 wings, 4 windows
   Based on HTML LV3: w=100, h=58
═══════════════════════════════════════════════════════════════ */
function drawLv3(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, stdWin, arcWin, arcDoor, col, wallBlock } = helpers;

  drawShadow(w * 0.58, 7 * sc);

  const wgW = 22 * sc;
  const wgH = 44 * sc;

  // Wings
  const wing3 = (lx) => {
    wallBlock(lx, -wgH, wgW, wgH, '#be9644', lx < 0);
    ctx.fillStyle = '#7a5020';
    ctx.beginPath();
    ctx.moveTo(lx - 2 * sc, -wgH);
    ctx.lineTo(lx + wgW / 2, -wgH - 22 * sc);
    ctx.lineTo(lx + wgW + 2 * sc, -wgH);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(lx + wgW / 2 - 3 * sc, -wgH);
    ctx.lineTo(lx + wgW / 2, -wgH - 22 * sc);
    ctx.lineTo(lx + wgW / 2 + 3 * sc, -wgH);
    ctx.closePath();
    ctx.fill();
    arcWin(lx + wgW / 2, -wgH + 8 * sc, 13 * sc, 17 * sc, 'rgba(255,235,160,0.6)');
    arcDoor(lx + wgW / 2, -wgH * 0.46, 9 * sc, wgH * 0.46);
  };

  wing3(-w / 2 - wgW);
  wing3(w / 2);

  // Main body
  wallBlock(-w / 2, -h * 0.52, w, h * 0.65, def.wallColor || '#c49a4e', false);
  ctx.strokeStyle = 'rgba(100,70,20,0.16)';
  ctx.lineWidth = 0.6 * sc;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h * 0.27);
  ctx.lineTo(w / 2, -h * 0.27);
  ctx.stroke();

  // 4 facade columns
  [-w * 0.36, -w * 0.14, w * 0.14, w * 0.36].forEach((cx) => {
    col(cx, -h * 0.52, 0, 4.5 * sc);
  });

  // Tile gable roof
  ctx.fillStyle = def.roofColor || '#8b5e2a';
  ctx.beginPath();
  ctx.moveTo(-w * 0.55, -h * 0.52);
  ctx.lineTo(0, -h * 1.24);
  ctx.lineTo(w * 0.55, -h * 0.52);
  ctx.closePath();
  ctx.fill();

  // Roof tiles (ridge lines)
  ctx.strokeStyle = 'rgba(50,25,5,0.26)';
  ctx.lineWidth = 0.6 * sc;
  for (let ri = 1; ri < 7; ri++) {
    const ry = -h * 0.52 - ri * h * 0.106;
    const rw = w * 0.55 * (1 - ri * 0.14);
    ctx.beginPath();
    ctx.moveTo(-rw, ry);
    ctx.lineTo(rw, ry);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath();
  ctx.moveTo(-w * 0.07, -h * 0.52);
  ctx.lineTo(0, -h * 1.24);
  ctx.lineTo(w * 0.07, -h * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#a06830';
  ctx.fillRect(-w * 0.57, -h * 0.535, w * 1.14, h * 0.038);

  // Pediment
  ctx.strokeStyle = 'rgba(245,200,66,0.38)';
  ctx.lineWidth = 0.8 * sc;
  ctx.strokeRect(-w * 0.3, -h * 0.535, w * 0.6, h * 0.07);

  // Door with outline
  arcDoor(0, -h * 0.39, 14 * sc, h * 0.39);
  ctx.strokeStyle = 'rgba(245,200,66,0.5)';
  ctx.lineWidth = 1.1 * sc;
  ctx.beginPath();
  ctx.rect(-7 * sc, -h * 0.39, 14 * sc, h * 0.39);
  ctx.arc(0, -h * 0.39, 7 * sc, Math.PI, 0, true);
  ctx.stroke();

  // 4 windows
  stdWin(-w * 0.44, -h * 0.45, 12 * sc, 10 * sc);
  stdWin(-w * 0.22, -h * 0.45, 12 * sc, 10 * sc);
  stdWin(w * 0.07, -h * 0.45, 12 * sc, 10 * sc);
  stdWin(w * 0.29, -h * 0.45, 12 * sc, 10 * sc);

  // Flag
  ctx.strokeStyle = '#7a6020';
  ctx.lineWidth = 1.2 * sc;
  ctx.beginPath();
  ctx.moveTo(0, -h * 1.24);
  ctx.lineTo(0, -h * 1.66);
  ctx.stroke();
  ctx.fillStyle = '#cc2222';
  ctx.beginPath();
  ctx.moveTo(0, -h * 1.66);
  ctx.lineTo(16 * sc, -h * 1.59);
  ctx.lineTo(0, -h * 1.52);
  ctx.closePath();
  ctx.fill();

  // Label
  ctx.fillStyle = 'rgba(255,225,155,0.82)';
  ctx.font = `${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Bahay-Bayan III', 0, h * 0.26);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 4 — Bahay-Bayan IV
   2-storey main block + clock tower + wide wings + grand portico
   Based on HTML LV4: w=124, h=64
═══════════════════════════════════════════════════════════════ */
function drawLv4(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, stdWin, arcWin, arcDoor, col, wallBlock, flatRoof } = helpers;

  drawShadow(w * 0.56, 8 * sc);

  const owW = 22 * sc;
  const owH = 44 * sc;

  // Outer wings
  const ow4 = (lx) => {
    wallBlock(lx, -owH, owW, owH, '#b88c3c', lx < 0);
    flatRoof(lx, -owH, owW);
    arcWin(lx + owW / 2, -owH + 7 * sc, 13 * sc, 16 * sc, 'rgba(255,235,160,0.6)');
  };
  ow4(-w / 2 - owW);
  ow4(w / 2);

  // Inner wings
  const iwW = 26 * sc;
  const iwH = 52 * sc;
  const iw4 = (lx) => {
    wallBlock(lx, -iwH, iwW, iwH, '#c09244', lx < 0);
    ctx.fillStyle = '#a07030';
    ctx.fillRect(lx - 1 * sc, -iwH * 0.5 - 1.5 * sc, iwW + 2 * sc, 3 * sc);
    flatRoof(lx, -iwH, iwW);
    arcWin(lx + iwW / 2, -iwH * 0.44, 16 * sc, 19 * sc, 'rgba(255,235,160,0.62)');
    stdWin(lx + 4 * sc, -iwH * 0.84, iwW - 8 * sc, 10 * sc, 'rgba(255,235,160,0.65)');
  };
  iw4(-w / 2 + owW * 0.0);
  iw4(w / 2 - iwW);

  // Main block dimensions
  const mbW = 60 * sc;
  const mbH = h * 0.5;
  const mb2H = h * 0.46;

  // GF
  wallBlock(-mbW / 2, -mbH, mbW, mbH, def.wallColor || '#c49a4e', false);
  ctx.strokeStyle = 'rgba(100,70,20,0.16)';
  ctx.lineWidth = 0.6 * sc;
  ctx.beginPath();
  ctx.moveTo(-mbW / 2, -mbH * 0.5);
  ctx.lineTo(mbW / 2, -mbH * 0.5);
  ctx.stroke();

  // Floor slab
  ctx.fillStyle = '#a07830';
  ctx.fillRect(-mbW / 2 - 2 * sc, -mbH - 2 * sc, mbW + 4 * sc, 4 * sc);
  ctx.fillStyle = '#b88840';
  ctx.fillRect(-mbW / 2 - 3 * sc, -mbH - 5.5 * sc, mbW + 6 * sc, 3.5 * sc);

  // 2F
  wallBlock(-mbW / 2, -mbH - mb2H, mbW, mb2H, '#cca456', false);
  ctx.fillStyle = '#8a6828';
  ctx.fillRect(-mbW / 2 - 3 * sc, -mbH - mb2H - 3 * sc, mbW + 6 * sc, 4 * sc);
  ctx.fillStyle = '#9a7838';
  ctx.fillRect(-mbW / 2 - 4 * sc, -mbH - mb2H - 7 * sc, mbW + 8 * sc, 4.5 * sc);

  // 6 portico columns
  [-mbW * 0.42, -mbW * 0.24, -mbW * 0.06, mbW * 0.06, mbW * 0.24, mbW * 0.42].forEach((cx) => {
    col(cx, -mbH, 0, 5 * sc);
  });

  // Clock tower
  const twH = mb2H * 1.6;
  const twW = 20 * sc;
  wallBlock(-twW / 2, -mbH - mb2H - twH, twW, twH, '#d4a858', false);
  ctx.fillStyle = '#7a5020';
  ctx.beginPath();
  ctx.moveTo(-twW / 2 - 2 * sc, -mbH - mb2H - twH);
  ctx.lineTo(0, -mbH - mb2H - twH - 26 * sc);
  ctx.lineTo(twW / 2 + 2 * sc, -mbH - mb2H - twH);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath();
  ctx.moveTo(-3 * sc, -mbH - mb2H - twH);
  ctx.lineTo(0, -mbH - mb2H - twH - 26 * sc);
  ctx.lineTo(3 * sc, -mbH - mb2H - twH);
  ctx.closePath();
  ctx.fill();

  // Clock face
  const clkY = -mbH - mb2H - twH * 0.42;
  ctx.fillStyle = '#f5e8c0';
  ctx.beginPath();
  ctx.arc(0, clkY, 7 * sc, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8b5e2a';
  ctx.lineWidth = 0.8 * sc;
  ctx.beginPath();
  ctx.arc(0, clkY, 7 * sc, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#3a2008';
  ctx.lineWidth = 1 * sc;
  ctx.beginPath();
  ctx.moveTo(0, clkY);
  ctx.lineTo(0, clkY - 5 * sc);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, clkY);
  ctx.lineTo(4 * sc, clkY + 2 * sc);
  ctx.stroke();

  // Tower windows
  stdWin(-4 * sc, -mbH - mb2H - twH * 0.72, 8 * sc, 6 * sc, 'rgba(255,235,160,0.7)');
  stdWin(-4 * sc, -mbH - mb2H - twH * 0.22, 8 * sc, 7 * sc, 'rgba(255,235,160,0.65)');
  ctx.fillStyle = '#a07830';
  ctx.fillRect(-twW / 2 - 1 * sc, -mbH - mb2H - twH * 0.52, twW + 2 * sc, 2.5 * sc);
  ctx.fillRect(-twW / 2 - 1 * sc, -mbH - mb2H, twW + 2 * sc, 2.5 * sc);

  // Main GF windows (arched)
  arcWin(-mbW * 0.36, -mbH + 5 * sc, 14 * sc, 20 * sc, 'rgba(255,235,160,0.65)');
  arcWin(mbW * 0.22, -mbH + 5 * sc, 14 * sc, 20 * sc, 'rgba(255,235,160,0.65)');

  // 2F windows
  stdWin(-mbW * 0.42, -mbH - mb2H * 0.78, 12 * sc, 10 * sc);
  stdWin(-mbW * 0.24, -mbH - mb2H * 0.78, 12 * sc, 10 * sc);
  stdWin(mbW * 0.1, -mbH - mb2H * 0.78, 12 * sc, 10 * sc);
  stdWin(mbW * 0.28, -mbH - mb2H * 0.78, 12 * sc, 10 * sc);

  // Main door
  arcDoor(0, -mbH * 0.42, 17 * sc, mbH * 0.42);
  ctx.strokeStyle = 'rgba(245,200,66,0.55)';
  ctx.lineWidth = 1.2 * sc;
  ctx.beginPath();
  ctx.rect(-8.5 * sc, -mbH * 0.42, 17 * sc, mbH * 0.42);
  ctx.arc(0, -mbH * 0.42, 8.5 * sc, Math.PI, 0, true);
  ctx.stroke();

  // Grand steps
  ctx.fillStyle = '#b09860';
  ctx.fillRect(-mbW / 2 - 2 * sc, 0, mbW + 4 * sc, 4 * sc);
  ctx.fillStyle = '#c0a870';
  ctx.fillRect(-mbW / 2 - 6 * sc, -4 * sc, mbW + 12 * sc, 4 * sc);
  ctx.fillStyle = '#b09860';
  ctx.fillRect(-mbW / 2 - 10 * sc, -8 * sc, mbW + 20 * sc, 4 * sc);

  // Flag
  const fBase = -mbH - mb2H - twH - 26 * sc;
  ctx.strokeStyle = '#c8a030';
  ctx.lineWidth = 1.2 * sc;
  ctx.beginPath();
  ctx.moveTo(0, fBase);
  ctx.lineTo(0, fBase - 16 * sc);
  ctx.stroke();
  ctx.fillStyle = '#cc2222';
  ctx.beginPath();
  ctx.moveTo(0, fBase - 16 * sc);
  ctx.lineTo(16 * sc, fBase - 10 * sc);
  ctx.lineTo(0, fBase - 4 * sc);
  ctx.closePath();
  ctx.fill();

  // Label
  ctx.fillStyle = 'rgba(255,225,155,0.82)';
  ctx.font = `${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Bahay-Bayan IV', 0, h * 0.24);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 5 — Bahay-Bayan V (Capitol)
   Grand dome, sweeping colonnaded wings, stone steps
   Based on HTML LV5: w=156, h=70
═══════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   LEVEL 5 — Bahay-Bayan V (Capitol)
   Grand dome, sweeping colonnaded wings, stone steps
   Based on HTML LV5: w=156, h=70
═══════════════════════════════════════════════════════════════ */
function drawLv5(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, stdWin, arcWin, arcDoor, col, wallBlock, flatRoof } = helpers;

  drawShadow(w * 0.53, 10 * sc);

  // Outer wings 1F
  const owW = 24 * sc;
  const owH = 40 * sc;
  const ow5 = (lx) => {
    wallBlock(lx, -owH, owW, owH, '#b88c3c', lx < 0);
    flatRoof(lx, -owH, owW);
    arcWin(lx + owW / 2, -owH + 6 * sc, 14 * sc, 17 * sc, 'rgba(255,235,160,0.58)');
  };
  ow5(-w / 2 - owW);
  ow5(w / 2);

  // Mid wings 2F
  const mwW = 32 * sc;
  const mwH = 56 * sc;
  const mw5 = (lx) => {
    wallBlock(lx, -mwH, mwW, mwH, '#c09244', lx < 0);
    ctx.fillStyle = '#a07030';
    ctx.fillRect(lx - 1 * sc, -mwH * 0.5 - 1.5 * sc, mwW + 2 * sc, 3 * sc);
    flatRoof(lx, -mwH, mwW);
    arcWin(lx + mwW / 2, -mwH * 0.44, 17 * sc, 20 * sc, 'rgba(255,235,160,0.62)');
    stdWin(lx + 5 * sc, -mwH * 0.82, mwW - 10 * sc, 11 * sc, 'rgba(255,235,160,0.65)');
    // Small columns on mid wing
    [lx + mwW * 0.2, lx + mwW * 0.8].forEach((cx) => {
      col(cx, -mwH, 0, 3.5 * sc);
    });
  };
  mw5(-w / 2 + owW * 0.0);
  mw5(w / 2 - mwW);

  // Main central block dimensions
  const mbW = 66 * sc;
  const mbH = h * 0.5;
  const mb2H = h * 0.46;

  // GF
  wallBlock(-mbW / 2, -mbH, mbW, mbH, def.wallColor || '#c49a4e', false);
  ctx.strokeStyle = 'rgba(100,70,20,0.15)';
  ctx.lineWidth = 0.6 * sc;
  ctx.beginPath();
  ctx.moveTo(-mbW / 2, -mbH * 0.5);
  ctx.lineTo(mbW / 2, -mbH * 0.5);
  ctx.stroke();
  ctx.fillStyle = '#a07830';
  ctx.fillRect(-mbW / 2 - 2 * sc, -mbH - 2 * sc, mbW + 4 * sc, 4 * sc);
  ctx.fillStyle = '#b88840';
  ctx.fillRect(-mbW / 2 - 3 * sc, -mbH - 5.5 * sc, mbW + 6 * sc, 3.5 * sc);

  // 2F
  wallBlock(-mbW / 2, -mbH - mb2H, mbW, mb2H, '#cca456', false);
  ctx.fillStyle = '#8a6828';
  ctx.fillRect(-mbW / 2 - 3 * sc, -mbH - mb2H - 3 * sc, mbW + 6 * sc, 4 * sc);
  ctx.fillStyle = '#9a7838';
  ctx.fillRect(-mbW / 2 - 4 * sc, -mbH - mb2H - 7 * sc, mbW + 8 * sc, 5 * sc);

  // 6 grand portico columns
  [-mbW * 0.42, -mbW * 0.24, -mbW * 0.06, mbW * 0.06, mbW * 0.24, mbW * 0.42].forEach((cx) => {
    col(cx, -mbH, 0, 6 * sc);
  });

  // Pediment over center
  const pedY = -mbH - mb2H - 7 * sc;
  ctx.fillStyle = '#9a7030';
  ctx.beginPath();
  ctx.moveTo(-mbW / 2 - 3 * sc, pedY);
  ctx.lineTo(0, pedY - 28 * sc);
  ctx.lineTo(mbW / 2 + 3 * sc, pedY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath();
  ctx.moveTo(-5 * sc, pedY);
  ctx.lineTo(0, pedY - 28 * sc);
  ctx.lineTo(5 * sc, pedY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,200,66,0.3)';
  ctx.lineWidth = 0.8 * sc;
  ctx.strokeRect(-mbW / 2 + 4 * sc, pedY + 2 * sc, mbW - 8 * sc, mb2H * 0.2);

  // DOME
  const domeBase = pedY - 28 * sc;
  const domeR = 22 * sc;
  const drumH = 14 * sc;
  const drumW = 18 * sc;

  // Drum
  wallBlock(-drumW / 2, domeBase - drumH, drumW, drumH, '#c49a4e', false);
  ctx.strokeStyle = 'rgba(100,70,20,0.2)';
  ctx.lineWidth = 0.5 * sc;
  // Draw vertical lines on drum - fixed loop
  const drumPositions = [-4, 0, 4];
  for (let idx = 0; idx < drumPositions.length; idx++) {
    const dx = drumPositions[idx] * sc;
    ctx.beginPath();
    ctx.moveTo(dx, domeBase - drumH);
    ctx.lineTo(dx, domeBase);
    ctx.stroke();
  }

  // Dome
  ctx.fillStyle = '#9a7028';
  ctx.beginPath();
  ctx.arc(0, domeBase - drumH, domeR, -Math.PI, 0, false);
  ctx.closePath();
  ctx.fill();

  // Dome shading
  const dsg = ctx.createRadialGradient(-6 * sc, domeBase - drumH - 10 * sc, 3 * sc, 0, domeBase - drumH, domeR);
  dsg.addColorStop(0, 'rgba(255,240,180,0.2)');
  dsg.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = dsg;
  ctx.beginPath();
  ctx.arc(0, domeBase - drumH, domeR, -Math.PI, 0, false);
  ctx.closePath();
  ctx.fill();

  // Dome ribs
  ctx.strokeStyle = 'rgba(100,60,12,0.3)';
  ctx.lineWidth = 0.7 * sc;
  for (let di = 0; di < 6; di++) {
    const da = -Math.PI + di * (Math.PI / 6);
    ctx.beginPath();
    ctx.moveTo(0, domeBase - drumH);
    ctx.lineTo(Math.cos(da) * domeR, domeBase - drumH + Math.sin(da) * domeR);
    ctx.stroke();
  }

  // Dome windows
  for (let dw2 = 0; dw2 < 4; dw2++) {
    const da2 = -Math.PI * 0.82 + dw2 * (Math.PI * 0.55);
    const dwx = Math.cos(da2) * domeR * 0.68;
    const dwy = domeBase - drumH + Math.sin(da2) * domeR * 0.68;
    ctx.fillStyle = 'rgba(255,235,160,0.55)';
    ctx.beginPath();
    ctx.arc(dwx, dwy, 3 * sc, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lantern
  ctx.fillStyle = '#c49a4e';
  ctx.fillRect(-4 * sc, domeBase - drumH - domeR, 8 * sc, 8 * sc);
  ctx.fillStyle = '#7a5020';
  ctx.beginPath();
  ctx.moveTo(-4 * sc, domeBase - drumH - domeR);
  ctx.lineTo(0, domeBase - drumH - domeR - 14 * sc);
  ctx.lineTo(4 * sc, domeBase - drumH - domeR);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f5c842';
  ctx.beginPath();
  ctx.arc(0, domeBase - drumH - domeR - 14 * sc, 3 * sc, 0, Math.PI * 2);
  ctx.fill();

  // Glow around gold tip
  ctx.fillStyle = 'rgba(245,200,66,0.2)';
  ctx.beginPath();
  ctx.arc(0, domeBase - drumH - domeR - 14 * sc, 8 * sc, 0, Math.PI * 2);
  ctx.fill();

  // GF arched windows center
  arcWin(-mbW * 0.36, -mbH + 5 * sc, 15 * sc, 21 * sc, 'rgba(255,235,160,0.65)');
  arcWin(mbW * 0.21, -mbH + 5 * sc, 15 * sc, 21 * sc, 'rgba(255,235,160,0.65)');

  // 2F windows
  stdWin(-mbW * 0.42, -mbH - mb2H * 0.78, 13 * sc, 11 * sc);
  stdWin(-mbW * 0.24, -mbH - mb2H * 0.78, 13 * sc, 11 * sc);
  stdWin(mbW * 0.08, -mbH - mb2H * 0.78, 13 * sc, 11 * sc);
  stdWin(mbW * 0.26, -mbH - mb2H * 0.78, 13 * sc, 11 * sc);

  // Main door grand
  arcDoor(0, -mbH * 0.44, 20 * sc, mbH * 0.44, 'rgba(25,12,2,0.92)');
  ctx.strokeStyle = 'rgba(245,200,66,0.6)';
  ctx.lineWidth = 1.4 * sc;
  ctx.beginPath();
  ctx.rect(-10 * sc, -mbH * 0.44, 20 * sc, mbH * 0.44);
  ctx.arc(0, -mbH * 0.44, 10 * sc, Math.PI, 0, true);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(245,200,66,0.28)';
  ctx.lineWidth = 0.7 * sc;
  ctx.beginPath();
  ctx.moveTo(0, -mbH * 0.44);
  ctx.lineTo(0, 0);
  ctx.stroke();

  // Grand steps wide
  ctx.fillStyle = '#b09860';
  ctx.fillRect(-mbW / 2 - 4 * sc, 0, mbW + 8 * sc, 4 * sc);
  ctx.fillStyle = '#c0a870';
  ctx.fillRect(-mbW / 2 - 9 * sc, -4 * sc, mbW + 18 * sc, 4 * sc);
  ctx.fillStyle = '#b09860';
  ctx.fillRect(-mbW / 2 - 14 * sc, -8 * sc, mbW + 28 * sc, 4 * sc);
  ctx.fillStyle = '#a89060';
  ctx.fillRect(-mbW / 2 - 19 * sc, -12 * sc, mbW + 38 * sc, 4 * sc);

  // Blinking aircraft light on lantern
  const bl = Math.sin(t * 2.5) > 0;
  ctx.fillStyle = bl ? 'rgba(255,50,50,1)' : 'rgba(255,50,50,0.08)';
  ctx.beginPath();
  ctx.arc(0, domeBase - drumH - domeR - 14 * sc, 2 * sc, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = 'rgba(255,225,155,0.9)';
  ctx.font = `bold ${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Bahay-Bayan V', 0, h * 0.22);
}