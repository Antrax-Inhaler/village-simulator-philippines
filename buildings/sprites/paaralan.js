/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/sprites/paaralan.js

   Level-aware sprite for Paaralan (School)
   Design based on the official upgrade level previews.
   Levels 1–5 with progressive architectural detail.
═══════════════════════════════════════════════════════════════ */

/**
 * drawSprite — renders Paaralan building for any level 1–5
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} sc                perspective scale (pixel multiplier)
 * @param {number} w                 building width (scaled)
 * @param {number} h                 building height (scaled)
 * @param {object} def               BUILDING_DEFS entry
 * @param {number} level             building level (1–5)
 * @param {number} now               timestamp for animations
 */
export function drawSprite(ctx, sc, w, h, def, level, now) {
    // Animation time for flags & shimmers
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
   Level 1 — Eskwelahan (Small village school)
   Faithful to original _drawPaaralan design
══════════════════════════════════════════════════════════════ */
function drawLv1(ctx, sc, w, h, def, t) {
    // Base dimensions (original: w=68, h=44)
    var baseW = 68, baseH = 44;
    var scaleX = w / baseW;
    var scaleY = h / baseH;

    // Walls
    ctx.fillStyle = '#e8c84a';
    ctx.fillRect(-w/2, -h*0.55, w, h*0.67);
    
    // Wall shading
    var ws = ctx.createLinearGradient(-w/2, 0, w/2, 0);
    ws.addColorStop(0, 'rgba(0,0,0,0)');
    ws.addColorStop(0.7, 'rgba(0,0,0,0)');
    ws.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = ws;
    ctx.fillRect(-w/2, -h*0.55, w, h*0.67);
    
    // Roof parapet (original style)
    ctx.fillStyle = '#b89020';
    ctx.fillRect(-w*0.6, -h*0.6, w*1.2, h*0.1);
    
    // Battlements/parapet tops
    ctx.fillStyle = '#b89020';
    for (var bi = -2; bi <= 2; bi++) {
        ctx.fillRect(bi * w * 0.22 - 5*sc, -h*0.76, 10*sc, 15*sc);
    }
    
    // Door
    ctx.fillStyle = 'rgba(80,60,0,0.8)';
    ctx.fillRect(-6*sc, -h*0.53, 12*sc, h*0.53);
    
    // Three windows
    drawSchoolWindow(ctx, -w*0.42, -h*0.5, 10*sc, 8*sc);
    drawSchoolWindow(ctx, -w*0.12, -h*0.5, 10*sc, 8*sc);
    drawSchoolWindow(ctx, w*0.2, -h*0.5, 10*sc, 8*sc);
    
    // Signboard
    ctx.fillStyle = '#fff8c0';
    ctx.fillRect(-w*0.35, -h*0.68, w*0.7, 9*sc);
    ctx.fillStyle = '#5a3800';
    ctx.font = 'bold ' + (7*sc) + 'px Oldenburg,serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAARALAN', 0, -h*0.68 + 4.5*sc);
    
    // Flagpole
    drawFlagpole(ctx, w*0.42, -h*0.6, 28*sc, t);
    
    // Small bush
    ctx.fillStyle = '#4a8a28';
    ctx.beginPath();
    ctx.ellipse(-w*0.38, 2*sc, 5*sc, 4*sc, 0, 0, Math.PI*2);
    ctx.fill();
    
    // Bench
    ctx.fillStyle = '#7a6028';
    ctx.fillRect(-w*0.48, 0, 16*sc, 3*sc);
    ctx.fillRect(-w*0.44, -2*sc, 8*sc, 6*sc);
    
    ctx.textBaseline = 'alphabetic';
}

/* ══════════════════════════════════════════════════════════════
   Level 2 — Paaralan (Town school with annex wing)
══════════════════════════════════════════════════════════════ */
function drawLv2(ctx, sc, w, h, def, t) {
    var baseW = 72, baseH = 44;
    
    // RIGHT CLASSROOM ANNEX
    var axW = 20*sc, axH = 36*sc;
    ctx.fillStyle = '#d8b840';
    ctx.fillRect(w/2 - axW, -axH, axW, axH);
    // Annex roof
    ctx.fillStyle = '#b08820';
    ctx.fillRect(w/2 - axW - 2*sc, -axH - 3*sc, axW + 4*sc, 4*sc);
    ctx.fillStyle = '#887008';
    ctx.fillRect(w/2 - axW - 3*sc, -axH - 7*sc, axW + 6*sc, 5*sc);
    // Annex windows
    drawSchoolWindow(ctx, w/2 - axW + 4*sc, -axH * 0.72, 11*sc, 9*sc);
    drawSchoolWindow(ctx, w/2 - axW + 4*sc, -axH * 0.42, 11*sc, 9*sc);
    
    // MAIN BLOCK
    ctx.fillStyle = '#e8c84a';
    ctx.fillRect(-w/2, -h*0.55, w, h*0.67);
    // Wall shading
    var ws = ctx.createLinearGradient(-w/2, 0, w/2, 0);
    ws.addColorStop(0, 'rgba(0,0,0,0)');
    ws.addColorStop(0.7, 'rgba(0,0,0,0)');
    ws.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = ws;
    ctx.fillRect(-w/2, -h*0.55, w, h*0.67);
    
    // Parapet roof
    ctx.fillStyle = '#b89020';
    ctx.fillRect(-w*0.55, -h*0.6, w*1.1, h*0.1);
    for (var bi = -3; bi <= 3; bi++) {
        ctx.fillRect(bi * w * 0.16 - 4*sc, -h*0.76, 8*sc, 14*sc);
    }
    
    // Door
    ctx.fillStyle = 'rgba(80,60,0,0.8)';
    ctx.fillRect(-6*sc, -h*0.53, 12*sc, h*0.53);
    ctx.strokeStyle = 'rgba(200,180,50,0.4)';
    ctx.lineWidth = 1*sc;
    ctx.strokeRect(-6*sc, -h*0.53, 12*sc, h*0.53);
    
    // Windows (4 on main block)
    drawSchoolWindow(ctx, -w*0.44, -h*0.49, 11*sc, 9*sc);
    drawSchoolWindow(ctx, -w*0.22, -h*0.49, 11*sc, 9*sc);
    drawSchoolWindow(ctx, w*0.08, -h*0.49, 11*sc, 9*sc);
    drawSchoolWindow(ctx, w*0.28, -h*0.49, 11*sc, 9*sc);
    
    // Signboard
    drawSchoolSign(ctx, -w*0.3, -h*0.62, w*0.6, 10*sc, 'PAARALAN');
    
    // Flagpole (taller)
    drawFlagpole(ctx, -w*0.44, -h*0.6, 34*sc, t);
    
    // Gate posts
    ctx.fillStyle = '#c8a828';
    ctx.fillRect(-w*0.52, -10*sc, 5*sc, 10*sc);
    ctx.fillRect(w*0.46, -10*sc, 5*sc, 10*sc);
    ctx.fillStyle = '#e8c840';
    ctx.fillRect(-w*0.52, -12*sc, 5*sc, 3*sc);
    ctx.fillRect(w*0.46, -12*sc, 5*sc, 3*sc);
    
    // Tree
    ctx.strokeStyle = '#6a4818';
    ctx.lineWidth = 1.5*sc;
    ctx.beginPath();
    ctx.moveTo(w*0.4, 0);
    ctx.lineTo(w*0.4, -22*sc);
    ctx.stroke();
    ctx.fillStyle = '#3a8828';
    ctx.beginPath();
    ctx.ellipse(w*0.4, -26*sc, 9*sc, 8*sc, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#4a9838';
    ctx.beginPath();
    ctx.ellipse(w*0.4 - 4*sc, -22*sc, 6*sc, 5*sc, 0, 0, Math.PI*2);
    ctx.fill();
}

/* ══════════════════════════════════════════════════════════════
   Level 3 — Pinalaking Paaralan (Two-storey school)
══════════════════════════════════════════════════════════════ */
function drawLv3(ctx, sc, w, h, def, t) {
    var baseW = 96, baseH = 46;
    var flH = 40*sc;
    
    // GROUND FLOOR
    ctx.fillStyle = '#e8c84a';
    ctx.fillRect(-w/2, -flH, w, flH);
    
    // Floor slab
    ctx.fillStyle = '#806010';
    ctx.fillRect(-w/2 - 2*sc, -flH - 3*sc, w + 4*sc, 4*sc);
    ctx.fillStyle = '#907020';
    ctx.fillRect(-w/2 - 3*sc, -flH - 5.5*sc, w + 6*sc, 3*sc);
    
    // SECOND FLOOR
    ctx.fillStyle = '#eecf52';
    ctx.fillRect(-w/2, -flH*2 - 5*sc, w, flH);
    
    // FLAT ROOF on 2F
    ctx.fillStyle = '#a08010';
    ctx.fillRect(-w/2 - 2*sc, -flH*2 - 8*sc, w + 4*sc, 4*sc);
    ctx.fillStyle = '#b09020';
    ctx.fillRect(-w/2 - 3*sc, -flH*2 - 12*sc, w + 6*sc, 5*sc);
    ctx.fillStyle = '#887008';
    ctx.fillRect(-w/2 - 4*sc, -flH*2 - 14*sc, w + 8*sc, 2.5*sc);
    
    // Parapet battlements
    ctx.fillStyle = '#b89020';
    for (var bi = -5; bi <= 5; bi++) {
        if (bi % 2 === 0) {
            ctx.fillRect(bi * w * 0.09 - 4*sc, -flH*2 - 19*sc, 8*sc, 7*sc);
        }
    }
    
    // CORRIDOR BALCONY on 2F
    var balW = w * 0.6;
    var balX = -w * 0.3;
    ctx.fillStyle = '#c8a830';
    ctx.fillRect(balX - 1*sc, -flH - 5.5*sc, balW + 2*sc, flH * 0.12);
    ctx.fillStyle = '#a88018';
    ctx.fillRect(balX - 2*sc, -flH - 5.5*sc, balW + 4*sc, 2*sc);
    
    // Railing
    ctx.strokeStyle = '#9a7818';
    ctx.lineWidth = 0.9*sc;
    for (var ri = 0; ri <= 8; ri++) {
        ctx.beginPath();
        ctx.moveTo(balX + ri * (balW / 8), -flH - 5.5*sc);
        ctx.lineTo(balX + ri * (balW / 8), -flH - 15*sc);
        ctx.stroke();
    }
    ctx.strokeStyle = '#c8a830';
    ctx.lineWidth = 1.1*sc;
    ctx.beginPath();
    ctx.moveTo(balX, -flH - 15*sc);
    ctx.lineTo(balX + balW, -flH - 15*sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(balX, -flH - 5.5*sc);
    ctx.lineTo(balX + balW, -flH - 5.5*sc);
    ctx.stroke();
    
    // GF: door + windows
    ctx.fillStyle = 'rgba(80,60,0,0.82)';
    ctx.fillRect(-7*sc, -flH * 0.52, 14*sc, flH * 0.52);
    ctx.strokeStyle = 'rgba(200,180,50,0.35)';
    ctx.lineWidth = 1*sc;
    ctx.strokeRect(-7*sc, -flH * 0.52, 14*sc, flH * 0.52);
    
    drawSchoolWindow(ctx, -w*0.44, -flH * 0.78, 12*sc, 9*sc);
    drawSchoolWindow(ctx, -w*0.24, -flH * 0.78, 12*sc, 9*sc);
    drawSchoolWindow(ctx, w*0.09, -flH * 0.78, 12*sc, 9*sc);
    drawSchoolWindow(ctx, w*0.29, -flH * 0.78, 12*sc, 9*sc);
    
    // 2F windows
    var f2y = -flH*2 - 5*sc + flH * 0.22;
    drawSchoolWindow(ctx, -w*0.44, f2y, 12*sc, 10*sc);
    drawSchoolWindow(ctx, -w*0.24, f2y, 12*sc, 10*sc);
    drawSchoolWindow(ctx, w*0.09, f2y, 12*sc, 10*sc);
    drawSchoolWindow(ctx, w*0.29, f2y, 12*sc, 10*sc);
    
    // Sign
    drawSchoolSign(ctx, -w*0.3, -flH * 0.62, w*0.6, 10*sc, 'PAARALAN');
    
    // Flagpole
    drawFlagpole(ctx, -w*0.46, -flH*2 - 5*sc, 42*sc, t);
    
    // Trees
    [-w*0.48, w*0.44].forEach(function(tx) {
        ctx.strokeStyle = '#6a4818';
        ctx.lineWidth = 1.5*sc;
        ctx.beginPath();
        ctx.moveTo(tx, 0);
        ctx.lineTo(tx, -20*sc);
        ctx.stroke();
        ctx.fillStyle = '#3a8828';
        ctx.beginPath();
        ctx.ellipse(tx, -24*sc, 8*sc, 7*sc, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#4a9838';
        ctx.beginPath();
        ctx.ellipse(tx - 3*sc, -20*sc, 5*sc, 4*sc, 0, 0, Math.PI*2);
        ctx.fill();
    });
}

/* ══════════════════════════════════════════════════════════════
   Level 4 — Mataas na Paaralan (High school campus with gym)
══════════════════════════════════════════════════════════════ */
function drawLv4(ctx, sc, w, h, def, t) {
    var baseW = 122, baseH = 50;
    var flH = 42*sc;
    
    // LEFT GYM / ANNEX WING
    var gymW = 28*sc, gymH = 48*sc;
    ctx.fillStyle = '#d8b840';
    ctx.fillRect(-w/2 - gymW + 2*sc, -gymH, gymW, gymH);
    
    // Gym flat roof
    ctx.fillStyle = '#a08010';
    ctx.fillRect(-w/2 - gymW + 2*sc - 2*sc, -gymH - 3*sc, gymW + 4*sc, 4*sc);
    ctx.fillStyle = '#b09020';
    ctx.fillRect(-w/2 - gymW + 2*sc - 3*sc, -gymH - 7*sc, gymW + 6*sc, 5*sc);
    
    // Gym big window
    ctx.fillStyle = 'rgba(255,248,180,0.55)';
    ctx.fillRect(-w/2 - gymW + 8*sc, -gymH + 8*sc, gymW - 8*sc, gymH * 0.4);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.7*sc;
    for (var gi = 0; gi < 3; gi++) {
        ctx.beginPath();
        ctx.moveTo(-w/2 - gymW + 8*sc + gi * ((gymW - 8*sc) / 3), -gymH + 8*sc);
        ctx.lineTo(-w/2 - gymW + 8*sc + gi * ((gymW - 8*sc) / 3), -gymH + 8*sc + gymH * 0.4);
        ctx.stroke();
    }
    
    // Gym label
    ctx.fillStyle = '#7a5810';
    ctx.font = 'bold ' + (6*sc) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GYM', -w/2 - gymW + 2*sc + gymW/2, -gymH * 0.55);
    
    // COVERED WALKWAY
    var walkW = 10*sc, walkH = 24*sc;
    ctx.fillStyle = '#a07818';
    ctx.fillRect(-w/2 - 2*sc, -walkH - 2*sc, walkW + 4*sc, 4*sc);
    ctx.strokeStyle = '#c8a830';
    ctx.lineWidth = 1.5*sc;
    ctx.beginPath();
    ctx.moveTo(-w/2, -walkH);
    ctx.lineTo(-w/2, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w/2 + walkW, -walkH);
    ctx.lineTo(-w/2 + walkW, 0);
    ctx.stroke();
    
    // MAIN 2-STOREY BLOCK
    ctx.fillStyle = '#e8c84a';
    ctx.fillRect(-w/2, -flH, w, flH);
    ctx.fillStyle = '#806010';
    ctx.fillRect(-w/2 - 2*sc, -flH - 3*sc, w + 4*sc, 4*sc);
    ctx.fillStyle = '#907020';
    ctx.fillRect(-w/2 - 3*sc, -flH - 5.5*sc, w + 6*sc, 3*sc);
    
    // Second floor
    ctx.fillStyle = '#eecf52';
    ctx.fillRect(-w/2, -flH*2 - 5*sc, w, flH);
    
    // Flat roof
    ctx.fillStyle = '#a08010';
    ctx.fillRect(-w/2 - 2*sc, -flH*2 - 8*sc, w + 4*sc, 4*sc);
    ctx.fillStyle = '#b09020';
    ctx.fillRect(-w/2 - 3*sc, -flH*2 - 12*sc, w + 6*sc, 5*sc);
    
    // Battlements
    ctx.fillStyle = '#b89020';
    for (var bi = -6; bi <= 6; bi++) {
        if (bi % 2 === 0) {
            ctx.fillRect(bi * w * 0.075 - 4*sc, -flH*2 - 19*sc, 8*sc, 7*sc);
        }
    }
    
    // Full-width balcony
    ctx.fillStyle = '#c8a830';
    ctx.fillRect(-w/2 - 1*sc, -flH - 5.5*sc, w + 2*sc, flH * 0.11);
    ctx.fillStyle = '#a88018';
    ctx.fillRect(-w/2 - 2*sc, -flH - 5.5*sc, w + 4*sc, 2*sc);
    
    ctx.strokeStyle = '#9a7818';
    ctx.lineWidth = 0.85*sc;
    for (var ri = 0; ri <= 12; ri++) {
        ctx.beginPath();
        ctx.moveTo(-w/2 + ri * (w / 12), -flH - 5.5*sc);
        ctx.lineTo(-w/2 + ri * (w / 12), -flH - 14*sc);
        ctx.stroke();
    }
    ctx.strokeStyle = '#c8a830';
    ctx.lineWidth = 1.1*sc;
    ctx.beginPath();
    ctx.moveTo(-w/2, -flH - 14*sc);
    ctx.lineTo(w/2, -flH - 14*sc);
    ctx.stroke();
    
    // Door and windows (more classrooms)
    ctx.fillStyle = 'rgba(80,60,0,0.82)';
    ctx.fillRect(-8*sc, -flH * 0.52, 16*sc, flH * 0.52);
    ctx.strokeStyle = 'rgba(200,180,50,0.35)';
    ctx.lineWidth = 1*sc;
    ctx.strokeRect(-8*sc, -flH * 0.52, 16*sc, flH * 0.52);
    
    [-w*0.44, -w*0.28, -w*0.12, w*0.08, w*0.24, w*0.4].forEach(function(wx) {
        drawSchoolWindow(ctx, wx, -flH * 0.77, 11*sc, 9*sc);
    });
    
    // 2F windows
    var f2y = -flH*2 - 5*sc + flH * 0.22;
    [-w*0.44, -w*0.28, -w*0.12, w*0.08, w*0.24, w*0.4].forEach(function(wx) {
        drawSchoolWindow(ctx, wx, f2y, 11*sc, 9*sc);
    });
    
    // Main sign
    drawSchoolSign(ctx, -w*0.32, -flH * 0.61, w*0.64, 11*sc, 'MATAAS NA PAARALAN');
    
    // Flagpole center
    drawFlagpole(ctx, 0, -flH*2 - 5*sc, 46*sc, t);
    
    // Trees
    [w*0.48, -w*0.5 - gymW + gymW/2].forEach(function(tx) {
        ctx.strokeStyle = '#6a4818';
        ctx.lineWidth = 1.5*sc;
        ctx.beginPath();
        ctx.moveTo(tx, 0);
        ctx.lineTo(tx, -22*sc);
        ctx.stroke();
        ctx.fillStyle = '#3a8828';
        ctx.beginPath();
        ctx.ellipse(tx, -26*sc, 9*sc, 8*sc, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#4a9838';
        ctx.beginPath();
        ctx.ellipse(tx - 4*sc, -22*sc, 6*sc, 5*sc, 0, 0, Math.PI*2);
        ctx.fill();
    });
    
    // Steps
    ctx.fillStyle = '#c8a828';
    ctx.fillRect(-w*0.35, 0, w*0.7, 4*sc);
    ctx.fillStyle = '#d8b838';
    ctx.fillRect(-w*0.42, -4*sc, w*0.84, 4*sc);
}

/* ══════════════════════════════════════════════════════════════
   Level 5 — Pamantasan (Grand university)
══════════════════════════════════════════════════════════════ */
function drawLv5(ctx, sc, w, h, def, t) {
    var baseW = 152, baseH = 58;
    var flH = 42*sc;
    
    // OUTER CLASSROOM WINGS
    var owW = 26*sc, owH = 52*sc;
    
    function drawOuterWing(lx) {
        ctx.fillStyle = '#d8b840';
        ctx.fillRect(lx, -owH, owW, owH);
        ctx.fillStyle = '#806010';
        ctx.fillRect(lx - 1*sc, -owH * 0.5 - 1.5*sc, owW + 2*sc, 3*sc);
        // Flat roof
        ctx.fillStyle = '#a08010';
        ctx.fillRect(lx - 2*sc, -owH - 3*sc, owW + 4*sc, 4*sc);
        ctx.fillStyle = '#b09020';
        ctx.fillRect(lx - 3*sc, -owH - 7*sc, owW + 6*sc, 5*sc);
        // Battlements
        ctx.fillStyle = '#b89020';
        for (var bi = 0; bi < 3; bi++) {
            if (bi % 2 === 0) {
                ctx.fillRect(lx + bi * owW * 0.32 + 2*sc, -owH - 12*sc, 7*sc, 6*sc);
            }
        }
        // Windows
        drawSchoolWindow(ctx, lx + 4*sc, -owH * 0.78, owW - 8*sc, 9*sc);
        drawSchoolWindow(ctx, lx + 4*sc, -owH * 0.44, owW - 8*sc, 9*sc);
        // Corridor
        ctx.fillStyle = '#c8a830';
        ctx.fillRect(lx - 1*sc, -owH * 0.5 - 3*sc, owW + 2*sc, owH * 0.1);
        ctx.strokeStyle = '#9a7818';
        ctx.lineWidth = 0.8*sc;
        for (var ri = 0; ri <= 4; ri++) {
            ctx.beginPath();
            ctx.moveTo(lx + ri * (owW / 4), -owH * 0.5 - 3*sc);
            ctx.lineTo(lx + ri * (owW / 4), -owH * 0.5 - 11*sc);
            ctx.stroke();
        }
    }
    
    drawOuterWing(-w/2 - owW + 2*sc);
    drawOuterWing(w/2 - 2*sc);
    
    // INNER WINGS
    var iwW = 32*sc, iwH = 56*sc;
    
    function drawInnerWing(lx) {
        ctx.fillStyle = '#e0c248';
        ctx.fillRect(lx, -iwH, iwW, iwH);
        ctx.fillStyle = '#806010';
        ctx.fillRect(lx - 1*sc, -iwH * 0.5 - 1.5*sc, iwW + 2*sc, 3*sc);
        // Roof
        ctx.fillStyle = '#a08010';
        ctx.fillRect(lx - 2*sc, -iwH - 3*sc, iwW + 4*sc, 4*sc);
        ctx.fillStyle = '#b09020';
        ctx.fillRect(lx - 3*sc, -iwH - 7*sc, iwW + 6*sc, 5*sc);
        // Battlements
        ctx.fillStyle = '#b89020';
        for (var bi = 0; bi < 4; bi++) {
            if (bi % 2 === 0) {
                ctx.fillRect(lx + bi * iwW * 0.26 + 2*sc, -iwH - 12*sc, 7*sc, 6*sc);
            }
        }
        // Windows
        drawSchoolWindow(ctx, lx + 4*sc, -iwH * 0.78, iwW - 8*sc, 9*sc);
        drawSchoolWindow(ctx, lx + 4*sc, -iwH * 0.44, iwW - 8*sc, 9*sc);
        // Corridor balcony
        ctx.fillStyle = '#c8a830';
        ctx.fillRect(lx - 1*sc, -iwH * 0.5 - 3*sc, iwW + 2*sc, iwH * 0.09);
        ctx.strokeStyle = '#9a7818';
        ctx.lineWidth = 0.8*sc;
        for (var ri = 0; ri <= 5; ri++) {
            ctx.beginPath();
            ctx.moveTo(lx + ri * (iwW / 5), -iwH * 0.5 - 3*sc);
            ctx.lineTo(lx + ri * (iwW / 5), -iwH * 0.5 - 11*sc);
            ctx.stroke();
        }
        // Columns
        drawPillar(ctx, lx + 5*sc, -iwH, 0, 4*sc);
        drawPillar(ctx, lx + iwW - 5*sc, -iwH, 0, 4*sc);
    }
    
    drawInnerWing(-w/2 + owW * 0.0);
    drawInnerWing(w/2 - iwW);
    
    // MAIN CENTRAL HALL (3-storey)
    var mbW = 64*sc, mbH = flH, mb2H = flH * 0.9, mb3H = flH * 0.6;
    
    // Ground floor
    ctx.fillStyle = '#e8c84a';
    ctx.fillRect(-mbW/2, -mbH, mbW, mbH);
    ctx.fillStyle = '#806010';
    ctx.fillRect(-mbW/2 - 2*sc, -mbH - 3*sc, mbW + 4*sc, 4*sc);
    ctx.fillStyle = '#907020';
    ctx.fillRect(-mbW/2 - 3*sc, -mbH - 6*sc, mbW + 6*sc, 3.5*sc);
    
    // Second floor
    ctx.fillStyle = '#eecf52';
    ctx.fillRect(-mbW/2, -mbH - mb2H, mbW, mb2H);
    ctx.fillStyle = '#706008';
    ctx.fillRect(-mbW/2 - 2*sc, -mbH - mb2H - 2*sc, mbW + 4*sc, 4*sc);
    ctx.fillStyle = '#806010';
    ctx.fillRect(-mbW/2 - 3*sc, -mbH - mb2H - 5.5*sc, mbW + 6*sc, 3.5*sc);
    
    // Third floor
    ctx.fillStyle = '#f0d55a';
    ctx.fillRect(-mbW/2, -mbH - mb2H - mb3H, mbW, mb3H);
    
    // Flat roof
    ctx.fillStyle = '#a08010';
    ctx.fillRect(-mbW/2 - 2*sc, -mbH - mb2H - mb3H - 3*sc, mbW + 4*sc, 4*sc);
    ctx.fillStyle = '#b09020';
    ctx.fillRect(-mbW/2 - 3*sc, -mbH - mb2H - mb3H - 7*sc, mbW + 6*sc, 5*sc);
    
    // 3F battlements
    ctx.fillStyle = '#b89020';
    for (var bi = -4; bi <= 4; bi++) {
        if (bi % 2 === 0) {
            ctx.fillRect(bi * mbW * 0.11 - 4*sc, -mbH - mb2H - mb3H - 12*sc, 8*sc, 7*sc);
        }
    }
    
    // BELL TOWER
    var twH = mb3H * 1.8, twW = 20*sc;
    var twBase = -mbH - mb2H - mb3H;
    ctx.fillStyle = '#f0d560';
    ctx.fillRect(-twW/2, twBase - twH, twW, twH);
    // Tower spire
    ctx.fillStyle = '#b89020';
    ctx.beginPath();
    ctx.moveTo(-twW/2 - 2*sc, twBase - twH);
    ctx.lineTo(0, twBase - twH - 26*sc);
    ctx.lineTo(twW/2 + 2*sc, twBase - twH);
    ctx.closePath();
    ctx.fill();
    
    // Bell
    var bellY = twBase - twH * 0.45;
    ctx.fillStyle = '#d4a820';
    ctx.beginPath();
    ctx.arc(0, bellY, 5.5*sc, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#f5c820';
    ctx.beginPath();
    ctx.arc(0, bellY, 3.5*sc, 0, Math.PI*2);
    ctx.fill();
    
    // Tower arch openings
    ctx.fillStyle = 'rgba(20,15,0,0.8)';
    ctx.beginPath();
    ctx.rect(-5*sc, twBase - twH * 0.8, 10*sc, 8*sc);
    ctx.arc(0, twBase - twH * 0.8, 5*sc, Math.PI, 0, true);
    ctx.fill();
    
    // Grand portico columns
    [-mbW*0.42, -mbW*0.24, -mbW*0.06, mbW*0.06, mbW*0.24, mbW*0.42].forEach(function(cx) {
        drawPillar(ctx, cx, -mbH, 0, 5.5*sc);
    });
    
    // GF door and windows
    ctx.fillStyle = 'rgba(70,52,0,0.85)';
    ctx.fillRect(-8*sc, -mbH * 0.52, 16*sc, mbH * 0.52);
    ctx.strokeStyle = 'rgba(220,190,60,0.45)';
    ctx.lineWidth = 1.1*sc;
    ctx.strokeRect(-8*sc, -mbH * 0.52, 16*sc, mbH * 0.52);
    
    [-mbW*0.44, -mbW*0.26, mbW*0.1, mbW*0.28].forEach(function(wx) {
        drawSchoolWindow(ctx, wx, -mbH * 0.76, 11*sc, 9*sc);
    });
    
    // 2F windows
    var f2y = -mbH - mb2H * 0.76;
    [-mbW*0.42, -mbW*0.24, mbW*0.08, mbW*0.26].forEach(function(wx) {
        drawSchoolWindow(ctx, wx, f2y, 11*sc, 9*sc);
    });
    
    // 3F windows
    var f3y = -mbH - mb2H - mb3H * 0.72;
    [-mbW*0.36, -mbW*0.18, mbW*0.04, mbW*0.22].forEach(function(wx) {
        drawSchoolWindow(ctx, wx, f3y, 10*sc, 8*sc);
    });
    
    // Grand sign
    drawSchoolSign(ctx, -mbW*0.38, -mbH - mb2H * 0.28, mbW*0.76, 13*sc, 'PAMANTASAN');
    
    // Grand entrance gate arch
    ctx.strokeStyle = '#c8a828';
    ctx.lineWidth = 2*sc;
    ctx.beginPath();
    ctx.arc(0, 2*sc, mbW*0.32, -Math.PI, 0, false);
    ctx.stroke();
    ctx.fillStyle = '#c8a828';
    [-mbW*0.32, mbW*0.32 - 4*sc].forEach(function(px) {
        ctx.fillRect(px, 0, 4*sc, 8*sc);
        ctx.fillRect(px - 1*sc, -2*sc, 6*sc, 3*sc);
    });
    
    // Wide steps
    ctx.fillStyle = '#c8a828';
    ctx.fillRect(-mbW/2 - 2*sc, 0, mbW + 4*sc, 4*sc);
    ctx.fillStyle = '#d8b838';
    ctx.fillRect(-mbW/2 - 6*sc, -4*sc, mbW + 12*sc, 4*sc);
    ctx.fillStyle = '#c8a828';
    ctx.fillRect(-mbW/2 - 10*sc, -8*sc, mbW + 20*sc, 4*sc);
    ctx.fillStyle = '#b89820';
    ctx.fillRect(-mbW/2 - 14*sc, -12*sc, mbW + 28*sc, 4*sc);
    
    // Flagpole on bell tower
    var flagBase = twBase - twH - 26*sc;
    ctx.strokeStyle = '#b89020';
    ctx.lineWidth = 1.2*sc;
    ctx.beginPath();
    ctx.moveTo(0, flagBase);
    ctx.lineTo(0, flagBase - 16*sc);
    ctx.stroke();
    ctx.fillStyle = '#cc2222';
    ctx.beginPath();
    ctx.moveTo(0, flagBase - 16*sc);
    ctx.lineTo(16*sc, flagBase - 10*sc);
    ctx.lineTo(0, flagBase - 4*sc);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f5c820';
    ctx.beginPath();
    ctx.arc(0, flagBase - 16*sc, 2*sc, 0, Math.PI*2);
    ctx.fill();
    
    // Campus trees
    [-w*0.5 - owW*0.5, w*0.5 + owW*0.5].forEach(function(tx) {
        ctx.strokeStyle = '#6a4818';
        ctx.lineWidth = 1.5*sc;
        ctx.beginPath();
        ctx.moveTo(tx, 0);
        ctx.lineTo(tx, -24*sc);
        ctx.stroke();
        ctx.fillStyle = '#2a7820';
        ctx.beginPath();
        ctx.ellipse(tx, -28*sc, 10*sc, 9*sc, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#3a8828';
        ctx.beginPath();
        ctx.ellipse(tx - 5*sc, -24*sc, 7*sc, 6*sc, 0, 0, Math.PI*2);
        ctx.fill();
    });
}

/* ══════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
══════════════════════════════════════════════════════════════ */

function drawSchoolWindow(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(255,250,200,0.7)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(x + w/2, y);
    ctx.lineTo(x + w/2, y + h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + h/2);
    ctx.lineTo(x + w, y + h/2);
    ctx.stroke();
}

function drawFlagpole(ctx, x, baseY, poleH, t) {
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x, baseY - poleH);
    ctx.stroke();
    
    // Animated flag
    var fw = 14, fh = 9;
    var fy = baseY - poleH;
    ctx.save();
    ctx.translate(x, fy);
    
    ctx.fillStyle = '#3a6abf';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (var i = 0; i <= fw; i++) {
        ctx.lineTo(i, Math.sin(t * 2 + i * 0.4) * 1.5);
    }
    ctx.lineTo(fw, fh/2);
    ctx.lineTo(0, fh/2);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#cc2222';
    ctx.beginPath();
    ctx.moveTo(0, fh/2);
    for (var i = 0; i <= fw; i++) {
        ctx.lineTo(i, fh/2 + Math.sin(t * 2 + i * 0.4) * 1.5);
    }
    ctx.lineTo(fw, fh);
    ctx.lineTo(0, fh);
    ctx.closePath();
    ctx.fill();
    
    // White triangle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, fh);
    ctx.lineTo(fh * 0.8, fh/2);
    ctx.closePath();
    ctx.fill();
    
    // Sun
    ctx.fillStyle = '#f5c842';
    ctx.beginPath();
    ctx.arc(fh * 0.35, fh/2, 2, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
    
    // Finial
    ctx.fillStyle = '#f5c842';
    ctx.beginPath();
    ctx.arc(x, baseY - poleH, 2, 0, Math.PI*2);
    ctx.fill();
}

function drawSchoolSign(ctx, x, y, w, h, text) {
    ctx.fillStyle = '#2a4a10';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.7;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#f0f0e0';
    ctx.font = 'bold ' + (h * 0.62) + 'px Oldenburg,serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w/2, y + h/2 + 0.5);
    ctx.textBaseline = 'alphabetic';
}

function drawPillar(ctx, x, yTop, yBot, w) {
    ctx.fillStyle = '#d8c858';
    ctx.fillRect(x - w/2, yTop, w, -yTop);
    ctx.fillStyle = '#e8d868';
    ctx.fillRect(x - w/2, yTop - 2, w, 3);
}