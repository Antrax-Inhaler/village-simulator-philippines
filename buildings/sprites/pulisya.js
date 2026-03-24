/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/sprites/pulisya.js

   Himpilan ng Pulisya (Police Station) — Level 1–5 sprites
   Faithful recreation of the designs from pulisya-levels.html
   with proper perspective scaling (sc) and positioning relative
   to building origin (x=0, y=0 at ground level).

   LEVEL 1 — Himpilan (small post)
   LEVEL 2 — Istasyon (wider station with detention wing, flagpole)
   LEVEL 3 — Istasyon Lv 3 (2-storey precinct with comms antenna)
   LEVEL 4 — Punong Himpilan (HQ with watchtower, searchlight)
   LEVEL 5 — PNP Tanggapan (Grand HQ with twin towers, helipad)

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

  // Helper: police-style window with badge trim
  const polWin = (x, y, winW, winH, lit) => {
    ctx.fillStyle = '#1a2450';
    ctx.fillRect(x - 1.5 * sc, y - 1.5 * sc, winW + 3 * sc, winH + 3 * sc);
    ctx.fillStyle = lit ? 'rgba(255,240,180,0.7)' : 'rgba(150,180,255,0.52)';
    ctx.fillRect(x, y, winW, winH);
    if (lit) {
      ctx.fillStyle = 'rgba(255,245,200,0.18)';
      ctx.fillRect(x, y, winW, winH * 0.32);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.65 * sc;
    ctx.beginPath();
    ctx.moveTo(x + winW / 2, y);
    ctx.lineTo(x + winW / 2, y + winH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + winH * 0.44);
    ctx.lineTo(x + winW, y + winH * 0.44);
    ctx.stroke();
    ctx.fillStyle = '#243880';
    ctx.fillRect(x - 2 * sc, y - 3 * sc, winW + 4 * sc, 2.5 * sc);
  };

  // Helper: PNP badge circle
  const pnpBadge = (cx, cy, r) => {
    ctx.fillStyle = '#f5c842';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a2a60';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f5c842';
    ctx.font = `bold ${r * 0.7}px 'Bebas Neue',sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PNP', cx, cy + 0.5 * sc);
    ctx.textBaseline = 'alphabetic';
  };

  // Helper: police car with flashing lights
  const policeCar = (x, y, flip, animTime) => {
    const tAnim = animTime * 0.001;
    const sx = flip ? -1 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, 1);
    // Body
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-12 * sc, -7 * sc, 24 * sc, 7 * sc);
    ctx.fillStyle = '#1a3a80';
    ctx.fillRect(-10 * sc, -13 * sc, 20 * sc, 6 * sc);
    // Stripe
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(-12 * sc, -5 * sc, 24 * sc, 2 * sc);
    ctx.fillStyle = '#2255aa';
    ctx.fillRect(-12 * sc, -3 * sc, 24 * sc, 2 * sc);
    // Wheels
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-7 * sc, 0, 2.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7 * sc, 0, 2.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(-7 * sc, 0, 1.2 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7 * sc, 0, 1.2 * sc, 0, Math.PI * 2);
    ctx.fill();
    // Windshield
    ctx.fillStyle = 'rgba(150,200,255,0.55)';
    ctx.fillRect(-8 * sc, -12 * sc, 16 * sc, 5 * sc);
    // Siren bar with flashing lights
    const bl = Math.sin(tAnim * 8 + x * 0.02) > 0;
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(-5 * sc, -14 * sc, 4 * sc, 2 * sc);
    ctx.fillStyle = '#2255ff';
    ctx.fillRect(1 * sc, -14 * sc, 4 * sc, 2 * sc);
    if (bl) {
      ctx.fillStyle = 'rgba(255,50,50,0.4)';
      ctx.beginPath();
      ctx.arc(-3 * sc, -14 * sc, 5 * sc, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(50,50,255,0.4)';
      ctx.beginPath();
      ctx.arc(3 * sc, -14 * sc, 5 * sc, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // Helper: wall block with shading
  const wall = (x, y, blockW, blockH, color, flipShade) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, blockW, blockH);
    const sg = ctx.createLinearGradient(x, 0, x + blockW, 0);
    if (flipShade) {
      sg.addColorStop(0, 'rgba(0,0,0,0.12)');
      sg.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      sg.addColorStop(0, 'rgba(255,255,255,0.04)');
      sg.addColorStop(0.75, 'rgba(0,0,0,0)');
      sg.addColorStop(1, 'rgba(0,0,0,0.18)');
    }
    ctx.fillStyle = sg;
    ctx.fillRect(x, y, blockW, blockH);
  };

  // Helper: flat parapet roof
  const flatRoof = (x, y, roofW) => {
    ctx.fillStyle = '#1a2a60';
    ctx.fillRect(x - 2 * sc, y - 3 * sc, roofW + 4 * sc, 4 * sc);
    ctx.fillStyle = '#243070';
    ctx.fillRect(x - 3 * sc, y - 7 * sc, roofW + 6 * sc, 5 * sc);
    ctx.fillStyle = '#121e50';
    ctx.fillRect(x - 4 * sc, y - 9 * sc, roofW + 8 * sc, 2.5 * sc);
  };

  // Helper: gable roof
  const gable = (lx, baseY, roofW, tipH) => {
    ctx.fillStyle = '#1a2a60';
    ctx.beginPath();
    ctx.moveTo(lx, baseY);
    ctx.lineTo(lx + roofW / 2, baseY - tipH);
    ctx.lineTo(lx + roofW, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(lx + roofW / 2 - roofW * 0.07, baseY);
    ctx.lineTo(lx + roofW / 2, baseY - tipH);
    ctx.lineTo(lx + roofW / 2 + roofW * 0.07, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0e1a48';
    ctx.fillRect(lx - 2 * sc, baseY - 2 * sc, roofW + 4 * sc, 3 * sc);
  };

  // Helper: antenna mast
  const antenna = (x, y, height) => {
    ctx.strokeStyle = '#8090a0';
    ctx.lineWidth = 1.2 * sc;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - height);
    ctx.stroke();
    ctx.strokeStyle = '#607080';
    ctx.lineWidth = 0.8 * sc;
    ctx.beginPath();
    ctx.moveTo(x, y - height * 0.6);
    ctx.lineTo(x - 8 * sc, y - height * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - height * 0.6);
    ctx.lineTo(x + 8 * sc, y - height * 0.4);
    ctx.stroke();
    ctx.fillStyle = '#cc4444';
    ctx.beginPath();
    ctx.arc(x, y - height, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
  };

  // Helper: searchlight sweep
  const searchlight = (x, y, angle) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(255,255,180,0.08)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 55 * sc, angle - 0.18, angle + 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,200,0.18)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 30 * sc, angle - 0.1, angle + 0.1);
    ctx.closePath();
    ctx.fill();
    // Lamp housing
    ctx.fillStyle = '#8090a0';
    ctx.beginPath();
    ctx.arc(0, 0, 4 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Helper: watchtower
  const watchTower = (x, y, towerW, towerH) => {
    // Shaft
    ctx.fillStyle = '#243070';
    ctx.fillRect(x - towerW / 2, y - towerH, towerW, towerH);
    // Observation box
    ctx.fillStyle = '#2c3878';
    ctx.fillRect(x - towerW / 2 - 3 * sc, y - towerH - 10 * sc, towerW + 6 * sc, 10 * sc);
    // Roof
    ctx.fillStyle = '#1a2460';
    ctx.beginPath();
    ctx.moveTo(x - towerW / 2 - 4 * sc, y - towerH - 10 * sc);
    ctx.lineTo(x, y - towerH - 18 * sc);
    ctx.lineTo(x + towerW / 2 + 4 * sc, y - towerH - 10 * sc);
    ctx.closePath();
    ctx.fill();
    // Slit windows
    ctx.fillStyle = 'rgba(150,180,255,0.5)';
    ctx.fillRect(x - 2 * sc, y - towerH - 8 * sc, 4 * sc, 5 * sc);
    // Base
    ctx.fillStyle = '#1a2050';
    ctx.fillRect(x - towerW / 2 - 1 * sc, y - 2 * sc, towerW + 2 * sc, 3 * sc);
  };

  // Helper: flagpole with waving flag
  const flagpole = (x, baseY, poleH, animTime) => {
    const tAnim = animTime * 0.001;
    ctx.strokeStyle = '#8090a0';
    ctx.lineWidth = 1.2 * sc;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x, baseY - poleH);
    ctx.stroke();
    const fw = 14 * sc;
    const fh = 9 * sc;
    const fy = baseY - poleH;
    ctx.save();
    ctx.translate(x, fy);
    // Blue field with waving effect
    ctx.fillStyle = '#3a6abf';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let i = 0; i <= fw; i++) {
      ctx.lineTo(i, Math.sin(tAnim * 2 + i * 0.04) * 1.5 * sc);
    }
    ctx.lineTo(fw, fh / 2);
    ctx.lineTo(0, fh / 2);
    ctx.closePath();
    ctx.fill();
    // Red field
    ctx.fillStyle = '#cc2222';
    ctx.beginPath();
    ctx.moveTo(0, fh / 2);
    for (let i = 0; i <= fw; i++) {
      ctx.lineTo(i, fh / 2 + Math.sin(tAnim * 2 + i * 0.04) * 1.5 * sc);
    }
    ctx.lineTo(fw, fh);
    ctx.lineTo(0, fh);
    ctx.closePath();
    ctx.fill();
    // White triangle and sun
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, fh);
    ctx.lineTo(fh * 0.8, fh / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f5c842';
    ctx.beginPath();
    ctx.arc(fh * 0.35, fh / 2, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Finial
    ctx.fillStyle = '#f5c842';
    ctx.beginPath();
    ctx.arc(x, baseY - poleH, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
  };

  // Dispatch based on level
  switch (level) {
    case 1:
      drawLv1(ctx, sc, w, h, def, t, {
        drawShadow, polWin, pnpBadge, policeCar, wall, gable
      });
      break;
    case 2:
      drawLv2(ctx, sc, w, h, def, t, {
        drawShadow, polWin, pnpBadge, policeCar, wall, flatRoof, gable, flagpole
      });
      break;
    case 3:
      drawLv3(ctx, sc, w, h, def, t, {
        drawShadow, polWin, pnpBadge, policeCar, wall, flatRoof, antenna, flagpole
      });
      break;
    case 4:
      drawLv4(ctx, sc, w, h, def, t, {
        drawShadow, polWin, pnpBadge, policeCar, wall, flatRoof, antenna, flagpole, watchTower, searchlight
      });
      break;
    case 5:
      drawLv5(ctx, sc, w, h, def, t, {
        drawShadow, polWin, pnpBadge, policeCar, wall, flatRoof, antenna, flagpole, watchTower, searchlight
      });
      break;
    default:
      drawLv1(ctx, sc, w, h, def, t, {
        drawShadow, polWin, pnpBadge, policeCar, wall, gable
      });
  }
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 1 — Himpilan (small post)
   Based on HTML LV1: w=48, h=38
═══════════════════════════════════════════════════════════════ */
function drawLv1(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, polWin, pnpBadge, policeCar, wall, gable } = helpers;

  drawShadow(w * 0.62, 5 * sc);

  // Walls
  wall(-w / 2, -h * 0.55, w, h * 0.67, def.wallColor || '#3050a0', false);

  // Gable roof
  gable(-w * 0.58, -h * 0.55, w * 1.16, h * 0.58);

  // Door
  ctx.fillStyle = 'rgba(10,20,50,0.9)';
  ctx.fillRect(-6 * sc, -h * 0.34, 12 * sc, h * 0.34);
  ctx.strokeStyle = 'rgba(100,140,255,0.4)';
  ctx.lineWidth = 0.8 * sc;
  ctx.strokeRect(-6 * sc, -h * 0.34, 12 * sc, h * 0.34);

  // Windows
  polWin(-w * 0.4, -h * 0.48, 10 * sc, 8 * sc, false);
  polWin(w * 0.25, -h * 0.48, 10 * sc, 8 * sc, false);

  // PNP badge on wall
  pnpBadge(0, -h * 0.3, 8 * sc);

  // Sign
  ctx.fillStyle = '#f5c842';
  ctx.fillRect(-w * 0.38, -h * 0.6, w * 0.76, 8 * sc);
  ctx.fillStyle = '#0a1430';
  ctx.font = `bold ${6 * sc}px 'Bebas Neue',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HIMPILAN', 0, -h * 0.6 + 4 * sc);
  ctx.textBaseline = 'alphabetic';

  // Patrol car parked outside
  policeCar(w * 0.5 + 14 * sc, -4 * sc, false, t);

  // Label
  ctx.fillStyle = 'rgba(150,180,255,0.8)';
  ctx.font = `${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Himpilan', 0, h * 0.28);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 2 — Istasyon
   Wider station with detention wing, flagpole, two patrol cars
   Based on HTML LV2: w=68, h=44
═══════════════════════════════════════════════════════════════ */
function drawLv2(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, polWin, pnpBadge, policeCar, wall, flatRoof, gable, flagpole } = helpers;

  drawShadow(w * 0.6, 6 * sc);

  const dwW = 18 * sc;
  const dwH = 36 * sc;

  // Detention wing (right)
  wall(w / 2 - 2 * sc, -dwH, dwW, dwH, '#283880', false);
  flatRoof(w / 2 - 2 * sc, -dwH, dwW);
  // Cell bars
  ctx.fillStyle = '#1a2850';
  ctx.fillRect(w / 2 + 2 * sc, -dwH * 0.75, dwW - 6 * sc, dwH * 0.45);
  ctx.strokeStyle = 'rgba(100,140,255,0.4)';
  ctx.lineWidth = 0.9 * sc;
  for (let bi = 0; bi < 4; bi++) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + 2 * sc + bi * (dwW - 6 * sc) / 3, -dwH * 0.75);
    ctx.lineTo(w / 2 + 2 * sc + bi * (dwW - 6 * sc) / 3, -dwH * 0.3);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(100,140,255,0.25)';
  ctx.lineWidth = 0.6 * sc;
  ctx.beginPath();
  ctx.moveTo(w / 2 + 2 * sc, -dwH * 0.52);
  ctx.lineTo(w / 2 + dwW - 4 * sc, -dwH * 0.52);
  ctx.stroke();

  // Main walls
  wall(-w / 2, -h * 0.55, w, h * 0.67, def.wallColor || '#3050a0', false);
  gable(-w * 0.56, -h * 0.55, w * 1.12, h * 0.62);

  // Door
  ctx.fillStyle = 'rgba(10,20,50,0.9)';
  ctx.fillRect(-7 * sc, -h * 0.36, 14 * sc, h * 0.36);
  ctx.strokeStyle = 'rgba(100,140,255,0.45)';
  ctx.lineWidth = 0.9 * sc;
  ctx.strokeRect(-7 * sc, -h * 0.36, 14 * sc, h * 0.36);
  ctx.strokeStyle = 'rgba(100,140,255,0.3)';
  ctx.lineWidth = 0.6 * sc;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.36);
  ctx.lineTo(0, 0);
  ctx.stroke();

  // Windows
  polWin(-w * 0.42, -h * 0.48, 11 * sc, 9 * sc, false);
  polWin(-w * 0.16, -h * 0.48, 11 * sc, 9 * sc, false);
  polWin(w * 0.22, -h * 0.48, 11 * sc, 9 * sc, false);

  // PNP badge larger
  pnpBadge(w * 0.35, -h * 0.32, 9 * sc);

  // Sign
  ctx.fillStyle = '#f5c842';
  ctx.fillRect(-w * 0.34, -h * 0.6, w * 0.68, 8 * sc);
  ctx.fillStyle = '#0a1430';
  ctx.font = `bold ${6 * sc}px 'Bebas Neue',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ISTASYON NG PULISYA', 0, -h * 0.6 + 4 * sc);
  ctx.textBaseline = 'alphabetic';

  // Flagpole
  flagpole(-w * 0.46, -h * 0.55, 32 * sc, t);

  // Two patrol cars
  policeCar(-w * 0.5 - 16 * sc, -4 * sc, true, t);
  policeCar(w * 0.5 + 16 * sc, -4 * sc, false, t);

  // Label
  ctx.fillStyle = 'rgba(150,180,255,0.8)';
  ctx.font = `${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Istasyon', 0, h * 0.26);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 3 — Istasyon Lv 3
   2-storey precinct with comms antenna, balcony, 3 cars
   Based on HTML LV3: w=94, h=46, flH=42
═══════════════════════════════════════════════════════════════ */
function drawLv3(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, polWin, pnpBadge, policeCar, wall, flatRoof, antenna, flagpole } = helpers;

  drawShadow(w * 0.58, 7 * sc);

  const flH = 42 * sc;

  // Detention block (right)
  const dbW = 22 * sc;
  const dbH = 44 * sc;
  wall(w / 2 - 2 * sc, -dbH, dbW, dbH, '#283880', false);
  flatRoof(w / 2 - 2 * sc, -dbH, dbW);
  // Cell windows with bars
  for (let ci = 0; ci < 2; ci++) {
    const cy2 = -dbH * 0.8 + ci * dbH * 0.38;
    ctx.fillStyle = '#1a2850';
    ctx.fillRect(w / 2 + 3 * sc, cy2, dbW - 8 * sc, 10 * sc);
    ctx.strokeStyle = 'rgba(100,140,255,0.38)';
    ctx.lineWidth = 0.8 * sc;
    for (let bi = 0; bi < 3; bi++) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + 3 * sc + bi * (dbW - 8 * sc) / 2, cy2);
      ctx.lineTo(w / 2 + 3 * sc + bi * (dbW - 8 * sc) / 2, cy2 + 10 * sc);
      ctx.stroke();
    }
  }

  // Main GF
  wall(-w / 2, -flH, w, flH, def.wallColor || '#3050a0', false);
  ctx.fillStyle = '#1a2a60';
  ctx.fillRect(-w / 2 - 2 * sc, -flH - 3 * sc, w + 4 * sc, 4 * sc);
  ctx.fillStyle = '#243070';
  ctx.fillRect(-w / 2 - 3 * sc, -flH - 6 * sc, w + 6 * sc, 3.5 * sc);

  // 2F
  wall(-w / 2, -flH * 2 - 5 * sc, w, flH, '#3858a8', false);
  flatRoof(-w / 2, -flH * 2 - 5 * sc, w);

  // Comms antenna
  antenna(w * 0.3, -flH * 2 - 5 * sc, 28 * sc);

  // HVAC on roof
  ctx.fillStyle = '#2a3870';
  ctx.fillRect(-w * 0.38, -flH * 2 - 5 * sc - 10 * sc, 16 * sc, 8 * sc);
  ctx.fillRect(-w * 0.38, -flH * 2 - 5 * sc - 12 * sc, 16 * sc, 3 * sc);

  // 2F balcony corridor
  ctx.fillStyle = '#2a3878';
  ctx.fillRect(-w / 2 - 1 * sc, -flH - 5.5 * sc, w + 2 * sc, flH * 0.1);
  ctx.fillStyle = '#1a2860';
  ctx.fillRect(-w / 2 - 2 * sc, -flH - 5.5 * sc, w + 4 * sc, 2 * sc);
  ctx.strokeStyle = '#2a4080';
  ctx.lineWidth = 0.85 * sc;
  for (let ri = 0; ri <= 10; ri++) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + ri * (w / 10), -flH - 5.5 * sc);
    ctx.lineTo(-w / 2 + ri * (w / 10), -flH - 14 * sc);
    ctx.stroke();
  }
  ctx.strokeStyle = '#3050a0';
  ctx.lineWidth = 1.1 * sc;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -flH - 14 * sc);
  ctx.lineTo(w / 2, -flH - 14 * sc);
  ctx.stroke();

  // Door
  ctx.fillStyle = 'rgba(8,16,48,0.92)';
  ctx.fillRect(-8 * sc, -flH * 0.38, 16 * sc, flH * 0.38);
  ctx.strokeStyle = 'rgba(100,140,255,0.5)';
  ctx.lineWidth = 1 * sc;
  ctx.strokeRect(-8 * sc, -flH * 0.38, 16 * sc, flH * 0.38);
  ctx.strokeStyle = 'rgba(100,140,255,0.28)';
  ctx.lineWidth = 0.7 * sc;
  ctx.beginPath();
  ctx.moveTo(0, -flH * 0.38);
  ctx.lineTo(0, 0);
  ctx.stroke();

  // GF windows
  [-w * 0.44, -w * 0.24, w * 0.08, w * 0.28].forEach((wx) => {
    polWin(wx, -flH * 0.76, 11 * sc, 9 * sc, false);
  });

  // 2F windows (some lit)
  const f2y = -flH * 2 - 5 * sc + flH * 0.22;
  [-w * 0.44, -w * 0.24, w * 0.08, w * 0.28].forEach((wx) => {
    polWin(wx, f2y, 11 * sc, 9 * sc, Math.sin(t * 0.4 + wx * 0.04) > 0);
  });

  // PNP badge on facade
  pnpBadge(w * 0.36, -flH * 0.38, 9 * sc);

  // Sign
  ctx.fillStyle = '#f5c842';
  ctx.fillRect(-w * 0.3, -flH * 0.6, w * 0.6, 9 * sc);
  ctx.fillStyle = '#0a1430';
  ctx.font = `bold ${5.5 * sc}px 'Bebas Neue',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HIMPILAN NG PULISYA', 0, -flH * 0.6 + 4.5 * sc);
  ctx.textBaseline = 'alphabetic';

  // Flagpole
  flagpole(-w * 0.46, -flH * 2 - 5 * sc, 40 * sc, t);

  // 3 cars
  policeCar(-w * 0.5 - 16 * sc, -4 * sc, true, t);
  policeCar(0, -4 * sc, false, t);
  policeCar(w * 0.5 + 16 * sc, -4 * sc, false, t);

  // Label
  ctx.fillStyle = 'rgba(150,180,255,0.8)';
  ctx.font = `${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Istasyon Lv 3', 0, flH * 0.22);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 4 — Punong Himpilan
   HQ with watchtower, searchlight, side wings, 4 cars
   Based on HTML LV4: w=122, h=52, flH=44
═══════════════════════════════════════════════════════════════ */
function drawLv4(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, polWin, pnpBadge, policeCar, wall, flatRoof, antenna, flagpole, watchTower, searchlight } = helpers;

  drawShadow(w * 0.56, 8 * sc);

  const flH = 44 * sc;

  // Left watchtower
  watchTower(-w / 2 - 10 * sc, 0, 10 * sc, 46 * sc);
  // Searchlight sweeping from tower
  const angle = -Math.PI * 0.5 + Math.sin(t * 0.8) * 0.6;
  searchlight(-w / 2 - 10 * sc, -46 * sc, angle);

  // Left detention wing
  const dwW = 24 * sc;
  const dwH = 48 * sc;
  wall(-w / 2 - dwW + 2 * sc, -dwH, dwW, dwH, '#243070', true);
  flatRoof(-w / 2 - dwW + 2 * sc, -dwH, dwW);
  for (let ci = 0; ci < 3; ci++) {
    const cy2 = -dwH * 0.88 + ci * dwH * 0.3;
    ctx.fillStyle = '#141e50';
    ctx.fillRect(-w / 2 - dwW + 5 * sc, cy2, dwW - 8 * sc, 9 * sc);
    ctx.strokeStyle = 'rgba(80,120,220,0.38)';
    ctx.lineWidth = 0.8 * sc;
    for (let bi = 0; bi < 3; bi++) {
      ctx.beginPath();
      ctx.moveTo(-w / 2 - dwW + 5 * sc + bi * (dwW - 8 * sc) / 2, cy2);
      ctx.lineTo(-w / 2 - dwW + 5 * sc + bi * (dwW - 8 * sc) / 2, cy2 + 9 * sc);
      ctx.stroke();
    }
  }

  // Right admin wing
  const awW = 24 * sc;
  const awH = 48 * sc;
  wall(w / 2 - 2 * sc, -awH, awW, awH, '#2a3880', false);
  flatRoof(w / 2 - 2 * sc, -awH, awW);
  polWin(w / 2 + 4 * sc, -awH * 0.8, awW - 8 * sc, 9 * sc, Math.sin(t * 0.35 + 1) > 0);
  polWin(w / 2 + 4 * sc, -awH * 0.52, awW - 8 * sc, 9 * sc, Math.sin(t * 0.35 + 2) > 0);
  polWin(w / 2 + 4 * sc, -awH * 0.24, awW - 8 * sc, 9 * sc, Math.sin(t * 0.35 + 3) > 0);
  ctx.fillStyle = '#f5c842';
  ctx.fillRect(w / 2 + 2 * sc, -awH + 2 * sc, awW - 4 * sc, 8 * sc);
  ctx.fillStyle = '#0a1430';
  ctx.font = `bold ${5 * sc}px 'Bebas Neue',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ADMIN', w / 2 + 2 * sc + awW / 2 - 2 * sc, -awH + 6 * sc);
  ctx.textBaseline = 'alphabetic';

  // Main GF
  wall(-w / 2, -flH, w, flH, def.wallColor || '#3050a0', false);
  ctx.fillStyle = '#1a2a60';
  ctx.fillRect(-w / 2 - 2 * sc, -flH - 3 * sc, w + 4 * sc, 4 * sc);
  ctx.fillStyle = '#243070';
  ctx.fillRect(-w / 2 - 3 * sc, -flH - 6 * sc, w + 6 * sc, 3.5 * sc);

  // 2F
  wall(-w / 2, -flH * 2 - 5 * sc, w, flH, '#3858a8', false);
  flatRoof(-w / 2, -flH * 2 - 5 * sc, w);

  // Comms antenna center
  antenna(0, -flH * 2 - 5 * sc, 32 * sc);

  // 2F balcony
  ctx.fillStyle = '#2a3878';
  ctx.fillRect(-w / 2 - 1 * sc, -flH - 5.5 * sc, w + 2 * sc, flH * 0.09);
  ctx.fillStyle = '#1a2860';
  ctx.fillRect(-w / 2 - 2 * sc, -flH - 5.5 * sc, w + 4 * sc, 2 * sc);
  ctx.strokeStyle = '#2a4080';
  ctx.lineWidth = 0.8 * sc;
  for (let ri = 0; ri <= 14; ri++) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + ri * (w / 14), -flH - 5.5 * sc);
    ctx.lineTo(-w / 2 + ri * (w / 14), -flH - 14 * sc);
    ctx.stroke();
  }
  ctx.strokeStyle = '#3050a0';
  ctx.lineWidth = 1 * sc;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -flH - 14 * sc);
  ctx.lineTo(w / 2, -flH - 14 * sc);
  ctx.stroke();

  // Door
  ctx.fillStyle = 'rgba(8,16,48,0.92)';
  ctx.fillRect(-9 * sc, -flH * 0.4, 18 * sc, flH * 0.4);
  ctx.strokeStyle = 'rgba(100,140,255,0.55)';
  ctx.lineWidth = 1.1 * sc;
  ctx.strokeRect(-9 * sc, -flH * 0.4, 18 * sc, flH * 0.4);
  ctx.strokeStyle = 'rgba(100,140,255,0.3)';
  ctx.lineWidth = 0.7 * sc;
  ctx.beginPath();
  ctx.moveTo(0, -flH * 0.4);
  ctx.lineTo(0, 0);
  ctx.stroke();

  // GF windows
  [-w * 0.44, -w * 0.28, -w * 0.1, w * 0.06, w * 0.22, w * 0.38].forEach((wx) => {
    polWin(wx, -flH * 0.76, 11 * sc, 9 * sc, false);
  });

  // 2F windows
  const f2y = -flH * 2 - 5 * sc + flH * 0.22;
  [-w * 0.44, -w * 0.28, -w * 0.1, w * 0.06, w * 0.22, w * 0.38].forEach((wx) => {
    polWin(wx, f2y, 11 * sc, 9 * sc, Math.sin(t * 0.35 + wx * 0.04) > -0.3);
  });

  // PNP badge large on facade
  pnpBadge(w * 0.34, -flH * 0.4, 10 * sc);

  // Big sign
  ctx.fillStyle = '#f5c842';
  ctx.fillRect(-w * 0.32, -flH * 0.6, w * 0.64, 10 * sc);
  ctx.fillStyle = '#0a1430';
  ctx.font = `bold ${6 * sc}px 'Bebas Neue',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PUNONG HIMPILAN NG PULISYA', 0, -flH * 0.6 + 5 * sc);
  ctx.textBaseline = 'alphabetic';

  // Flagpole
  flagpole(-w * 0.46, -flH * 2 - 5 * sc, 44 * sc, t);

  // Steps
  ctx.fillStyle = '#243070';
  ctx.fillRect(-w * 0.3, 0, w * 0.6, 4 * sc);
  ctx.fillStyle = '#2a3880';
  ctx.fillRect(-w * 0.36, -4 * sc, w * 0.72, 4 * sc);

  // 4 patrol cars
  policeCar(-w * 0.5 - 38 * sc, -4 * sc, true, t);
  policeCar(-w * 0.5 - 14 * sc, -4 * sc, true, t);
  policeCar(w * 0.5 + 14 * sc, -4 * sc, false, t);
  policeCar(w * 0.5 + 38 * sc, -4 * sc, false, t);

  // Label
  ctx.fillStyle = 'rgba(150,180,255,0.8)';
  ctx.font = `${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Punong Himpilan', 0, flH * 0.2);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 5 — PNP Punong-tanggapan
   Grand HQ: 3-storey central tower, twin watchtowers,
   sweeping wings, dual searchlights, helipad, 5 cars
   Based on HTML LV5: w=154, h=60, flH=42
═══════════════════════════════════════════════════════════════ */
function drawLv5(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, polWin, pnpBadge, policeCar, wall, flatRoof, antenna, flagpole, watchTower, searchlight } = helpers;

  drawShadow(w * 0.53, 10 * sc);

  const flH = 42 * sc;

  // Twin watchtowers
  watchTower(-w / 2 - 12 * sc, 0, 11 * sc, 50 * sc);
  watchTower(w / 2 + 12 * sc, 0, 11 * sc, 50 * sc);
  // Dual searchlights
  searchlight(-w / 2 - 12 * sc, -50 * sc, -Math.PI * 0.5 + Math.sin(t * 0.7) * 0.7);
  searchlight(w / 2 + 12 * sc, -50 * sc, -Math.PI * 0.5 - Math.sin(t * 0.7 + 1) * 0.7);

  // Outer wings 2F
  const owW = 26 * sc;
  const owH = 54 * sc;
  const ow5 = (lx) => {
    wall(lx, -owH, owW, owH, lx < 0 ? '#243070' : '#283878', lx < 0);
    ctx.fillStyle = '#1a2060';
    ctx.fillRect(lx - 1 * sc, -owH * 0.5 - 1.5 * sc, owW + 2 * sc, 3 * sc);
    flatRoof(lx, -owH, owW);
    for (let ci = 0; ci < 2; ci++) {
      const lit = ci === 1 && Math.sin(t * 0.3 + lx * 0.02 + ci) > 0;
      if (ci === 0) {
        ctx.fillStyle = '#141e50';
        ctx.fillRect(lx + 3 * sc, -owH * 0.88, owW - 6 * sc, 10 * sc);
        ctx.strokeStyle = 'rgba(80,120,220,0.38)';
        ctx.lineWidth = 0.8 * sc;
        for (let bi = 0; bi < 3; bi++) {
          ctx.beginPath();
          ctx.moveTo(lx + 3 * sc + bi * (owW - 6 * sc) / 2, -owH * 0.88);
          ctx.lineTo(lx + 3 * sc + bi * (owW - 6 * sc) / 2, -owH * 0.88 + 10 * sc);
          ctx.stroke();
        }
      } else {
        polWin(lx + 3 * sc, -owH * 0.46, owW - 6 * sc, 10 * sc, lit);
      }
    }
    // Corridor
    ctx.fillStyle = '#1a2860';
    ctx.fillRect(lx - 1 * sc, -owH * 0.5 - 3 * sc, owW + 2 * sc, owH * 0.09);
    ctx.strokeStyle = '#1a3070';
    ctx.lineWidth = 0.7 * sc;
    for (let ri = 0; ri <= 4; ri++) {
      ctx.beginPath();
      ctx.moveTo(lx + ri * (owW / 4), -owH * 0.5 - 3 * sc);
      ctx.lineTo(lx + ri * (owW / 4), -owH * 0.5 - 11 * sc);
      ctx.stroke();
    }
    ctx.strokeStyle = '#243880';
    ctx.lineWidth = 0.9 * sc;
    ctx.beginPath();
    ctx.moveTo(lx, -owH * 0.5 - 11 * sc);
    ctx.lineTo(lx + owW, -owH * 0.5 - 11 * sc);
    ctx.stroke();
  };
  ow5(-w / 2 + 0);
  ow5(w / 2 - owW);

  // Inner wings 2F
  const iwW = 28 * sc;
  const iwH = 58 * sc;
  const iw5 = (lx) => {
    wall(lx, -iwH, iwW, iwH, lx < 0 ? '#2a3880' : '#2e3e88', lx < 0);
    ctx.fillStyle = '#1a2060';
    ctx.fillRect(lx - 1 * sc, -iwH * 0.5 - 1.5 * sc, iwW + 2 * sc, 3 * sc);
    flatRoof(lx, -iwH, iwW);
    polWin(lx + 3 * sc, -iwH * 0.84, iwW - 6 * sc, 9 * sc, Math.sin(t * 0.32 + lx * 0.02 + 1) > -0.2);
    polWin(lx + 3 * sc, -iwH * 0.54, iwW - 6 * sc, 9 * sc, Math.sin(t * 0.32 + lx * 0.02 + 2) > -0.2);
    polWin(lx + 3 * sc, -iwH * 0.22, iwW - 6 * sc, 9 * sc, Math.sin(t * 0.32 + lx * 0.02 + 3) > -0.2);
    ctx.fillStyle = '#1a2860';
    ctx.fillRect(lx - 1 * sc, -iwH * 0.5 - 3 * sc, iwW + 2 * sc, iwH * 0.08);
    ctx.strokeStyle = '#243880';
    ctx.lineWidth = 0.9 * sc;
    ctx.beginPath();
    ctx.moveTo(lx, -iwH * 0.5 - 11 * sc);
    ctx.lineTo(lx + iwW, -iwH * 0.5 - 11 * sc);
    ctx.stroke();
  };
  iw5(-w / 2 + owW);
  iw5(w / 2 - owW - iwW);

  // Central tower 3F
  const mbW = 62 * sc;
  const mbH = flH;
  const mb2H = flH * 0.88;
  const mb3H = flH * 0.65;

  // GF
  wall(-mbW / 2, -mbH, mbW, mbH, def.wallColor || '#3050a0', false);
  ctx.fillStyle = '#1a2a60';
  ctx.fillRect(-mbW / 2 - 2 * sc, -mbH - 3 * sc, mbW + 4 * sc, 4 * sc);
  ctx.fillStyle = '#243070';
  ctx.fillRect(-mbW / 2 - 3 * sc, -mbH - 6 * sc, mbW + 6 * sc, 3.5 * sc);

  // 2F
  wall(-mbW / 2, -mbH - mb2H, mbW, mb2H, '#3858a8', false);
  ctx.fillStyle = '#162050';
  ctx.fillRect(-mbW / 2 - 2 * sc, -mbH - mb2H - 2 * sc, mbW + 4 * sc, 4 * sc);
  ctx.fillStyle = '#202860';
  ctx.fillRect(-mbW / 2 - 3 * sc, -mbH - mb2H - 5.5 * sc, mbW + 6 * sc, 3.5 * sc);

  // 3F
  wall(-mbW / 2, -mbH - mb2H - mb3H, mbW, mb3H, '#4060b0', false);
  flatRoof(-mbW / 2, -mbH - mb2H - mb3H, mbW);

  // Helipad on 3F
  const rfY = -mbH - mb2H - mb3H;
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.4 * sc;
  ctx.beginPath();
  ctx.arc(mbW * 0.28, rfY - 12 * sc, 11 * sc, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.arc(mbW * 0.28, rfY - 12 * sc, 11 * sc, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `bold ${8 * sc}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('H', mbW * 0.28, rfY - 11.5 * sc);
  ctx.textBaseline = 'alphabetic';

  // Comms cluster on roof
  antenna(-mbW * 0.3, rfY, 30 * sc);
  ctx.fillStyle = '#2a3878';
  ctx.fillRect(-mbW * 0.44, rfY - 12 * sc, 16 * sc, 9 * sc);
  ctx.fillRect(-mbW * 0.44, rfY - 14 * sc, 16 * sc, 3 * sc);

  // Full 2F balcony
  ctx.fillStyle = '#2a3878';
  ctx.fillRect(-mbW / 2 - 1 * sc, -mbH - 5.5 * sc, mbW + 2 * sc, mbH * 0.09);
  ctx.fillStyle = '#1a2860';
  ctx.fillRect(-mbW / 2 - 2 * sc, -mbH - 5.5 * sc, mbW + 4 * sc, 2 * sc);
  ctx.strokeStyle = '#2a4080';
  ctx.lineWidth = 0.8 * sc;
  for (let ri = 0; ri <= 12; ri++) {
    ctx.beginPath();
    ctx.moveTo(-mbW / 2 + ri * (mbW / 12), -mbH - 5.5 * sc);
    ctx.lineTo(-mbW / 2 + ri * (mbW / 12), -mbH - 13 * sc);
    ctx.stroke();
  }
  ctx.strokeStyle = '#3050a0';
  ctx.lineWidth = 1 * sc;
  ctx.beginPath();
  ctx.moveTo(-mbW / 2, -mbH - 13 * sc);
  ctx.lineTo(mbW / 2, -mbH - 13 * sc);
  ctx.stroke();

  // GF door
  ctx.fillStyle = 'rgba(6,12,44,0.94)';
  ctx.fillRect(-10 * sc, -mbH * 0.42, 20 * sc, mbH * 0.42);
  ctx.strokeStyle = 'rgba(100,140,255,0.6)';
  ctx.lineWidth = 1.2 * sc;
  ctx.strokeRect(-10 * sc, -mbH * 0.42, 20 * sc, mbH * 0.42);
  ctx.strokeStyle = 'rgba(100,140,255,0.3)';
  ctx.lineWidth = 0.7 * sc;
  ctx.beginPath();
  ctx.moveTo(0, -mbH * 0.42);
  ctx.lineTo(0, 0);
  ctx.stroke();

  // GF windows
  [-mbW * 0.44, -mbW * 0.26, -mbW * 0.08, mbW * 0.08, mbW * 0.26].forEach((wx) => {
    polWin(wx, -mbH * 0.76, 11 * sc, 9 * sc, false);
  });

  // 2F windows
  const f2y = -mbH - mb2H * 0.78;
  [-mbW * 0.44, -mbW * 0.26, -mbW * 0.08, mbW * 0.08, mbW * 0.26, mbW * 0.42].forEach((wx) => {
    polWin(wx, f2y, 11 * sc, 9 * sc, Math.sin(t * 0.3 + wx * 0.04) > -0.3);
  });

  // 3F windows
  const f3y = -mbH - mb2H - mb3H * 0.72;
  [-mbW * 0.38, -mbW * 0.2, -mbW * 0.02, mbW * 0.14, mbW * 0.32].forEach((wx) => {
    polWin(wx, f3y, 10 * sc, 8 * sc, Math.sin(t * 0.28 + wx * 0.04 + 1) > -0.1);
  });

  // BIG PNP BADGE on facade
  pnpBadge(mbW * 0.36, -mbH * 0.42, 11 * sc);

  // GRAND SIGN
  ctx.fillStyle = '#f5c842';
  ctx.fillRect(-mbW * 0.38, -mbH - mb2H * 0.26, mbW * 0.76, 12 * sc);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.6 * sc;
  ctx.strokeRect(-mbW * 0.38, -mbH - mb2H * 0.26, mbW * 0.76, 12 * sc);
  ctx.fillStyle = '#0a1430';
  ctx.font = `bold ${5.5 * sc}px 'Bebas Neue',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PNP PUNONG-TANGGAPAN', 0, -mbH - mb2H * 0.26 + 6 * sc);
  ctx.textBaseline = 'alphabetic';

  // Flagpole on tower
  flagpole(-mbW * 0.44, rfY, 48 * sc, t);

  // GRAND STEPS
  ctx.fillStyle = '#1e2860';
  ctx.fillRect(-mbW / 2 - 2 * sc, 0, mbW + 4 * sc, 4 * sc);
  ctx.fillStyle = '#243070';
  ctx.fillRect(-mbW / 2 - 6 * sc, -4 * sc, mbW + 12 * sc, 4 * sc);
  ctx.fillStyle = '#1e2860';
  ctx.fillRect(-mbW / 2 - 10 * sc, -8 * sc, mbW + 20 * sc, 4 * sc);
  ctx.fillStyle = '#182058';
  ctx.fillRect(-mbW / 2 - 14 * sc, -12 * sc, mbW + 28 * sc, 4 * sc);

  // 5 patrol cars
  [-62, -36, 0, 36, 62].forEach((cx2, i) => {
    policeCar(cx2 * sc, -4 * sc, i < 2, t);
  });

  // Blinking tower light
  const bl = Math.sin(t * 2.8) > 0;
  ctx.fillStyle = bl ? 'rgba(255,50,50,1)' : 'rgba(255,50,50,0.08)';
  ctx.beginPath();
  ctx.arc(-mbW * 0.3, rfY - 30 * sc, 2.5 * sc, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = 'rgba(150,180,255,0.9)';
  ctx.font = `bold ${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('PNP Tanggapan', 0, h * 0.18);
}