/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/sprites/ospital.js

   Level-aware sprite for Ospital (Hospital)
   Design based on the official upgrade level previews.
   Levels 1–5 with progressive medical facility complexity.
═══════════════════════════════════════════════════════════════ */

/**
 * drawSprite — renders Ospital building for any level 1–5
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} sc                perspective scale (pixel multiplier)
 * @param {number} w                 building width (scaled)
 * @param {number} h                 building height (scaled)
 * @param {object} def               BUILDING_DEFS entry
 * @param {number} level             building level (1–5)
 * @param {number} now               timestamp for animations
 */
export function drawSprite(ctx, sc, w, h, def, level, now) {
    // Animation time for pulsing lights, window glow
    var t = (now || performance.now()) * 0.001;

    // Select renderer based on level
    switch (level) {
        case 1: drawLv1(ctx, sc, w, h, def, t); break;
        case 2: drawLv2(ctx, sc, w, h, def, t); break;
        case 3: drawLv3(ctx, sc, w, h, def, t); break;
        case 4: drawLv4(ctx, sc, w, h, def, t); break;
        default: drawLv5(ctx, sc, w, h, def, t); break;
    }
}

/* ══════════════════════════════════════════════════════════════
   Level 1 — Klinika (Small village clinic)
   Faithful to original _drawOspital design
══════════════════════════════════════════════════════════════ */
function drawLv1(ctx, sc, w, h, def, t) {
    var baseW = 64, baseH = 46;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 3, w * 0.62, 5 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ground
    ctx.fillStyle = '#181c20';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#222830';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    
    // Walls — white/light blue
    ctx.fillStyle = '#e8f0f8';
    ctx.fillRect(-w/2, -h * 0.55, w, h * 0.67);
    
    var ws = ctx.createLinearGradient(-w/2, 0, w/2, 0);
    ws.addColorStop(0, 'rgba(255,255,255,0.08)');
    ws.addColorStop(0.7, 'rgba(0,0,0,0)');
    ws.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = ws;
    ctx.fillRect(-w/2, -h * 0.55, w, h * 0.67);
    
    // Blue flat roof + parapet
    ctx.fillStyle = '#5080c0';
    ctx.fillRect(-w * 0.55, -h * 0.6, w * 1.1, h * 0.1);
    ctx.fillStyle = '#3868a8';
    ctx.fillRect(-w * 0.57, -h * 0.63, w * 1.14, h * 0.035);
    
    // Red cross on wall — centered
    redCross(ctx, 0, -h * 0.38, 18 * sc, sc);
    
    // Door
    ctx.fillStyle = 'rgba(20,40,80,0.75)';
    ctx.fillRect(-7 * sc, -h * 0.28, 14 * sc, h * 0.28);
    ctx.strokeStyle = 'rgba(80,130,200,0.5)';
    ctx.lineWidth = 1 * sc;
    ctx.strokeRect(-7 * sc, -h * 0.28, 14 * sc, h * 0.28);
    ctx.strokeStyle = 'rgba(80,130,200,0.4)';
    ctx.lineWidth = 0.7 * sc;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.28);
    ctx.lineTo(0, 0);
    ctx.stroke();
    
    // Windows
    hospWin(ctx, -w * 0.44, -h * 0.5, 11 * sc, 9 * sc, false, sc);
    hospWin(ctx, w * 0.28, -h * 0.5, 11 * sc, 9 * sc, false, sc);
    
    // Small cross sign on roof
    crossSign(ctx, w * 0.3, -h * 0.62, 4 * sc, sc);
    
    // Sign
    ctx.fillStyle = '#2858a0';
    ctx.fillRect(-w * 0.32, -h * 0.62, w * 0.64, 8 * sc);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + (6 * sc) + 'px Oldenburg,serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('KLINIKA', 0, -h * 0.62 + 4 * sc);
    
    ctx.textBaseline = 'alphabetic';
}

/* ══════════════════════════════════════════════════════════════
   Level 2 — Ospital (Town hospital)
   Wider clinic, entrance canopy, ambulance bay, more windows
══════════════════════════════════════════════════════════════ */
function drawLv2(ctx, sc, w, h, def, t) {
    var baseW = 70, baseH = 46;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.beginPath();
    ctx.ellipse(0, 3, w * 0.6, 6 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ground
    ctx.fillStyle = '#181c20';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#222830';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    
    // Ambulance bay — left
    ambulanceBay(ctx, -w/2 - 2 * sc, -22 * sc, 22 * sc, 20 * sc, sc);
    ctx.fillStyle = '#1a2840';
    ctx.fillRect(-w/2 - 2 * sc, -22 * sc, 22 * sc, 2 * sc);
    ctx.fillStyle = '#2858a0';
    ctx.fillRect(-w/2 - 4 * sc, -24 * sc, 26 * sc, 3 * sc);
    
    // Main walls
    wall(ctx, -w/2, -h * 0.55, w, h * 0.67, '#e8f0f8', false, sc);
    
    // Flat roof
    flatRoof(ctx, -w/2, -h * 0.55, w, sc);
    
    // Entrance canopy
    canopy(ctx, -10 * sc, -h * 0.3, 20 * sc, 10 * sc, sc);
    
    // Red cross — prominent
    redCross(ctx, w * 0.22, -h * 0.4, 16 * sc, sc);
    
    // Door — sliding glass
    ctx.fillStyle = 'rgba(180,220,255,0.35)';
    ctx.fillRect(-8 * sc, -h * 0.3, 16 * sc, h * 0.3);
    ctx.strokeStyle = 'rgba(80,140,220,0.6)';
    ctx.lineWidth = 1.1 * sc;
    ctx.strokeRect(-8 * sc, -h * 0.3, 16 * sc, h * 0.3);
    ctx.strokeStyle = 'rgba(80,140,220,0.4)';
    ctx.lineWidth = 0.7 * sc;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.3);
    ctx.lineTo(0, 0);
    ctx.stroke();
    
    // Windows
    hospWin(ctx, -w * 0.44, -h * 0.48, 12 * sc, 9 * sc, false, sc);
    hospWin(ctx, -w * 0.22, -h * 0.48, 12 * sc, 9 * sc, false, sc);
    hospWin(ctx, w * 0.32, -h * 0.48, 12 * sc, 9 * sc, false, sc);
    
    // Sign board
    ctx.fillStyle = '#2050a0';
    ctx.fillRect(-w * 0.3, -h * 0.58, w * 0.6, 9 * sc);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.6 * sc;
    ctx.strokeRect(-w * 0.3, -h * 0.58, w * 0.6, 9 * sc);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + (6.5 * sc) + 'px Oldenburg,serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OSPITAL', 0, -h * 0.58 + 4.5 * sc);
    
    // Small garden / bench
    ctx.fillStyle = '#334455';
    ctx.fillRect(w * 0.38, 0, 12 * sc, 3 * sc);
    ivPole(ctx, w * 0.38, -1 * sc, sc);
    
    ctx.textBaseline = 'alphabetic';
}

/* ══════════════════════════════════════════════════════════════
   Level 3 — Ospital Lv 3 (2-storey hospital)
   2-storey building, helipad on roof, corridor balcony
══════════════════════════════════════════════════════════════ */
function drawLv3(ctx, sc, w, h, def, t) {
    var flH = 42 * sc;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.26)';
    ctx.beginPath();
    ctx.ellipse(0, 3, w * 0.58, 7 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ground
    ctx.fillStyle = '#181c20';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#222830';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    
    // EMERGENCY WING left
    var ewW = 22 * sc, ewH = 40 * sc;
    wall(ctx, -w/2 - ewW + 2 * sc, -ewH, ewW, ewH, '#dce8f4', true, sc);
    flatRoof(ctx, -w/2 - ewW + 2 * sc, -ewH, ewW, sc);
    
    // ER label
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(-w/2 - ewW + 4 * sc, -ewH + 4 * sc, ewW - 4 * sc, 10 * sc);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + (7 * sc) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ER', -w/2 - ewW + 2 * sc + ewW/2 + 1 * sc, -ewH + 9 * sc);
    
    // ER door
    ctx.fillStyle = 'rgba(180,220,255,0.4)';
    ctx.fillRect(-w/2 - ewW + 2 * sc + ewW/2 - 7 * sc, -ewH * 0.4, 14 * sc, ewH * 0.4);
    ctx.strokeStyle = 'rgba(80,140,220,0.55)';
    ctx.lineWidth = 0.9 * sc;
    ctx.strokeRect(-w/2 - ewW + 2 * sc + ewW/2 - 7 * sc, -ewH * 0.4, 14 * sc, ewH * 0.4);
    
    // Ambulance parked
    ctx.fillStyle = '#fff';
    ctx.fillRect(-w/2 - ewW + 3 * sc, -9 * sc, ewW - 4 * sc, 8 * sc);
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(-w/2 - ewW + 3 * sc, -9 * sc, ewW - 4 * sc, 4 * sc);
    crossSign(ctx, -w/2 - ewW + 3 * sc + (ewW - 4 * sc)/2, -7 * sc, 3 * sc, sc);
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(-w/2 - ewW + 7 * sc, -2 * sc, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-w/2 - ewW + ewW - 4 * sc + 1 * sc, -2 * sc, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    // MAIN GF
    wall(ctx, -w/2, -flH, w, flH, '#e8f0f8', false, sc);
    ctx.fillStyle = '#3060a0';
    ctx.fillRect(-w/2 - 2 * sc, -flH - 3 * sc, w + 4 * sc, 4 * sc);
    ctx.fillStyle = '#4070b0';
    ctx.fillRect(-w/2 - 3 * sc, -flH - 6 * sc, w + 6 * sc, 3.5 * sc);
    
    // 2F
    wall(ctx, -w/2, -flH * 2 - 5 * sc, w, flH, '#f0f6ff', false, sc);
    flatRoof(ctx, -w/2, -flH * 2 - 5 * sc, w, sc);
    
    // Helipad on roof
    helipad(ctx, w * 0.26, -flH * 2 - 5 * sc - 12 * sc, 11 * sc, sc);
    
    // HVAC units on roof
    ctx.fillStyle = '#7090b0';
    ctx.fillRect(-w * 0.38, -flH * 2 - 5 * sc - 10 * sc, 14 * sc, 8 * sc);
    ctx.fillRect(-w * 0.38, -flH * 2 - 5 * sc - 12 * sc, 14 * sc, 3 * sc);
    ctx.fillStyle = '#8090a0';
    ctx.fillRect(-w * 0.38 + 1 * sc, -flH * 2 - 5 * sc - 10 * sc, 12 * sc, 2 * sc);
    
    // 2F corridor balcony
    ctx.fillStyle = '#a0b8d8';
    ctx.fillRect(-w/2 - 1 * sc, -flH - 5.5 * sc, w + 2 * sc, flH * 0.1);
    ctx.fillStyle = '#8098b8';
    ctx.fillRect(-w/2 - 2 * sc, -flH - 5.5 * sc, w + 4 * sc, 2 * sc);
    ctx.strokeStyle = '#7090b0';
    ctx.lineWidth = 0.85 * sc;
    for (var ri = 0; ri <= 10; ri++) {
        ctx.beginPath();
        ctx.moveTo(-w/2 + ri * (w / 10), -flH - 5.5 * sc);
        ctx.lineTo(-w/2 + ri * (w / 10), -flH - 14 * sc);
        ctx.stroke();
    }
    ctx.strokeStyle = '#a0b8d8';
    ctx.lineWidth = 1.1 * sc;
    ctx.beginPath();
    ctx.moveTo(-w/2, -flH - 14 * sc);
    ctx.lineTo(w/2, -flH - 14 * sc);
    ctx.stroke();
    
    // Red cross on main facade
    redCross(ctx, w * 0.28, -flH * 0.4, 15 * sc, sc);
    
    // Canopy over entrance
    canopy(ctx, -11 * sc, -flH * 0.32, 22 * sc, 10 * sc, sc);
    ctx.fillStyle = 'rgba(180,220,255,0.38)';
    ctx.fillRect(-8 * sc, -flH * 0.32, 16 * sc, flH * 0.32);
    ctx.strokeStyle = 'rgba(80,140,220,0.55)';
    ctx.lineWidth = 1 * sc;
    ctx.strokeRect(-8 * sc, -flH * 0.32, 16 * sc, flH * 0.32);
    ctx.strokeStyle = 'rgba(80,140,220,0.3)';
    ctx.lineWidth = 0.7 * sc;
    ctx.beginPath();
    ctx.moveTo(0, -flH * 0.32);
    ctx.lineTo(0, 0);
    ctx.stroke();
    
    // GF windows
    hospWin(ctx, -w * 0.44, -flH * 0.76, 12 * sc, 9 * sc, false, sc);
    hospWin(ctx, -w * 0.24, -flH * 0.76, 12 * sc, 9 * sc, false, sc);
    hospWin(ctx, w * 0.08, -flH * 0.76, 12 * sc, 9 * sc, false, sc);
    hospWin(ctx, w * 0.28, -flH * 0.76, 12 * sc, 9 * sc, false, sc);
    
    // 2F windows — some lit
    var f2y = -flH * 2 - 5 * sc + flH * 0.22;
    hospWin(ctx, -w * 0.44, f2y, 12 * sc, 9 * sc, Math.sin(t * 0.4 + 1) > 0, sc);
    hospWin(ctx, -w * 0.24, f2y, 12 * sc, 9 * sc, Math.sin(t * 0.4 + 2) > 0, sc);
    hospWin(ctx, w * 0.08, f2y, 12 * sc, 9 * sc, Math.sin(t * 0.4 + 3) > 0, sc);
    hospWin(ctx, w * 0.28, f2y, 12 * sc, 9 * sc, Math.sin(t * 0.4 + 4) > 0, sc);
    
    // Sign
    ctx.fillStyle = '#2050a0';
    ctx.fillRect(-w * 0.28, -flH * 0.6, w * 0.56, 9 * sc);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 0.6 * sc;
    ctx.strokeRect(-w * 0.28, -flH * 0.6, w * 0.56, 9 * sc);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + (6 * sc) + 'px Oldenburg,serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OSPITAL', 0, -flH * 0.6 + 4.5 * sc);
    
    ctx.textBaseline = 'alphabetic';
}

/* ══════════════════════════════════════════════════════════════
   Level 4 — Sentral na Ospital (Central hospital)
   Full hospital: 2-storey main + separate ER and lab/admin wings
══════════════════════════════════════════════════════════════ */
function drawLv4(ctx, sc, w, h, def, t) {
    var flH = 44 * sc;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 3, w * 0.56, 8 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ground
    ctx.fillStyle = '#181c20';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#222830';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    
    // LEFT ER WING
    var ewW = 26 * sc, ewH = 50 * sc;
    wall(ctx, -w/2 - ewW + 2 * sc, -ewH, ewW, ewH, '#dce8f4', true, sc);
    ctx.fillStyle = '#2858a0';
    ctx.fillRect(-w/2 - ewW, -ewH - 3 * sc, ewW + 2 * sc, 4 * sc);
    ctx.fillStyle = '#3868b0';
    ctx.fillRect(-w/2 - ewW - 1 * sc, -ewH - 7 * sc, ewW + 4 * sc, 5 * sc);
    ctx.fillStyle = '#1848a0';
    ctx.fillRect(-w/2 - ewW - 2 * sc, -ewH - 9 * sc, ewW + 6 * sc, 2.5 * sc);
    
    // ER sign
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(-w/2 - ewW + 3 * sc, -ewH + 3 * sc, ewW - 5 * sc, 12 * sc);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + (8 * sc) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ER', -w/2 - ewW + 2 * sc + ewW/2, -ewH + 9 * sc);
    
    // ER windows
    hospWin(ctx, -w/2 - ewW + 4 * sc, -ewH * 0.72, ewW - 8 * sc, 10 * sc, false, sc);
    hospWin(ctx, -w/2 - ewW + 4 * sc, -ewH * 0.42, ewW - 8 * sc, 10 * sc, Math.sin(t * 0.35 + 1) > 0, sc);
    
    // ER sliding door
    ctx.fillStyle = 'rgba(180,220,255,0.35)';
    ctx.fillRect(-w/2 - ewW + ewW/2 - 8 * sc, -ewH * 0.38, 16 * sc, ewH * 0.38);
    ctx.strokeStyle = 'rgba(80,140,220,0.5)';
    ctx.lineWidth = 1 * sc;
    ctx.strokeRect(-w/2 - ewW + ewW/2 - 8 * sc, -ewH * 0.38, 16 * sc, ewH * 0.38);
    
    // Driveway / canopy
    ctx.fillStyle = '#2050a0';
    ctx.fillRect(-w/2 - ewW - 2 * sc, -ewH * 0.42, ewW + 4 * sc, 4 * sc);
    
    // Ambulance
    ctx.fillStyle = '#fff';
    ctx.fillRect(-w/2 - ewW + 2 * sc, -10 * sc, ewW - 6 * sc, 9 * sc);
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(-w/2 - ewW + 2 * sc, -10 * sc, ewW - 6 * sc, 4.5 * sc);
    crossSign(ctx, -w/2 - ewW + 2 * sc + (ewW - 6 * sc)/2, -7.5 * sc, 3 * sc, sc);
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(-w/2 - ewW + 6 * sc, -2 * sc, 2.2 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-w/2 - ewW + ewW - 4 * sc, -2 * sc, 2.2 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    // Flashing red light on ER
    var fl = Math.sin(t * 4) > 0;
    ctx.fillStyle = fl ? 'rgba(255,50,50,1)' : 'rgba(200,50,50,0.3)';
    ctx.beginPath();
    ctx.arc(-w/2 - ewW + 2 * sc, -11 * sc, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    // RIGHT ADMIN/LAB WING
    var awW = 24 * sc, awH = 46 * sc;
    wall(ctx, w/2 - 2 * sc, -awH, awW, awH, '#e0eef8', false, sc);
    flatRoof(ctx, w/2 - 2 * sc, -awH, awW, sc);
    hospWin(ctx, w/2 + 3 * sc, -awH * 0.78, awW - 8 * sc, 9 * sc, false, sc);
    hospWin(ctx, w/2 + 3 * sc, -awH * 0.48, awW - 8 * sc, 9 * sc, Math.sin(t * 0.4 + 5) > 0, sc);
    
    ctx.fillStyle = '#2050a0';
    ctx.fillRect(w/2, -awH + 3 * sc, awW - 4 * sc, 8 * sc);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + (5.5 * sc) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LAB', w/2 + awW/2 - 2 * sc, -awH + 7 * sc);
    
    // MAIN 2F BLOCK
    wall(ctx, -w/2, -flH, w, flH, '#e8f0f8', false, sc);
    ctx.fillStyle = '#3060a0';
    ctx.fillRect(-w/2 - 2 * sc, -flH - 3 * sc, w + 4 * sc, 4 * sc);
    ctx.fillStyle = '#4070b0';
    ctx.fillRect(-w/2 - 3 * sc, -flH - 6 * sc, w + 6 * sc, 3.5 * sc);
    wall(ctx, -w/2, -flH * 2 - 5 * sc, w, flH, '#f0f6ff', false, sc);
    flatRoof(ctx, -w/2, -flH * 2 - 5 * sc, w, sc);
    
    // Helipad
    helipad(ctx, w * 0.28, -flH * 2 - 5 * sc - 14 * sc, 14 * sc, sc);
    
    // HVAC bank
    ctx.fillStyle = '#6888a8';
    ctx.fillRect(-w * 0.42, -flH * 2 - 5 * sc - 12 * sc, 20 * sc, 10 * sc);
    ctx.fillRect(-w * 0.42, -flH * 2 - 5 * sc - 14 * sc, 20 * sc, 3 * sc);
    for (var hi = 0; hi < 3; hi++) {
        ctx.fillStyle = '#788898';
        ctx.fillRect(-w * 0.42 + hi * 7 * sc + 1 * sc, -flH * 2 - 5 * sc - 12 * sc, 5 * sc, 2 * sc);
    }
    
    // 2F corridor
    ctx.fillStyle = '#a0b8d8';
    ctx.fillRect(-w/2 - 1 * sc, -flH - 5.5 * sc, w + 2 * sc, flH * 0.09);
    ctx.fillStyle = '#8098b8';
    ctx.fillRect(-w/2 - 2 * sc, -flH - 5.5 * sc, w + 4 * sc, 2 * sc);
    ctx.strokeStyle = '#7090b0';
    ctx.lineWidth = 0.8 * sc;
    for (var ri = 0; ri <= 13; ri++) {
        ctx.beginPath();
        ctx.moveTo(-w/2 + ri * (w / 13), -flH - 5.5 * sc);
        ctx.lineTo(-w/2 + ri * (w / 13), -flH - 14 * sc);
        ctx.stroke();
    }
    ctx.strokeStyle = '#a0b8d8';
    ctx.lineWidth = 1.1 * sc;
    ctx.beginPath();
    ctx.moveTo(-w/2, -flH - 14 * sc);
    ctx.lineTo(w/2, -flH - 14 * sc);
    ctx.stroke();
    
    // Red cross on main facade
    redCross(ctx, w * 0.3, -flH * 0.42, 15 * sc, sc);
    
    // Main entrance canopy + doors
    canopy(ctx, -14 * sc, -flH * 0.34, 28 * sc, 12 * sc, sc);
    ctx.fillStyle = 'rgba(180,220,255,0.35)';
    ctx.fillRect(-10 * sc, -flH * 0.34, 20 * sc, flH * 0.34);
    ctx.strokeStyle = 'rgba(80,140,220,0.55)';
    ctx.lineWidth = 1 * sc;
    ctx.strokeRect(-10 * sc, -flH * 0.34, 20 * sc, flH * 0.34);
    ctx.strokeStyle = 'rgba(80,140,220,0.35)';
    ctx.lineWidth = 0.7 * sc;
    ctx.beginPath();
    ctx.moveTo(0, -flH * 0.34);
    ctx.lineTo(0, 0);
    ctx.stroke();
    
    // GF windows
    [-w * 0.44, -w * 0.28, -w * 0.12, w * 0.08, w * 0.22].forEach(function(wx) {
        hospWin(ctx, wx, -flH * 0.76, 12 * sc, 9 * sc, false, sc);
    });
    
    // 2F windows
    var f2y = -flH * 2 - 5 * sc + flH * 0.22;
    [-w * 0.44, -w * 0.28, -w * 0.12, w * 0.08, w * 0.22, w * 0.38].forEach(function(wx) {
        hospWin(ctx, wx, f2y, 12 * sc, 9 * sc, Math.sin(t * 0.35 + wx) > -0.3, sc);
    });
    
    // Sign
    ctx.fillStyle = '#1a4080';
    ctx.fillRect(-w * 0.3, -flH * 0.59, w * 0.6, 10 * sc);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 0.6 * sc;
    ctx.strokeRect(-w * 0.3, -flH * 0.59, w * 0.6, 10 * sc);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + (6 * sc) + 'px Oldenburg,serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SENTRAL NA OSPITAL', 0, -flH * 0.59 + 5 * sc);
    
    // Steps
    ctx.fillStyle = '#4868a0';
    ctx.fillRect(-w * 0.28, 0, w * 0.56, 4 * sc);
    ctx.fillStyle = '#5878b0';
    ctx.fillRect(-w * 0.34, -4 * sc, w * 0.68, 4 * sc);
    
    ctx.textBaseline = 'alphabetic';
}

/* ══════════════════════════════════════════════════════════════
   Level 5 — Medikal Sentro ng Bayan (Medical Center)
   Full medical center: 3-storey central tower, wide flanking wings,
   large helipad, multiple ER bays, glowing night windows
══════════════════════════════════════════════════════════════ */
function drawLv5(ctx, sc, w, h, def, t) {
    var flH = 42 * sc;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 3, w * 0.53, 10 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ground
    ctx.fillStyle = '#181c20';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#222830';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    
    // OUTER WINGS 2F
    var owW = 26 * sc, owH = 54 * sc;
    
    function outerWing(lx, isLeft) {
        wall(ctx, lx, -owH, owW, owH, isLeft ? '#dce8f4' : '#e0eef8', isLeft, sc);
        ctx.fillStyle = '#2858a0';
        ctx.fillRect(lx - 2 * sc, -owH - 3 * sc, owW + 4 * sc, 4 * sc);
        ctx.fillStyle = '#3868b0';
        ctx.fillRect(lx - 3 * sc, -owH - 7 * sc, owW + 6 * sc, 4 * sc);
        ctx.fillStyle = '#1848a0';
        ctx.fillRect(lx - 4 * sc, -owH - 9 * sc, owW + 8 * sc, 2.5 * sc);
        
        // Floor band
        ctx.fillStyle = '#3868a8';
        ctx.fillRect(lx - 1 * sc, -owH * 0.5 - 1.5 * sc, owW + 2 * sc, 3 * sc);
        
        // Windows x2 per floor
        hospWin(ctx, lx + 4 * sc, -owH * 0.82, owW - 8 * sc, 9 * sc, Math.sin(t * 0.3 + lx * 0.02 + 1) > -0.2, sc);
        hospWin(ctx, lx + 4 * sc, -owH * 0.46, owW - 8 * sc, 9 * sc, Math.sin(t * 0.3 + lx * 0.02 + 2) > -0.2, sc);
    }
    
    outerWing(-w/2 - owW + 2 * sc, true);
    outerWing(w/2 - 2 * sc, false);
    
    // INNER WINGS 2F+3F
    var iwW = 30 * sc, iwH = 64 * sc;
    
    function innerWing(lx, isLeft) {
        wall(ctx, lx, -iwH, iwW, iwH, isLeft ? '#e0ecf8' : '#e4f0fc', isLeft, sc);
        ctx.fillStyle = '#3060a0';
        ctx.fillRect(lx - 1 * sc, -iwH * 0.5 - 1.5 * sc, iwW + 2 * sc, 3 * sc);
        flatRoof(ctx, lx, -iwH, iwW, sc);
        
        // Windows per floor
        hospWin(ctx, lx + 4 * sc, -iwH * 0.85, iwW - 8 * sc, 9 * sc, Math.sin(t * 0.3 + lx * 0.02 + 3) > -0.2, sc);
        hospWin(ctx, lx + 4 * sc, -iwH * 0.56, iwW - 8 * sc, 9 * sc, Math.sin(t * 0.3 + lx * 0.02 + 4) > -0.2, sc);
        hospWin(ctx, lx + 4 * sc, -iwH * 0.26, iwW - 8 * sc, 9 * sc, Math.sin(t * 0.3 + lx * 0.02 + 5) > -0.2, sc);
        
        // Corridor balcony on 2F
        ctx.fillStyle = '#90a8c8';
        ctx.fillRect(lx - 1 * sc, -iwH * 0.5 - 3 * sc, iwW + 2 * sc, iwH * 0.08);
        ctx.strokeStyle = '#6888a8';
        ctx.lineWidth = 0.8 * sc;
        for (var ri = 0; ri <= 4; ri++) {
            ctx.beginPath();
            ctx.moveTo(lx + ri * (iwW / 4), -iwH * 0.5 - 3 * sc);
            ctx.lineTo(lx + ri * (iwW / 4), -iwH * 0.5 - 11 * sc);
            ctx.stroke();
        }
        ctx.strokeStyle = '#90a8c8';
        ctx.lineWidth = 1 * sc;
        ctx.beginPath();
        ctx.moveTo(lx, -iwH * 0.5 - 11 * sc);
        ctx.lineTo(lx + iwW, -iwH * 0.5 - 11 * sc);
        ctx.stroke();
    }
    
    innerWing(-w/2 + owW * 0.0, true);
    innerWing(w/2 - iwW, false);
    
    // CENTRAL TOWER 3F + ROOFTOP
    var mbW = 64 * sc, mbH = flH, mb2H = flH * 0.88, mb3H = flH * 0.7;
    
    wall(ctx, -mbW/2, -mbH, mbW, mbH, '#e8f0f8', false, sc);
    ctx.fillStyle = '#2858a0';
    ctx.fillRect(-mbW/2 - 2 * sc, -mbH - 3 * sc, mbW + 4 * sc, 4 * sc);
    ctx.fillStyle = '#3868b0';
    ctx.fillRect(-mbW/2 - 3 * sc, -mbH - 6 * sc, mbW + 6 * sc, 3.5 * sc);
    
    wall(ctx, -mbW/2, -mbH - mb2H, mbW, mb2H, '#eff5ff', false, sc);
    ctx.fillStyle = '#2050a0';
    ctx.fillRect(-mbW/2 - 2 * sc, -mbH - mb2H - 2 * sc, mbW + 4 * sc, 4 * sc);
    ctx.fillStyle = '#3060b0';
    ctx.fillRect(-mbW/2 - 3 * sc, -mbH - mb2H - 5.5 * sc, mbW + 6 * sc, 3.5 * sc);
    
    wall(ctx, -mbW/2, -mbH - mb2H - mb3H, mbW, mb3H, '#f4f8ff', false, sc);
    flatRoof(ctx, -mbW/2, -mbH - mb2H - mb3H, mbW, sc);
    
    // BIG RED CROSS TOWER
    var twH = mb3H * 1.5, twW = 16 * sc, twBase = -mbH - mb2H - mb3H;
    wall(ctx, -twW/2, twBase - twH, twW, twH, '#ffffff', false, sc);
    ctx.fillStyle = '#2858a0';
    ctx.beginPath();
    ctx.moveTo(-twW/2 - 2 * sc, twBase - twH);
    ctx.lineTo(0, twBase - twH - 20 * sc);
    ctx.lineTo(twW/2 + 2 * sc, twBase - twH);
    ctx.closePath();
    ctx.fill();
    
    // Big red cross on tower
    redCross(ctx, 0, twBase - twH * 0.5, twW * 0.8, sc);
    
    // Tower slab
    ctx.fillStyle = '#3868a8';
    ctx.fillRect(-twW/2 - 1 * sc, twBase, twW + 2 * sc, 2.5 * sc);
    ctx.fillRect(-twW/2 - 1 * sc, twBase - twH * 0.55, twW + 2 * sc, 2.5 * sc);
    
    // HELIPAD on 3F roof
    helipad(ctx, mbW * 0.28, twBase - 12 * sc, 13 * sc, sc);
    
    // HVAC cluster
    ctx.fillStyle = '#6080a0';
    ctx.fillRect(-mbW * 0.44, twBase - 14 * sc, 18 * sc, 10 * sc);
    ctx.fillRect(-mbW * 0.44, twBase - 16 * sc, 18 * sc, 3 * sc);
    for (var hi = 0; hi < 3; hi++) {
        ctx.fillStyle = '#708090';
        ctx.fillRect(-mbW * 0.44 + hi * 6 * sc + 1 * sc, twBase - 14 * sc, 4 * sc, 2 * sc);
    }
    
    // FULL 2F BALCONY CORRIDOR
    ctx.fillStyle = '#a0b8d8';
    ctx.fillRect(-mbW/2 - 1 * sc, -mbH - 5.5 * sc, mbW + 2 * sc, mbH * 0.09);
    ctx.fillStyle = '#8098b8';
    ctx.fillRect(-mbW/2 - 2 * sc, -mbH - 5.5 * sc, mbW + 4 * sc, 2 * sc);
    ctx.strokeStyle = '#7090b0';
    ctx.lineWidth = 0.8 * sc;
    for (var ri = 0; ri <= 12; ri++) {
        ctx.beginPath();
        ctx.moveTo(-mbW/2 + ri * (mbW / 12), -mbH - 5.5 * sc);
        ctx.lineTo(-mbW/2 + ri * (mbW / 12), -mbH - 13 * sc);
        ctx.stroke();
    }
    ctx.strokeStyle = '#a0b8d8';
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.moveTo(-mbW/2, -mbH - 13 * sc);
    ctx.lineTo(mbW/2, -mbH - 13 * sc);
    ctx.stroke();
    
    // MAIN ENTRANCE CANOPY + DOOR
    canopy(ctx, -16 * sc, -mbH * 0.36, 32 * sc, 13 * sc, sc);
    ctx.fillStyle = 'rgba(180,220,255,0.32)';
    ctx.fillRect(-12 * sc, -mbH * 0.36, 24 * sc, mbH * 0.36);
    ctx.strokeStyle = 'rgba(80,140,220,0.55)';
    ctx.lineWidth = 1.1 * sc;
    ctx.strokeRect(-12 * sc, -mbH * 0.36, 24 * sc, mbH * 0.36);
    ctx.strokeStyle = 'rgba(80,140,220,0.35)';
    ctx.lineWidth = 0.7 * sc;
    ctx.beginPath();
    ctx.moveTo(0, -mbH * 0.36);
    ctx.lineTo(0, 0);
    ctx.stroke();
    
    // GF windows
    [-mbW * 0.44, -mbW * 0.28, -mbW * 0.1, mbW * 0.06, mbW * 0.22, mbW * 0.38].forEach(function(wx) {
        hospWin(ctx, wx, -mbH * 0.76, 11 * sc, 9 * sc, false, sc);
    });
    
    // 2F windows
    var f2y = -mbH - mb2H * 0.78;
    [-mbW * 0.44, -mbW * 0.28, -mbW * 0.1, mbW * 0.06, mbW * 0.22, mbW * 0.38].forEach(function(wx) {
        hospWin(ctx, wx, f2y, 11 * sc, 9 * sc, Math.sin(t * 0.32 + wx * 0.04) > -0.25, sc);
    });
    
    // 3F windows
    var f3y = -mbH - mb2H - mb3H * 0.72;
    [-mbW * 0.42, -mbW * 0.24, -mbW * 0.06, mbW * 0.1, mbW * 0.28].forEach(function(wx) {
        hospWin(ctx, wx, f3y, 11 * sc, 9 * sc, Math.sin(t * 0.28 + wx * 0.04 + 1) > -0.1, sc);
    });
    
    // GRAND SIGN
    ctx.fillStyle = '#1a3a80';
    ctx.fillRect(-mbW * 0.36, -mbH - mb2H * 0.26, mbW * 0.72, 11 * sc);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 0.6 * sc;
    ctx.strokeRect(-mbW * 0.36, -mbH - mb2H * 0.26, mbW * 0.72, 11 * sc);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + (6 * sc) + 'px Oldenburg,serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MEDIKAL SENTRO', 0, -mbH - mb2H * 0.26 + 5.5 * sc);
    
    // Cross signs on sides
    crossSign(ctx, mbW * 0.34, -mbH - mb2H * 0.26 + 5.5 * sc, 4.5 * sc, sc);
    crossSign(ctx, -mbW * 0.34, -mbH - mb2H * 0.26 + 5.5 * sc, 4.5 * sc, sc);
    
    // GRAND STEPS
    ctx.fillStyle = '#4060a0';
    ctx.fillRect(-mbW/2 - 2 * sc, 0, mbW + 4 * sc, 4 * sc);
    ctx.fillStyle = '#5070b0';
    ctx.fillRect(-mbW/2 - 6 * sc, -4 * sc, mbW + 12 * sc, 4 * sc);
    ctx.fillStyle = '#4060a0';
    ctx.fillRect(-mbW/2 - 10 * sc, -8 * sc, mbW + 20 * sc, 4 * sc);
    
    // IV POLES near entrance
    ivPole(ctx, -mbW * 0.2, -1 * sc, sc);
    ivPole(ctx, mbW * 0.16, -1 * sc, sc);
    
    // Blinking red cross light on tower tip
    var bl = Math.sin(t * 2.5) > 0;
    ctx.fillStyle = bl ? 'rgba(255,50,50,1)' : 'rgba(255,50,50,0.08)';
    ctx.beginPath();
    ctx.arc(0, twBase - twH - 20 * sc, 2.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.textBaseline = 'alphabetic';
}

/* ══════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
══════════════════════════════════════════════════════════════ */

function hospWin(ctx, x, y, w, h, lit, sc) {
    // Sill
    ctx.fillStyle = '#9ab0c8';
    ctx.fillRect(x - 1.5 * sc, y + h, w + 3 * sc, 2 * sc);
    // Frame
    ctx.fillStyle = '#7090b0';
    ctx.fillRect(x - 1.5 * sc, y - 1.5 * sc, w + 3 * sc, h + 3 * sc);
    // Glass
    ctx.fillStyle = lit ? 'rgba(255,240,200,0.75)' : 'rgba(200,220,255,0.7)';
    ctx.fillRect(x, y, w, h);
    if (lit) {
        ctx.fillStyle = 'rgba(255,245,210,0.18)';
        ctx.fillRect(x, y, w, h * 0.3);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.6 * sc;
    ctx.beginPath();
    ctx.moveTo(x + w/2, y);
    ctx.lineTo(x + w/2, y + h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.45);
    ctx.lineTo(x + w, y + h * 0.45);
    ctx.stroke();
    // Lintel
    ctx.fillStyle = '#a0b8d0';
    ctx.fillRect(x - 2 * sc, y - 3 * sc, w + 4 * sc, 2.5 * sc);
}

function redCross(ctx, cx, cy, size, sc) {
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(cx - size * 0.18, cy - size * 0.5, size * 0.36, size);
    ctx.fillRect(cx - size * 0.5, cy - size * 0.18, size, size * 0.36);
}

function crossSign(ctx, cx, cy, r, sc) {
    ctx.fillStyle = '#cc2222';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - r * 0.2, cy - r * 0.55, r * 0.4, r * 1.1);
    ctx.fillRect(cx - r * 0.55, cy - r * 0.2, r * 1.1, r * 0.4);
}

function wall(ctx, x, y, w, h, color, flipShade, sc) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    var sg = ctx.createLinearGradient(x, 0, x + w, 0);
    if (flipShade) {
        sg.addColorStop(0, 'rgba(0,0,0,0.1)');
        sg.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
        sg.addColorStop(0, 'rgba(255,255,255,0.06)');
        sg.addColorStop(0.75, 'rgba(0,0,0,0)');
        sg.addColorStop(1, 'rgba(0,0,0,0.14)');
    }
    ctx.fillStyle = sg;
    ctx.fillRect(x, y, w, h);
}

function flatRoof(ctx, x, y, w, sc) {
    ctx.fillStyle = '#3868a8';
    ctx.fillRect(x - 2 * sc, y - 3 * sc, w + 4 * sc, 4 * sc);
    ctx.fillStyle = '#4878b8';
    ctx.fillRect(x - 3 * sc, y - 7 * sc, w + 6 * sc, 5 * sc);
    ctx.fillStyle = '#2858a0';
    ctx.fillRect(x - 4 * sc, y - 9 * sc, w + 8 * sc, 2.5 * sc);
}

function canopy(ctx, x, y, w, h, sc) {
    ctx.fillStyle = '#2858a0';
    ctx.beginPath();
    ctx.moveTo(x - 2 * sc, y);
    ctx.lineTo(x + w + 2 * sc, y);
    ctx.lineTo(x + w + 4 * sc, y + h);
    ctx.lineTo(x - 4 * sc, y + h);
    ctx.closePath();
    ctx.fill();
    // Stripe
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (var s = 0; s < 3; s++) {
        var sx = x + s * (w / 3);
        ctx.beginPath();
        ctx.moveTo(sx, y);
        ctx.lineTo(sx + w/3, y);
        ctx.lineTo(sx + w/3 + 4 * sc, y + h);
        ctx.lineTo(sx + 4 * sc, y + h);
        ctx.closePath();
        if (s % 2 === 0) ctx.fill();
    }
}

function helipad(ctx, cx, cy, r, sc) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5 * sc;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = 'bold ' + (r * 1.2) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', cx, cy + 0.5 * sc);
    ctx.textBaseline = 'alphabetic';
}

function ambulanceBay(ctx, x, y, w, h, sc) {
    ctx.fillStyle = '#1a2840';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 0.7 * sc;
    ctx.strokeRect(x, y, w, h);
    // Ambulance shape
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 3 * sc, y + 3 * sc, w - 6 * sc, h - 6 * sc);
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(x + 3 * sc, y + 3 * sc, w - 6 * sc, (h - 6 * sc) * 0.45);
    crossSign(ctx, x + w/2, y + 3 * sc + (h - 6 * sc) * 0.22, 3 * sc, sc);
    // Wheels
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(x + 6 * sc, y + h - 3 * sc, 2.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w - 6 * sc, y + h - 3 * sc, 2.5 * sc, 0, Math.PI * 2);
    ctx.fill();
}

function ivPole(ctx, x, y, sc) {
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 18 * sc);
    ctx.stroke();
    ctx.strokeStyle = '#7ab';
    ctx.lineWidth = 0.7 * sc;
    ctx.beginPath();
    ctx.moveTo(x, y - 16 * sc);
    ctx.lineTo(x - 4 * sc, y - 12 * sc);
    ctx.stroke();
    ctx.fillStyle = 'rgba(180,220,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(x, y - 17 * sc, 2 * sc, 3 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
}