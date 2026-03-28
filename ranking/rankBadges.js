// FILE: ranking/rankBadges.js (with transparent backgrounds)
/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — Rank Badge Drawer (Transparent Backgrounds)
   Beautiful animated badges with transparent backgrounds
═══════════════════════════════════════════════════════════════ */

const S = 160; // Badge canvas size

// Utility functions
function rad(d) { return d * Math.PI / 180; }

function polygon(ctx, cx, cy, r, n, rot) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    let a = rad(rot + i * (360 / n));
    if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

function star(ctx, cx, cy, r1, r2, pts, rot) {
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    let a = rad(rot + i * (180 / pts));
    let r = i % 2 === 0 ? r1 : r2;
    if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

function shield(ctx, cx, cy, w, h) {
  let x = cx, y = cy;
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x + w / 2, y - h / 2 + h * 0.1);
  ctx.lineTo(x + w / 2, y + h * 0.12);
  ctx.quadraticCurveTo(x + w / 2, y + h / 2, x, y + h / 2);
  ctx.quadraticCurveTo(x - w / 2, y + h / 2, x - w / 2, y + h * 0.12);
  ctx.lineTo(x - w / 2, y - h / 2 + h * 0.1);
  ctx.closePath();
}

function diamond(ctx, cx, cy, w, h) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + h / 2);
  ctx.lineTo(cx - w / 2, cy);
  ctx.closePath();
}

function glowRing(ctx, cx, cy, r, col, alpha, lw) {
  ctx.save();
  ctx.globalAlpha = alpha || 0.4;
  ctx.strokeStyle = col;
  ctx.lineWidth = lw || 1.5;
  ctx.shadowColor = col;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function innerPanel(ctx, cx, cy, r, bg, rimCol) {
  // Make background more transparent - use radial gradient that fades to fully transparent
  let ig = ctx.createRadialGradient(cx, cy - r * 0.3, r * 0.05, cx, cy, r);
  ig.addColorStop(0, bg + 'cc');  // Slightly more opaque at center
  ig.addColorStop(0.7, bg + '66'); // More transparent towards edge
  ig.addColorStop(1, 'rgba(0,0,0,0)'); // Fully transparent at outer edge
  ctx.fillStyle = ig;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rimCol;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.4;  // More transparent rim
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawNumeral(ctx, cx, cy, text, col, shadowCol, sz) {
  sz = sz || 30;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + sz + 'px "Bebas Neue", sans-serif';
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillText(text, cx + 1.5, cy + 2);
  ctx.globalAlpha = 0.9;
  ctx.shadowColor = shadowCol;
  ctx.shadowBlur = 16;
  ctx.fillStyle = col;
  ctx.fillText(text, cx, cy);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.fillStyle = col;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

function shimmer(ctx, cx, cy, radius, t, col) {
  let phase = (t * 0.4) % 1;
  let sx = cx - radius + phase * radius * 2.5;
  let sg = ctx.createLinearGradient(sx - 30, cy - radius, sx + 30, cy + radius);
  sg.addColorStop(0, 'rgba(255,255,255,0)');
  sg.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = sg;
  ctx.fillRect(sx - 30, cy - radius, 60, radius * 2);
  ctx.restore();
}

function gloss(ctx, cx, cy, w, h) {
  let g = ctx.createRadialGradient(cx - w * 0.1, cy - h * 0.25, 0, cx, cy, h * 0.7);
  g.addColorStop(0, 'rgba(255,255,255,0.22)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.06)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy - h * 0.15, w * 0.45, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
}

function laurel(ctx, cx, cy, r, side, col, nLeaves) {
  nLeaves = nLeaves || 9;
  let spread = 20;
  let base = side < 0 ? 190 : 350;
  ctx.save();
  ctx.strokeStyle = col;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, rad(side < 0 ? 190 : 10), rad(side < 0 ? 350 : 170), side < 0);
  ctx.stroke();
  ctx.restore();
  for (let i = 0; i < nLeaves; i++) {
    let frac = i / (nLeaves - 1);
    let angle = rad(base + i * (side < 0 ? -spread : spread));
    let lx = cx + Math.cos(angle) * r, ly = cy + Math.sin(angle) * r;
    let leafAngle = angle + Math.PI / 2;
    ctx.save();
    ctx.globalAlpha = 0.55 + frac * 0.25;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 4.8, 2.4, leafAngle, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(lx - Math.cos(leafAngle) * 4, ly - Math.sin(leafAngle) * 4);
    ctx.lineTo(lx + Math.cos(leafAngle) * 4, ly + Math.sin(leafAngle) * 4);
    ctx.stroke();
    ctx.restore();
  }
}

function crown(ctx, cx, cy, sz, bodyCol, highlightCol, gems) {
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + sz * 0.6, sz * 0.9, sz * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = bodyCol;
  ctx.fillRect(cx - sz, cy, sz * 2, sz * 0.45);
  ctx.fillStyle = highlightCol;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(cx - sz, cy, sz * 2, sz * 0.12);
  ctx.globalAlpha = 1;
  let spires = [[0, -sz], [sz * 0.55, -sz * 0.75], [sz, -sz * 0.4], [-sz, -sz * 0.4], [-sz * 0.55, -sz * 0.75]];
  spires.forEach(function(sp, si) {
    ctx.fillStyle = bodyCol;
    ctx.beginPath();
    let bx = cx + sp[0];
    ctx.moveTo(bx - sz * 0.18, cy);
    ctx.lineTo(bx + sz * 0.18, cy);
    ctx.lineTo(bx + sz * (si === 0 ? 0.07 : 0.05), cy + sp[1]);
    ctx.lineTo(bx - (si === 0 ? sz * 0.07 : sz * 0.05), cy + sp[1]);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = highlightCol;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(bx - sz * 0.04, cy);
    ctx.lineTo(bx, cy + sp[1]);
    ctx.lineTo(bx + sz * 0.04, cy);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    if (si === 0) {
      let tipGrad = ctx.createRadialGradient(bx, cy + sp[1], 0, bx, cy + sp[1], sz * 0.12);
      tipGrad.addColorStop(0, '#ffffff');
      tipGrad.addColorStop(1, highlightCol);
      ctx.fillStyle = tipGrad;
      ctx.beginPath();
      ctx.arc(bx, cy + sp[1], sz * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  if (gems) {
    gems.forEach(function(gc, gi) {
      let gx = cx + (gi - Math.floor(gems.length / 2)) * sz * 0.5;
      let gr = ctx.createRadialGradient(gx, cy + sz * 0.2, 0, gx, cy + sz * 0.2, sz * 0.18);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(0.4, gc);
      gr.addColorStop(1, gc + '88');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(gx, cy + sz * 0.2, sz * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(gx, cy + sz * 0.2, sz * 0.17, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
  ctx.strokeStyle = highlightCol;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(cx - sz, cy + sz * 0.08);
  ctx.lineTo(cx + sz, cy + sz * 0.08);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function orbitDots(ctx, cx, cy, r, n, speed, t, col, dotR) {
  for (let i = 0; i < n; i++) {
    let a = rad(i * (360 / n) + t * speed);
    let alpha = 0.4 + Math.sin(t * 2 + i) * 0.25;
    ctx.fillStyle = col.replace(')', ',' + alpha + ')').replace('rgb', 'rgba');
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, dotR || 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function pulseAura(ctx, cx, cy, r, col, t) {
  let pulse = 0.06 + Math.sin(t * 2) * 0.04;
  let pg = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.4);
  pg.addColorStop(0, 'rgba(0,0,0,0)');
  pg.addColorStop(0.7, col.replace(')', ',' + pulse + ')').replace('rgb', 'rgba'));
  pg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2);
  ctx.fill();
}

// All draw functions now have transparent backgrounds - no ctx.fillRect backgrounds

function drawRank1(ctx, w, h, now) {
  let cx = w / 2, cy = h / 2, t = now * 0.001;
  
  pulseAura(ctx, cx, cy, 64, 'rgb(154,160,180)', t);
  glowRing(ctx, cx, cy, 70, '#5a6070', 0.12 + Math.sin(t * 1.5) * 0.04, 12);
  polygon(ctx, cx, cy, 64, 5, -90);
  let pg = ctx.createLinearGradient(cx - 20, cy - 64, cx + 20, cy + 64);
  pg.addColorStop(0, '#44484e');
  pg.addColorStop(0.3, '#3a3e46');
  pg.addColorStop(0.7, '#282c34');
  pg.addColorStop(1, '#1e2028');
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.strokeStyle = '#70788a';
  ctx.lineWidth = 3;
  ctx.stroke();
  polygon(ctx, cx, cy, 52, 5, -90);
  ctx.strokeStyle = 'rgba(154,160,176,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
  innerPanel(ctx, cx, cy, 32, '#1e222a', '#7a8090');
  ctx.fillStyle = '#7a8090';
  ctx.fillRect(cx - 12, cy - 3, 24, 6);
  ctx.fillRect(cx - 3, cy - 14, 6, 28);
  ctx.fillRect(cx - 12, cy + 9, 24, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(cx - 12, cy - 3, 24, 2.5);
  ctx.fillRect(cx - 3, cy - 14, 2.5, 28);
  shimmer(ctx, cx, cy, 64, t, '#aaa');
  gloss(ctx, cx, cy, 64, 64);
  drawNumeral(ctx, cx, cy + 2, 'I', '#b0b8c8', '#9aa0b0', 32);
}

function drawRank2(ctx, w, h, now) {
  let cx = w / 2, cy = h / 2, t = now * 0.001;
  
  pulseAura(ctx, cx, cy, 66, 'rgb(208,168,104)', t);
  glowRing(ctx, cx, cy, 72, '#8a5a20', 0.15 + Math.sin(t * 1.8) * 0.05, 14);
  polygon(ctx, cx, cy, 66, 6, 0);
  let hg = ctx.createLinearGradient(cx - 30, cy - 66, cx + 30, cy + 66);
  hg.addColorStop(0, '#6a4020');
  hg.addColorStop(0.25, '#5a3418');
  hg.addColorStop(0.6, '#3a2010');
  hg.addColorStop(1, '#241408');
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.strokeStyle = '#c08040';
  ctx.lineWidth = 3;
  ctx.stroke();
  polygon(ctx, cx, cy, 58, 6, 0);
  ctx.strokeStyle = 'rgba(200,150,70,0.3)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  innerPanel(ctx, cx, cy, 34, '#1e1008', '#c09050');
  ctx.fillStyle = '#e0b060';
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 18);
  ctx.lineTo(cx + 10, cy - 4);
  ctx.lineTo(cx + 5, cy - 4);
  ctx.lineTo(cx + 5, cy + 14);
  ctx.lineTo(cx - 5, cy + 14);
  ctx.lineTo(cx - 5, cy - 4);
  ctx.lineTo(cx - 10, cy - 4);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  shimmer(ctx, cx, cy, 66, t, '#c08040');
  gloss(ctx, cx, cy, 66, 66);
  drawNumeral(ctx, cx, cy + 4, 'II', '#f0c870', '#d0a040', 30);
}

function drawRank3(ctx, w, h, now) {
  let cx = w / 2, cy = h / 2, t = now * 0.001;
  
  pulseAura(ctx, cx, cy, 67, 'rgb(184,208,224)', t);
  glowRing(ctx, cx, cy, 74, '#8098b0', 0.14 + Math.sin(t * 1.3) * 0.04, 14);
  polygon(ctx, cx, cy, 67, 7, -90);
  let sg = ctx.createLinearGradient(cx - 20, cy - 67, cx + 20, cy + 67);
  sg.addColorStop(0, '#505a68');
  sg.addColorStop(0.2, '#424c5a');
  sg.addColorStop(0.5, '#343e4c');
  sg.addColorStop(0.8, '#262e3a');
  sg.addColorStop(1, '#1a2230');
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.strokeStyle = '#a0b8cc';
  ctx.lineWidth = 3;
  ctx.stroke();
  polygon(ctx, cx, cy, 60, 7, -90);
  ctx.strokeStyle = 'rgba(160,184,204,0.3)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  innerPanel(ctx, cx, cy, 35, '#16202a', '#90a8bc');
  ctx.fillStyle = '#b0c8dc';
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 18);
  ctx.lineTo(cx + 12, cy - 14);
  ctx.lineTo(cx + 12, cy + 2);
  ctx.quadraticCurveTo(cx + 12, cy + 16, cx, cy + 16);
  ctx.quadraticCurveTo(cx - 12, cy + 16, cx - 12, cy + 2);
  ctx.lineTo(cx - 12, cy - 14);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  shimmer(ctx, cx, cy, 67, t, '#a0b8cc');
  gloss(ctx, cx, cy, 67, 67);
  drawNumeral(ctx, cx, cy + 4, 'III', '#d8eaf4', '#a0b8cc', 26);
}

function drawRank4(ctx, w, h, now) {
  let cx = w / 2, cy = h / 2, t = now * 0.001;
  
  pulseAura(ctx, cx, cy, 68, 'rgb(245,200,66)', t);
  glowRing(ctx, cx, cy, 78, '#d4a820', 0.1, 1);
  polygon(ctx, cx, cy, 68, 8, 22.5);
  let og = ctx.createLinearGradient(cx - 30, cy - 68, cx + 30, cy + 68);
  og.addColorStop(0, '#6a4808');
  og.addColorStop(0.2, '#5a3c08');
  og.addColorStop(0.5, '#3e2a06');
  og.addColorStop(0.8, '#2c1e04');
  og.addColorStop(1, '#1e1402');
  ctx.fillStyle = og;
  ctx.fill();
  ctx.strokeStyle = '#e8b030';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  polygon(ctx, cx, cy, 61, 8, 22.5);
  ctx.strokeStyle = 'rgba(240,190,60,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  star(ctx, cx, cy, 50, 22, 4, -45);
  ctx.strokeStyle = 'rgba(240,190,60,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(240,190,60,0.05)';
  ctx.fill();
  innerPanel(ctx, cx, cy, 36, '#1e1604', '#e8b030');
  laurel(ctx, cx, cy + 6, 28, -1, '#b89028', 10);
  laurel(ctx, cx, cy + 6, 28, 1, '#b89028', 10);
  star(ctx, cx, cy - 2, 16, 8, 5, -90);
  let sg2 = ctx.createRadialGradient(cx, cy - 8, 0, cx, cy, 16);
  sg2.addColorStop(0, '#fff8c0');
  sg2.addColorStop(1, '#d4a020');
  ctx.fillStyle = sg2;
  ctx.fill();
  ctx.strokeStyle = '#fff0a0';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  shimmer(ctx, cx, cy, 68, t, '#e8b030');
  gloss(ctx, cx, cy, 68, 68);
  drawNumeral(ctx, cx, cy + 10, 'IV', '#fff8c0', '#f5c842', 28);
}

function drawRank5(ctx, w, h, now) {
  let cx = w / 2, cy = h / 2 + 4, t = now * 0.001;
  
  pulseAura(ctx, cx, cy, 56, 'rgb(112,176,255)', t);
  shield(ctx, cx, cy, 108, 114);
  let shg = ctx.createLinearGradient(cx - 54, cy - 57, cx + 54, cy + 57);
  shg.addColorStop(0, '#1e3060');
  shg.addColorStop(0.3, '#162448');
  shg.addColorStop(0.7, '#0e1830');
  shg.addColorStop(1, '#080e20');
  ctx.fillStyle = shg;
  ctx.fill();
  ctx.strokeStyle = '#5090f0';
  ctx.lineWidth = 3;
  ctx.stroke();
  star(ctx, cx, cy - 32, 13, 6.5, 5, -90);
  let stg = ctx.createRadialGradient(cx, cy - 38, 0, cx, cy - 32, 13);
  stg.addColorStop(0, '#d0e8ff');
  stg.addColorStop(1, '#4070d0');
  ctx.fillStyle = stg;
  ctx.fill();
  ctx.strokeStyle = '#b0d4ff';
  ctx.lineWidth = 1;
  ctx.stroke();
  innerPanel(ctx, cx, cy + 16, 28, '#0c1a38', '#5090f0');
  ctx.fillStyle = '#5090f0';
  ctx.beginPath();
  ctx.arc(cx, cy + 16, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,220,255,0.6)';
  ctx.beginPath();
  ctx.arc(cx - 2, cy + 14, 3, 0, Math.PI * 2);
  ctx.fill();
  laurel(ctx, cx, cy + 20, 26, -1, '#3060b0', 8);
  laurel(ctx, cx, cy + 20, 26, 1, '#3060b0', 8);
  shimmer(ctx, cx, cy, 54, t, '#5090f0');
  gloss(ctx, cx, cy - 4, 56, 62);
  drawNumeral(ctx, cx, cy + 30, 'V', '#b0d4ff', '#5090f0', 28);
}

function drawRank6(ctx, w, h, now) {
  let cx = w / 2, cy = h / 2, t = now * 0.001;
  
  pulseAura(ctx, cx, cy, 68, 'rgb(64,232,200)', t);
  star(ctx, cx, cy, 68, 30, 10, -90);
  let tg = ctx.createRadialGradient(cx, cy, 8, cx, cy, 68);
  tg.addColorStop(0, '#1a3c38');
  tg.addColorStop(0.4, '#123028');
  tg.addColorStop(1, '#081a18');
  ctx.fillStyle = tg;
  ctx.fill();
  ctx.strokeStyle = '#25c8a0';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  star(ctx, cx, cy, 60, 26, 10, -90);
  ctx.strokeStyle = 'rgba(37,200,160,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  innerPanel(ctx, cx, cy, 34, '#081e1c', '#20c8a0');
  ctx.fillStyle = '#20c8a0';
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,255,240,0.7)';
  ctx.beginPath();
  ctx.arc(cx - 1, cy - 1, 2, 0, Math.PI * 2);
  ctx.fill();
  orbitDots(ctx, cx, cy, 62, 10, 15, t, 'rgb(64,200,160)', 2);
  laurel(ctx, cx, cy, 28, -1, '#18a888', 8);
  laurel(ctx, cx, cy, 28, 1, '#18a888', 8);
  shimmer(ctx, cx, cy, 68, t, '#20c8a0');
  gloss(ctx, cx, cy, 68, 68);
  drawNumeral(ctx, cx, cy + 2, 'VI', '#80f0d0', '#20c8a0', 26);
}

function drawRank7(ctx, w, h, now) {
  let cx = w / 2, cy = h / 2, t = now * 0.001;
  
  pulseAura(ctx, cx, cy, 68, 'rgb(232,112,208)', t);
  star(ctx, cx, cy, 68, 30, 12, -90);
  let mg = ctx.createLinearGradient(cx - 30, cy - 68, cx + 30, cy + 68);
  mg.addColorStop(0, '#441060');
  mg.addColorStop(0.3, '#380c50');
  mg.addColorStop(0.6, '#260838');
  mg.addColorStop(1, '#160420');
  ctx.fillStyle = mg;
  ctx.fill();
  ctx.strokeStyle = '#c840c0';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  star(ctx, cx, cy, 60, 26, 12, -90);
  ctx.strokeStyle = 'rgba(200,64,192,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();
  innerPanel(ctx, cx, cy, 33, '#160828', '#c040c0');
  crown(ctx, cx, cy - 28, 12, '#b030b0', '#e080e0', ['#ff8888', '#ffe080', '#8888ff', '#ff8888', '#ffe080']);
  laurel(ctx, cx, cy + 6, 26, -1, '#9020a0', 9);
  laurel(ctx, cx, cy + 6, 26, 1, '#9020a0', 9);
  shimmer(ctx, cx, cy, 68, t, '#c040c0');
  gloss(ctx, cx, cy, 68, 68);
  drawNumeral(ctx, cx, cy + 8, 'VII', '#f090e8', '#c040c0', 24);
}

function drawRank8(ctx, w, h, now) {
  let cx = w / 2, cy = h / 2, t = now * 0.001;
  
  pulseAura(ctx, cx, cy, 68, 'rgb(255,128,80)', t);
  star(ctx, cx, cy, 68, 30, 8, -22.5);
  let rg = ctx.createRadialGradient(cx, cy, 8, cx, cy, 68);
  rg.addColorStop(0, '#6a1808');
  rg.addColorStop(0.3, '#4a1006');
  rg.addColorStop(1, '#200804');
  ctx.fillStyle = rg;
  ctx.fill();
  ctx.strokeStyle = '#e84818';
  ctx.lineWidth = 3;
  ctx.stroke();
  star(ctx, cx, cy, 60, 26, 8, -22.5);
  ctx.strokeStyle = 'rgba(255,80,30,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  innerPanel(ctx, cx, cy, 34, '#200808', '#ff5020');
  crown(ctx, cx, cy - 28, 13, '#c83010', '#ff7040', ['#ffaa60', '#ff3010', '#ffcc30', '#ff3010', '#ffaa60']);
  laurel(ctx, cx, cy + 6, 27, -1, '#c02808', 9);
  laurel(ctx, cx, cy + 6, 27, 1, '#c02808', 9);
  shimmer(ctx, cx, cy, 68, t, '#ff5020');
  gloss(ctx, cx, cy, 68, 68);
  drawNumeral(ctx, cx, cy + 8, 'VIII', '#ffc090', '#ff5020', 22);
}

function drawRank9(ctx, w, h, now) {
  let cx = w / 2, cy = h / 2, t = now * 0.001;
  
  pulseAura(ctx, cx, cy, 75, 'rgb(144,216,255)', t);
  star(ctx, cx, cy, 70, 32, 12, -90);
  let dg = ctx.createLinearGradient(cx - 70, cy, cx + 70, cy);
  dg.addColorStop(0, '#0e2a50');
  dg.addColorStop(0.25, '#163a68');
  dg.addColorStop(0.5, '#1a4070');
  dg.addColorStop(0.75, '#163a68');
  dg.addColorStop(1, '#0e2a50');
  ctx.fillStyle = dg;
  ctx.fill();
  ctx.strokeStyle = '#68b8ff';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  star(ctx, cx, cy, 62, 28, 12, -90);
  ctx.strokeStyle = 'rgba(104,184,255,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  innerPanel(ctx, cx, cy, 34, '#0a1e38', '#68b8ff');
  orbitDots(ctx, cx, cy, 63, 12, 20, t, 'rgb(144,216,255)', 1.8);
  crown(ctx, cx, cy - 29, 13, '#5090d0', '#b0d8ff', ['#60b0ff', '#ffffff', '#a0d0ff', '#ffffff', '#60b0ff']);
  laurel(ctx, cx, cy + 6, 27, -1, '#3070b0', 9);
  laurel(ctx, cx, cy + 6, 27, 1, '#3070b0', 9);
  shimmer(ctx, cx, cy, 70, t, '#68b8ff');
  gloss(ctx, cx, cy, 70, 70);
  drawNumeral(ctx, cx, cy + 8, 'IX', '#c0e8ff', '#60b8ff', 28);
}

function drawRank10(ctx, w, h, now) {
  let cx = w / 2, cy = h / 2, t = now * 0.001;
  
  pulseAura(ctx, cx, cy, 76, 'rgb(255,232,128)', t);
  star(ctx, cx, cy, 70, 32, 16, -90);
  let lg = ctx.createRadialGradient(cx, cy, 8, cx, cy, 70);
  lg.addColorStop(0, '#6a4a08');
  lg.addColorStop(0.25, '#503808');
  lg.addColorStop(0.5, '#382808');
  lg.addColorStop(0.75, '#241c04');
  lg.addColorStop(1, '#161002');
  ctx.fillStyle = lg;
  ctx.fill();
  ctx.strokeStyle = '#f5c842';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  star(ctx, cx, cy, 62, 28, 16, -90);
  ctx.strokeStyle = 'rgba(245,200,66,0.22)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  star(ctx, cx, cy, 55, 24, 16, -90);
  ctx.strokeStyle = 'rgba(245,200,66,0.1)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  innerPanel(ctx, cx, cy, 36, '#20180a', '#f5c842');
  let sunc = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12 + Math.sin(t * 3) * 2);
  sunc.addColorStop(0, '#ffe880');
  sunc.addColorStop(0.5, '#f5c842');
  sunc.addColorStop(1, '#c89020');
  ctx.fillStyle = sunc;
  ctx.beginPath();
  ctx.arc(cx, cy, 12 + Math.sin(t * 3) * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff8c0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.stroke();
  orbitDots(ctx, cx, cy, 64, 16, 25, t, 'rgb(245,200,66)', 2.2);
  crown(ctx, cx, cy - 31, 15, '#d4a020', '#fff8b0', ['#ff7060', '#fff880', '#8080ff', '#fff880', '#ff7060']);
  laurel(ctx, cx, cy + 8, 30, -1, '#c89020', 11);
  laurel(ctx, cx, cy + 8, 30, 1, '#c89020', 11);
  shimmer(ctx, cx, cy, 70, t, '#f5c842');
  gloss(ctx, cx, cy, 70, 70);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 30px "Bebas Neue", sans-serif';
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillText('X', cx + 2, cy + 12);
  ctx.globalAlpha = 1;
  ctx.shadowColor = 'rgba(255,220,40,1)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#fff8c0';
  ctx.fillText('X', cx, cy + 10);
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('X', cx, cy + 10);
  ctx.restore();
}

export const RANK_DRAWERS = [null, drawRank1, drawRank2, drawRank3, drawRank4, drawRank5, drawRank6, drawRank7, drawRank8, drawRank9, drawRank10];
export const BADGE_SIZE = 160;