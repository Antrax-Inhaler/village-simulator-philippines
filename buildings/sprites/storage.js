/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/sprites/storage.js

   BODEGA — Level-aware sprite (Lv 1–5)
   ─────────────────────────────────────────────────────────────
   Designs ported from bodega-levels.html.

   Level progression
   ─────────────────────────────────────────────────────────────
   Lv 1  Bodega            — Small gable shed, two barrels
   Lv 2  Pinalaking Bodega — Wider, corrugated roof, dock door,
                             crates & sacks outside
   Lv 3  Bodega Galpong    — Big warehouse: arch roof, two
                             loading bays, forklift, truck
   Lv 4  Distribusyon Sentro — Raised platform, 3 bays, 2F
                             office block, animated windows
   Lv 5  Bodega Kompleks   — 3 warehouse sheds, 3F office
                             tower, full yard with trucks &
                             forklifts, blinking beacon

   Called by buildingSprites.js drawBuilding()
   ─────────────────────────────────────────────────────────────
   export drawSprite(ctx, sc, w, h, def, level, now)
     ctx   — Canvas 2D context already translated to building
             world-origin (isometric ground anchor).
     sc    — perspScale result for this building's depth.
     w     — def.w * sc  (pixel width)
     h     — def.h * sc  (pixel height)
     def   — BUILDING_DEFS.storage entry
     level — 1–5
     now   — performance.now() timestamp (for animation)
═══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   SHARED DRAWING HELPERS
   (all coords are in *canvas pixels* relative to the building
    origin; sc is baked in where needed for line widths)
══════════════════════════════════════════════════════════════ */

/* Solid wall block with left-highlight / right-shadow shading */
function _wall(ctx, x, y, w, h, color, flipShade) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  var sg = ctx.createLinearGradient(x, 0, x + w, 0);
  if (flipShade) {
    sg.addColorStop(0, 'rgba(0,0,0,0.12)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
  } else {
    sg.addColorStop(0, 'rgba(255,255,255,0.05)');
    sg.addColorStop(0.72, 'rgba(0,0,0,0)');
    sg.addColorStop(1, 'rgba(0,0,0,0.16)');
  }
  ctx.fillStyle = sg;
  ctx.fillRect(x, y, w, h);
}

/* Gable / triangular roof */
function _gable(ctx, lx, bY, rw, tipH, color) {
  ctx.fillStyle = color || '#585878';
  ctx.beginPath();
  ctx.moveTo(lx, bY);
  ctx.lineTo(lx + rw / 2, bY - tipH);
  ctx.lineTo(lx + rw, bY);
  ctx.closePath();
  ctx.fill();
  /* ridge highlight */
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.moveTo(lx + rw / 2 - rw * 0.07, bY);
  ctx.lineTo(lx + rw / 2, bY - tipH);
  ctx.lineTo(lx + rw / 2 + rw * 0.07, bY);
  ctx.closePath();
  ctx.fill();
  /* eave shadow strip */
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(lx - 2, bY - 2, rw + 4, 3);
}

/* Flat parapet roof (3-layer cornice) */
function _flatRoof(ctx, x, y, w, c1, c2, c3) {
  ctx.fillStyle = c1 || '#484860';
  ctx.fillRect(x - 2, y - 3, w + 4, 4);
  ctx.fillStyle = c2 || '#505870';
  ctx.fillRect(x - 3, y - 7, w + 6, 5);
  ctx.fillStyle = c3 || '#383850';
  ctx.fillRect(x - 4, y - 9, w + 8, 2.5);
}

/* Wooden barrel */
function _barrel(ctx, cx, cy, r, bh) {
  ctx.fillStyle = 'rgba(100,80,40,0.78)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(cx - r, cy, r * 2, bh);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy + bh, r, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6b4c2a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy + bh * 0.33, r, r * 0.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy + bh * 0.66, r, r * 0.4, 0, 0, Math.PI * 2);
  ctx.stroke();
}

/* Wooden crate with cross-brace markings */
function _crate(ctx, x, y, cw, ch) {
  ctx.fillStyle = '#a07840';
  ctx.fillRect(x, y, cw, ch);
  ctx.strokeStyle = 'rgba(60,35,5,0.45)';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(x, y, cw, ch);
  ctx.beginPath();
  ctx.moveTo(x, y);       ctx.lineTo(x + cw, y + ch);
  ctx.moveTo(x + cw, y); ctx.lineTo(x, y + ch);
  ctx.moveTo(x + cw / 2, y); ctx.lineTo(x + cw / 2, y + ch);
  ctx.moveTo(x, y + ch / 2); ctx.lineTo(x + cw, y + ch / 2);
  ctx.stroke();
}

/* Burlap sack / rice bag */
function _sack(ctx, cx, cy, rx, ry) {
  ctx.fillStyle = '#c8b868';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(80,60,10,0.3)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.5, cy - ry * 0.2);
  ctx.quadraticCurveTo(cx, cy + ry * 0.5, cx + rx * 0.5, cy - ry * 0.2);
  ctx.stroke();
  /* tie string */
  ctx.fillStyle = '#8a7030';
  ctx.fillRect(cx - 2, cy - ry - 2, 4, 3);
}

/* Roll-up loading dock door */
function _dockDoor(ctx, x, y, dw, dh, open) {
  ctx.fillStyle = '#2a2838';
  ctx.fillRect(x, y, dw, dh);
  ctx.strokeStyle = 'rgba(150,140,180,0.12)';
  ctx.lineWidth = 0.7;
  var panels = open ? 2 : 5;
  for (var p = 0; p < panels; p++) {
    ctx.beginPath();
    ctx.moveTo(x, y + p * (dh / panels));
    ctx.lineTo(x + dw, y + p * (dh / panels));
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(150,140,180,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, dw, dh);
  /* handle bar */
  ctx.strokeStyle = 'rgba(200,190,230,0.4)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + dw * 0.3, y + dh * (open ? 0.9 : 0.55));
  ctx.lineTo(x + dw * 0.7, y + dh * (open ? 0.9 : 0.55));
  ctx.stroke();
}

/* Forklift (flip = facing left) */
function _forklift(ctx, x, y, flip) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  /* body */
  ctx.fillStyle = '#f5c020';
  ctx.fillRect(-10, -10, 20, 10);
  /* cab */
  ctx.fillStyle = '#d4a010';
  ctx.fillRect(-10, -14, 12, 4);
  /* windshield */
  ctx.fillStyle = 'rgba(150,200,255,0.4)';
  ctx.fillRect(-9, -13, 10, 3);
  /* mast */
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(10, -10);
  ctx.lineTo(10, -24);
  ctx.stroke();
  /* forks */
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(10, -14); ctx.lineTo(20, -14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10, -11); ctx.lineTo(20, -11); ctx.stroke();
  /* wheels */
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(-6, 0, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6,  0, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/* Roof ventilation dome */
function _roofVent(ctx, cx, cy, r) {
  ctx.fillStyle = '#6a6880';
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0, false);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#888898';
  ctx.fillRect(cx - r, cy - 1, r * 2, 2);
}

/* Delivery truck (flip = facing left) */
function _truck(ctx, x, y, flip) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  /* trailer */
  ctx.fillStyle = '#c0b8d8';
  ctx.fillRect(-28, -14, 28, 14);
  ctx.strokeStyle = 'rgba(80,70,100,0.3)';
  ctx.lineWidth = 0.7;
  ctx.strokeRect(-28, -14, 28, 14);
  /* trailer bands */
  ctx.strokeStyle = 'rgba(80,70,100,0.2)';
  ctx.lineWidth = 0.5;
  [-20, -12, -4].forEach(function(tx) {
    ctx.beginPath(); ctx.moveTo(tx, -14); ctx.lineTo(tx, 0); ctx.stroke();
  });
  /* cab */
  ctx.fillStyle = '#5858a0';
  ctx.fillRect(0, -16, 16, 16);
  /* windshield */
  ctx.fillStyle = 'rgba(180,200,255,0.45)';
  ctx.fillRect(1, -15, 14, 8);
  /* wheels */
  ctx.fillStyle = '#222';
  [-20, -6, 8].forEach(function(wx) {
    ctx.beginPath(); ctx.arc(wx, 0, 3, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = '#666';
  [-20, -6, 8].forEach(function(wx) {
    ctx.beginPath(); ctx.arc(wx, 0, 1.5, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

/* Lit / unlit office window strip */
function _officeWin(ctx, x, y, ww, wh, lit) {
  ctx.fillStyle = '#383848';
  ctx.fillRect(x - 1.5, y - 1.5, ww + 3, wh + 3);
  ctx.fillStyle = lit ? 'rgba(255,240,180,0.7)' : 'rgba(200,200,240,0.5)';
  ctx.fillRect(x, y, ww, wh);
  if (lit) {
    ctx.fillStyle = 'rgba(255,245,200,0.15)';
    ctx.fillRect(x, y, ww, wh * 0.3);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x + ww / 2, y);
  ctx.lineTo(x + ww / 2, y + wh);
  ctx.stroke();
  ctx.fillStyle = '#484858';
  ctx.fillRect(x - 2, y - 3, ww + 4, 2.5);
}

/* Ground shadow ellipse */
function _shadow(ctx, rx, ry) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 3, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* ══════════════════════════════════════════════════════════════
   LEVEL DRAW FUNCTIONS
   All coords are relative to the translated origin at the
   building's isometric ground anchor, matching the h/w
   proportions from BUILDING_DEFS.storage (w:54, h:40).
   sc is used for line-width scaling; w/h are already scaled.
══════════════════════════════════════════════════════════════ */

/* ── Level 1 ── Bodega (simple gable shed) ───────────────── */
function _drawLv1(ctx, sc, w, h) {
  _shadow(ctx, w * 0.62, 5 * sc);

  /* walls */
  ctx.fillStyle = '#a8a8c4';
  ctx.fillRect(-w / 2, -h * 0.55, w, h * 0.67);
  var ws = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  ws.addColorStop(0, 'rgba(0,0,0,0)');
  ws.addColorStop(0.7, 'rgba(0,0,0,0)');
  ws.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = ws;
  ctx.fillRect(-w / 2, -h * 0.55, w, h * 0.67);

  /* gable roof */
  _gable(ctx, -w * 0.58, -h * 0.55, w * 1.16, h * 0.56, '#585878');

  /* door */
  ctx.fillStyle = 'rgba(30,30,60,0.75)';
  ctx.fillRect(-7 * sc, -h * 0.34, 14 * sc, h * 0.34);
  ctx.strokeStyle = 'rgba(150,140,200,0.3)';
  ctx.lineWidth = 0.8 * sc;
  ctx.strokeRect(-7 * sc, -h * 0.34, 14 * sc, h * 0.34);

  /* windows */
  ctx.fillStyle = 'rgba(200,200,240,0.5)';
  ctx.fillRect(-w * 0.38, -h * 0.48, 10 * sc, 8 * sc);
  ctx.fillRect( w * 0.23, -h * 0.48, 10 * sc, 8 * sc);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.7 * sc;
  [-w * 0.38 + 5 * sc, w * 0.23 + 5 * sc].forEach(function(wx) {
    ctx.beginPath(); ctx.moveTo(wx, -h * 0.48); ctx.lineTo(wx, -h * 0.48 + 8 * sc); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx - 5 * sc, -h * 0.48 + 4 * sc); ctx.lineTo(wx + 5 * sc, -h * 0.48 + 4 * sc); ctx.stroke();
  });

  /* barrels beside door */
  _barrel(ctx, -w * 0.1, -h * 0.28, 8 * sc, 10 * sc);
  ctx.strokeStyle = '#6b4c2a'; ctx.lineWidth = 1.5 * sc;
  ctx.beginPath(); ctx.ellipse(-w * 0.1, -h * 0.28, 8 * sc, 3.2 * sc, 0, 0, Math.PI * 2); ctx.stroke();
  _barrel(ctx, w * 0.22, -h * 0.28, 8 * sc, 10 * sc);
  ctx.beginPath(); ctx.ellipse(w * 0.22, -h * 0.28, 8 * sc, 3.2 * sc, 0, 0, Math.PI * 2); ctx.stroke();

  /* name label */
  ctx.fillStyle = 'rgba(200,200,240,0.82)';
  ctx.font = (9 * sc) + 'px serif';
  ctx.textAlign = 'center';
  ctx.fillText('Bodega', 0, h * 0.28);
}

/* ── Level 2 ── Pinalaking Bodega (wider, crates & sacks) ── */
function _drawLv2(ctx, sc, w, h) {
  _shadow(ctx, w * 0.6, 6 * sc);

  _wall(ctx, -w / 2, -h * 0.55, w, h * 0.67, '#a8a8c4', false);

  /* corrugated gable roof */
  _gable(ctx, -w * 0.56, -h * 0.55, w * 1.12, h * 0.52, '#585878');
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-w * 0.56, -h * 0.55);
  ctx.lineTo(0, -h * 1.07);
  ctx.lineTo(w * 0.56, -h * 0.55);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1.2 * sc;
  for (var i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(-w * 0.56 + i * 8 * sc, -h * 0.55);
    ctx.lineTo(-w * 0.56 + i * 8 * sc + 4 * sc, -h);
    ctx.stroke();
  }
  ctx.restore();

  /* ridge cap */
  ctx.fillStyle = '#484860';
  ctx.fillRect(-3 * sc, -h * 1.06, 6 * sc, 4 * sc);

  /* main loading dock door */
  _dockDoor(ctx, -10 * sc, -h * 0.52, 20 * sc, h * 0.52, false);

  /* side window */
  ctx.fillStyle = 'rgba(200,200,240,0.5)';
  ctx.fillRect(-w * 0.44, -h * 0.48, 10 * sc, 8 * sc);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 0.7 * sc;
  ctx.beginPath(); ctx.moveTo(-w * 0.44 + 5 * sc, -h * 0.48); ctx.lineTo(-w * 0.44 + 5 * sc, -h * 0.48 + 8 * sc); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-w * 0.44, -h * 0.44); ctx.lineTo(-w * 0.44 + 10 * sc, -h * 0.44); ctx.stroke();

  /* crates stacked outside right */
  _crate(ctx, w * 0.22, -12 * sc, 14 * sc, 10 * sc);
  _crate(ctx, w * 0.22 + 4 * sc, -22 * sc, 14 * sc, 10 * sc);
  _crate(ctx, w * 0.38, -12 * sc, 12 * sc, 10 * sc);

  /* sacks outside left */
  _sack(ctx, -w * 0.38, -4 * sc, 7 * sc, 5 * sc);
  _sack(ctx, -w * 0.3,  -4 * sc, 7 * sc, 5 * sc);
  _sack(ctx, -w * 0.34, -10 * sc, 7 * sc, 5 * sc);

  /* barrel */
  _barrel(ctx, w * 0.44, -h * 0.28, 6 * sc, 8 * sc);

  /* loading platform */
  ctx.fillStyle = '#4a4858';
  ctx.fillRect(-w * 0.54, -2 * sc, w * 1.08, 4 * sc);

  ctx.fillStyle = 'rgba(200,200,240,0.82)';
  ctx.font = (9 * sc) + 'px serif';
  ctx.textAlign = 'center';
  ctx.fillText('Bodega', 0, h * 0.26);
}

/* ── Level 3 ── Bodega Galpong (warehouse + arch roof) ───── */
function _drawLv3(ctx, sc, w, h) {
  _shadow(ctx, w * 0.58, 7 * sc);

  /* main shed body */
  _wall(ctx, -w / 2, -h * 0.6, w, h * 0.72, '#9898b8', false);

  /* barrel / arch roof */
  ctx.fillStyle = '#585878';
  ctx.beginPath();
  ctx.moveTo(-w * 0.54, -h * 0.6);
  ctx.quadraticCurveTo(0, -h * 1.18, w * 0.54, -h * 0.6);
  ctx.closePath();
  ctx.fill();
  /* corrugation on arch */
  ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.lineWidth = 1.2 * sc;
  for (var i = -6; i <= 6; i++) {
    var ax = i * (w * 0.54 / 6);
    var ay = -h * 0.6 + Math.sqrt(Math.max(0, (w * 0.54) * (w * 0.54) - ax * ax)) * (h * 0.58) / (w * 0.54);
    ctx.beginPath(); ctx.moveTo(ax, -h * 0.6); ctx.lineTo(ax * 0.6, -h * 0.6 - ay * 0.6); ctx.stroke();
  }
  /* highlight strip */
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.moveTo(-w * 0.1, -h * 0.6);
  ctx.quadraticCurveTo(0, -h * 1.18, w * 0.1, -h * 0.6);
  ctx.closePath(); ctx.fill();
  /* eave drip */
  ctx.fillStyle = '#484858';
  ctx.fillRect(-w * 0.56, -h * 0.62, w * 1.12, 3 * sc);

  /* roof vents */
  _roofVent(ctx, -w * 0.2, -h * 0.9, 6 * sc);
  _roofVent(ctx,  w * 0.2, -h * 0.9, 6 * sc);

  /* two loading bays */
  _dockDoor(ctx, -w * 0.38, -h * 0.56, w * 0.3,  h * 0.56, false);
  _dockDoor(ctx,  w * 0.06, -h * 0.56, w * 0.3,  h * 0.56, true);

  /* small office window */
  ctx.fillStyle = 'rgba(200,200,240,0.5)';
  ctx.fillRect(w * 0.38, -h * 0.48, 11 * sc, 9 * sc);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 0.7 * sc;
  ctx.beginPath(); ctx.moveTo(w * 0.38 + 5.5 * sc, -h * 0.48); ctx.lineTo(w * 0.38 + 5.5 * sc, -h * 0.48 + 9 * sc); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w * 0.38, -h * 0.44); ctx.lineTo(w * 0.38 + 11 * sc, -h * 0.44); ctx.stroke();

  /* small side office annex */
  _wall(ctx, w * 0.35, -h * 0.35, w * 0.19, h * 0.35, '#b0b0c8', false);
  ctx.fillStyle = 'rgba(30,28,50,0.8)';
  ctx.fillRect(w * 0.38, -h * 0.3, w * 0.13, h * 0.3);

  /* loading platform */
  ctx.fillStyle = '#4a4858';
  ctx.fillRect(-w * 0.56, -2 * sc, w * 1.12, 5 * sc);
  ctx.fillStyle = '#222228';
  [-w * 0.23, w * 0.12].forEach(function(bx) {
    ctx.fillRect(bx, -2 * sc, w * 0.28, 4 * sc);
  });

  /* forklift in open bay */
  _forklift(ctx, w * 0.18, -3 * sc, true);

  /* stacked goods outside left */
  _crate(ctx, -w * 0.5, -14 * sc, 13 * sc, 10 * sc);
  _crate(ctx, -w * 0.5 + 2 * sc, -24 * sc, 13 * sc, 10 * sc);
  _barrel(ctx, -w * 0.36, -h * 0.3, 6 * sc, 8 * sc);
  _barrel(ctx, -w * 0.28, -h * 0.3, 6 * sc, 8 * sc);
  _sack(ctx, -w * 0.5 + 20 * sc, -5 * sc, 7 * sc, 5 * sc);
  _sack(ctx, -w * 0.5 + 28 * sc, -5 * sc, 7 * sc, 5 * sc);
  _sack(ctx, -w * 0.5 + 24 * sc, -11 * sc, 7 * sc, 5 * sc);

  /* parked truck right */
  _truck(ctx, w * 0.5 + 26 * sc, -3 * sc, true);

  ctx.fillStyle = 'rgba(200,200,240,0.82)';
  ctx.font = (9 * sc) + 'px serif';
  ctx.textAlign = 'center';
  ctx.fillText('Bodega Galpong', 0, h * 0.26);
}

/* ── Level 4 ── Distribusyon Sentro (3 bays + 2F office) ─── */
function _drawLv4(ctx, sc, w, h, now) {
  var t = now * 0.001;
  _shadow(ctx, w * 0.56, 8 * sc);

  /* 2F office block (right) */
  var obW = 30 * sc, obH = 52 * sc;
  _wall(ctx, w / 2 - obW, -obH, obW, obH, '#b0a8c8', false);
  _flatRoof(ctx, w / 2 - obW, -obH, obW);
  /* animated windows */
  _officeWin(ctx, w / 2 - obW + 4 * sc, -obH * 0.82, obW - 8 * sc, 9 * sc, Math.sin(t * 0.38 + 1) > -0.2);
  _officeWin(ctx, w / 2 - obW + 4 * sc, -obH * 0.52, obW - 8 * sc, 9 * sc, Math.sin(t * 0.38 + 2) > -0.2);
  _officeWin(ctx, w / 2 - obW + 4 * sc, -obH * 0.22, obW - 8 * sc, 9 * sc, Math.sin(t * 0.38 + 3) > -0.2);
  /* office sign */
  ctx.fillStyle = '#383848';
  ctx.fillRect(w / 2 - obW + 2 * sc, -obH + 2 * sc, obW - 4 * sc, 8 * sc);
  ctx.fillStyle = 'rgba(200,200,240,0.7)';
  ctx.font = 'bold ' + (5 * sc) + 'px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('OPISINA', w / 2 - obW + obW / 2, -obH + 6 * sc);
  ctx.textBaseline = 'alphabetic';
  /* office door */
  ctx.fillStyle = 'rgba(30,28,52,0.85)';
  ctx.fillRect(w / 2 - obW + obW / 2 - 5 * sc, -obH * 0.35, 10 * sc, obH * 0.35);
  ctx.strokeStyle = 'rgba(150,140,200,0.3)'; ctx.lineWidth = 0.8 * sc;
  ctx.strokeRect(w / 2 - obW + obW / 2 - 5 * sc, -obH * 0.35, 10 * sc, obH * 0.35);

  /* main warehouse body */
  var shW = w - obW + 2 * sc, shH = h * 0.65;
  _wall(ctx, -w / 2, -shH, shW, shH, '#9898b8', false);

  /* arch roof on main shed */
  var archCX = -w / 2 + shW / 2;
  ctx.fillStyle = '#585878';
  ctx.beginPath();
  ctx.moveTo(-w * 0.54, -shH);
  ctx.quadraticCurveTo(archCX, -shH - shH * 0.72, w / 2 - obW + 2 * sc, -shH);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = sc;
  for (var i = -7; i <= 7; i++) {
    var ax2 = archCX + i * (shW * 0.45 / 7);
    ctx.beginPath(); ctx.moveTo(ax2, -shH); ctx.lineTo(ax2 - i * 1.5 * sc, -shH - shH * 0.3); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath();
  ctx.moveTo(archCX - shW * 0.06, -shH);
  ctx.quadraticCurveTo(archCX, -shH - shH * 0.72, archCX + shW * 0.06, -shH);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#484858';
  ctx.fillRect(-w * 0.56, -shH - 2 * sc, shW + 2 * sc, 3 * sc);

  /* roof vents */
  _roofVent(ctx, archCX - shW * 0.22, -shH - shH * 0.42, 7 * sc);
  _roofVent(ctx, archCX + shW * 0.08, -shH - shH * 0.42, 7 * sc);

  /* 3 loading bays */
  var bayW = w * 0.26, bayH = shH;
  _dockDoor(ctx, -w / 2 + 4 * sc,          -bayH, bayW - 4 * sc, bayH, false);
  _dockDoor(ctx, -w / 2 + bayW + 2 * sc,   -bayH, bayW - 4 * sc, bayH, true);
  _dockDoor(ctx, -w / 2 + bayW * 2,         -bayH, bayW - 4 * sc, bayH, false);

  /* raised loading platform */
  ctx.fillStyle = '#3e3c54';
  ctx.fillRect(-w * 0.56, -8 * sc, shW + 4 * sc, 8 * sc);
  ctx.fillStyle = '#4a4858';
  ctx.fillRect(-w * 0.56, -10 * sc, shW + 4 * sc, 3 * sc);
  /* dock bumpers & levelers */
  [bayW * 0.5 - w / 2, bayW * 1.5 - w / 2, bayW * 2.5 - w / 2].forEach(function(bx) {
    ctx.fillStyle = '#282635';
    ctx.fillRect(bx - bayW * 0.38, -7 * sc, bayW * 0.76, 6 * sc);
    ctx.fillStyle = '#555368';
    ctx.fillRect(bx - 10 * sc, -4 * sc, 20 * sc, 3 * sc);
  });

  /* forklifts */
  _forklift(ctx, -w / 2 + bayW * 0.6, -9 * sc, false);
  _forklift(ctx, -w / 2 + bayW * 1.8, -9 * sc, true);

  /* goods area */
  _crate(ctx,  -w * 0.5 + 2 * sc,  -22 * sc, 13 * sc, 10 * sc);
  _crate(ctx,  -w * 0.5 + 2 * sc,  -32 * sc, 13 * sc, 10 * sc);
  _crate(ctx,  -w * 0.5 + 16 * sc, -22 * sc, 13 * sc, 10 * sc);
  _barrel(ctx, -w * 0.5 + 34 * sc, -h * 0.36, 6 * sc, 8 * sc);
  _barrel(ctx, -w * 0.5 + 44 * sc, -h * 0.36, 6 * sc, 8 * sc);
  _sack(ctx,   -w * 0.5 + 58 * sc, -10 * sc, 8 * sc, 5 * sc);
  _sack(ctx,   -w * 0.5 + 66 * sc, -10 * sc, 8 * sc, 5 * sc);
  _sack(ctx,   -w * 0.5 + 62 * sc, -16 * sc, 8 * sc, 5 * sc);

  /* trucks */
  _truck(ctx, -w * 0.5 - 30 * sc, -9 * sc, false);
  _truck(ctx,  w * 0.5 + 8 * sc,  -9 * sc, true);

  ctx.fillStyle = 'rgba(200,200,240,0.82)';
  ctx.font = (9 * sc) + 'px serif';
  ctx.textAlign = 'center';
  ctx.fillText('Distribusyon Sentro', 0, h * 0.22);
}

/* ── Level 5 ── Bodega Kompleks (3 sheds + 3F tower) ─────── */
function _drawLv5(ctx, sc, w, h, now) {
  var t = now * 0.001;
  _shadow(ctx, w * 0.53, 10 * sc);

  /* ── 3F OFFICE TOWER (center-right) ── */
  var otW = 32 * sc, otH1 = 40 * sc, otH2 = 36 * sc, otH3 = 28 * sc;
  var otX = w * 0.18;

  _wall(ctx, otX, -otH1, otW, otH1, '#b0a8c8', false);
  ctx.fillStyle = '#383848'; ctx.fillRect(otX - 2 * sc, -otH1 - 3 * sc, otW + 4 * sc, 4 * sc);
  ctx.fillStyle = '#484858'; ctx.fillRect(otX - 3 * sc, -otH1 - 7 * sc, otW + 6 * sc, 5 * sc);

  _wall(ctx, otX, -otH1 - otH2, otW, otH2, '#b8b0d0', false);
  ctx.fillStyle = '#303040'; ctx.fillRect(otX - 2 * sc, -otH1 - otH2 - 2 * sc, otW + 4 * sc, 4 * sc);
  ctx.fillStyle = '#404050'; ctx.fillRect(otX - 3 * sc, -otH1 - otH2 - 5.5 * sc, otW + 6 * sc, 3.5 * sc);

  _wall(ctx, otX, -otH1 - otH2 - otH3, otW, otH3, '#c0b8d8', false);
  _flatRoof(ctx, otX, -otH1 - otH2 - otH3, otW, '#383848', '#484858', '#282838');

  /* antenna */
  ctx.strokeStyle = '#8888a0'; ctx.lineWidth = 1.2 * sc;
  ctx.beginPath();
  ctx.moveTo(otX + otW * 0.5, -otH1 - otH2 - otH3);
  ctx.lineTo(otX + otW * 0.5, -otH1 - otH2 - otH3 - 22 * sc);
  ctx.stroke();
  ctx.strokeStyle = '#606070'; ctx.lineWidth = 0.8 * sc;
  ctx.beginPath(); ctx.moveTo(otX + otW * 0.5, -otH1 - otH2 - otH3 - 14 * sc); ctx.lineTo(otX + otW * 0.5 - 8 * sc, -otH1 - otH2 - otH3 - 8 * sc); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(otX + otW * 0.5, -otH1 - otH2 - otH3 - 14 * sc); ctx.lineTo(otX + otW * 0.5 + 8 * sc, -otH1 - otH2 - otH3 - 8 * sc); ctx.stroke();
  /* blinking beacon */
  var bl = Math.sin(t * 2.5) > 0;
  ctx.fillStyle = bl ? 'rgba(255,50,50,0.9)' : 'rgba(255,50,50,0.08)';
  ctx.beginPath(); ctx.arc(otX + otW * 0.5, -otH1 - otH2 - otH3 - 22 * sc, 2 * sc, 0, Math.PI * 2); ctx.fill();

  /* office windows per floor */
  _officeWin(ctx, otX + 4 * sc, -otH1 * 0.82, otW - 8 * sc, 9 * sc, Math.sin(t * 0.35 + 1) > -0.2);
  _officeWin(ctx, otX + 4 * sc, -otH1 * 0.5,  otW - 8 * sc, 9 * sc, Math.sin(t * 0.35 + 2) > -0.2);
  _officeWin(ctx, otX + 4 * sc, -otH1 - otH2 * 0.78, otW - 8 * sc, 9 * sc, Math.sin(t * 0.35 + 3) > -0.2);
  _officeWin(ctx, otX + 4 * sc, -otH1 - otH2 * 0.45, otW - 8 * sc, 9 * sc, Math.sin(t * 0.35 + 4) > -0.2);
  _officeWin(ctx, otX + 4 * sc, -otH1 - otH2 - otH3 * 0.72, otW - 8 * sc, 9 * sc, Math.sin(t * 0.35 + 5) > 0);

  /* office sign */
  ctx.fillStyle = '#2a2838';
  ctx.fillRect(otX + 2 * sc, -otH1 + 2 * sc, otW - 4 * sc, 9 * sc);
  ctx.fillStyle = 'rgba(200,200,240,0.75)';
  ctx.font = 'bold ' + (5 * sc) + 'px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('OPISINA', otX + otW / 2, -otH1 + 6.5 * sc);
  ctx.textBaseline = 'alphabetic';

  /* ── 3 WAREHOUSE SHEDS ── */
  var shedW = 48 * sc, shedH = h * 0.65;
  var shedStarts = [-w / 2, -w / 2 + shedW + 2 * sc, -w / 2 + shedW * 2 + 4 * sc];

  shedStarts.forEach(function(sx, si) {
    /* walls */
    _wall(ctx, sx, -shedH, shedW, shedH, '#9898b8', si === 2);
    /* arch roof */
    var archCX2 = sx + shedW / 2;
    ctx.fillStyle = '#585878';
    ctx.beginPath();
    ctx.moveTo(sx, -shedH);
    ctx.quadraticCurveTo(archCX2, -shedH - shedH * 0.72, sx + shedW, -shedH);
    ctx.closePath(); ctx.fill();
    /* corrugation */
    ctx.strokeStyle = 'rgba(0,0,0,0.11)'; ctx.lineWidth = sc;
    for (var ci = -4; ci <= 4; ci++) {
      ctx.beginPath();
      ctx.moveTo(archCX2 + ci * (shedW * 0.42 / 4), -shedH);
      ctx.lineTo(archCX2 + ci * 3 * sc, -shedH - shedH * 0.28);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.moveTo(archCX2 - shedW * 0.06, -shedH);
    ctx.quadraticCurveTo(archCX2, -shedH - shedH * 0.72, archCX2 + shedW * 0.06, -shedH);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#484858';
    ctx.fillRect(sx - 2 * sc, -shedH - 2 * sc, shedW + 4 * sc, 3 * sc);
    /* roof vent */
    _roofVent(ctx, archCX2, -shedH - shedH * 0.42, 6 * sc);
    /* loading bay door */
    _dockDoor(ctx, sx + 6 * sc, -shedH, shedW - 12 * sc, shedH, si === 1);
    /* bay label */
    ctx.fillStyle = 'rgba(200,200,240,0.4)';
    ctx.font = 'bold ' + (6 * sc) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('BAY ' + (si + 1), sx + shedW / 2, -shedH + 8 * sc);
    ctx.textBaseline = 'alphabetic';
  });

  /* ── RAISED PLATFORM ── */
  ctx.fillStyle = '#3e3c54';
  ctx.fillRect(-w * 0.54, -8 * sc, w * 1.08, 8 * sc);
  ctx.fillStyle = '#4a4858';
  ctx.fillRect(-w * 0.54, -10 * sc, w * 1.08, 3 * sc);
  /* dock bumpers */
  shedStarts.forEach(function(sx) {
    ctx.fillStyle = '#282635';
    ctx.fillRect(sx + 4 * sc, -7 * sc, shedW - 10 * sc, 5 * sc);
    ctx.fillStyle = '#555368';
    ctx.fillRect(sx + shedW / 2 - 10 * sc, -4 * sc, 20 * sc, 3 * sc);
  });

  /* ── FORKLIFTS ── */
  _forklift(ctx, shedStarts[0] + shedW * 0.4, -9 * sc, false);
  _forklift(ctx, shedStarts[1] + shedW * 0.55, -9 * sc, true);
  _forklift(ctx, shedStarts[2] + shedW * 0.35, -9 * sc, false);

  /* ── GOODS YARD ── */
  _crate(ctx, -w * 0.52,          -14 * sc, 12 * sc, 10 * sc);
  _crate(ctx, -w * 0.52,          -24 * sc, 12 * sc, 10 * sc);
  _crate(ctx, -w * 0.52 + 14 * sc, -14 * sc, 12 * sc, 10 * sc);
  [-w * 0.36, -w * 0.28, -w * 0.2].forEach(function(bx) {
    _barrel(ctx, bx, -h * 0.35, 5 * sc, 7 * sc);
  });
  [w * 0.44, w * 0.5, w * 0.56].forEach(function(sx2, si2) {
    _sack(ctx, sx2, -5 * sc - si2 * 5 * sc, 7 * sc, 5 * sc);
  });

  /* ── TRUCKS ── */
  _truck(ctx, -w * 0.52 - 32 * sc, -9 * sc, false);
  _truck(ctx,  w * 0.52 + 8 * sc,  -9 * sc, true);
  _truck(ctx,  w * 0.52 + 56 * sc, -9 * sc, true);

  /* ── SECURITY BOOTH ── */
  ctx.fillStyle = '#4a4858';
  ctx.fillRect(-w * 0.54 - 8 * sc, -18 * sc, 10 * sc, 18 * sc);
  ctx.fillStyle = 'rgba(180,180,220,0.4)';
  ctx.fillRect(-w * 0.54 - 7 * sc, -16 * sc, 8 * sc, 8 * sc);
  ctx.fillStyle = '#383848';
  ctx.fillRect(-w * 0.54 - 8 * sc, -19 * sc, 10 * sc, 2 * sc);

  ctx.fillStyle = 'rgba(200,200,240,0.88)';
  ctx.font = 'bold ' + (9 * sc) + 'px serif';
  ctx.textAlign = 'center';
  ctx.fillText('Bodega Kompleks', 0, h * 0.18);
}

/* ══════════════════════════════════════════════════════════════
   EXPORT — master entry point called by buildingSprites.js
══════════════════════════════════════════════════════════════ */
export function drawSprite(ctx, sc, w, h, def, level, now) {
  switch (level) {
    case 1:  _drawLv1(ctx, sc, w, h);           break;
    case 2:  _drawLv2(ctx, sc, w, h);           break;
    case 3:  _drawLv3(ctx, sc, w, h);           break;
    case 4:  _drawLv4(ctx, sc, w, h, now);      break;
    case 5:  _drawLv5(ctx, sc, w, h, now);      break;
    default: _drawLv5(ctx, sc, w, h, now);      break; /* cap at max design */
  }
}
