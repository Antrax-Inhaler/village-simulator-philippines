/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/sprites/mine.js

   Level-aware sprite for Minahan ng Langis (Oil Mine)
   Design based on the official upgrade level previews.
   Levels 1–5 with progressive industrial complexity.
═══════════════════════════════════════════════════════════════ */

/**
 * drawSprite — renders Minahan ng Langis building for any level 1–5
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} sc                perspective scale (pixel multiplier)
 * @param {number} w                 building width (scaled)
 * @param {number} h                 building height (scaled)
 * @param {object} def               BUILDING_DEFS entry
 * @param {number} level             building level (1–5)
 * @param {number} now               timestamp for animations
 */
export function drawSprite(ctx, sc, w, h, def, level, now) {
    // Animation time for pumps, smoke, flares
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
   Level 1 — Maliit na Balon (Small hand-dug well)
   Simple wooden derrick frame, wellhead, single barrel
══════════════════════════════════════════════════════════════ */
function drawLv1(ctx, sc, w, h, def, t) {
    var baseW = 58, baseH = 44;
    
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 3, w * 0.48, 5 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Industrial ground base
    ctx.fillStyle = '#1a1408';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#221a0a';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    
    // Oil puddle sheen
    ctx.fillStyle = 'rgba(60,30,0,0.4)';
    ctx.fillRect(-w/2, 8 * sc, w, 3 * sc);
    
    // Simple wooden derrick frame (4 legs)
    ctx.strokeStyle = '#4a3010';
    ctx.lineWidth = 2.5 * sc;
    ctx.lineCap = 'round';
    
    // Left legs
    ctx.beginPath();
    ctx.moveTo(-18 * sc, 0);
    ctx.lineTo(-6 * sc, -44 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-14 * sc, 0);
    ctx.lineTo(-6 * sc, -44 * sc);
    ctx.stroke();
    
    // Right legs
    ctx.beginPath();
    ctx.moveTo(18 * sc, 0);
    ctx.lineTo(6 * sc, -44 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(14 * sc, 0);
    ctx.lineTo(6 * sc, -44 * sc);
    ctx.stroke();
    
    // Cross braces
    ctx.lineWidth = 1.5 * sc;
    ctx.beginPath();
    ctx.moveTo(-16 * sc, -12 * sc);
    ctx.lineTo(16 * sc, -12 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-14 * sc, -26 * sc);
    ctx.lineTo(14 * sc, -26 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10 * sc, -38 * sc);
    ctx.lineTo(10 * sc, -38 * sc);
    ctx.stroke();
    
    // X braces
    ctx.beginPath();
    ctx.moveTo(-16 * sc, -12 * sc);
    ctx.lineTo(14 * sc, -26 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(16 * sc, -12 * sc);
    ctx.lineTo(-14 * sc, -26 * sc);
    ctx.stroke();
    
    // Crown pulley
    ctx.fillStyle = '#5a3a10';
    ctx.fillRect(-4 * sc, -46 * sc, 8 * sc, 4 * sc);
    ctx.lineCap = 'butt';
    
    // Cable
    ctx.strokeStyle = 'rgba(180,140,60,0.5)';
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.moveTo(0, -44 * sc);
    ctx.lineTo(0, -2 * sc);
    ctx.stroke();
    
    // Wellhead
    ctx.fillStyle = '#3a2808';
    ctx.fillRect(-8 * sc, -6 * sc, 16 * sc, 6 * sc);
    ctx.fillStyle = '#4a3810';
    ctx.fillRect(-10 * sc, -8 * sc, 20 * sc, 3 * sc);
    
    // Valve wheel
    ctx.strokeStyle = '#6a4820';
    ctx.lineWidth = 1.5 * sc;
    ctx.beginPath();
    ctx.arc(-14 * sc, -4 * sc, 5 * sc, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-14 * sc, -9 * sc);
    ctx.lineTo(-14 * sc, 1 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-19 * sc, -4 * sc);
    ctx.lineTo(-9 * sc, -4 * sc);
    ctx.stroke();
    
    // Oil barrel
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(20 * sc, -14 * sc, 12 * sc, 14 * sc);
    ctx.strokeStyle = 'rgba(255,160,30,0.3)';
    ctx.lineWidth = 0.8 * sc;
    ctx.beginPath();
    ctx.moveTo(20 * sc, -10 * sc);
    ctx.lineTo(32 * sc, -10 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(20 * sc, -5 * sc);
    ctx.lineTo(32 * sc, -5 * sc);
    ctx.stroke();
    ctx.fillStyle = '#f5c842';
    ctx.fillRect(21 * sc, -12 * sc, 10 * sc, 5 * sc);
    
    // "OIL" text on barrel
    ctx.fillStyle = '#0a0804';
    ctx.font = 'bold ' + (3.5 * sc) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OIL', 26 * sc, -9.5 * sc);
    
    // Tiny smoke puff
    smokePuff(ctx, 0, -46 * sc, t, 'rgba(60,50,30,', 0.5);
    
    ctx.textBaseline = 'alphabetic';
}

/* ══════════════════════════════════════════════════════════════
   Level 2 — Pump Jack (Nodding donkey pump)
   Classic pump jack, wellhead, pipes, 2 barrels
══════════════════════════════════════════════════════════════ */
function drawLv2(ctx, sc, w, h, def, t) {
    var baseW = 58, baseH = 44;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 3, w * 0.65, 5 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ground
    ctx.fillStyle = '#1a1408';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#221a0a';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    ctx.fillStyle = 'rgba(60,30,0,0.4)';
    ctx.fillRect(-w/2, 8 * sc, w, 3 * sc);
    
    // Pump jack (nodding donkey)
    pumpJack(ctx, 0, 0, 52 * sc, t, sc);
    
    // Pipe to barrels
    pipe(ctx, 20 * sc, 0, 44 * sc, 0, 3 * sc);
    pipe(ctx, 44 * sc, 0, 44 * sc, -8 * sc, 3 * sc);
    
    // 2 barrels stacked
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(38 * sc, -14 * sc, 14 * sc, 14 * sc);
    ctx.fillRect(38 * sc, -28 * sc, 14 * sc, 14 * sc);
    ctx.strokeStyle = 'rgba(255,160,30,0.28)';
    ctx.lineWidth = 0.8 * sc;
    ctx.beginPath();
    ctx.moveTo(38 * sc, -7 * sc);
    ctx.lineTo(52 * sc, -7 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(38 * sc, -21 * sc);
    ctx.lineTo(52 * sc, -21 * sc);
    ctx.stroke();
    
    // Small control shed
    ctx.fillStyle = '#261a06';
    ctx.fillRect(-40 * sc, -22 * sc, 18 * sc, 22 * sc);
    ctx.fillStyle = '#1a1006';
    ctx.fillRect(-40 * sc, -22 * sc, 18 * sc, 3 * sc);
    ctx.fillStyle = 'rgba(255,200,80,0.4)';
    ctx.fillRect(-38 * sc, -18 * sc, 6 * sc, 5 * sc);
    ctx.fillRect(-32 * sc, -18 * sc, 6 * sc, 5 * sc);
    
    // Small flare
    flare(ctx, -50 * sc, 0, t, 20 * sc, sc);
    
    // Caution stripe on shed
    cautionStripe(ctx, -40 * sc, -4 * sc, 18 * sc, 4 * sc, sc);
}

/* ══════════════════════════════════════════════════════════════
   Level 3 — Pump Station
   Multiple pump jacks, storage tank, pipes, control building
══════════════════════════════════════════════════════════════ */
function drawLv3(ctx, sc, w, h, def, t) {
    var baseW = 58, baseH = 44;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 3, w * 0.96, 6 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ground
    ctx.fillStyle = '#1a1408';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#221a0a';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    ctx.fillStyle = 'rgba(60,30,0,0.45)';
    ctx.fillRect(-w/2, 8 * sc, w, 4 * sc);
    
    // Storage tank left
    tank(ctx, -56 * sc, -10 * sc, 16 * sc, 38 * sc, '#2a1a06', sc);
    pipe(ctx, -40 * sc, -8 * sc, -22 * sc, -8 * sc, 3 * sc);
    
    // 2 pump jacks
    pumpJack(ctx, -14 * sc, 0, 48 * sc, t, sc);
    pumpJack(ctx, 22 * sc, 0, 44 * sc, t + 1.2, sc);
    
    // Connecting pipes
    pipe(ctx, -14 * sc, -4 * sc, 22 * sc, -4 * sc, 3 * sc);
    pipe(ctx, 22 * sc, -4 * sc, 48 * sc, -4 * sc, 3 * sc);
    pipe(ctx, 48 * sc, -4 * sc, 48 * sc, -14 * sc, 3 * sc);
    
    // Control building
    ctx.fillStyle = '#221808';
    ctx.fillRect(36 * sc, -36 * sc, 28 * sc, 36 * sc);
    flatRoof(ctx, 36 * sc, -36 * sc, 28 * sc, sc);
    
    // Windows (glowing)
    ctx.fillStyle = 'rgba(255,200,80,0.5)';
    ctx.fillRect(39 * sc, -30 * sc, 8 * sc, 7 * sc);
    ctx.fillRect(51 * sc, -30 * sc, 8 * sc, 7 * sc);
    ctx.fillStyle = 'rgba(255,220,100,0.15)';
    ctx.fillRect(39 * sc, -30 * sc, 8 * sc, 7 * sc);
    ctx.fillRect(51 * sc, -30 * sc, 8 * sc, 7 * sc);
    
    // Door
    ctx.fillStyle = 'rgba(10,8,4,0.9)';
    ctx.fillRect(45 * sc, -18 * sc, 8 * sc, 18 * sc);
    ctx.strokeStyle = 'rgba(255,160,30,0.35)';
    ctx.lineWidth = 0.8 * sc;
    ctx.strokeRect(45 * sc, -18 * sc, 8 * sc, 18 * sc);
    
    // Caution stripe
    cautionStripe(ctx, 36 * sc, -4 * sc, 28 * sc, 4 * sc, sc);
    
    // Ladder
    ladder(ctx, 62 * sc, -36 * sc, 36 * sc, sc);
    
    // Flare stack
    flare(ctx, -56 * sc, 0, t, 28 * sc, sc);
    
    // Chimney
    chimney(ctx, 36 * sc, -36 * sc, 20 * sc, 8 * sc, t, sc);
    
    // Station sign
    ctx.fillStyle = '#f5c842';
    ctx.fillRect(38 * sc, -38 * sc, 24 * sc, 7 * sc);
    ctx.fillStyle = '#0a0804';
    ctx.font = 'bold ' + (4 * sc) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PUMP STN', 50 * sc, -34.5 * sc);
    ctx.textBaseline = 'alphabetic';
}

/* ══════════════════════════════════════════════════════════════
   Level 4 — Oil Processing Hub
   3 pump jacks, 2 large tanks, processing unit, pipe network
══════════════════════════════════════════════════════════════ */
function drawLv4(ctx, sc, w, h, def, t) {
    var baseW = 58, baseH = 44;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 3, w * 1.17, 7 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ground with orange haze
    ctx.fillStyle = '#1a1408';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#221a0a';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    ctx.fillStyle = 'rgba(80,40,0,0.5)';
    ctx.fillRect(-w/2, 8 * sc, w, 5 * sc);
    
    // LEFT TANK FARM (2 tanks)
    tank(ctx, -70 * sc, -6 * sc, 18 * sc, 44 * sc, '#241a04', sc);
    tank(ctx, -46 * sc, -6 * sc, 14 * sc, 36 * sc, '#2a1e06', sc);
    
    // Tank pipe manifold
    pipe(ctx, -70 * sc, -10 * sc, -46 * sc, -10 * sc, 4 * sc);
    pipe(ctx, -52 * sc, -10 * sc, -36 * sc, -10 * sc, 3 * sc);
    pipe(ctx, -36 * sc, -10 * sc, -36 * sc, -4 * sc, 3 * sc);
    
    // 3 PUMP JACKS
    pumpJack(ctx, -28 * sc, 0, 50 * sc, t, sc);
    pumpJack(ctx, 4 * sc, 0, 46 * sc, t, sc);
    pumpJack(ctx, 34 * sc, 0, 50 * sc, t, sc);
    
    // Pipe network
    pipe(ctx, -28 * sc, -4 * sc, 4 * sc, -4 * sc, 3 * sc);
    pipe(ctx, 4 * sc, -4 * sc, 34 * sc, -4 * sc, 3 * sc);
    pipe(ctx, 34 * sc, -4 * sc, 58 * sc, -4 * sc, 3 * sc);
    pipe(ctx, 58 * sc, -4 * sc, 58 * sc, -18 * sc, 3 * sc);
    
    // PROCESSING UNIT
    var pbx = 42 * sc, pby = -18 * sc, pbw = 36 * sc, pbh = 42 * sc;
    ctx.fillStyle = '#1e1606';
    ctx.fillRect(pbx, -pbh, pbw, pbh);
    
    // 2nd level
    ctx.fillStyle = '#241c08';
    ctx.fillRect(pbx + 4 * sc, -pbh - 20 * sc, pbw - 8 * sc, 20 * sc);
    flatRoof(ctx, pbx + 4 * sc, -pbh - 20 * sc, pbw - 8 * sc, sc);
    
    // Windows (glowing)
    ctx.fillStyle = 'rgba(255,180,60,0.5)';
    [pbx + 6 * sc, pbx + 16 * sc, pbx + 26 * sc].forEach(function(wx) {
        ctx.fillRect(wx, -pbh + 6 * sc, 8 * sc, 8 * sc);
    });
    [pbx + 8 * sc, pbx + 20 * sc].forEach(function(wx) {
        ctx.fillRect(wx, -pbh - 16 * sc, 8 * sc, 7 * sc);
    });
    
    // Door
    ctx.fillStyle = 'rgba(8,6,2,0.9)';
    ctx.fillRect(pbx + pbw/2 - 5 * sc, -pbh * 0.45, 10 * sc, pbh * 0.45);
    ctx.strokeStyle = 'rgba(255,160,30,0.4)';
    ctx.lineWidth = 0.9 * sc;
    ctx.strokeRect(pbx + pbw/2 - 5 * sc, -pbh * 0.45, 10 * sc, pbh * 0.45);
    
    // Caution stripe
    cautionStripe(ctx, pbx, -4 * sc, pbw, 5 * sc, sc);
    
    // Ladder
    ladder(ctx, pbx + pbw - 3 * sc, -pbh - 20 * sc, pbh + 20 * sc, sc);
    
    // Sign
    ctx.fillStyle = '#f5c842';
    ctx.fillRect(pbx + 4 * sc, -pbh - 23 * sc, pbw - 12 * sc, 7 * sc);
    ctx.fillStyle = '#0a0804';
    ctx.font = 'bold ' + (4 * sc) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OIL HUB', pbx + pbw/2, -pbh - 19.5 * sc);
    
    // Tall chimney
    chimney(ctx, pbx + pbw + 6 * sc, -pbh - 20 * sc, 30 * sc, 10 * sc, t, sc);
    
    // 2 flares
    flare(ctx, -78 * sc, 0, t, 30 * sc, sc);
    flare(ctx, pbx + pbw + 18 * sc, 0, t, 22 * sc, sc);
    
    // Glow from flares
    var fg = ctx.createRadialGradient(-78 * sc, -30 * sc, 2 * sc, -78 * sc, -30 * sc, 40 * sc);
    fg.addColorStop(0, 'rgba(255,100,20,0.12)');
    fg.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(-78 * sc, -30 * sc, 40 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.textBaseline = 'alphabetic';
}

/* ══════════════════════════════════════════════════════════════
   Level 5 — Grand Refinery
   Full refinery complex: distillation tower, 4 pump jacks,
   multiple tanks, pipe racks, control tower, loading bay
══════════════════════════════════════════════════════════════ */
function drawLv5(ctx, sc, w, h, def, t) {
    var baseW = 58, baseH = 44;
    
    // Heavy shadow
    ctx.fillStyle = 'rgba(0,0,0,0.36)';
    ctx.beginPath();
    ctx.ellipse(0, 3, w * 1.45, 10 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ground with industrial grime
    ctx.fillStyle = '#1a1408';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#221a0a';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    ctx.fillStyle = 'rgba(100,50,10,0.55)';
    ctx.fillRect(-w/2, 8 * sc, w, 6 * sc);
    
    // LEFT TANK FARM (3 tanks)
    tank(ctx, -84 * sc, -4 * sc, 20 * sc, 54 * sc, '#221806', sc);
    tank(ctx, -60 * sc, -4 * sc, 16 * sc, 46 * sc, '#261c08', sc);
    tank(ctx, -40 * sc, -4 * sc, 13 * sc, 38 * sc, '#2a2008', sc);
    
    // Tank manifold pipes
    pipe(ctx, -84 * sc, -12 * sc, -60 * sc, -12 * sc, 4 * sc);
    pipe(ctx, -60 * sc, -12 * sc, -40 * sc, -12 * sc, 4 * sc);
    pipe(ctx, -40 * sc, -12 * sc, -28 * sc, -12 * sc, 3 * sc);
    pipe(ctx, -28 * sc, -12 * sc, -28 * sc, -4 * sc, 3 * sc);
    
    // 4 PUMP JACKS
    pumpJack(ctx, -22 * sc, 0, 52 * sc, t, sc);
    pumpJack(ctx, 6 * sc, 0, 48 * sc, t, sc);
    pumpJack(ctx, 30 * sc, 0, 52 * sc, t, sc);
    pumpJack(ctx, 54 * sc, 0, 48 * sc, t, sc);
    
    // Interconnect pipes
    pipe(ctx, -22 * sc, -4 * sc, 6 * sc, -4 * sc, 3 * sc);
    pipe(ctx, 6 * sc, -4 * sc, 30 * sc, -4 * sc, 3 * sc);
    pipe(ctx, 30 * sc, -4 * sc, 54 * sc, -4 * sc, 3 * sc);
    pipe(ctx, 54 * sc, -4 * sc, 70 * sc, -4 * sc, 3 * sc);
    pipe(ctx, 70 * sc, -4 * sc, 70 * sc, -18 * sc, 3 * sc);
    
    // DISTILLATION TOWER (tall)
    var dtx = -92 * sc, dth = 88 * sc, dtw = 14 * sc;
    ctx.fillStyle = '#221606';
    ctx.fillRect(dtx - dtw/2, -dth, dtw, dth);
    
    // Banding rings
    ctx.fillStyle = 'rgba(255,150,30,0.2)';
    for (var bi = 0; bi < 6; bi++) {
        ctx.fillRect(dtx - dtw/2, bi * (-dth/6) - dth/6, dtw, 2.5 * sc);
    }
    
    // Dome top
    ctx.fillStyle = '#1e1404';
    ctx.beginPath();
    ctx.ellipse(dtx, -dth, dtw/2, 5 * sc, 0, Math.PI, 0, true);
    ctx.fill();
    
    // Ladder on tower
    ladder(ctx, dtx + dtw/2 - 2 * sc, -dth, dth, sc);
    
    // Pipes off distillation tower
    pipe(ctx, dtx + dtw/2, -dth * 0.7, -84 * sc, -dth * 0.3, 3 * sc);
    pipe(ctx, dtx + dtw/2, -dth * 0.4, -84 * sc, -10 * sc, 3 * sc);
    
    // Smoke from tower
    smokePuff(ctx, dtx, -dth, t, 'rgba(120,90,50,', 1.1);
    
    // MAIN REFINERY BUILDING (3-storey)
    var mbx = 60 * sc, mby = 0, mbw = 52 * sc, mbh = 46 * sc, mb2h = 36 * sc, mb3h = 26 * sc;
    
    // Ground floor
    ctx.fillStyle = '#1e1606';
    ctx.fillRect(mbx, -mbh, mbw, mbh);
    ctx.fillStyle = '#141004';
    ctx.fillRect(mbx - 2 * sc, -mbh - 3 * sc, mbw + 4 * sc, 4 * sc);
    ctx.fillStyle = '#1a1406';
    ctx.fillRect(mbx - 3 * sc, -mbh - 6 * sc, mbw + 6 * sc, 3.5 * sc);
    
    // Second floor
    ctx.fillStyle = '#221a08';
    ctx.fillRect(mbx, -mbh - mb2h, mbw, mb2h);
    ctx.fillStyle = '#0e0c04';
    ctx.fillRect(mbx - 2 * sc, -mbh - mb2h - 2 * sc, mbw + 4 * sc, 4 * sc);
    
    // Third floor
    ctx.fillStyle = '#281e0a';
    ctx.fillRect(mbx, -mbh - mb2h - mb3h, mbw, mb3h);
    flatRoof(ctx, mbx, -mbh - mb2h - mb3h, mbw, sc);
    
    // Ground floor windows
    [mbx + 4 * sc, mbx + 14 * sc, mbx + 24 * sc, mbx + 34 * sc].forEach(function(wx) {
        ctx.fillStyle = 'rgba(255,200,80,0.55)';
        ctx.fillRect(wx, -mbh + 8 * sc, 9 * sc, 8 * sc);
    });
    
    // 2nd floor windows
    var f2y = -mbh - mb2h * 0.75;
    [mbx + 6 * sc, mbx + 18 * sc, mbx + 30 * sc, mbx + 42 * sc].forEach(function(wx) {
        ctx.fillStyle = 'rgba(255,180,60,0.5)';
        ctx.fillRect(wx, f2y, 9 * sc, 8 * sc);
    });
    
    // 3rd floor windows
    var f3y = -mbh - mb2h - mb3h * 0.7;
    [mbx + 8 * sc, mbx + 22 * sc, mbx + 36 * sc].forEach(function(wx) {
        ctx.fillStyle = 'rgba(255,160,40,0.45)';
        ctx.fillRect(wx, f3y, 9 * sc, 7 * sc);
    });
    
    // Main door
    ctx.fillStyle = 'rgba(6,4,2,0.94)';
    ctx.fillRect(mbx + mbw/2 - 6 * sc, -mbh * 0.42, 12 * sc, mbh * 0.42);
    ctx.strokeStyle = 'rgba(255,160,30,0.5)';
    ctx.lineWidth = 1 * sc;
    ctx.strokeRect(mbx + mbw/2 - 6 * sc, -mbh * 0.42, 12 * sc, mbh * 0.42);
    
    // Balcony rail
    ctx.fillStyle = '#1e1606';
    ctx.fillRect(mbx - 1 * sc, -mbh - 4 * sc, mbw + 2 * sc, mbh * 0.08);
    ctx.fillStyle = '#100e04';
    ctx.fillRect(mbx - 2 * sc, -mbh - 4 * sc, mbw + 4 * sc, 2 * sc);
    
    ctx.strokeStyle = '#2a1e08';
    ctx.lineWidth = 0.8 * sc;
    for (var ri = 0; ri <= 10; ri++) {
        ctx.beginPath();
        ctx.moveTo(mbx + ri * (mbw / 10), -mbh - 4 * sc);
        ctx.lineTo(mbx + ri * (mbw / 10), -mbh - 13 * sc);
        ctx.stroke();
    }
    ctx.strokeStyle = '#3a2808';
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.moveTo(mbx, -mbh - 13 * sc);
    ctx.lineTo(mbx + mbw, -mbh - 13 * sc);
    ctx.stroke();
    
    // Caution stripe
    cautionStripe(ctx, mbx, -5 * sc, mbw, 5 * sc, sc);
    
    // Ladder
    ladder(ctx, mbx + mbw - 3 * sc, -mbh - mb2h - mb3h, mbh + mb2h + mb3h, sc);
    
    // Grand sign
    ctx.fillStyle = '#f5c842';
    ctx.fillRect(mbx + 4 * sc, -mbh - mb2h * 0.28, mbw - 8 * sc, 11 * sc);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5 * sc;
    ctx.strokeRect(mbx + 4 * sc, -mbh - mb2h * 0.28, mbw - 8 * sc, 11 * sc);
    ctx.fillStyle = '#080604';
    ctx.font = 'bold ' + (5 * sc) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GRAND REFINERY', mbx + mbw/2, -mbh - mb2h * 0.28 + 5.5 * sc);
    
    // PIPE RACK across site
    for (var ri = 0; ri < 6; ri++) {
        var rx = -20 * sc + ri * 20 * sc;
        ctx.fillStyle = '#3a2808';
        ctx.fillRect(rx - 2 * sc, -18 * sc, 4 * sc, 18 * sc);
        ctx.fillRect(rx - 6 * sc, -18 * sc, 12 * sc, 3 * sc);
    }
    
    // Pipes on rack
    pipe(ctx, -22 * sc, -16 * sc, 80 * sc, -16 * sc, 3 * sc);
    pipe(ctx, -22 * sc, -13 * sc, 80 * sc, -13 * sc, 3 * sc);
    pipe(ctx, -22 * sc, -10 * sc, 80 * sc, -10 * sc, 2 * sc);
    
    // 3 FLARE STACKS
    flare(ctx, -94 * sc, 0, t, 36 * sc, sc);
    flare(ctx, mbx + mbw + 6 * sc, 0, t, 30 * sc, sc);
    flare(ctx, mbx + mbw + 20 * sc, 0, t, 24 * sc, sc);
    
    // 2 TALL CHIMNEYS on building
    chimney(ctx, mbx + 8 * sc, -mbh - mb2h - mb3h, 32 * sc, 10 * sc, t, sc);
    chimney(ctx, mbx + mbw - 8 * sc, -mbh - mb2h - mb3h, 28 * sc, 9 * sc, t, sc);
    
    // Orange sky glows from flares
    [[-94 * sc, -36 * sc], [mbx + mbw + 13 * sc, -30 * sc]].forEach(function(fp) {
        var fg2 = ctx.createRadialGradient(fp[0], fp[1], 3 * sc, fp[0], fp[1], 55 * sc);
        fg2.addColorStop(0, 'rgba(255,100,20,0.16)');
        fg2.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = fg2;
        ctx.beginPath();
        ctx.arc(fp[0], fp[1], 55 * sc, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Blinking red warning light on distillation tower
    var bl = Math.sin(t * 2.5) > 0;
    ctx.fillStyle = bl ? 'rgba(255,40,40,1)' : 'rgba(255,40,40,0.07)';
    ctx.beginPath();
    ctx.arc(dtx, -dth - 3 * sc, 2.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    // Blinking on refinery top
    ctx.fillStyle = bl ? 'rgba(255,120,20,1)' : 'rgba(255,120,20,0.07)';
    ctx.beginPath();
    ctx.arc(mbx + mbw/2, -mbh - mb2h - mb3h - 8 * sc, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.textBaseline = 'alphabetic';
}

/* ══════════════════════════════════════════════════════════════
   HELPER FUNCTIONS (scaled versions of original HTML functions)
══════════════════════════════════════════════════════════════ */

function smokePuff(ctx, x, baseY, t, color, scale) {
    for (var i = 0; i < 6; i++) {
        var frac = ((t * 0.4 + i * 0.18) % 1);
        var py = baseY - frac * 55 * scale;
        var r = (4 + frac * 10) * scale;
        var alpha = (1 - frac) * 0.35;
        ctx.fillStyle = color + alpha + ')';
        ctx.beginPath();
        ctx.arc(x + Math.sin(frac * 8) * 3 * scale, py, r, 0, Math.PI * 2);
        ctx.fill();
    }
}

function flare(ctx, x, baseY, t, h, sc) {
    var flicker = Math.sin(t * 8 + x) * 0.15;
    
    // Stack pipe
    ctx.fillStyle = '#2a1a08';
    ctx.fillRect(x - 2 * sc, baseY - h, 4 * sc, h);
    
    // Flame layers
    ctx.fillStyle = 'rgba(255,120,20,0.9)';
    ctx.beginPath();
    ctx.moveTo(x - 4 * sc, baseY - h);
    ctx.quadraticCurveTo(x + flicker * 8 * sc, baseY - h - 10 * sc, x, baseY - h - 16 * sc);
    ctx.quadraticCurveTo(x - flicker * 8 * sc, baseY - h - 10 * sc, x + 4 * sc, baseY - h);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255,200,40,0.75)';
    ctx.beginPath();
    ctx.moveTo(x - 2.5 * sc, baseY - h);
    ctx.quadraticCurveTo(x + flicker * 5 * sc, baseY - h - 7 * sc, x, baseY - h - 12 * sc);
    ctx.quadraticCurveTo(x - flicker * 5 * sc, baseY - h - 7 * sc, x + 2.5 * sc, baseY - h);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255,255,180,0.6)';
    ctx.beginPath();
    ctx.moveTo(x - 1 * sc, baseY - h);
    ctx.quadraticCurveTo(x, baseY - h - 5 * sc, x, baseY - h - 9 * sc);
    ctx.quadraticCurveTo(x, baseY - h - 5 * sc, x + 1 * sc, baseY - h);
    ctx.closePath();
    ctx.fill();
    
    // Glow
    var gg = ctx.createRadialGradient(x, baseY - h - 8 * sc, 1 * sc, x, baseY - h - 8 * sc, 18 * sc);
    gg.addColorStop(0, 'rgba(255,140,20,0.18)');
    gg.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(x, baseY - h - 8 * sc, 18 * sc, 0, Math.PI * 2);
    ctx.fill();
}

function pumpJack(ctx, x, baseY, h, t, sc) {
    // Base frame
    ctx.fillStyle = '#3a2808';
    ctx.fillRect(x - 10 * sc, baseY - h * 0.25, 20 * sc, h * 0.25);
    
    // Vertical mast
    ctx.fillStyle = '#2e2006';
    ctx.fillRect(x - 4 * sc, baseY - h, 8 * sc, h);
    
    // Diagonal braces
    ctx.strokeStyle = '#3a2808';
    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    ctx.moveTo(x - 10 * sc, baseY);
    ctx.lineTo(x - 4 * sc, baseY - h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 10 * sc, baseY);
    ctx.lineTo(x + 4 * sc, baseY - h);
    ctx.stroke();
    
    // Crank wheel
    var crankAngle = t * 2;
    ctx.strokeStyle = '#4a3010';
    ctx.lineWidth = 2.5 * sc;
    ctx.beginPath();
    ctx.arc(x, baseY - h * 0.25, 8 * sc, 0, Math.PI * 2);
    ctx.stroke();
    
    // Crank pin
    var crankX = x + Math.cos(crankAngle) * 6 * sc;
    var crankY = baseY - h * 0.25 + Math.sin(crankAngle) * 6 * sc;
    ctx.fillStyle = '#6a4010';
    ctx.beginPath();
    ctx.arc(crankX, crankY, 2.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    // Walking beam
    var pivotY = baseY - h - 4 * sc;
    var beamAngle = Math.sin(crankAngle) * 0.35;
    ctx.save();
    ctx.translate(x, pivotY);
    ctx.rotate(beamAngle);
    ctx.fillStyle = '#3a2808';
    ctx.fillRect(-28 * sc, -4 * sc, 56 * sc, 8 * sc);
    
    // Horse head
    ctx.fillStyle = '#2e2006';
    ctx.beginPath();
    ctx.moveTo(28 * sc, -4 * sc);
    ctx.lineTo(36 * sc, -10 * sc);
    ctx.lineTo(36 * sc, 4 * sc);
    ctx.lineTo(28 * sc, 4 * sc);
    ctx.closePath();
    ctx.fill();
    
    // Counterweight
    ctx.fillStyle = '#4a3010';
    ctx.fillRect(-36 * sc, -7 * sc, 10 * sc, 14 * sc);
    ctx.fillRect(-44 * sc, -5 * sc, 10 * sc, 10 * sc);
    ctx.restore();
    
    // Polished rod
    var rodY = pivotY + Math.sin(crankAngle) * 14 * sc;
    ctx.strokeStyle = '#888060';
    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    ctx.moveTo(x + 20 * sc, rodY - 8 * sc);
    ctx.lineTo(x + 20 * sc, baseY);
    ctx.stroke();
    
    // Wellhead
    ctx.fillStyle = '#3a2808';
    ctx.fillRect(x + 14 * sc, baseY - 5 * sc, 12 * sc, 6 * sc);
    ctx.fillStyle = '#4a3010';
    ctx.fillRect(x + 12 * sc, baseY - 8 * sc, 16 * sc, 4 * sc);
}

function tank(ctx, x, y, r, h, color, sc) {
    // Body
    ctx.fillStyle = color || '#2a2008';
    ctx.fillRect(x - r, y - h, r * 2, h);
    
    // Side gradient
    var sg = ctx.createLinearGradient(x - r, 0, x + r, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0.04)');
    sg.addColorStop(0.5, 'rgba(0,0,0,0)');
    sg.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = sg;
    ctx.fillRect(x - r, y - h, r * 2, h);
    
    // Dome top
    ctx.fillStyle = color || '#2a2008';
    ctx.beginPath();
    ctx.ellipse(x, y - h, r, r * 0.35, 0, Math.PI, 0, true);
    ctx.fill();
    
    // Rim
    ctx.strokeStyle = 'rgba(255,180,60,0.2)';
    ctx.lineWidth = 0.8 * sc;
    ctx.beginPath();
    ctx.ellipse(x, y - h, r, r * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Band stripe
    ctx.strokeStyle = 'rgba(255,160,30,0.15)';
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.moveTo(x - r, y - h * 0.4);
    ctx.lineTo(x + r, y - h * 0.4);
    ctx.stroke();
    
    // Bottom shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
}

function pipe(ctx, x1, y1, x2, y2, thick) {
    ctx.strokeStyle = '#3a2808';
    ctx.lineWidth = thick;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Highlight
    ctx.strokeStyle = 'rgba(255,160,30,0.1)';
    ctx.lineWidth = thick * 0.4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.lineCap = 'butt';
}

function chimney(ctx, x, baseY, h, w, t, sc) {
    ctx.fillStyle = '#2a1a06';
    ctx.fillRect(x - w/2, baseY - h, w, h);
    
    // Bands
    ctx.fillStyle = 'rgba(255,80,0,0.25)';
    for (var bi = 0; bi < 3; bi++) {
        ctx.fillRect(x - w/2, baseY - h * 0.25 - bi * h * 0.3, w, 3 * sc);
    }
    
    // Smoke
    smokePuff(ctx, x, baseY - h, t, 'rgba(100,80,60,', 0.9);
}

function ladder(ctx, x, y, h, sc) {
    ctx.strokeStyle = 'rgba(255,150,30,0.3)';
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.moveTo(x - 2 * sc, y);
    ctx.lineTo(x - 2 * sc, y - h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 2 * sc, y);
    ctx.lineTo(x + 2 * sc, y - h);
    ctx.stroke();
    
    for (var ri = 0; ri < Math.floor(h / (6 * sc)); ri++) {
        ctx.beginPath();
        ctx.moveTo(x - 2 * sc, y - ri * 6 * sc);
        ctx.lineTo(x + 2 * sc, y - ri * 6 * sc);
        ctx.stroke();
    }
}

function cautionStripe(ctx, x, y, w, h, sc) {
    var stripeW = 6 * sc;
    ctx.save();
    ctx.rect(x, y, w, h);
    ctx.clip();
    
    for (var si = 0; si < (w + h) / stripeW; si++) {
        ctx.fillStyle = si % 2 === 0 ? 'rgba(255,180,0,0.4)' : 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.moveTo(x + si * stripeW, y);
        ctx.lineTo(x + si * stripeW + h, y);
        ctx.lineTo(x + si * stripeW + h - stripeW, y + h);
        ctx.lineTo(x + si * stripeW - stripeW, y + h);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

function flatRoof(ctx, x, y, w, sc) {
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(x - 2 * sc, y - 3 * sc, w + 4 * sc, 4 * sc);
    ctx.fillStyle = '#221408';
    ctx.fillRect(x - 3 * sc, y - 7 * sc, w + 6 * sc, 5 * sc);
    ctx.fillStyle = '#120e04';
    ctx.fillRect(x - 4 * sc, y - 9 * sc, w + 8 * sc, 2.5 * sc);
}