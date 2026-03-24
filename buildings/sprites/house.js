/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/sprites/house.js

   BAHAY (House) — Level-Aware Sprite
   ─────────────────────────────────────────────────────────────
   Draws a visually distinct building for each upgrade level.
   Canvas context is already translated to the building's world
   origin (centre-bottom of the building footprint) by building.js
   before this function is called.

   LEVEL PROGRESSION
   ─────────────────────────────────────────────────────────────
   Lv 1  Bahay            — Small nipa-style single storey
   Lv 2  Bahay na Bato    — Concrete flat-roof, wider
   Lv 3  Dalawang Palapag — 2-storey concrete
   Lv 4  Bahay may Garahe — 2-storey + attached garage
   Lv 5  Townhouse        — 3-storey rowhouse with rooftop railing

   COORDINATE SYSTEM
   ─────────────────────────────────────────────────────────────
   Origin (0, 0) = centre of the building's ground-level foot.
   Positive Y = downward (into the ground).
   Negative Y = upward (into the sky).
   All measurements are in world-pixels, pre-scaled by sc.

   EXPORTS
   ─────────────────────────────────────────────────────────────
   drawSprite(ctx, sc, w, h, def, level, now)
═══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   ENTRY POINT — dispatch by level
══════════════════════════════════════════════════════════════ */
export function drawSprite(ctx, sc, w, h, def, level, now) {
  var t = now ? now * 0.001 : 0;
  switch (level) {
    case 1:  _drawLv1(ctx, sc, w, h, def, t); break;
    case 2:  _drawLv2(ctx, sc, w, h, def, t); break;
    case 3:  _drawLv3(ctx, sc, w, h, def, t); break;
    case 4:  _drawLv4(ctx, sc, w, h, def, t); break;
    default: _drawLv5(ctx, sc, w, h, def, t); break;  /* Lv5+ */
  }
}

/* ══════════════════════════════════════════════════════════════
   SHARED HELPERS
══════════════════════════════════════════════════════════════ */

/* Simple window — small sash-style */
function _win(ctx, sc, x, y, lit) {
  /* Frame */
  ctx.fillStyle = '#7a7060';
  ctx.fillRect(x - 1.5 * sc, y - 2 * sc, 12 * sc, 2 * sc);
  ctx.fillRect(x - 1.5 * sc, y, 12 * sc, 2 * sc);
  /* Glass */
  ctx.fillStyle = lit ? 'rgba(255,238,170,0.72)' : 'rgba(180,215,230,0.62)';
  ctx.fillRect(x, y, 9 * sc, 7 * sc);
  if (lit) {
    ctx.fillStyle = 'rgba(255,240,180,0.22)';
    ctx.fillRect(x, y, 9 * sc, 2.5 * sc);
  }
  /* Muntins */
  ctx.strokeStyle = 'rgba(80,110,130,0.35)';
  ctx.lineWidth = 0.5 * sc;
  ctx.beginPath();
  ctx.moveTo(x + 4.5 * sc, y); ctx.lineTo(x + 4.5 * sc, y + 7 * sc);
  ctx.moveTo(x, y + 3.5 * sc); ctx.lineTo(x + 9 * sc, y + 3.5 * sc);
  ctx.stroke();
  /* Sill */
  ctx.fillStyle = '#9a9280';
  ctx.fillRect(x - 2 * sc, y + 7 * sc, 13 * sc, 2.5 * sc);
}

/* Arched door */
function _door(ctx, sc, x, dh, color) {
  var dw = 11 * sc;
  ctx.fillStyle = color || 'rgba(50,28,8,0.88)';
  ctx.beginPath();
  ctx.rect(x - dw / 2, -dh, dw, dh);
  ctx.arc(x, -dh, dw / 2, Math.PI, 0, true);
  ctx.fill();
  /* Door panels */
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 0.7 * sc;
  ctx.strokeRect(x - dw / 2 + 2 * sc, -dh + 3 * sc, dw - 4 * sc, dh * 0.4);
  ctx.strokeRect(x - dw / 2 + 2 * sc, -dh + 3 * sc + dh * 0.45, dw - 4 * sc, dh * 0.35);
  /* Knob */
  ctx.fillStyle = '#d4a030';
  ctx.beginPath();
  ctx.arc(x + dw * 0.28, -dh * 0.35, 1.4 * sc, 0, Math.PI * 2);
  ctx.fill();
}

/* Shadow ellipse at ground */
function _shadow(ctx, sc, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 3 * sc, w * 0.58, 4 * sc, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* ══════════════════════════════════════════════════════════════
   LV 1 — Bahay (nipa-style single storey, ~38px wide)
══════════════════════════════════════════════════════════════ */
function _drawLv1(ctx, sc, w, h, def, t) {
  var bw = 36 * sc;   /* body width  */
  var bh = 26 * sc;   /* body height */

  _shadow(ctx, sc, bw);

  /* ── Foundation step */
  ctx.fillStyle = '#b09060';
  ctx.fillRect(-bw * 0.55, -4 * sc, bw * 1.1, 4 * sc);

  /* ── Wall */
  ctx.fillStyle = '#d4a878';
  ctx.fillRect(-bw / 2, -bh, bw, bh);
  /* Light side sheen */
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(-bw / 2, -bh, bw * 0.3, bh);

  /* ── Nipa/cogon roof — wide thatched gable */
  ctx.fillStyle = '#7a4820';
  ctx.beginPath();
  ctx.moveTo(-bw * 0.72, -bh);
  ctx.lineTo(0, -bh - 26 * sc);
  ctx.lineTo(bw * 0.72, -bh);
  ctx.closePath();
  ctx.fill();
  /* Thatch texture lines */
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 0.7 * sc;
  for (var ri = 0; ri < 6; ri++) {
    var ry = -bh - ri * 4 * sc;
    var rx = bw * 0.72 - ri * (bw * 0.72 / 7);
    ctx.beginPath();
    ctx.moveTo(-rx, ry); ctx.lineTo(rx, ry);
    ctx.stroke();
  }
  /* Roof ridge cap */
  ctx.fillStyle = '#5a3010';
  ctx.fillRect(-3 * sc, -bh - 26 * sc, 6 * sc, 4 * sc);

  /* ── Porch posts */
  ctx.fillStyle = '#8b5e2a';
  ctx.fillRect(-bw * 0.45, -bh, 3 * sc, bh);
  ctx.fillRect(bw * 0.42, -bh, 3 * sc, bh);

  /* ── Door */
  _door(ctx, sc, 0, bh * 0.7, 'rgba(50,24,6,0.9)');

  /* ── Window */
  _win(ctx, sc, bw * 0.2, -bh + bh * 0.22, Math.sin(t * 0.5) > 0.4);

  /* ── Label */
  ctx.fillStyle = 'rgba(255,220,140,0.75)';
  ctx.font = (9 * sc) + 'px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('Bahay', 0, 8 * sc);
}

/* ══════════════════════════════════════════════════════════════
   LV 2 — Bahay na Bato (concrete flat-roof, same width, taller)
══════════════════════════════════════════════════════════════ */
function _drawLv2(ctx, sc, w, h, def, t) {
  var bw = 44 * sc;
  var bh = 32 * sc;

  _shadow(ctx, sc, bw);

  /* Foundation */
  ctx.fillStyle = '#8a8878';
  ctx.fillRect(-bw * 0.52, -5 * sc, bw * 1.04, 5 * sc);

  /* Wall — concrete grey-beige */
  ctx.fillStyle = '#c8c0a8';
  ctx.fillRect(-bw / 2, -bh, bw, bh);
  /* Render shading */
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  ctx.fillRect(bw * 0.3, -bh, bw * 0.2, bh);

  /* Flat roof with parapet */
  ctx.fillStyle = '#909088';
  ctx.fillRect(-bw * 0.54, -bh - 5 * sc, bw * 1.08, 6 * sc);
  /* Parapet top edge */
  ctx.fillStyle = '#a8a898';
  ctx.fillRect(-bw * 0.54, -bh - 5 * sc, bw * 1.08, 2 * sc);

  /* Water tank on roof */
  ctx.fillStyle = '#5a5a58';
  ctx.beginPath();
  ctx.ellipse(bw * 0.28, -bh - 12 * sc, 7 * sc, 9 * sc, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a7a78'; ctx.lineWidth = 0.8 * sc;
  ctx.beginPath(); ctx.ellipse(bw * 0.28, -bh - 8 * sc, 7 * sc, 2.5 * sc, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(bw * 0.28, -bh - 13 * sc, 7 * sc, 2 * sc, 0, 0, Math.PI * 2); ctx.stroke();

  /* Door */
  _door(ctx, sc, -bw * 0.15, bh * 0.72, 'rgba(40,20,5,0.88)');

  /* Windows */
  _win(ctx, sc, bw * 0.12, -bh + bh * 0.20, Math.sin(t * 0.45) > 0);
  _win(ctx, sc, -bw * 0.45, -bh + bh * 0.20, Math.sin(t * 0.45 + 1.2) > 0.3);

  /* Fence post detail */
  ctx.fillStyle = '#a89878';
  ctx.fillRect(-bw * 0.52, -6 * sc, bw * 1.04, 3 * sc);

  /* Label */
  ctx.fillStyle = 'rgba(255,225,155,0.70)';
  ctx.font = (9 * sc) + 'px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('Bahay na Bato', 0, 8 * sc);
}

/* ══════════════════════════════════════════════════════════════
   LV 3 — Dalawang Palapag (2-storey concrete)
══════════════════════════════════════════════════════════════ */
function _drawLv3(ctx, sc, w, h, def, t) {
  var bw = 50 * sc;
  var flH = 30 * sc;   /* per-floor height */

  _shadow(ctx, sc, bw);

  /* Foundation */
  ctx.fillStyle = '#888070';
  ctx.fillRect(-bw * 0.54, -6 * sc, bw * 1.08, 6 * sc);

  /* Ground floor */
  ctx.fillStyle = '#c0b898';
  ctx.fillRect(-bw / 2, -flH, bw, flH);

  /* 2nd floor — slightly lighter */
  ctx.fillStyle = '#cac2a8';
  ctx.fillRect(-bw / 2, -flH * 2 - 4 * sc, bw, flH);

  /* Floor band */
  ctx.fillStyle = '#787060';
  ctx.fillRect(-bw / 2 - 2 * sc, -flH - 2 * sc, bw + 4 * sc, 5 * sc);

  /* Flat roof + parapet */
  ctx.fillStyle = '#888078';
  ctx.fillRect(-bw * 0.54, -flH * 2 - 4 * sc - 5 * sc, bw * 1.08, 6 * sc);
  /* Water tank */
  ctx.fillStyle = '#4a4a48';
  ctx.beginPath();
  ctx.ellipse(-bw * 0.25, -flH * 2 - 4 * sc - 14 * sc, 7 * sc, 10 * sc, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6a6a68'; ctx.lineWidth = 0.7 * sc;
  ctx.beginPath(); ctx.ellipse(-bw * 0.25, -flH * 2 - 4 * sc - 10 * sc, 7 * sc, 2.5 * sc, 0, 0, Math.PI * 2); ctx.stroke();

  /* Door */
  _door(ctx, sc, 0, flH * 0.78, 'rgba(38,18,4,0.9)');

  /* GF windows */
  _win(ctx, sc, bw * 0.18, -flH + flH * 0.2, true);

  /* 2F windows */
  _win(ctx, sc, -bw * 0.42, -flH * 2 - 4 * sc + flH * 0.2, Math.sin(t * 0.4 + 1) > 0);
  _win(ctx, sc, bw * 0.18, -flH * 2 - 4 * sc + flH * 0.2, Math.sin(t * 0.4 + 2) > 0);

  /* Balcony railing on 2F */
  ctx.strokeStyle = '#9a9080'; ctx.lineWidth = 1.2 * sc;
  ctx.strokeRect(-bw / 2 - 2 * sc, -flH - 2 * sc, bw + 4 * sc, -8 * sc);
  for (var bi = -3; bi <= 3; bi++) {
    ctx.beginPath();
    ctx.moveTo(bi * (bw / 7), -flH - 2 * sc);
    ctx.lineTo(bi * (bw / 7), -flH - 10 * sc);
    ctx.stroke();
  }

  /* Label */
  ctx.fillStyle = 'rgba(255,225,155,0.70)';
  ctx.font = (9 * sc) + 'px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('Dalawang Palapag', 0, 8 * sc);
}

/* ══════════════════════════════════════════════════════════════
   LV 4 — Bahay may Garahe (2-storey + garage wing)
══════════════════════════════════════════════════════════════ */
function _drawLv4(ctx, sc, w, h, def, t) {
  var hW = 46 * sc;   /* main house width  */
  var flH = 30 * sc;
  var gW = 22 * sc;   /* garage width */
  var gH = 22 * sc;   /* garage height */
  var gX = -hW / 2 - gW + 2 * sc;   /* garage left edge */

  _shadow(ctx, sc, hW + gW);

  /* ── Garage wing */
  /* Garage wall */
  ctx.fillStyle = '#b8b0a0';
  ctx.fillRect(gX, -gH, gW, gH);
  /* Garage flat roof */
  ctx.fillStyle = '#868078';
  ctx.fillRect(gX - 2 * sc, -gH - 4 * sc, gW + 2 * sc, 5 * sc);
  /* Garage door — roller shutter style */
  ctx.fillStyle = 'rgba(30,28,24,0.82)';
  ctx.fillRect(gX + 3 * sc, -gH + 2 * sc, gW - 6 * sc, gH - 2 * sc);
  /* Shutter lines */
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 0.8 * sc;
  for (var gi = 1; gi <= 5; gi++) {
    ctx.beginPath();
    ctx.moveTo(gX + 3 * sc, -gH + 2 * sc + gi * (gH / 6));
    ctx.lineTo(gX + gW - 3 * sc, -gH + 2 * sc + gi * (gH / 6));
    ctx.stroke();
  }
  /* Car inside (silhouette) */
  ctx.fillStyle = 'rgba(60,80,120,0.35)';
  ctx.fillRect(gX + 4 * sc, -14 * sc, 16 * sc, 11 * sc);
  ctx.fillStyle = 'rgba(60,80,120,0.22)';
  ctx.beginPath(); ctx.ellipse(gX + 12 * sc, -14 * sc, 8 * sc, 4 * sc, -0.1, Math.PI, 0, true); ctx.fill();

  /* ── Main house — 2 storeys */
  ctx.fillStyle = '#c8bea8';
  ctx.fillRect(-hW / 2, -flH, hW, flH);
  ctx.fillStyle = '#d0c8b0';
  ctx.fillRect(-hW / 2, -flH * 2 - 4 * sc, hW, flH);

  /* Floor band */
  ctx.fillStyle = '#6e6658';
  ctx.fillRect(-hW / 2 - 2 * sc, -flH - 2 * sc, hW + 4 * sc, 5 * sc);

  /* Flat roof */
  ctx.fillStyle = '#808070';
  ctx.fillRect(-hW * 0.52, -flH * 2 - 4 * sc - 5 * sc, hW * 1.04, 6 * sc);

  /* Door */
  _door(ctx, sc, hW * 0.08, flH * 0.78, 'rgba(35,16,4,0.92)');

  /* GF window */
  _win(ctx, sc, hW * 0.18, -flH + flH * 0.2, false);

  /* 2F windows */
  _win(ctx, sc, -hW * 0.4, -flH * 2 - 4 * sc + flH * 0.2, Math.sin(t * 0.45 + 1) > 0);
  _win(ctx, sc, hW * 0.18, -flH * 2 - 4 * sc + flH * 0.2, Math.sin(t * 0.45 + 2) > 0);

  /* Balcony */
  ctx.strokeStyle = '#9a9080'; ctx.lineWidth = 1 * sc;
  ctx.strokeRect(-hW / 2 - 2 * sc, -flH - 2 * sc, hW + 4 * sc, -8 * sc);
  for (var bj = -3; bj <= 3; bj++) {
    ctx.beginPath();
    ctx.moveTo(bj * (hW / 7), -flH - 2 * sc);
    ctx.lineTo(bj * (hW / 7), -flH - 10 * sc);
    ctx.stroke();
  }

  /* Street lamp */
  ctx.strokeStyle = '#585856'; ctx.lineWidth = 1 * sc;
  ctx.beginPath(); ctx.moveTo(-hW * 0.6, 0); ctx.lineTo(-hW * 0.6, -30 * sc); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-hW * 0.6, -30 * sc); ctx.lineTo(-hW * 0.6 - 6 * sc, -30 * sc); ctx.stroke();
  ctx.fillStyle = 'rgba(255,220,100,0.9)';
  ctx.beginPath(); ctx.arc(-hW * 0.6 - 6 * sc, -30 * sc, 2 * sc, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,220,100,0.12)';
  ctx.beginPath(); ctx.arc(-hW * 0.6 - 6 * sc, -30 * sc, 8 * sc, 0, Math.PI * 2); ctx.fill();

  /* Label */
  ctx.fillStyle = 'rgba(255,225,155,0.70)';
  ctx.font = (8.5 * sc) + 'px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('Bahay may Garahe', 0, 8 * sc);
}

/* ══════════════════════════════════════════════════════════════
   LV 5 — Townhouse (3-storey rowhouse)
══════════════════════════════════════════════════════════════ */
function _drawLv5(ctx, sc, w, h, def, t) {
  var bw = 60 * sc;
  var flH = 28 * sc;

  _shadow(ctx, sc, bw);

  /* Foundation */
  ctx.fillStyle = '#4e4e4c';
  ctx.fillRect(-bw / 2 - 3 * sc, -5 * sc, bw + 6 * sc, 5 * sc);

  /* 3 floors */
  var floorColors = ['#bdbab0', '#c5c2b8', '#cac7be'];
  for (var fi = 0; fi < 3; fi++) {
    ctx.fillStyle = floorColors[fi];
    ctx.fillRect(-bw / 2, -flH * (fi + 1) - fi * 4 * sc, bw, flH);
    /* Side-shading gradient */
    var sg = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0.02)');
    sg.addColorStop(0.8, 'rgba(0,0,0,0)');
    sg.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = sg;
    ctx.fillRect(-bw / 2, -flH * (fi + 1) - fi * 4 * sc, bw, flH);
  }

  /* Floor bands */
  ctx.fillStyle = '#686858';
  ctx.fillRect(-bw / 2 - 2 * sc, -flH - 2 * sc, bw + 4 * sc, 4 * sc);
  ctx.fillRect(-bw / 2 - 2 * sc, -flH * 2 - 6 * sc, bw + 4 * sc, 4 * sc);

  /* Rooftop parapet */
  var rfY = -flH * 3 - 8 * sc;
  ctx.fillStyle = '#7a7868';
  ctx.fillRect(-bw / 2 - 2 * sc, rfY - 3 * sc, bw + 4 * sc, 4 * sc);
  ctx.fillStyle = '#868778';
  ctx.fillRect(-bw / 2 - 3 * sc, rfY - 7 * sc, bw + 6 * sc, 5 * sc);
  ctx.fillStyle = '#585848';
  ctx.fillRect(-bw / 2 - 4 * sc, rfY - 9 * sc, bw + 8 * sc, 2.5 * sc);

  /* Rooftop railing posts */
  ctx.strokeStyle = '#4e4e3e'; ctx.lineWidth = 0.8 * sc;
  for (var ri2 = -4; ri2 <= 4; ri2++) {
    ctx.beginPath();
    ctx.moveTo(ri2 * 8 * sc, rfY - 3 * sc);
    ctx.lineTo(ri2 * 8 * sc, rfY - 12 * sc);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-bw / 2, rfY - 12 * sc); ctx.lineTo(bw / 2, rfY - 12 * sc);
  ctx.stroke();

  /* AC units on 2F ledge */
  ctx.fillStyle = '#888';
  ctx.fillRect(-bw / 2 + 4 * sc, -flH * 2 - 6 * sc + flH * 0.7, 11 * sc, 6 * sc);
  ctx.fillRect(bw / 2 - 16 * sc, -flH * 2 - 6 * sc + flH * 0.7, 11 * sc, 6 * sc);
  /* AC vents */
  ctx.strokeStyle = '#666'; ctx.lineWidth = 0.5 * sc;
  for (var ai = 0; ai < 3; ai++) {
    ctx.beginPath();
    ctx.moveTo(-bw / 2 + 5 * sc, -flH * 2 - 6 * sc + flH * 0.7 + ai * 2 * sc + 1 * sc);
    ctx.lineTo(-bw / 2 + 14 * sc, -flH * 2 - 6 * sc + flH * 0.7 + ai * 2 * sc + 1 * sc);
    ctx.stroke();
  }

  /* Windows — per floor */
  function win5(x, y, lit) {
    ctx.fillStyle = '#545252';
    ctx.fillRect(x - 2 * sc, y - 2 * sc, 13 * sc, 11 * sc);
    ctx.fillStyle = lit ? 'rgba(255,240,175,0.72)' : 'rgba(165,215,235,0.65)';
    ctx.fillRect(x, y, 9 * sc, 7 * sc);
    if (lit) { ctx.fillStyle = 'rgba(255,240,180,0.15)'; ctx.fillRect(x, y, 9 * sc, 2.5 * sc); }
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 0.7 * sc;
    ctx.beginPath(); ctx.moveTo(x + 4.5 * sc, y); ctx.lineTo(x + 4.5 * sc, y + 7 * sc); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + 3.2 * sc); ctx.lineTo(x + 9 * sc, y + 3.2 * sc); ctx.stroke();
    ctx.fillStyle = 'rgba(50,45,35,0.7)';
    ctx.fillRect(x - 2 * sc, y - 4 * sc, 13 * sc, 3 * sc);
  }
  /* GF */
  win5(-bw / 2 + 6 * sc, -flH + flH * 0.22, true);
  win5(bw / 2 - 18 * sc, -flH + flH * 0.22, true);
  /* 2F */
  win5(-bw / 2 + 6 * sc, -flH * 2 - 6 * sc + flH * 0.22, Math.sin(t * 0.38 + 1) > 0.05);
  win5(bw / 2 - 18 * sc, -flH * 2 - 6 * sc + flH * 0.22, Math.sin(t * 0.38 + 2) > 0.05);
  /* 3F */
  win5(-bw / 2 + 6 * sc, rfY + flH * 0.22, Math.sin(t * 0.38 + 3) > 0);
  win5(bw / 2 - 18 * sc, rfY + flH * 0.22, Math.sin(t * 0.38 + 4) > 0);

  /* Door */
  ctx.fillStyle = '#2c2c2c';
  ctx.fillRect(-8 * sc, -flH + 2 * sc, 16 * sc, flH - 2 * sc);
  ctx.fillStyle = 'rgba(255,220,140,0.18)';
  ctx.fillRect(-7 * sc, -flH + 3 * sc, 14 * sc, flH - 4 * sc);
  ctx.strokeStyle = 'rgba(200,200,200,0.09)'; ctx.lineWidth = 0.7 * sc;
  ctx.strokeRect(-8 * sc, -flH + 2 * sc, 16 * sc, flH - 2 * sc);
  ctx.strokeStyle = 'rgba(150,150,150,0.18)'; ctx.lineWidth = 0.6 * sc;
  ctx.beginPath(); ctx.moveTo(0, -flH + 2 * sc); ctx.lineTo(0, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-8 * sc, -flH * 0.5); ctx.lineTo(8 * sc, -flH * 0.5); ctx.stroke();
  /* Door knob */
  ctx.fillStyle = '#d4c000';
  ctx.beginPath(); ctx.arc(6 * sc, -flH * 0.3, 1.5 * sc, 0, Math.PI * 2); ctx.fill();

  /* Label */
  ctx.fillStyle = 'rgba(255,225,155,0.70)';
  ctx.font = (9 * sc) + 'px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('Townhouse', 0, 8 * sc);
}