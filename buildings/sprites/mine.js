/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/sprites/mine.js

   Level-aware sprite for Minahan (Gold Mine)
   Design based on the official upgrade level previews.
   Levels 1–5 with progressive industrial complexity.
═══════════════════════════════════════════════════════════════ */

/**
 * drawSprite — renders Mine building for any level 1–5
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} sc                perspective scale (pixel multiplier)
 * @param {number} w                 building width (scaled)
 * @param {number} h                 building height (scaled)
 * @param {object} def               BUILDING_DEFS entry
 * @param {number} level             building level (1–5)
 * @param {number} now               timestamp for animations
 */
export function drawSprite(ctx, sc, w, h, def, level, now) {
    // Animation time for smoke, carts, etc.
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
   Level 1 — Hukay (Simple mine shaft)
   Rocky hillside, timber-framed entrance, mine cart, ore pile
══════════════════════════════════════════════════════════════ */
function drawLv1(ctx, sc, w, h, def, t) {
    var baseW = 46, baseH = 32;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 3, w * 0.52, 5 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ground base
    ctx.fillStyle = '#1e1a12';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#2a2418';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    
    // Mine shaft entrance
    shaftEntrance(ctx, -8 * sc, -6 * sc, 18 * sc, 22 * sc, sc);
    
    // Wooden support beam struts
    ctx.strokeStyle = '#5a3c18';
    ctx.lineWidth = 1.5 * sc;
    ctx.beginPath();
    ctx.moveTo(-w * 0.33, 0);
    ctx.lineTo(-22 * sc, -28 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.33, 0);
    ctx.lineTo(22 * sc, -30 * sc);
    ctx.stroke();
    
    // Mine cart on tracks
    mineCart(ctx, 20 * sc, -2 * sc, false, t, sc);
    
    // Ore pile outside
    orePile(ctx, 30 * sc, -2 * sc, 10 * sc, 5 * sc, sc);
    
    // Wooden headframe
    headframe(ctx, -8 * sc, -6 * sc, 24 * sc, 28 * sc, sc);
    
    // Sign post
    ctx.strokeStyle = '#5a3c18';
    ctx.lineWidth = 1.2 * sc;
    ctx.beginPath();
    ctx.moveTo(-30 * sc, -2 * sc);
    ctx.lineTo(-30 * sc, -18 * sc);
    ctx.stroke();
    ctx.fillStyle = '#6a4c28';
    ctx.fillRect(-30 * sc, -18 * sc, 20 * sc, 8 * sc);
    ctx.fillStyle = '#f5e8a0';
    ctx.font = 'bold ' + (5 * sc) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HUKAY', -20 * sc, -14 * sc);
    
    // Lantern hanging from shaft
    ctx.fillStyle = 'rgba(255,200,80,0.5)';
    ctx.beginPath();
    ctx.arc(-8 * sc, -24 * sc, 6 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c8a030';
    ctx.beginPath();
    ctx.arc(-8 * sc, -24 * sc, 2.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,100,0,0.4)';
    ctx.lineWidth = 0.7 * sc;
    ctx.beginPath();
    ctx.moveTo(-8 * sc, -6 * sc);
    ctx.lineTo(-8 * sc, -21 * sc);
    ctx.stroke();
    
    ctx.textBaseline = 'alphabetic';
}

/* ══════════════════════════════════════════════════════════════
   Level 2 — Minahan (Town mine)
   Larger hillside, proper headframe tower, two shafts, cart tracks
══════════════════════════════════════════════════════════════ */
function drawLv2(ctx, sc, w, h, def, t) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 3, w * 0.65, 6 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ground base
    ctx.fillStyle = '#1e1a12';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#2a2418';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    
    // Small timber support hut left side
    wall(ctx, -48 * sc, -28 * sc, 18 * sc, 28 * sc, '#7a6040', false, sc);
    ctx.fillStyle = '#5a4028';
    ctx.beginPath();
    ctx.moveTo(-50 * sc, -28 * sc);
    ctx.lineTo(-39 * sc, -38 * sc);
    ctx.lineTo(-28 * sc, -28 * sc);
    ctx.closePath();
    ctx.fill();
    // Hut window
    ctx.fillStyle = 'rgba(255,200,80,0.45)';
    ctx.fillRect(-45 * sc, -24 * sc, 8 * sc, 6 * sc);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.6 * sc;
    ctx.strokeRect(-45 * sc, -24 * sc, 8 * sc, 6 * sc);
    
    // Two mine shaft entrances
    shaftEntrance(ctx, -10 * sc, -5 * sc, 18 * sc, 22 * sc, sc);
    shaftEntrance(ctx, 16 * sc, -5 * sc, 16 * sc, 18 * sc, sc);
    
    // Headframe — wooden, taller
    headframe(ctx, -10 * sc, -5 * sc, 28 * sc, 38 * sc, sc);
    
    // Second smaller headframe
    ctx.strokeStyle = '#7a5828';
    ctx.lineWidth = 1.5 * sc;
    ctx.beginPath();
    ctx.moveTo(8 * sc, -5 * sc);
    ctx.lineTo(16 * sc, -28 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(24 * sc, -5 * sc);
    ctx.lineTo(16 * sc, -28 * sc);
    ctx.stroke();
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.moveTo(10 * sc, -18 * sc);
    ctx.lineTo(22 * sc, -18 * sc);
    ctx.stroke();
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.arc(16 * sc, -28 * sc, 3 * sc, 0, Math.PI * 2);
    ctx.stroke();
    
    // Mine carts on tracks
    mineCart(ctx, 28 * sc, -2 * sc, false, t, sc);
    mineCart(ctx, -36 * sc, -2 * sc, true, t, sc);
    
    // Ore piles
    orePile(ctx, 36 * sc, -2 * sc, 14 * sc, 7 * sc, sc);
    orePile(ctx, -38 * sc, -2 * sc, 10 * sc, 5 * sc, sc);
    
    // Smokestack on hut
    ctx.fillStyle = '#7a5030';
    ctx.fillRect(-43 * sc, -38 * sc, 5 * sc, 10 * sc);
    ctx.fillStyle = 'rgba(120,110,100,0.4)';
    ctx.beginPath();
    ctx.arc(-40 * sc, -38 * sc, 3 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    // Sign
    ctx.strokeStyle = '#5a3c18';
    ctx.lineWidth = 1.2 * sc;
    ctx.beginPath();
    ctx.moveTo(40 * sc, -2 * sc);
    ctx.lineTo(40 * sc, -16 * sc);
    ctx.stroke();
    ctx.fillStyle = '#6a4c28';
    ctx.fillRect(28 * sc, -16 * sc, 24 * sc, 8 * sc);
    ctx.fillStyle = '#f5e8a0';
    ctx.font = 'bold ' + (5 * sc) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MINAHAN', 40 * sc, -12 * sc);
    
    ctx.textBaseline = 'alphabetic';
}

/* ══════════════════════════════════════════════════════════════
   Level 3 — Industriyal na Minahan (Industrial mine)
   Steel headframe, processing shed, conveyor belt, smokestack
══════════════════════════════════════════════════════════════ */
function drawLv3(ctx, sc, w, h, def, t) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 3, w * 0.81, 7 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ground base
    ctx.fillStyle = '#1c1810';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#282210';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    
    // PROCESSING BUILDING left
    processBldg(ctx, -58 * sc, -4 * sc, 26 * sc, 32 * sc, '#706050', sc);
    // Window lit
    ctx.fillStyle = 'rgba(255,200,80,0.45)';
    ctx.fillRect(-54 * sc, -26 * sc, 18 * sc, 8 * sc);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.6 * sc;
    ctx.strokeRect(-54 * sc, -26 * sc, 18 * sc, 8 * sc);
    ctx.beginPath();
    ctx.moveTo(-45 * sc, -26 * sc);
    ctx.lineTo(-45 * sc, -18 * sc);
    ctx.stroke();
    
    // STEEL HEADFRAME — center
    steelHeadframe(ctx, -4 * sc, -5 * sc, 32 * sc, 46 * sc, sc);
    
    // SHAFT ENTRANCE
    shaftEntrance(ctx, -4 * sc, -5 * sc, 20 * sc, 24 * sc, sc);
    
    // CONVEYOR from hill to pile
    conveyor(ctx, 18 * sc, -18 * sc, 42 * sc, -5 * sc, t, sc);
    
    // ORE PROCESSING SHED right
    processBldg(ctx, 30 * sc, -4 * sc, 28 * sc, 28 * sc, '#686050', sc);
    ctx.fillStyle = 'rgba(255,180,50,0.4)';
    ctx.fillRect(33 * sc, -28 * sc, 22 * sc, 9 * sc);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.6 * sc;
    ctx.strokeRect(33 * sc, -28 * sc, 22 * sc, 9 * sc);
    
    // SMOKESTACK on processing shed
    smokestack(ctx, 52 * sc, -4 * sc, 5 * sc, 32 * sc, t, sc);
    
    // Ore piles
    orePile(ctx, 22 * sc, -3 * sc, 12 * sc, 6 * sc, sc);
    orePile(ctx, -46 * sc, -3 * sc, 10 * sc, 5 * sc, sc);
    
    // Mine cart
    mineCart(ctx, -24 * sc, -3 * sc, false, t, sc);
    
    // Rail tracks extending
    ctx.strokeStyle = '#7a6040';
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.moveTo(-60 * sc, -3 * sc);
    ctx.lineTo(60 * sc, -3 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-60 * sc, 0);
    ctx.lineTo(60 * sc, 0);
    ctx.stroke();
    ctx.strokeStyle = '#5a3820';
    ctx.lineWidth = 0.7 * sc;
    for (var ti = -5; ti <= 5; ti++) {
        ctx.beginPath();
        ctx.moveTo(ti * 12 * sc, -3 * sc);
        ctx.lineTo(ti * 12 * sc, 0);
        ctx.stroke();
    }
    
    ctx.textBaseline = 'alphabetic';
}

/* ══════════════════════════════════════════════════════════════
   Level 4 — Malaking Minahan (Large mine)
   Two steel headframes, ore processing plant, 2 smokestacks,
   rail yard, office building
══════════════════════════════════════════════════════════════ */
function drawLv4(ctx, sc, w, h, def, t) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 3, w * 1.0, 8 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ground base
    ctx.fillStyle = '#1a1610';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#262010';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    
    // LEFT PROCESSING COMPLEX
    wall(ctx, -74 * sc, -46 * sc, 36 * sc, 46 * sc, '#6a5838', false, sc);
    indRoof(ctx, -74 * sc, -46 * sc, 36 * sc, sc);
    // Windows
    ctx.fillStyle = 'rgba(255,200,80,0.4)';
    ctx.fillRect(-70 * sc, -40 * sc, 12 * sc, 8 * sc);
    ctx.fillRect(-70 * sc, -26 * sc, 12 * sc, 8 * sc);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 0.6 * sc;
    ctx.strokeRect(-70 * sc, -40 * sc, 12 * sc, 8 * sc);
    ctx.strokeRect(-70 * sc, -26 * sc, 12 * sc, 8 * sc);
    // Smokestack 1
    smokestack(ctx, -44 * sc, -4 * sc, 6 * sc, 38 * sc, t, sc);
    
    // LEFT SHAFT + HEADFRAME
    shaftEntrance(ctx, -24 * sc, -5 * sc, 20 * sc, 26 * sc, sc);
    steelHeadframe(ctx, -24 * sc, -5 * sc, 36 * sc, 52 * sc, sc);
    
    // CENTER CONVEYOR system
    conveyor(ctx, -8 * sc, -24 * sc, 14 * sc, -10 * sc, t, sc);
    conveyor(ctx, 14 * sc, -10 * sc, 34 * sc, -10 * sc, t, sc);
    
    // CENTER ORE BIN
    ctx.fillStyle = '#584830';
    ctx.fillRect(10 * sc, -22 * sc, 18 * sc, 18 * sc);
    ctx.fillStyle = '#483820';
    ctx.fillRect(8 * sc, -24 * sc, 22 * sc, 4 * sc);
    // Ore inside
    ctx.fillStyle = 'rgba(200,160,40,0.7)';
    ctx.fillRect(12 * sc, -20 * sc, 14 * sc, 6 * sc);
    ctx.fillStyle = 'rgba(240,200,50,0.5)';
    ctx.beginPath();
    ctx.ellipse(19 * sc, -16 * sc, 8 * sc, 3 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // RIGHT SHAFT + HEADFRAME
    shaftEntrance(ctx, 30 * sc, -5 * sc, 20 * sc, 26 * sc, sc);
    steelHeadframe(ctx, 30 * sc, -5 * sc, 36 * sc, 52 * sc, sc);
    
    // RIGHT PROCESSING PLANT
    wall(ctx, 38 * sc, -52 * sc, 36 * sc, 52 * sc, '#726048', false, sc);
    indRoof(ctx, 38 * sc, -52 * sc, 36 * sc, sc);
    ctx.fillStyle = 'rgba(255,200,80,0.42)';
    [-46 * sc, -32 * sc, -18 * sc].forEach(function(wy) {
        ctx.fillRect(42 * sc, wy, 12 * sc, 8 * sc);
        ctx.strokeStyle = 'rgba(0,0,0,0.22)';
        ctx.lineWidth = 0.6 * sc;
        ctx.strokeRect(42 * sc, wy, 12 * sc, 8 * sc);
    });
    // Smokestack 2
    smokestack(ctx, 68 * sc, -4 * sc, 6 * sc, 40 * sc, t, sc);
    
    // Ore piles
    orePile(ctx, -52 * sc, -3 * sc, 12 * sc, 6 * sc, sc);
    orePile(ctx, 52 * sc, -3 * sc, 14 * sc, 7 * sc, sc);
    
    // Rail tracks across full width
    ctx.strokeStyle = '#8a6840';
    ctx.lineWidth = 1.2 * sc;
    ctx.beginPath();
    ctx.moveTo(-76 * sc, -4 * sc);
    ctx.lineTo(76 * sc, -4 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-76 * sc, -1 * sc);
    ctx.lineTo(76 * sc, -1 * sc);
    ctx.stroke();
    ctx.strokeStyle = '#604820';
    ctx.lineWidth = 0.8 * sc;
    for (var ti = -6; ti <= 6; ti++) {
        ctx.beginPath();
        ctx.moveTo(ti * 13 * sc, -4 * sc);
        ctx.lineTo(ti * 13 * sc, -1 * sc);
        ctx.stroke();
    }
    
    // Mine carts
    mineCart(ctx, -48 * sc, -4 * sc, false, t, sc);
    mineCart(ctx, 4 * sc, -4 * sc, true, t, sc);
    
    // Office block top-right
    wall(ctx, 40 * sc, -68 * sc, 22 * sc, 18 * sc, '#7a6858', false, sc);
    indRoof(ctx, 40 * sc, -68 * sc, 22 * sc, sc);
    ctx.fillStyle = 'rgba(255,230,160,0.45)';
    ctx.fillRect(43 * sc, -64 * sc, 8 * sc, 6 * sc);
    ctx.fillRect(53 * sc, -64 * sc, 6 * sc, 6 * sc);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5 * sc;
    ctx.strokeRect(43 * sc, -64 * sc, 8 * sc, 6 * sc);
    ctx.strokeRect(53 * sc, -64 * sc, 6 * sc, 6 * sc);
    
    ctx.textBaseline = 'alphabetic';
}

/* ══════════════════════════════════════════════════════════════
   Level 5 — Minahan Kompleks (Mining complex)
   3 headframes, ore processing tower, 3 smokestacks,
   rail yard with multiple carts, crusher building, admin block
══════════════════════════════════════════════════════════════ */
function drawLv5(ctx, sc, w, h, def, t) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.36)';
    ctx.beginPath();
    ctx.ellipse(0, 3, w * 1.13, 10 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ground base
    ctx.fillStyle = '#181408';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#22180c';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    
    // LEFT WING: crusher + processing
    wall(ctx, -84 * sc, -54 * sc, 30 * sc, 54 * sc, '#6a5838', true, sc);
    indRoof(ctx, -84 * sc, -54 * sc, 30 * sc, sc);
    // Crusher machine
    ctx.fillStyle = '#484030';
    ctx.fillRect(-80 * sc, -38 * sc, 22 * sc, 20 * sc);
    ctx.fillStyle = '#585048';
    ctx.fillRect(-78 * sc, -40 * sc, 18 * sc, 4 * sc);
    ctx.fillStyle = 'rgba(255,160,40,0.5)';
    ctx.fillRect(-76 * sc, -34 * sc, 14 * sc, 12 * sc);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.7 * sc;
    ctx.strokeRect(-80 * sc, -38 * sc, 22 * sc, 20 * sc);
    // Crusher windows
    ctx.fillStyle = 'rgba(255,180,50,0.5)';
    ctx.fillRect(-80 * sc, -50 * sc, 10 * sc, 8 * sc);
    ctx.fillRect(-66 * sc, -50 * sc, 10 * sc, 8 * sc);
    smokestack(ctx, -60 * sc, -4 * sc, 5 * sc, 36 * sc, t, sc);
    
    // LEFT SHAFT
    shaftEntrance(ctx, -46 * sc, -5 * sc, 18 * sc, 24 * sc, sc);
    steelHeadframe(ctx, -46 * sc, -5 * sc, 34 * sc, 50 * sc, sc);
    
    // CENTER-LEFT: ore processing tower
    wall(ctx, -20 * sc, -70 * sc, 26 * sc, 70 * sc, '#7a6850', false, sc);
    indRoof(ctx, -20 * sc, -70 * sc, 26 * sc, sc);
    // Tower windows per floor with pulsing glow
    for (var fi = 0; fi < 4; fi++) {
        var wy = -66 * sc + fi * 16 * sc;
        ctx.fillStyle = Math.sin(t * 0.3 + fi) > 0 ? 'rgba(255,220,100,0.55)' : 'rgba(255,180,60,0.35)';
        ctx.fillRect(-17 * sc, wy, 8 * sc, 7 * sc);
        ctx.fillRect(-7 * sc, wy, 8 * sc, 7 * sc);
        ctx.strokeStyle = 'rgba(0,0,0,0.22)';
        ctx.lineWidth = 0.5 * sc;
        ctx.strokeRect(-17 * sc, wy, 8 * sc, 7 * sc);
        ctx.strokeRect(-7 * sc, wy, 8 * sc, 7 * sc);
    }
    // Tower sign
    ctx.fillStyle = '#c8a030';
    ctx.fillRect(-18 * sc, -72 * sc, 22 * sc, 6 * sc);
    ctx.fillStyle = '#0a0800';
    ctx.font = 'bold ' + (4.5 * sc) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ORE TOWER', -7 * sc, -69 * sc);
    smokestack(ctx, -2 * sc, -4 * sc, 7 * sc, 42 * sc, t, sc);
    
    // CENTER SHAFT
    shaftEntrance(ctx, 6 * sc, -5 * sc, 20 * sc, 26 * sc, sc);
    steelHeadframe(ctx, 6 * sc, -5 * sc, 38 * sc, 56 * sc, sc);
    
    // CENTER conveyor system
    conveyor(ctx, 22 * sc, -30 * sc, 38 * sc, -16 * sc, t, sc);
    conveyor(ctx, 38 * sc, -16 * sc, 56 * sc, -16 * sc, t, sc);
    
    // ORE HOPPERS
    ctx.fillStyle = '#584830';
    ctx.fillRect(34 * sc, -28 * sc, 16 * sc, 14 * sc);
    ctx.fillRect(34 * sc, -30 * sc, 16 * sc, 3 * sc);
    ctx.fillStyle = 'rgba(200,160,40,0.65)';
    ctx.fillRect(36 * sc, -26 * sc, 12 * sc, 5 * sc);
    ctx.fillStyle = 'rgba(240,200,50,0.45)';
    ctx.beginPath();
    ctx.ellipse(42 * sc, -22 * sc, 7 * sc, 3 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // RIGHT SHAFT
    shaftEntrance(ctx, 44 * sc, -5 * sc, 18 * sc, 24 * sc, sc);
    steelHeadframe(ctx, 44 * sc, -5 * sc, 34 * sc, 50 * sc, sc);
    
    // RIGHT WING: processing + admin
    wall(ctx, 54 * sc, -58 * sc, 32 * sc, 58 * sc, '#726048', false, sc);
    indRoof(ctx, 54 * sc, -58 * sc, 32 * sc, sc);
    ctx.fillStyle = 'rgba(255,200,80,0.42)';
    [-52 * sc, -36 * sc, -20 * sc].forEach(function(wy) {
        ctx.fillRect(58 * sc, wy, 10 * sc, 8 * sc);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 0.5 * sc;
        ctx.strokeRect(58 * sc, wy, 10 * sc, 8 * sc);
    });
    smokestack(ctx, 80 * sc, -4 * sc, 6 * sc, 40 * sc, t, sc);
    
    // Admin office top
    wall(ctx, 56 * sc, -74 * sc, 28 * sc, 18 * sc, '#8a7860', false, sc);
    indRoof(ctx, 56 * sc, -74 * sc, 28 * sc, sc);
    ctx.fillStyle = 'rgba(255,230,160,0.48)';
    ctx.fillRect(59 * sc, -70 * sc, 9 * sc, 7 * sc);
    ctx.fillRect(71 * sc, -70 * sc, 9 * sc, 7 * sc);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5 * sc;
    ctx.strokeRect(59 * sc, -70 * sc, 9 * sc, 7 * sc);
    ctx.strokeRect(71 * sc, -70 * sc, 9 * sc, 7 * sc);
    // Antenna with blinking light
    ctx.strokeStyle = '#8898a8';
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.moveTo(70 * sc, -74 * sc);
    ctx.lineTo(70 * sc, -88 * sc);
    ctx.stroke();
    var bl = Math.sin(t * 2.5) > 0;
    ctx.fillStyle = bl ? 'rgba(255,50,50,0.9)' : 'rgba(255,50,50,0.08)';
    ctx.beginPath();
    ctx.arc(70 * sc, -88 * sc, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    // Ore piles
    orePile(ctx, -68 * sc, -3 * sc, 14 * sc, 7 * sc, sc);
    orePile(ctx, 60 * sc, -3 * sc, 16 * sc, 8 * sc, sc);
    orePile(ctx, 0, -3 * sc, 12 * sc, 6 * sc, sc);
    
    // Wide rail network
    ctx.strokeStyle = '#9a7840';
    ctx.lineWidth = 1.2 * sc;
    ctx.beginPath();
    ctx.moveTo(-86 * sc, -4 * sc);
    ctx.lineTo(86 * sc, -4 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-86 * sc, -1 * sc);
    ctx.lineTo(86 * sc, -1 * sc);
    ctx.stroke();
    // Branch rail
    ctx.beginPath();
    ctx.moveTo(-40 * sc, -4 * sc);
    ctx.lineTo(-40 * sc, -20 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-37 * sc, -4 * sc);
    ctx.lineTo(-37 * sc, -20 * sc);
    ctx.stroke();
    ctx.strokeStyle = '#604820';
    ctx.lineWidth = 0.8 * sc;
    for (var ti = -7; ti <= 7; ti++) {
        ctx.beginPath();
        ctx.moveTo(ti * 12 * sc, -4 * sc);
        ctx.lineTo(ti * 12 * sc, -1 * sc);
        ctx.stroke();
    }
    for (var ti2 = 0; ti2 <= 3; ti2++) {
        ctx.beginPath();
        ctx.moveTo(-40 * sc, -4 * sc - ti2 * 5 * sc);
        ctx.lineTo(-37 * sc, -4 * sc - ti2 * 5 * sc);
        ctx.stroke();
    }
    
    // Mine carts on tracks
    mineCart(ctx, -60 * sc, -4 * sc, false, t, sc);
    mineCart(ctx, -16 * sc, -4 * sc, true, t, sc);
    mineCart(ctx, 28 * sc, -4 * sc, false, t, sc);
    
    ctx.textBaseline = 'alphabetic';
}

/* ══════════════════════════════════════════════════════════════
   HELPER FUNCTIONS (scaled versions from HTML)
══════════════════════════════════════════════════════════════ */

function shaftEntrance(ctx, cx, baseY, sw, sh, sc) {
    // Arch timber frame
    ctx.fillStyle = '#1a1008';
    ctx.beginPath();
    ctx.rect(cx - sw/2, baseY - sh, sw, sh);
    ctx.arc(cx, baseY - sh, sw/2, Math.PI, 0, true);
    ctx.fill();
    
    // Timber frame beams
    ctx.strokeStyle = '#6a4c20';
    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    ctx.moveTo(cx - sw/2, baseY);
    ctx.lineTo(cx - sw/2, baseY - sh);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + sw/2, baseY);
    ctx.lineTo(cx + sw/2, baseY - sh);
    ctx.stroke();
    
    // Arch
    ctx.beginPath();
    ctx.arc(cx, baseY - sh, sw/2 + 1 * sc, Math.PI, 0, false);
    ctx.stroke();
    
    // Cross beam
    ctx.beginPath();
    ctx.moveTo(cx - sw/2, baseY - sh * 0.55);
    ctx.lineTo(cx + sw/2, baseY - sh * 0.55);
    ctx.stroke();
    
    // Lantern glow inside
    ctx.fillStyle = 'rgba(255,200,80,0.15)';
    ctx.beginPath();
    ctx.arc(cx, baseY - sh * 0.4, sw * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Lantern
    ctx.fillStyle = '#c8a030';
    ctx.beginPath();
    ctx.arc(cx, baseY - sh * 0.4, 2.5 * sc, 0, Math.PI * 2);
    ctx.fill();
}

function mineCart(ctx, x, y, flip, t, sc) {
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    
    // Rails
    ctx.strokeStyle = '#7a6040';
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.moveTo(-18 * sc, 0);
    ctx.lineTo(18 * sc, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-18 * sc, -3 * sc);
    ctx.lineTo(18 * sc, -3 * sc);
    ctx.stroke();
    
    // Ties
    ctx.strokeStyle = '#5a3820';
    ctx.lineWidth = 0.8 * sc;
    [-12 * sc, -4 * sc, 4 * sc, 12 * sc].forEach(function(tx) {
        ctx.beginPath();
        ctx.moveTo(tx, 0);
        ctx.lineTo(tx, -3 * sc);
        ctx.stroke();
    });
    
    // Cart body
    ctx.fillStyle = '#5a4830';
    ctx.fillRect(-8 * sc, -12 * sc, 16 * sc, 9 * sc);
    
    // Cart taper
    ctx.fillStyle = '#4a3820';
    ctx.beginPath();
    ctx.moveTo(-8 * sc, -3 * sc);
    ctx.lineTo(-10 * sc, 0);
    ctx.lineTo(10 * sc, 0);
    ctx.lineTo(8 * sc, -3 * sc);
    ctx.closePath();
    ctx.fill();
    
    // Ore in cart
    ctx.fillStyle = '#c8a040';
    ctx.beginPath();
    ctx.ellipse(0, -11 * sc, 6 * sc, 3 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c050';
    ctx.beginPath();
    ctx.arc(-2 * sc, -12 * sc, 2.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d4a838';
    ctx.beginPath();
    ctx.arc(3 * sc, -12 * sc, 2 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    // Wheels
    ctx.fillStyle = '#3a2810';
    ctx.beginPath();
    ctx.arc(-5 * sc, 0, 3 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5 * sc, 0, 3 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(-5 * sc, 0, 1.2 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5 * sc, 0, 1.2 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function orePile(ctx, cx, y, rx, ry, sc) {
    var g = ctx.createRadialGradient(cx - rx * 0.2, y - ry * 0.4, 0, cx, y, rx);
    g.addColorStop(0, '#e8c050');
    g.addColorStop(0.5, '#c8a030');
    g.addColorStop(1, '#7a6020');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Glinting nuggets
    ctx.fillStyle = 'rgba(255,240,100,0.6)';
    [[cx - rx * 0.3, y - ry * 0.5], [cx + rx * 0.2, y - ry * 0.6], [cx - rx * 0.1, y - ry * 0.3]].forEach(function(p) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 1.5 * sc, 0, Math.PI * 2);
        ctx.fill();
    });
}

function headframe(ctx, cx, baseY, w, h, sc) {
    ctx.strokeStyle = '#6a4c20';
    ctx.lineWidth = 2 * sc;
    // Legs
    ctx.beginPath();
    ctx.moveTo(cx - w/2, baseY);
    ctx.lineTo(cx - w * 0.1, baseY - h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + w/2, baseY);
    ctx.lineTo(cx + w * 0.1, baseY - h);
    ctx.stroke();
    
    // Cross braces
    ctx.lineWidth = 1.5 * sc;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.4, baseY - h * 0.3);
    ctx.lineTo(cx + w * 0.4, baseY - h * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.4, baseY - h * 0.3);
    ctx.lineTo(cx - w * 0.4, baseY - h * 0.6);
    ctx.stroke();
    
    // Top platform
    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.15, baseY - h);
    ctx.lineTo(cx + w * 0.15, baseY - h);
    ctx.stroke();
    
    // Pulley wheel
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.2 * sc;
    ctx.beginPath();
    ctx.arc(cx, baseY - h, 4 * sc, 0, Math.PI * 2);
    ctx.stroke();
    
    // Hoist cable
    ctx.strokeStyle = 'rgba(150,130,80,0.6)';
    ctx.lineWidth = 0.8 * sc;
    ctx.beginPath();
    ctx.moveTo(cx, baseY - h);
    ctx.lineTo(cx - 2 * sc, baseY - h * 0.3);
    ctx.stroke();
}

function steelHeadframe(ctx, cx, baseY, w, h, sc) {
    ctx.strokeStyle = '#707070';
    ctx.lineWidth = 2.5 * sc;
    ctx.beginPath();
    ctx.moveTo(cx - w/2, baseY);
    ctx.lineTo(cx, baseY - h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + w/2, baseY);
    ctx.lineTo(cx, baseY - h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.3, baseY);
    ctx.lineTo(cx, baseY - h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.3, baseY);
    ctx.lineTo(cx, baseY - h);
    ctx.stroke();
    
    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.4, baseY - h * 0.35);
    ctx.lineTo(cx + w * 0.4, baseY - h * 0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.28, baseY - h * 0.65);
    ctx.lineTo(cx + w * 0.28, baseY - h * 0.65);
    ctx.stroke();
    
    // Wheel housing
    ctx.fillStyle = '#505050';
    ctx.beginPath();
    ctx.arc(cx, baseY - h, 6 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.arc(cx, baseY - h, 6 * sc, 0, Math.PI * 2);
    ctx.stroke();
    
    // Cage/skip indicator
    ctx.fillStyle = 'rgba(255,180,0,0.6)';
    ctx.fillRect(cx - 3 * sc, baseY - h * 0.55, 6 * sc, 5 * sc);
}

function smokestack(ctx, cx, baseY, r, h, t, sc) {
    // Brick body
    var g = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.04)');
    g.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = '#8a5030';
    ctx.fillRect(cx - r, baseY - h, r * 2, h);
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, baseY - h, r * 2, h);
    
    // Brick lines
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5 * sc;
    for (var bi = 0; bi < h / (5 * sc); bi++) {
        ctx.beginPath();
        ctx.moveTo(cx - r, baseY - h + bi * 5 * sc);
        ctx.lineTo(cx + r, baseY - h + bi * 5 * sc);
        ctx.stroke();
    }
    
    // Cap
    ctx.fillStyle = '#6a3a20';
    ctx.fillRect(cx - r - 1 * sc, baseY - h - 3 * sc, r * 2 + 2 * sc, 3 * sc);
    
    // Smoke puffs
    var alpha = 0.35;
    for (var si = 0; si < 3; si++) {
        var sy = baseY - h - 8 * sc - si * 10 * sc;
        var sx = cx + Math.sin(t * 1.2 + si * 1.5) * 3 * sc;
        var sr = (3 + si * 2.5 + Math.sin(t * 0.8 + si) * 0.5) * sc;
        ctx.fillStyle = 'rgba(120,110,100,' + alpha + ')';
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
        alpha *= 0.7;
    }
}

function processBldg(ctx, x, y, w, h, color, sc) {
    ctx.fillStyle = color || '#6a6050';
    ctx.fillRect(x, y - h, w, h);
    var sg = ctx.createLinearGradient(x, 0, x + w, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0.04)');
    sg.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = sg;
    ctx.fillRect(x, y - h, w, h);
    
    // Flat roof
    ctx.fillStyle = '#4a4038';
    ctx.fillRect(x - 1 * sc, y - h - 3 * sc, w + 2 * sc, 4 * sc);
    
    // Window
    ctx.fillStyle = 'rgba(255,200,80,0.35)';
    ctx.fillRect(x + 3 * sc, y - h + 4 * sc, w - 6 * sc, h * 0.3);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.7 * sc;
    ctx.strokeRect(x + 3 * sc, y - h + 4 * sc, w - 6 * sc, h * 0.3);
}

function conveyor(ctx, x1, y1, x2, y2, t, sc) {
    ctx.strokeStyle = '#5a4828';
    ctx.lineWidth = 4 * sc;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(200,160,50,0.4)';
    ctx.lineWidth = 1 * sc;
    ctx.setLineDash([4 * sc, 4 * sc]);
    ctx.lineDashOffset = -t * 20 % 8;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Rollers at ends
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(x1, y1, 3 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x2, y2, 3 * sc, 0, Math.PI * 2);
    ctx.fill();
}

function wall(ctx, x, y, w, h, color, flip, sc) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    var sg = ctx.createLinearGradient(x, 0, x + w, 0);
    if (flip) {
        sg.addColorStop(0, 'rgba(0,0,0,0.12)');
        sg.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
        sg.addColorStop(0, 'rgba(255,255,255,0.04)');
        sg.addColorStop(0.75, 'rgba(0,0,0,0)');
        sg.addColorStop(1, 'rgba(0,0,0,0.2)');
    }
    ctx.fillStyle = sg;
    ctx.fillRect(x, y, w, h);
}

function indRoof(ctx, x, y, w, sc) {
    ctx.fillStyle = '#484038';
    ctx.fillRect(x - 2 * sc, y - 3 * sc, w + 4 * sc, 4 * sc);
    ctx.fillStyle = '#544840';
    ctx.fillRect(x - 3 * sc, y - 7 * sc, w + 6 * sc, 5 * sc);
    ctx.fillStyle = '#383028';
    ctx.fillRect(x - 4 * sc, y - 9 * sc, w + 8 * sc, 2.5 * sc);
}