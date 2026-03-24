/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/sprites/cuartel.js

   Cuartel (Military Barracks) — Level 1–5 sprites
   Faithful recreation of the designs from cuartel-levels.html
   with proper perspective scaling (sc) and positioning relative
   to building origin (x=0, y=0 at ground level).

   LEVEL 1 — Kampo ng Sundalo (tent camp with sandbags)
   LEVEL 2 — Kuwartel (proper barracks building, guard post)
   LEVEL 3 — Cuartel ng Bayan (2-storey barracks, watchtower, cannon)
   LEVEL 4 — Himpilan Militar (full military HQ with walls, tank)
   LEVEL 5 — Grand Fortress (stone fortress with 4 towers, radar)

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
      sg.addColorStop(0, 'rgba(255,255,255,0.04)');
      sg.addColorStop(0.7, 'rgba(0,0,0,0)');
      sg.addColorStop(1, 'rgba(0,0,0,0.2)');
    }
    ctx.fillStyle = sg;
    ctx.fillRect(x, y, blockW, blockH);
  };

  // Helper: flat roof with layers
  const flatRoof = (x, y, roofW) => {
    ctx.fillStyle = '#141e08';
    ctx.fillRect(x - 2 * sc, y - 3 * sc, roofW + 4 * sc, 4 * sc);
    ctx.fillStyle = '#1a2810';
    ctx.fillRect(x - 3 * sc, y - 7 * sc, roofW + 6 * sc, 5 * sc);
    ctx.fillStyle = '#0e1806';
    ctx.fillRect(x - 4 * sc, y - 9 * sc, roofW + 8 * sc, 2.5 * sc);
  };

  // Helper: military slit window
  const slitWin = (x, y, winW, winH, lit) => {
    ctx.fillStyle = '#0a1206';
    ctx.fillRect(x - 1 * sc, y - 1 * sc, winW + 2 * sc, winH + 2 * sc);
    ctx.fillStyle = lit ? 'rgba(255,220,120,0.6)' : 'rgba(60,100,40,0.5)';
    ctx.fillRect(x, y, winW, winH);
    if (lit) {
      ctx.fillStyle = 'rgba(255,240,160,0.2)';
      ctx.fillRect(x, y, winW, winH * 0.4);
    }
  };

  // Helper: soldier silhouette
  const soldier = (x, y, animTime, facing) => {
    const tAnim = animTime * 0.001;
    const march = Math.sin(tAnim * 3 + x * 0.02) * 2 * sc;
    ctx.save();
    ctx.translate(x, y);
    if (facing < 0) ctx.scale(-1, 1);
    // Legs
    ctx.fillStyle = '#3a4a20';
    ctx.fillRect(-3 * sc, 0, 3 * sc, 8 * sc + march);
    ctx.fillRect(0, 0, 3 * sc, 8 * sc - march);
    // Body
    ctx.fillStyle = '#4a5a28';
    ctx.fillRect(-4 * sc, -14 * sc, 8 * sc, 14 * sc);
    // Head + helmet
    ctx.fillStyle = '#4a5a28';
    ctx.beginPath();
    ctx.arc(0, -16 * sc, 4 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a4a1a';
    ctx.fillRect(-5 * sc, -20 * sc, 10 * sc, 4 * sc);
    ctx.fillRect(-6 * sc, -22 * sc, 12 * sc, 3 * sc);
    // Rifle
    ctx.fillStyle = '#2a2010';
    ctx.fillRect(5 * sc, -18 * sc, 2 * sc, 18 * sc);
    ctx.fillRect(5 * sc, -18 * sc, 6 * sc, 2 * sc);
    ctx.restore();
  };

  // Helper: sandbag wall
  const sandbags = (x, y, count) => {
    for (let si = 0; si < count; si++) {
      const bx = x + si * 10 * sc;
      ctx.fillStyle = si % 2 === 0 ? '#4a3a18' : '#3e3014';
      ctx.beginPath();
      ctx.ellipse(bx + 5 * sc, y - 4 * sc, 6 * sc, 4 * sc, 0, 0, Math.PI * 2);
      ctx.fill();
      // Seam
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 0.6 * sc;
      ctx.beginPath();
      ctx.moveTo(bx, y - 4 * sc);
      ctx.lineTo(bx + 10 * sc, y - 4 * sc);
      ctx.stroke();
    }
  };

  // Helper: barbed wire
  const barbedWire = (x, y, len) => {
    ctx.strokeStyle = 'rgba(160,140,80,0.55)';
    ctx.lineWidth = 0.9 * sc;
    ctx.beginPath();
    for (let bx = 0; bx < len; bx += 4 * sc) {
      ctx.lineTo(x + bx, y + Math.sin(bx * 0.8) * 1.5 * sc);
    }
    ctx.stroke();
    // Barbs
    ctx.strokeStyle = 'rgba(180,160,100,0.4)';
    ctx.lineWidth = 0.7 * sc;
    for (let bx = 0; bx < len; bx += 10 * sc) {
      const waveY = y + Math.sin(bx * 0.8) * 1.5 * sc;
      ctx.beginPath();
      ctx.moveTo(x + bx, waveY - 2 * sc);
      ctx.lineTo(x + bx + 2 * sc, waveY + 2 * sc);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + bx + 2 * sc, waveY - 2 * sc);
      ctx.lineTo(x + bx, waveY + 2 * sc);
      ctx.stroke();
    }
  };

  // Helper: military fence with barbed wire
  const militaryFence = (x, y, len) => {
    ctx.strokeStyle = 'rgba(80,120,40,0.5)';
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.moveTo(x, y - 8 * sc);
    ctx.lineTo(x + len, y - 8 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 4 * sc);
    ctx.lineTo(x + len, y - 4 * sc);
    ctx.stroke();
    for (let fi = 0; fi <= len / (10 * sc); fi++) {
      ctx.fillStyle = '#2a3818';
      ctx.fillRect(x + fi * 10 * sc - 1 * sc, y - 12 * sc, 2.5 * sc, 13 * sc);
    }
    barbedWire(x, y - 12 * sc, len);
  };

  // Helper: military jeep
  const jeep = (x, y, animTime, flip) => {
    const tAnim = animTime * 0.001;
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    // Wheels
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(-9 * sc, 0, 6 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(9 * sc, 0, 6 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.arc(-9 * sc, 0, 6 * sc, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(9 * sc, 0, 6 * sc, 0, Math.PI * 2);
    ctx.stroke();
    // Body
    ctx.fillStyle = '#3a4a1e';
    ctx.fillRect(-14 * sc, -10 * sc, 28 * sc, 10 * sc);
    // Hood
    ctx.fillStyle = '#304018';
    ctx.fillRect(6 * sc, -8 * sc, 10 * sc, 8 * sc);
    // Windshield
    ctx.fillStyle = 'rgba(80,160,200,0.3)';
    ctx.fillRect(-12 * sc, -16 * sc, 16 * sc, 6 * sc);
    // Cab frame
    ctx.fillStyle = '#2a3814';
    ctx.fillRect(-12 * sc, -18 * sc, 4 * sc, 8 * sc);
    ctx.fillRect(0, -18 * sc, 4 * sc, 8 * sc);
    // Spare tire
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(-12 * sc, -4 * sc, 4 * sc, 0, Math.PI * 2);
    ctx.fill();
    // Headlights
    const hl = 0.3 + Math.sin(tAnim * 0.1) * 0.05;
    ctx.fillStyle = `rgba(255,240,160,${hl})`;
    ctx.fillRect(14 * sc, -7 * sc, 3 * sc, 4 * sc);
    ctx.restore();
  };

  // Helper: tank
  const tank = (x, y, animTime, flip) => {
    const tAnim = animTime * 0.001;
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    // Tracks
    ctx.fillStyle = '#1a1a10';
    ctx.fillRect(-18 * sc, 0, 36 * sc, 8 * sc);
    ctx.strokeStyle = '#2a2a1a';
    ctx.lineWidth = 1 * sc;
    for (let ti = 0; ti < 7; ti++) {
      ctx.beginPath();
      ctx.moveTo(-18 * sc + ti * 6 * sc, 0);
      ctx.lineTo(-18 * sc + ti * 6 * sc, 8 * sc);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-18 * sc, 0);
    ctx.lineTo(18 * sc, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-18 * sc, 8 * sc);
    ctx.lineTo(18 * sc, 8 * sc);
    ctx.stroke();
    // Hull
    ctx.fillStyle = '#3c4c1e';
    ctx.fillRect(-15 * sc, -4 * sc, 30 * sc, 4 * sc);
    // Turret
    ctx.fillStyle = '#485828';
    ctx.beginPath();
    ctx.ellipse(0, -8 * sc, 12 * sc, 7 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    // Barrel
    ctx.fillStyle = '#2a3414';
    ctx.fillRect(8 * sc, -10 * sc, 20 * sc, 4 * sc);
    ctx.fillRect(26 * sc, -10 * sc, 4 * sc, 4 * sc);
    // Hatch
    ctx.fillStyle = '#384820';
    ctx.beginPath();
    ctx.arc(-2 * sc, -10 * sc, 4 * sc, 0, Math.PI * 2);
    ctx.fill();
    // Antenna
    ctx.strokeStyle = '#607040';
    ctx.lineWidth = 0.8 * sc;
    ctx.beginPath();
    ctx.moveTo(6 * sc, -14 * sc);
    ctx.lineTo(4 * sc, -28 * sc);
    ctx.stroke();
    ctx.restore();
  };

  // Helper: watchtower (tall military)
  const watchTower = (x, y, towerH, animTime) => {
    const tAnim = animTime * 0.001;
    // Legs
    ctx.strokeStyle = '#2a3c14';
    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    ctx.moveTo(x - 10 * sc, y);
    ctx.lineTo(x - 4 * sc, y - towerH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 10 * sc, y);
    ctx.lineTo(x + 4 * sc, y - towerH);
    ctx.stroke();
    // Cross braces
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.moveTo(x - 9 * sc, y - towerH * 0.3);
    ctx.lineTo(x + 9 * sc, y - towerH * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 7 * sc, y - towerH * 0.6);
    ctx.lineTo(x + 7 * sc, y - towerH * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 9 * sc, y - towerH * 0.3);
    ctx.lineTo(x + 7 * sc, y - towerH * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 9 * sc, y - towerH * 0.3);
    ctx.lineTo(x - 7 * sc, y - towerH * 0.6);
    ctx.stroke();
    // Platform
    ctx.fillStyle = '#243214';
    ctx.fillRect(x - 12 * sc, y - towerH - 2 * sc, 24 * sc, 5 * sc);
    // Cabin
    ctx.fillStyle = '#1e2c10';
    ctx.fillRect(x - 10 * sc, y - towerH - 18 * sc, 20 * sc, 16 * sc);
    // Slit windows
    ctx.fillStyle = 'rgba(255,220,80,0.5)';
    ctx.fillRect(x - 8 * sc, y - towerH - 14 * sc, 5 * sc, 4 * sc);
    ctx.fillRect(x + 3 * sc, y - towerH - 14 * sc, 5 * sc, 4 * sc);
    // Crenels
    ctx.fillStyle = '#1a2810';
    for (let ci = 0; ci < 4; ci++) {
      ctx.fillRect(x - 10 * sc + ci * 6 * sc, y - towerH - 22 * sc, 4 * sc, 5 * sc);
    }
    // Searchlight sweep
    ctx.save();
    ctx.translate(x, y - towerH - 10 * sc);
    ctx.rotate(Math.sin(tAnim * 0.6) * 1.0);
    ctx.fillStyle = 'rgba(255,240,120,0.1)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 55 * sc, -0.22, 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Blinking light
    const bl = Math.sin(tAnim * 3 + x * 0.02) > 0;
    ctx.fillStyle = bl ? 'rgba(255,40,40,0.9)' : 'rgba(255,40,40,0.06)';
    ctx.beginPath();
    ctx.arc(x, y - towerH - 24 * sc, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
  };

  // Helper: guard tower (small)
  const guardTower = (x, y, towerH, animTime) => {
    const tAnim = animTime * 0.001;
    ctx.fillStyle = '#1e2c10';
    ctx.fillRect(x - 5 * sc, y - towerH, 10 * sc, towerH);
    ctx.strokeStyle = '#283a14';
    ctx.lineWidth = 1 * sc;
    for (let ci = 0; ci < 4; ci++) {
      ctx.beginPath();
      ctx.moveTo(x - 5 * sc, y - ci * (towerH / 4));
      ctx.lineTo(x + 5 * sc, y - ci * (towerH / 4));
      ctx.stroke();
    }
    // Platform
    ctx.fillStyle = '#243214';
    ctx.fillRect(x - 8 * sc, y - towerH - 2 * sc, 16 * sc, 4 * sc);
    // Crenelations
    ctx.fillStyle = '#1e2c10';
    for (let ci = 0; ci < 3; ci++) {
      ctx.fillRect(x - 7 * sc + ci * 5 * sc, y - towerH - 7 * sc, 4 * sc, 5 * sc);
    }
    // Searchlight sweep
    ctx.save();
    ctx.translate(x, y - towerH + 2 * sc);
    ctx.rotate(Math.sin(tAnim * 0.7) * 0.8);
    ctx.fillStyle = 'rgba(255,240,120,0.12)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 50 * sc, -0.2, 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Red blink
    const bl = Math.sin(tAnim * 3 + x * 0.02) > 0;
    ctx.fillStyle = bl ? 'rgba(255,50,50,0.9)' : 'rgba(255,50,50,0.06)';
    ctx.beginPath();
    ctx.arc(x, y - towerH - 9 * sc, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
  };

  // Helper: cannon
  const cannon = (x, y, flip) => {
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    // Wheels
    ctx.fillStyle = '#2a1a08';
    ctx.beginPath();
    ctx.arc(-8 * sc, 0, 7 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8 * sc, 0, 7 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a2a10';
    ctx.lineWidth = 1.2 * sc;
    ctx.beginPath();
    ctx.arc(-8 * sc, 0, 7 * sc, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(8 * sc, 0, 7 * sc, 0, Math.PI * 2);
    ctx.stroke();
    // Spokes
    for (let si = 0; si < 4; si++) {
      const sa = si * (Math.PI / 2);
      [-8 * sc, 8 * sc].forEach((wx) => {
        ctx.beginPath();
        ctx.moveTo(wx, 0);
        ctx.lineTo(wx + Math.cos(sa) * 5 * sc, Math.sin(sa) * 5 * sc);
        ctx.stroke();
      });
    }
    // Carriage
    ctx.fillStyle = '#3a2808';
    ctx.fillRect(-10 * sc, -8 * sc, 20 * sc, 8 * sc);
    // Barrel
    ctx.fillStyle = '#2a2008';
    ctx.save();
    ctx.rotate(-0.18);
    ctx.fillRect(0, -6 * sc, 26 * sc, 8 * sc);
    ctx.fillRect(24 * sc, -7 * sc, 6 * sc, 10 * sc);
    ctx.restore();
    // Muzzle band
    ctx.fillStyle = '#1e1606';
    ctx.save();
    ctx.rotate(-0.18);
    ctx.fillRect(22 * sc, -7 * sc, 3 * sc, 10 * sc);
    ctx.restore();
    ctx.restore();
  };

  // Helper: flagpole with waving flag
  const flagpole = (x, baseY, poleH, animTime) => {
    const tAnim = animTime * 0.001;
    ctx.strokeStyle = '#607050';
    ctx.lineWidth = 1.2 * sc;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x, baseY - poleH);
    ctx.stroke();
    const fw = 16 * sc;
    const fh = 10 * sc;
    const fy = baseY - poleH;
    ctx.save();
    ctx.translate(x, fy);
    ctx.fillStyle = '#3a6abf';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let i = 0; i <= fw; i += 1) {
      ctx.lineTo(i, Math.sin(tAnim * 2 + i * 0.04) * 1.8 * sc);
    }
    ctx.lineTo(fw, fh / 2);
    ctx.lineTo(0, fh / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#cc2222';
    ctx.beginPath();
    ctx.moveTo(0, fh / 2);
    for (let i = 0; i <= fw; i += 1) {
      ctx.lineTo(i, fh / 2 + Math.sin(tAnim * 2 + i * 0.04) * 1.8 * sc);
    }
    ctx.lineTo(fw, fh);
    ctx.lineTo(0, fh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
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
    ctx.fillStyle = '#f5c842';
    ctx.beginPath();
    ctx.arc(x, baseY - poleH, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
  };

  // Helper: hazard stripe
  const hazard = (x, y, stripW, stripH) => {
    const sw = 6 * sc;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, stripW, stripH);
    ctx.clip();
    for (let si = 0; si < (stripW + stripH) / sw; si++) {
      ctx.fillStyle = si % 2 === 0 ? 'rgba(255,180,0,0.35)' : 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.moveTo(x + si * sw, y);
      ctx.lineTo(x + si * sw + stripH, y);
      ctx.lineTo(x + si * sw + stripH - sw, y + stripH);
      ctx.lineTo(x + si * sw - sw, y + stripH);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  // Dispatch based on level
  switch (level) {
    case 1:
      drawLv1(ctx, sc, w, h, def, t, {
        drawShadow, wall, flatRoof, slitWin, soldier, sandbags,
        militaryFence, jeep, guardTower, cannon, flagpole, hazard
      });
      break;
    case 2:
      drawLv2(ctx, sc, w, h, def, t, {
        drawShadow, wall, flatRoof, slitWin, soldier, sandbags,
        militaryFence, jeep, guardTower, cannon, flagpole, hazard
      });
      break;
    case 3:
      drawLv3(ctx, sc, w, h, def, t, {
        drawShadow, wall, flatRoof, slitWin, soldier, sandbags,
        militaryFence, jeep, guardTower, watchTower, cannon, flagpole, hazard
      });
      break;
    case 4:
      drawLv4(ctx, sc, w, h, def, t, {
        drawShadow, wall, flatRoof, slitWin, soldier, sandbags,
        militaryFence, jeep, tank, guardTower, watchTower, cannon, flagpole, hazard
      });
      break;
    case 5:
      drawLv5(ctx, sc, w, h, def, t, {
        drawShadow, wall, flatRoof, slitWin, soldier, sandbags,
        militaryFence, jeep, tank, guardTower, watchTower, cannon, flagpole, hazard
      });
      break;
    default:
      drawLv1(ctx, sc, w, h, def, t, {
        drawShadow, wall, flatRoof, slitWin, soldier, sandbags,
        militaryFence, jeep, guardTower, cannon, flagpole, hazard
      });
  }
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 1 — Kampo ng Sundalo (tent camp)
   Based on HTML LV1
═══════════════════════════════════════════════════════════════ */
function drawLv1(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, soldier, sandbags, militaryFence } = helpers;

  drawShadow(38 * sc, 5 * sc);

  // Two military tents
  [-22 * sc, 18 * sc].forEach((tx, ti) => {
    // Tent body
    ctx.fillStyle = ti === 0 ? '#3a4a1e' : '#344418';
    ctx.beginPath();
    ctx.moveTo(tx - 18 * sc, 0);
    ctx.lineTo(tx, -32 * sc);
    ctx.lineTo(tx + 18 * sc, 0);
    ctx.closePath();
    ctx.fill();
    // Tent door flap
    ctx.fillStyle = 'rgba(10,14,6,0.8)';
    ctx.beginPath();
    ctx.moveTo(tx - 5 * sc, 0);
    ctx.lineTo(tx, ti === 1 ? -18 * sc : -20 * sc);
    ctx.lineTo(tx + 5 * sc, 0);
    ctx.closePath();
    ctx.fill();
    // Tent shading
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.moveTo(tx, 0);
    ctx.lineTo(tx, -32 * sc);
    ctx.lineTo(tx + 18 * sc, 0);
    ctx.closePath();
    ctx.fill();
    // Support pole
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.8 * sc;
    ctx.beginPath();
    ctx.moveTo(tx, -32 * sc);
    ctx.lineTo(tx, 0);
    ctx.stroke();
  });

  // Sandbag wall front
  sandbags(-40 * sc, -1 * sc, 8);

  // Two soldiers on guard
  soldier(-48 * sc, -1 * sc, t, 1);
  soldier(42 * sc, -1 * sc, t, -1);

  // Basic wooden fence
  militaryFence(-54 * sc, -1 * sc, 108 * sc);

  // Campfire with flames
  const fl = Math.sin(t * 6) * 0.8;
  ctx.fillStyle = 'rgba(255,100,20,0.8)';
  ctx.beginPath();
  ctx.moveTo(2 * sc, -1 * sc);
  ctx.quadraticCurveTo(2 * sc + fl * sc, -7 * sc, 2 * sc, -9 * sc);
  ctx.quadraticCurveTo(2 * sc - fl * sc, -7 * sc, 4 * sc, -1 * sc);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,120,20,0.8)';
  ctx.beginPath();
  ctx.moveTo(0, -1 * sc);
  ctx.lineTo(fl * 0.5 * sc, -8 * sc);
  ctx.lineTo(4 * sc, -1 * sc);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,200,50,0.9)';
  ctx.beginPath();
  ctx.moveTo(1 * sc, -1 * sc);
  ctx.lineTo(fl * 0.2 * sc, -6 * sc);
  ctx.lineTo(3 * sc, -1 * sc);
  ctx.closePath();
  ctx.fill();
  // Fire glow
  const fg = ctx.createRadialGradient(2 * sc, -5 * sc, 1 * sc, 2 * sc, -5 * sc, 14 * sc);
  fg.addColorStop(0, 'rgba(255,140,20,0.2)');
  fg.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.arc(2 * sc, -5 * sc, 14 * sc, 0, Math.PI * 2);
  ctx.fill();
  // Logs
  ctx.strokeStyle = '#3a2010';
  ctx.lineWidth = 2 * sc;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-4 * sc, 0);
  ctx.lineTo(8 * sc, -1 * sc);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-2 * sc, 0);
  ctx.lineTo(6 * sc, -2 * sc);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Label
  ctx.fillStyle = 'rgba(160,210,80,0.75)';
  ctx.font = `${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Kampo ng Sundalo', 0, h * 0.16);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 2 — Kuwartel (proper barracks building)
   Based on HTML LV2
═══════════════════════════════════════════════════════════════ */
function drawLv2(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, wall, flatRoof, slitWin, soldier, sandbags,
    militaryFence, jeep, guardTower, flagpole, hazard } = helpers;

  drawShadow(50 * sc, 6 * sc);

  // Main barracks building
  wall(-52 * sc, -42 * sc, 72 * sc, 42 * sc, '#2e3c18', false);
  flatRoof(-52 * sc, -42 * sc, 72 * sc);
  // Windows
  [-44, -28, -12, 4].forEach((wx) => {
    slitWin(wx * sc, -36 * sc, 10 * sc, 8 * sc, Math.sin(t * 0.5 + wx * 0.01) > 0);
  });
  // Door
  ctx.fillStyle = 'rgba(8,12,4,0.9)';
  ctx.fillRect(-18 * sc, -28 * sc, 12 * sc, 28 * sc);
  ctx.strokeStyle = 'rgba(120,180,60,0.35)';
  ctx.lineWidth = 0.8 * sc;
  ctx.strokeRect(-18 * sc, -28 * sc, 12 * sc, 28 * sc);
  // Hazard stripe base
  hazard(-52 * sc, -5 * sc, 72 * sc, 5 * sc);
  // Sign
  ctx.fillStyle = '#f5c842';
  ctx.fillRect(-44 * sc, -44 * sc, 56 * sc, 8 * sc);
  ctx.fillStyle = '#0a0c04';
  ctx.font = `bold ${5 * sc}px 'Bebas Neue',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('KUWARTEL', -52 * sc + 22 * sc, -40 * sc);
  ctx.textBaseline = 'alphabetic';

  // Guard post right
  wall(24 * sc, -30 * sc, 18 * sc, 30 * sc, '#243014', false);
  flatRoof(24 * sc, -30 * sc, 18 * sc);
  slitWin(28 * sc, -24 * sc, 10 * sc, 8 * sc, true);
  // Guard post door
  ctx.fillStyle = 'rgba(6,10,2,0.88)';
  ctx.fillRect(29 * sc, -18 * sc, 8 * sc, 18 * sc);

  // Guard tower small
  guardTower(52 * sc, -1 * sc, 38 * sc, t);

  // Sandbags at entrance
  sandbags(-28 * sc, -1 * sc, 4);
  sandbags(4 * sc, -1 * sc, 3);

  // Jeep parked
  jeep(-68 * sc, -6 * sc, t, false);

  // Flagpole
  flagpole(-50 * sc, -42 * sc, 36 * sc, t);

  // Fence perimeter
  militaryFence(-76 * sc, -1 * sc, 152 * sc);

  // Two soldiers
  soldier(-24 * sc, -1 * sc, t, 1);
  soldier(16 * sc, -1 * sc, t, -1);

  // Label
  ctx.fillStyle = 'rgba(160,210,80,0.8)';
  ctx.font = `${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Kuwartel', 0, h * 0.15);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 3 — Cuartel ng Bayan (2-storey barracks, watchtower, cannon)
   Based on HTML LV3
═══════════════════════════════════════════════════════════════ */
function drawLv3(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, wall, flatRoof, slitWin, soldier, sandbags,
    militaryFence, jeep, watchTower, cannon, flagpole, hazard } = helpers;

  drawShadow(64 * sc, 7 * sc);

  const bw = 60 * sc;
  const bh = 44 * sc;
  const b2h = 34 * sc;

  // LEFT BARRACKS 2F
  wall(-74 * sc, -bh, bw, bh, '#2a3816', true);
  ctx.fillStyle = '#1e2a0e';
  ctx.fillRect(-74 * sc, -bh - 3 * sc, bw + 2 * sc, 4 * sc);
  ctx.fillStyle = '#243010';
  ctx.fillRect(-74 * sc, -bh - 6 * sc, bw + 2 * sc, 3.5 * sc);
  wall(-74 * sc, -bh - b2h, bw, b2h, '#2e3e1a', true);
  flatRoof(-74 * sc, -bh - b2h, bw);
  // GF windows
  [-68, -52, -36].forEach((wx) => {
    slitWin(wx * sc, -bh * 0.78, 10 * sc, 8 * sc, false);
  });
  // 2F windows
  [-68, -52, -36, -20].forEach((wx) => {
    slitWin(wx * sc, -bh - b2h * 0.7, 10 * sc, 8 * sc, Math.sin(t * 0.4 + wx * 0.005) > 0);
  });
  // Door
  ctx.fillStyle = 'rgba(8,12,4,0.9)';
  ctx.fillRect(-58 * sc, -bh * 0.45, 12 * sc, bh * 0.45);
  ctx.strokeStyle = 'rgba(120,180,60,0.38)';
  ctx.lineWidth = 0.9 * sc;
  ctx.strokeRect(-58 * sc, -bh * 0.45, 12 * sc, bh * 0.45);
  hazard(-74 * sc, -5 * sc, bw, 5 * sc);
  // Balcony rail
  ctx.fillStyle = '#243014';
  ctx.fillRect(-75 * sc, -bh - 3 * sc, bw + 2 * sc, bh * 0.08);
  ctx.fillStyle = '#1a2208';
  ctx.fillRect(-76 * sc, -bh - 3 * sc, bw + 4 * sc, 2 * sc);
  ctx.strokeStyle = '#2a3810';
  ctx.lineWidth = 0.8 * sc;
  for (let ri = 0; ri <= 8; ri++) {
    ctx.beginPath();
    ctx.moveTo(-74 * sc + ri * (bw / 8), -bh - 3 * sc);
    ctx.lineTo(-74 * sc + ri * (bw / 8), -bh - 12 * sc);
    ctx.stroke();
  }
  ctx.strokeStyle = '#364820';
  ctx.lineWidth = 1 * sc;
  ctx.beginPath();
  ctx.moveTo(-74 * sc, -bh - 12 * sc);
  ctx.lineTo(-74 * sc + bw, -bh - 12 * sc);
  ctx.stroke();

  // RIGHT ADMIN/ARMORY
  wall(-8 * sc, -40 * sc, 52 * sc, 40 * sc, '#283618', false);
  flatRoof(-8 * sc, -40 * sc, 52 * sc);
  [-2, 14, 28].forEach((wx) => {
    slitWin(wx * sc, -34 * sc, 10 * sc, 8 * sc, Math.sin(t * 0.4 + wx * 0.005) > 0);
  });
  ctx.fillStyle = 'rgba(6,10,2,0.9)';
  ctx.fillRect(14 * sc, -28 * sc, 10 * sc, 28 * sc);
  ctx.strokeStyle = 'rgba(120,180,60,0.35)';
  ctx.lineWidth = 0.8 * sc;
  ctx.strokeRect(14 * sc, -28 * sc, 10 * sc, 28 * sc);
  hazard(-8 * sc, -5 * sc, 52 * sc, 5 * sc);
  // Sign
  ctx.fillStyle = '#f5c842';
  ctx.fillRect(-4 * sc, -43 * sc, 44 * sc, 8 * sc);
  ctx.fillStyle = '#060804';
  ctx.font = `bold ${4.5 * sc}px 'Bebas Neue',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ARMERIA', 18 * sc, -39 * sc);
  ctx.textBaseline = 'alphabetic';

  // Watchtower
  watchTower(58 * sc, -1 * sc, 54 * sc, t);

  // Cannon at entrance
  cannon(-82 * sc, -6 * sc, false);
  cannon(70 * sc, -6 * sc, true);

  // Flagpole
  flagpole(-72 * sc, -bh - b2h, 46 * sc, t);

  // Jeep + soldiers
  jeep(-96 * sc, -6 * sc, t, false);
  soldier(-90 * sc, -1 * sc, t, 1);
  soldier(-80 * sc, -1 * sc, t, 1);
  soldier(44 * sc, -1 * sc, t, -1);

  // Sandbags
  sandbags(2 * sc, -1 * sc, 5);

  // Perimeter fence
  militaryFence(-100 * sc, -1 * sc, 200 * sc);

  // Label
  ctx.fillStyle = 'rgba(160,210,80,0.8)';
  ctx.font = `${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Cuartel ng Bayan', 0, h * 0.14);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 4 — Himpilan Militar (full military HQ with walls, tank)
   Based on HTML LV4
═══════════════════════════════════════════════════════════════ */
function drawLv4(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, wall, flatRoof, slitWin, soldier, sandbags,
    militaryFence, jeep, tank, guardTower, watchTower, cannon, flagpole, hazard } = helpers;

  drawShadow(80 * sc, 8 * sc);

  // PERIMETER WALL
  ctx.fillStyle = '#1e2c10';
  ctx.fillRect(-108 * sc, -14 * sc, 216 * sc, 14 * sc);
  ctx.fillStyle = '#283810';
  ctx.fillRect(-110 * sc, -16 * sc, 220 * sc, 4 * sc);
  // Crenelations top
  for (let ci = 0; ci < 22; ci++) {
    ctx.fillStyle = '#1e2c10';
    ctx.fillRect(-108 * sc + ci * 10 * sc, -22 * sc, 7 * sc, 8 * sc);
  }

  // CORNER TOWERS
  [-104, 98].forEach((tx) => {
    ctx.fillStyle = '#243214';
    ctx.fillRect(tx * sc - 6 * sc, -30 * sc, 14 * sc, 30 * sc);
    ctx.fillStyle = '#1e2a10';
    for (let ci = 0; ci < 2; ci++) {
      ctx.fillRect(tx * sc - 7 * sc + ci * 8 * sc, -36 * sc, 6 * sc, 7 * sc);
    }
    slitWin(tx * sc - 4 * sc, -24 * sc, 10 * sc, 8 * sc, true);
    guardTower(tx * sc + 1 * sc, -30 * sc, 24 * sc, t);
  });

  // LEFT BARRACKS BLOCK
  wall(-96 * sc, -52 * sc, 44 * sc, 52 * sc, '#263414', true);
  flatRoof(-96 * sc, -52 * sc, 44 * sc);
  [-90, -74, -60].forEach((wx) => {
    slitWin(wx * sc, -46 * sc, 10 * sc, 8 * sc, false);
    slitWin(wx * sc, -26 * sc, 10 * sc, 8 * sc, Math.sin(t * 0.4 + wx * 0.005) > 0);
  });
  ctx.fillStyle = 'rgba(6,10,2,0.9)';
  ctx.fillRect(-76 * sc, -34 * sc, 10 * sc, 34 * sc);
  ctx.strokeStyle = 'rgba(120,180,60,0.35)';
  ctx.lineWidth = 0.8 * sc;
  ctx.strokeRect(-76 * sc, -34 * sc, 10 * sc, 34 * sc);
  hazard(-96 * sc, -5 * sc, 44 * sc, 5 * sc);

  // RIGHT BARRACKS BLOCK
  wall(52 * sc, -52 * sc, 44 * sc, 52 * sc, '#283618', false);
  flatRoof(52 * sc, -52 * sc, 44 * sc);
  [58, 72, 86].forEach((wx) => {
    slitWin(wx * sc, -46 * sc, 10 * sc, 8 * sc, false);
    slitWin(wx * sc, -26 * sc, 10 * sc, 8 * sc, Math.sin(t * 0.4 + wx * 0.005) > 0);
  });
  ctx.fillStyle = 'rgba(6,10,2,0.9)';
  ctx.fillRect(66 * sc, -34 * sc, 10 * sc, 34 * sc);
  ctx.strokeStyle = 'rgba(120,180,60,0.35)';
  ctx.lineWidth = 0.8 * sc;
  ctx.strokeRect(66 * sc, -34 * sc, 10 * sc, 34 * sc);
  hazard(52 * sc, -5 * sc, 44 * sc, 5 * sc);

  // MAIN HQ BUILDING
  const mbw = 54 * sc;
  const mbh = 46 * sc;
  const mb2h = 36 * sc;
  wall(-mbw / 2, -mbh, mbw, mbh, '#2e3e1a', false);
  ctx.fillStyle = '#1e2c0e';
  ctx.fillRect(-mbw / 2 - 2 * sc, -mbh - 3 * sc, mbw + 4 * sc, 4 * sc);
  ctx.fillStyle = '#243214';
  ctx.fillRect(-mbw / 2 - 3 * sc, -mbh - 6 * sc, mbw + 6 * sc, 3.5 * sc);
  wall(-mbw / 2, -mbh - mb2h, mbw, mb2h, '#324418', false);
  flatRoof(-mbw / 2, -mbh - mb2h, mbw);
  // GF windows
  [-22, -8, 8, 22].forEach((wx) => {
    slitWin(wx * sc, -mbh * 0.78, 10 * sc, 8 * sc, false);
  });
  // 2F windows
  const f2y = -mbh - mb2h * 0.72;
  [-22, -8, 8, 22].forEach((wx) => {
    slitWin(wx * sc, f2y, 10 * sc, 8 * sc, Math.sin(t * 0.35 + wx * 0.004) > -0.2);
  });
  // Main gate
  ctx.fillStyle = 'rgba(6,10,2,0.94)';
  ctx.fillRect(-10 * sc, -mbh * 0.44, 20 * sc, mbh * 0.44);
  ctx.strokeStyle = 'rgba(140,200,60,0.5)';
  ctx.lineWidth = 1.1 * sc;
  ctx.strokeRect(-10 * sc, -mbh * 0.44, 20 * sc, mbh * 0.44);
  // Balcony
  ctx.fillStyle = '#2a3814';
  ctx.fillRect(-mbw / 2 - 1 * sc, -mbh - 3 * sc, mbw + 2 * sc, mbh * 0.08);
  ctx.fillStyle = '#1a2808';
  ctx.fillRect(-mbw / 2 - 2 * sc, -mbh - 3 * sc, mbw + 4 * sc, 2 * sc);
  ctx.strokeStyle = '#304018';
  ctx.lineWidth = 0.8 * sc;
  for (let ri = 0; ri <= 10; ri++) {
    ctx.beginPath();
    ctx.moveTo(-mbw / 2 + ri * (mbw / 10), -mbh - 3 * sc);
    ctx.lineTo(-mbw / 2 + ri * (mbw / 10), -mbh - 12 * sc);
    ctx.stroke();
  }
  ctx.strokeStyle = '#3c5020';
  ctx.lineWidth = 1 * sc;
  ctx.beginPath();
  ctx.moveTo(-mbw / 2, -mbh - 12 * sc);
  ctx.lineTo(mbw / 2, -mbh - 12 * sc);
  ctx.stroke();
  // Grand sign
  ctx.fillStyle = '#f5c842';
  ctx.fillRect(-mbw * 0.38, -mbh - mb2h * 0.28, mbw * 0.76, 10 * sc);
  ctx.fillStyle = '#060804';
  ctx.font = `bold ${5 * sc}px 'Bebas Neue',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HIMPILAN MILITAR', 0, -mbh - mb2h * 0.28 + 5 * sc);
  ctx.textBaseline = 'alphabetic';
  hazard(-mbw / 2, -5 * sc, mbw, 5 * sc);

  // 2 TALL WATCHTOWERS
  watchTower(-108 * sc, -14 * sc, 52 * sc, t);
  watchTower(108 * sc, -14 * sc, 52 * sc, t);

  // Flagpole center
  flagpole(-mbw / 2 + 4 * sc, -mbh - mb2h, 52 * sc, t);

  // 2 cannons flanking gate
  cannon(-24 * sc, -7 * sc, false);
  cannon(24 * sc, -7 * sc, true);

  // Tank in motor pool
  tank(-108 * sc + 8 * sc, -20 * sc, t, false);

  // 2 jeeps
  jeep(-110 * sc, -20 * sc, t, true);
  jeep(88 * sc, -20 * sc, t, false);

  // Soldiers
  [-88, -78, 72, 82].forEach((sx) => {
    soldier(sx * sc, -15 * sc, t, sx < 0 ? 1 : -1);
  });

  // Sandbags at main gate
  sandbags(-14 * sc, -1 * sc, 3);

  // Grand steps
  ctx.fillStyle = '#1e2c10';
  ctx.fillRect(-mbw / 2 - 2 * sc, 0, mbw + 4 * sc, 4 * sc);
  ctx.fillRect(-mbw / 2 - 6 * sc, -4 * sc, mbw + 12 * sc, 4 * sc);

  // Label
  ctx.fillStyle = 'rgba(160,210,80,0.82)';
  ctx.font = `${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Himpilan Militar', 0, h * 0.13);
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL 5 — Grand Fortress (stone fortress with 4 towers, radar)
   Based on HTML LV5
═══════════════════════════════════════════════════════════════ */
function drawLv5(ctx, sc, w, h, def, t, helpers) {
  const { drawShadow, wall, flatRoof, slitWin, soldier, sandbags,
    jeep, tank, watchTower, cannon, flagpole, hazard } = helpers;

  drawShadow(96 * sc, 10 * sc);

  // OUTER STONE FORTRESS WALLS
  ctx.fillStyle = '#1a2810';
  ctx.fillRect(-120 * sc, -20 * sc, 240 * sc, 20 * sc);
  // Stone texture
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 0.6 * sc;
  for (let xi = 0; xi < 240; xi += 16) {
    ctx.beginPath();
    ctx.moveTo(-120 * sc + xi * sc, -20 * sc);
    ctx.lineTo(-120 * sc + xi * sc, 0);
    ctx.stroke();
  }
  for (let yi = 0; yi < 3; yi++) {
    ctx.beginPath();
    ctx.moveTo(-120 * sc, -20 * sc + yi * 7 * sc);
    ctx.lineTo(120 * sc, -20 * sc + yi * 7 * sc);
    ctx.stroke();
  }
  // Wall top parapet
  ctx.fillStyle = '#243814';
  ctx.fillRect(-122 * sc, -24 * sc, 244 * sc, 6 * sc);
  // Merlons
  for (let ci = 0; ci < 24; ci++) {
    ctx.fillStyle = '#1a2810';
    ctx.fillRect(-120 * sc + ci * 10 * sc, -30 * sc, 7 * sc, 8 * sc);
  }

  // 4 CORNER FORTRESS TOWERS
  [-116, 110].forEach((tx) => {
    [-1, 1].forEach((side) => {
      const fy = side < 0 ? -20 * sc : 0;
      ctx.fillStyle = '#1e3012';
      ctx.fillRect(tx * sc - 8 * sc, fy - 38 * sc, 16 * sc, 38 * sc);
      // Tower crenels
      for (let ci = 0; ci < 3; ci++) {
        ctx.fillStyle = '#182808';
        ctx.fillRect(tx * sc - 7 * sc + ci * 5 * sc, fy - 44 * sc, 4 * sc, 7 * sc);
      }
      slitWin(tx * sc - 5 * sc, fy - 32 * sc, 10 * sc, 8 * sc, true);
      slitWin(tx * sc - 5 * sc, fy - 20 * sc, 10 * sc, 8 * sc, Math.sin(t * 0.5 + tx * 0.02) > 0);
      // Searchlight
      if (side < 0) {
        ctx.save();
        ctx.translate(tx * sc, fy - 40 * sc);
        ctx.rotate(Math.sin(t * 0.55 + tx * 0.02) * 0.9);
        ctx.fillStyle = 'rgba(255,240,120,0.09)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 60 * sc, -0.2, 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        const bl = Math.sin(t * 3 + tx * 0.02) > 0;
        ctx.fillStyle = bl ? 'rgba(255,40,40,0.9)' : 'rgba(255,40,40,0.05)';
        ctx.beginPath();
        ctx.arc(tx * sc, fy - 46 * sc, 2.5 * sc, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  });

  // LEFT BARRACKS COMPLEX
  wall(-108 * sc, -56 * sc, 46 * sc, 56 * sc, '#243214', true);
  flatRoof(-108 * sc, -56 * sc, 46 * sc);
  [-102, -86, -70].forEach((wx) => {
    slitWin(wx * sc, -50 * sc, 10 * sc, 8 * sc, false);
    slitWin(wx * sc, -28 * sc, 10 * sc, 8 * sc, Math.sin(t * 0.4 + wx * 0.005) > 0);
  });
  ctx.fillStyle = 'rgba(6,10,2,0.9)';
  ctx.fillRect(-88 * sc, -36 * sc, 10 * sc, 36 * sc);
  ctx.strokeStyle = 'rgba(120,180,60,0.35)';
  ctx.lineWidth = 0.8 * sc;
  ctx.strokeRect(-88 * sc, -36 * sc, 10 * sc, 36 * sc);
  hazard(-108 * sc, -5 * sc, 46 * sc, 5 * sc);

  // RIGHT BARRACKS COMPLEX
  wall(62 * sc, -56 * sc, 46 * sc, 56 * sc, '#263418', false);
  flatRoof(62 * sc, -56 * sc, 46 * sc);
  [68, 82, 96].forEach((wx) => {
    slitWin(wx * sc, -50 * sc, 10 * sc, 8 * sc, false);
    slitWin(wx * sc, -28 * sc, 10 * sc, 8 * sc, Math.sin(t * 0.4 + wx * 0.005) > 0);
  });
  ctx.fillStyle = 'rgba(6,10,2,0.9)';
  ctx.fillRect(78 * sc, -36 * sc, 10 * sc, 36 * sc);
  ctx.strokeStyle = 'rgba(120,180,60,0.35)';
  ctx.lineWidth = 0.8 * sc;
  ctx.strokeRect(78 * sc, -36 * sc, 10 * sc, 36 * sc);
  hazard(62 * sc, -5 * sc, 46 * sc, 5 * sc);

  // GRAND HQ 3F
  const mbw = 62 * sc;
  const mbh = 44 * sc;
  const mb2h = 36 * sc;
  const mb3h = 28 * sc;
  wall(-mbw / 2, -mbh, mbw, mbh, '#2e4018', false);
  ctx.fillStyle = '#1e2e0e';
  ctx.fillRect(-mbw / 2 - 2 * sc, -mbh - 3 * sc, mbw + 4 * sc, 4 * sc);
  ctx.fillStyle = '#243414';
  ctx.fillRect(-mbw / 2 - 3 * sc, -mbh - 6 * sc, mbw + 6 * sc, 3.5 * sc);
  wall(-mbw / 2, -mbh - mb2h, mbw, mb2h, '#324618', false);
  ctx.fillStyle = '#1c2c0c';
  ctx.fillRect(-mbw / 2 - 2 * sc, -mbh - mb2h - 2 * sc, mbw + 4 * sc, 4 * sc);
  wall(-mbw / 2, -mbh - mb2h - mb3h, mbw, mb3h, '#364a1a', false);
  flatRoof(-mbw / 2, -mbh - mb2h - mb3h, mbw);
  // GF windows
  [-24, -10, 6, 20].forEach((wx) => {
    slitWin(wx * sc, -mbh * 0.78, 10 * sc, 8 * sc, false);
  });
  // 2F windows
  const f2y = -mbh - mb2h * 0.72;
  [-24, -10, 6, 20].forEach((wx) => {
    slitWin(wx * sc, f2y, 10 * sc, 8 * sc, Math.sin(t * 0.3 + wx * 0.004) > -0.2);
  });
  // 3F windows
  const f3y = -mbh - mb2h - mb3h * 0.7;
  [-18, -4, 10].forEach((wx) => {
    slitWin(wx * sc, f3y, 10 * sc, 7 * sc, Math.sin(t * 0.28 + wx * 0.004 + 1) > -0.1);
  });
  // Main gate with portcullis look
  ctx.fillStyle = 'rgba(4,8,2,0.95)';
  ctx.fillRect(-11 * sc, -mbh * 0.46, 22 * sc, mbh * 0.46);
  ctx.strokeStyle = 'rgba(140,210,60,0.6)';
  ctx.lineWidth = 1.2 * sc;
  ctx.strokeRect(-11 * sc, -mbh * 0.46, 22 * sc, mbh * 0.46);
  // Portcullis bars
  ctx.strokeStyle = 'rgba(100,160,40,0.25)';
  ctx.lineWidth = 0.8 * sc;
  for (let bi = 0; bi < 4; bi++) {
    ctx.beginPath();
    ctx.moveTo(-11 * sc + bi * 7 * sc, -mbh * 0.46);
    ctx.lineTo(-11 * sc + bi * 7 * sc, 0);
    ctx.stroke();
  }
  for (let bi = 0; bi < 3; bi++) {
    ctx.beginPath();
    ctx.moveTo(-11 * sc, -mbh * 0.46 + bi * 12 * sc);
    ctx.lineTo(11 * sc, -mbh * 0.46 + bi * 12 * sc);
    ctx.stroke();
  }
  // Balcony
  ctx.fillStyle = '#2a3c14';
  ctx.fillRect(-mbw / 2 - 1 * sc, -mbh - 3 * sc, mbw + 2 * sc, mbh * 0.08);
  ctx.fillStyle = '#1c2a08';
  ctx.fillRect(-mbw / 2 - 2 * sc, -mbh - 3 * sc, mbw + 4 * sc, 2 * sc);
  ctx.strokeStyle = '#334618';
  ctx.lineWidth = 0.8 * sc;
  for (let ri = 0; ri <= 12; ri++) {
    ctx.beginPath();
    ctx.moveTo(-mbw / 2 + ri * (mbw / 12), -mbh - 3 * sc);
    ctx.lineTo(-mbw / 2 + ri * (mbw / 12), -mbh - 12 * sc);
    ctx.stroke();
  }
  ctx.strokeStyle = '#3e5422';
  ctx.lineWidth = 1 * sc;
  ctx.beginPath();
  ctx.moveTo(-mbw / 2, -mbh - 12 * sc);
  ctx.lineTo(mbw / 2, -mbh - 12 * sc);
  ctx.stroke();
  // GRAND SIGN
  ctx.fillStyle = '#f5c842';
  ctx.fillRect(-mbw * 0.38, -mbh - mb2h * 0.28, mbw * 0.76, 12 * sc);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.5 * sc;
  ctx.strokeRect(-mbw * 0.38, -mbh - mb2h * 0.28, mbw * 0.76, 12 * sc);
  ctx.fillStyle = '#060804';
  ctx.font = `bold ${5.5 * sc}px 'Bebas Neue',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GRAND FORTRESS', 0, -mbh - mb2h * 0.28 + 6 * sc);
  ctx.textBaseline = 'alphabetic';
  hazard(-mbw / 2, -5 * sc, mbw, 5 * sc);

  // Radar dish on roof
  const rfY = -mbh - mb2h - mb3h;
  ctx.save();
  ctx.translate(mbw * 0.3, rfY - 8 * sc);
  ctx.rotate(t * 1.2);
  ctx.strokeStyle = 'rgba(160,220,80,0.7)';
  ctx.lineWidth = 1.2 * sc;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(14 * sc, 2 * sc);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-14 * sc, -2 * sc);
  ctx.stroke();
  ctx.fillStyle = '#a0d050';
  ctx.beginPath();
  ctx.arc(0, 0, 2.5 * sc, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Missile/SAM launcher left roof
  ctx.fillStyle = '#2a3814';
  ctx.fillRect(-mbw * 0.4, rfY - 4 * sc, 10 * sc, 4 * sc);
  ctx.fillStyle = '#3a4820';
  for (let mi = 0; mi < 3; mi++) {
    ctx.save();
    ctx.translate(-mbw * 0.4 + mi * 4 * sc, rfY - 4 * sc);
    ctx.rotate(-0.4);
    ctx.fillRect(-1 * sc, -10 * sc, 2.5 * sc, 10 * sc);
    ctx.fillRect(-2 * sc, -11 * sc, 5 * sc, 3 * sc);
    ctx.restore();
  }

  // Tall watchtowers flanking HQ
  watchTower(-mbw / 2 - 14 * sc, -20 * sc, 58 * sc, t);
  watchTower(mbw / 2 + 14 * sc, -20 * sc, 58 * sc, t);

  // Flagpole
  flagpole(-mbw * 0.44, rfY, 56 * sc, t);

  // Tank battalion
  tank(-116 * sc, -26 * sc, t, false);
  tank(-96 * sc, -26 * sc, t + 0.8, false);
  tank(80 * sc, -26 * sc, t, true);

  // 2 jeeps
  jeep(-118 * sc, -26 * sc, t, true);
  jeep(96 * sc, -26 * sc, t, false);

  // 4 cannons flanking
  cannon(-mbw / 2 - 4 * sc, -7 * sc, false);
  cannon(mbw / 2 + 4 * sc, -7 * sc, true);
  cannon(-90 * sc, -21 * sc, false);
  cannon(86 * sc, -21 * sc, true);

  // Soldiers drilling in formation
  [-88, -76, -64, 60, 72, 84].forEach((sx) => {
    soldier(sx * sc, -21 * sc, t, sx < 0 ? 1 : -1);
  });
  [-24, -14, 10, 20].forEach((sx) => {
    soldier(sx * sc, -1 * sc, t, sx < 0 ? 1 : -1);
  });

  // Sandbags at gate
  sandbags(-16 * sc, -1 * sc, 4);

  // Grand steps
  ctx.fillStyle = '#1e2e10';
  ctx.fillRect(-mbw / 2 - 2 * sc, 0, mbw + 4 * sc, 4 * sc);
  ctx.fillRect(-mbw / 2 - 6 * sc, -4 * sc, mbw + 12 * sc, 4 * sc);
  ctx.fillRect(-mbw / 2 - 10 * sc, -8 * sc, mbw + 20 * sc, 4 * sc);

  // Blinking tower lights
  const bl = Math.sin(t * 2.8) > 0;
  ctx.fillStyle = bl ? 'rgba(255,40,40,1)' : 'rgba(255,40,40,0.07)';
  ctx.beginPath();
  ctx.arc(-mbw * 0.3, rfY - 20 * sc, 2.5 * sc, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = 'rgba(180,230,90,0.9)';
  ctx.font = `bold ${9 * sc}px 'Crimson Pro',serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Grand Fortress', 0, h * 0.11);
}