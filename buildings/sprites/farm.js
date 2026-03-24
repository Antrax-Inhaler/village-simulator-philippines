/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/sprites/farm.js

   Level-aware sprite for Bukid ng Palay (Rice Farm)
   Design based on the official upgrade level previews.
   Levels 1–5 with progressive agricultural complexity.
═══════════════════════════════════════════════════════════════ */

/**
 * drawSprite — renders Farm building for any level 1–5
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} sc                perspective scale (pixel multiplier)
 * @param {number} w                 building width (scaled)
 * @param {number} h                 building height (scaled)
 * @param {object} def               BUILDING_DEFS entry
 * @param {number} level             building level (1–5)
 * @param {number} now               timestamp for animations
 */
export function drawSprite(ctx, sc, w, h, def, level, now) {
    // Animation time for swaying plants, windmill, etc.
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
   Level 1 — Munting Taniman (Small family plot)
   Small hand-planted paddy, bahay kubo, scarecrow
══════════════════════════════════════════════════════════════ */
function drawLv1(ctx, sc, w, h, def, t) {
    var baseW = 84, baseH = 30;
    
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 2, w * 0.45, 5 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Soil base
    ctx.fillStyle = '#141408';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#1c1c0a';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    
    // One small paddy plot — flooded/planted stage
    paddy(ctx, 0, -2 * sc, w * 0.76, 4, 0, t, sc);
    
    // Bahay Kubo to the right
    bahayKubo(ctx, w * 0.6, -2 * sc, 0.7, t, sc);
    
    // Scarecrow in field
    scarecrow(ctx, -w * 0.22, 0, t, sc);
    
    // Small bamboo fence
    fence(ctx, -w * 0.45, -2 * sc, w * 0.9, sc);
    
    // Level label
    ctx.fillStyle = 'rgba(140,220,60,0.75)';
    ctx.font = 'bold ' + (9 * sc) + 'px Oldenburg,serif';
    ctx.textAlign = 'center';
    ctx.fillText('Munting Taniman', 0, h * 0.22);
}

/* ══════════════════════════════════════════════════════════════
   Level 2 — Bukid ng Pamilya (Family farm)
   Two plots, growing rice, kalabaw, bahay kubo
══════════════════════════════════════════════════════════════ */
function drawLv2(ctx, sc, w, h, def, t) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 2, w * 0.62, 6 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Soil base
    ctx.fillStyle = '#121208';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#1a1a08';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    
    // Two paddy plots side by side — growing green
    paddy(ctx, -w * 0.4, -2 * sc, w * 0.38, 5, 1, t, sc);
    paddy(ctx, w * 0.02, -2 * sc, w * 0.38, 5, 1, t, sc);
    
    // Canal between plots
    canal(ctx, -6 * sc, -36 * sc, 12 * sc, t, sc);
    
    // Bahay Kubo
    bahayKubo(ctx, w * 0.82, -2 * sc, 0.85, t, sc);
    
    // Kalabaw plowing
    kalabaw(ctx, -w * 0.78, -2 * sc, t, false, sc);
    
    // Scarecrow
    scarecrow(ctx, -12 * sc, -2 * sc, t, sc);
    
    // Fence around
    fence(ctx, -w, -2 * sc, w * 2, sc);
    
    // Level label
    ctx.fillStyle = 'rgba(140,220,60,0.8)';
    ctx.font = 'bold ' + (9 * sc) + 'px Oldenburg,serif';
    ctx.textAlign = 'center';
    ctx.fillText('Bukid ng Pamilya', 0, h * 0.21);
}

/* ══════════════════════════════════════════════════════════════
   Level 3 — Palayan ng Bayan (Town rice field)
   3 plots, ripe golden rice, windmill, tractor, canal system
══════════════════════════════════════════════════════════════ */
function drawLv3(ctx, sc, w, h, def, t) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 2, w * 0.81, 7 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Soil base
    ctx.fillStyle = '#101008';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#181808';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    
    // Three paddy plots — mix of stages
    paddy(ctx, -w * 0.56, -2 * sc, w * 0.34, 6, 2, t, sc);  // ripe golden
    paddy(ctx, 0, -2 * sc, w * 0.34, 6, 1, t, sc);          // growing
    paddy(ctx, w * 0.56, -2 * sc, w * 0.34, 6, 2, t, sc);   // ripe golden
    
    // Irrigation canals
    canal(ctx, -w * 0.79, -42 * sc, 28 * sc, t, sc);
    canal(ctx, -33 * sc, -42 * sc, 24 * sc, t, sc);
    canal(ctx, 13 * sc, -42 * sc, 24 * sc, t, sc);
    
    // Windmill
    windmill(ctx, -w * 0.79, -2 * sc, 44 * sc, t, sc);
    
    // Tractor
    tractor(ctx, w * 0.71, -2 * sc, t, true, sc);
    
    // Bahay Kubo larger
    bahayKubo(ctx, w * 0.8, -2 * sc, 1, t, sc);
    
    // Two scarecrows
    scarecrow(ctx, -w * 0.42, -2 * sc, t, sc);
    scarecrow(ctx, 18 * sc, -2 * sc, t, sc);
    
    // Fence
    fence(ctx, -w * 0.93, -2 * sc, w * 1.86, sc);
    
    // Level label
    ctx.fillStyle = 'rgba(140,220,60,0.8)';
    ctx.font = 'bold ' + (9 * sc) + 'px Oldenburg,serif';
    ctx.textAlign = 'center';
    ctx.fillText('Palayan ng Bayan', 0, h * 0.2);
}

/* ══════════════════════════════════════════════════════════════
   Level 4 — Sakahan ng Lalawigan (Provincial farm)
   4 plots, silo, 2 tractors, kalabaw, windmill, storage shed
══════════════════════════════════════════════════════════════ */
function drawLv4(ctx, sc, w, h, def, t) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 2, w * 1.0, 8 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Soil base with harvest glow
    ctx.fillStyle = '#0e0e06';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#161606';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    
    // Four paddy plots — all ripe golden (stage 2)
    paddy(ctx, -w * 0.73, -2 * sc, w * 0.33, 7, 2, t, sc);
    paddy(ctx, -w * 0.27, -2 * sc, w * 0.33, 7, 2, t, sc);
    paddy(ctx, w * 0.19, -2 * sc, w * 0.33, 7, 1, t, sc);   // growing
    paddy(ctx, w * 0.65, -2 * sc, w * 0.33, 7, 2, t, sc);
    
    // Irrigation canal network
    canal(ctx, -w * 0.93, -48 * sc, 34 * sc, t, sc);
    canal(ctx, -w * 0.47, -48 * sc, 30 * sc, t, sc);
    canal(ctx, -2 * sc, -48 * sc, 30 * sc, t, sc);
    canal(ctx, 44 * sc, -48 * sc, 30 * sc, t, sc);
    // Main header canal
    canal(ctx, -w * 0.93, -50 * sc, w * 1.86, t, sc);
    
    // Windmill
    windmill(ctx, -w * 0.93, -2 * sc, 52 * sc, t, sc);
    
    // Grain silo
    silo(ctx, w * 0.84, -2 * sc, 14 * sc, 48 * sc, sc);
    
    // Storage warehouse left
    warehouse(ctx, -w * 0.93, -42 * sc, 36 * sc, 42 * sc, sc);
    
    // Two tractors
    tractor(ctx, -w * 0.43, -2 * sc, t, true, sc);
    tractor(ctx, w * 0.74, -2 * sc, t, false, sc);
    
    // Kalabaw
    kalabaw(ctx, 34 * sc, -2 * sc, t, true, sc);
    
    // Scarecrow
    scarecrow(ctx, 3 * sc, -2 * sc, t, sc);
    
    // Fence
    fence(ctx, -w * 0.96, -2 * sc, w * 1.92, sc);
    
    // Level label
    ctx.fillStyle = 'rgba(140,220,60,0.8)';
    ctx.font = 'bold ' + (9 * sc) + 'px Oldenburg,serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sakahan ng Lalawigan', 0, h * 0.18);
}

/* ══════════════════════════════════════════════════════════════
   Level 5 — Agri-Industrial Hub (Modern rice farming complex)
   5 plots, combine harvester, 2 silos, large warehouse,
   tractor fleet, full canal + pump system
══════════════════════════════════════════════════════════════ */
function drawLv5(ctx, sc, w, h, def, t) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 2, w * 1.19, 10 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Soil base with rich earth
    ctx.fillStyle = '#0c0c04';
    ctx.fillRect(-w/2, 0, w, 6 * sc);
    ctx.fillStyle = '#141404';
    ctx.fillRect(-w/2, 4 * sc, w, 3 * sc);
    
    // Five paddy plots — alternating ripe / growing
    paddy(ctx, -w * 0.86, -2 * sc, w * 0.33, 8, 2, t, sc);  // ripe
    paddy(ctx, -w * 0.45, -2 * sc, w * 0.33, 8, 2, t, sc);  // ripe
    paddy(ctx, -4 * sc, -2 * sc, w * 0.33, 8, 1, t, sc);    // growing
    paddy(ctx, w * 0.37, -2 * sc, w * 0.33, 8, 2, t, sc);   // ripe
    paddy(ctx, w * 0.78, -2 * sc, w * 0.33, 8, 2, t, sc);   // ripe
    
    // Full canal network
    // Main header
    canal(ctx, -w * 1.02, -54 * sc, w * 2.04, t, sc);
    // Laterals
    [-w * 0.88, -w * 0.5, -12 * sc, 28 * sc, 70 * sc].forEach(function(cx) {
        canal(ctx, cx, -54 * sc, 30 * sc, t, sc);
    });
    
    // Two windmills / pump stations
    windmill(ctx, -w * 1.01, -2 * sc, 58 * sc, t, sc);
    windmill(ctx, w * 0.91, -2 * sc, 54 * sc, t, sc);
    
    // Large warehouse
    warehouse(ctx, -w * 1.01, -52 * sc, 52 * sc, 52 * sc, sc);
    // Warehouse sign
    ctx.fillStyle = '#f5c842';
    ctx.fillRect(-w * 0.98, -54 * sc, 44 * sc, 8 * sc);
    ctx.fillStyle = '#0a0804';
    ctx.font = 'bold ' + (4.5 * sc) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BODEGA', -w * 0.76, -50 * sc);
    
    // Two grain silos
    silo(ctx, w * 0.9, -2 * sc, 14 * sc, 56 * sc, sc);
    silo(ctx, w * 1.01, -2 * sc, 12 * sc, 50 * sc, sc);
    // Pipe between silos
    ctx.fillStyle = '#3a3820';
    ctx.fillRect(w * 0.9, -28 * sc, 18 * sc, 4 * sc);
    
    // Combine harvester working
    harvester(ctx, -w * 0.69, -4 * sc, t, false, sc);
    
    // Two tractors
    tractor(ctx, 14 * sc, -2 * sc, t, true, sc);
    tractor(ctx, 59 * sc, -2 * sc, t + 2, false, sc);
    
    // Kalabaw pulling cart
    kalabaw(ctx, -27 * sc, -2 * sc, t, true, sc);
    
    // Scarecrows
    scarecrow(ctx, -10 * sc, -2 * sc, t, sc);
    scarecrow(ctx, 49 * sc, -2 * sc, t, sc);
    
    // Processing shed / Rice Mill
    wall(ctx, 64 * sc, -38 * sc, 36 * sc, 38 * sc, '#22221a', false, sc);
    // Shed roof
    ctx.fillStyle = '#181810';
    ctx.beginPath();
    ctx.moveTo(64 * sc, -38 * sc);
    ctx.quadraticCurveTo(82 * sc, -52 * sc, 100 * sc, -38 * sc);
    ctx.lineTo(100 * sc, -40 * sc);
    ctx.quadraticCurveTo(82 * sc, -54 * sc, 64 * sc, -40 * sc);
    ctx.closePath();
    ctx.fill();
    // Windows
    ctx.fillStyle = 'rgba(255,220,80,0.4)';
    ctx.fillRect(68 * sc, -32 * sc, 10 * sc, 8 * sc);
    ctx.fillRect(84 * sc, -32 * sc, 10 * sc, 8 * sc);
    // Door
    ctx.fillStyle = 'rgba(6,6,2,0.9)';
    ctx.fillRect(78 * sc, -24 * sc, 8 * sc, 24 * sc);
    ctx.strokeStyle = 'rgba(180,160,40,0.4)';
    ctx.lineWidth = 0.8 * sc;
    ctx.strokeRect(78 * sc, -24 * sc, 8 * sc, 24 * sc);
    // Sign
    ctx.fillStyle = '#f5c842';
    ctx.fillRect(66 * sc, -42 * sc, 32 * sc, 7 * sc);
    ctx.fillStyle = '#0a0804';
    ctx.font = 'bold ' + (4 * sc) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RICE MILL', 82 * sc, -38.5 * sc);
    
    // Grand fence
    fence(ctx, -w * 1.03, -2 * sc, w * 2.06, sc);
    
    // Blinking harvest light on silo
    var bl = Math.sin(t * 2.5) > 0;
    ctx.fillStyle = bl ? 'rgba(255,220,40,1)' : 'rgba(255,220,40,0.08)';
    ctx.beginPath();
    ctx.arc(w * 0.9, -62 * sc, 2.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    // Level label
    ctx.fillStyle = 'rgba(160,240,80,0.9)';
    ctx.font = 'bold ' + (9 * sc) + 'px Oldenburg,serif';
    ctx.textAlign = 'center';
    ctx.fillText('Agri-Industrial Hub', 0, h * 0.17);
    
    ctx.textBaseline = 'alphabetic';
}

/* ══════════════════════════════════════════════════════════════
   HELPER FUNCTIONS (scaled versions from HTML)
══════════════════════════════════════════════════════════════ */

function paddy(ctx, cx, cy, w, rows, stage, t, sc) {
    var rh = 7 * sc;
    var totalH = rows * rh;
    
    // Water / soil base
    if (stage === 0) {
        // Flooded — dark water with shimmer
        var wg = ctx.createLinearGradient(cx - w/2, cy - totalH, cx - w/2, cy);
        wg.addColorStop(0, '#1a3820');
        wg.addColorStop(1, '#0e2414');
        ctx.fillStyle = wg;
        ctx.fillRect(cx - w/2, cy - totalH, w, totalH);
        
        // Water shimmer lines
        ctx.strokeStyle = 'rgba(80,200,120,0.12)';
        ctx.lineWidth = 0.6 * sc;
        for (var ri = 0; ri < rows; ri++) {
            ctx.beginPath();
            ctx.moveTo(cx - w/2, cy - ri * rh - rh * 0.5);
            ctx.lineTo(cx + w/2, cy - ri * rh - rh * 0.5);
            ctx.stroke();
        }
        
        // Tiny seedlings
        ctx.strokeStyle = 'rgba(60,180,60,0.7)';
        ctx.lineWidth = 0.8 * sc;
        var cols = Math.floor(w / (6 * sc));
        for (var ri = 0; ri < rows; ri++) {
            for (var ci = 0; ci < cols; ci++) {
                var sx = cx - w/2 + 3 * sc + ci * 6 * sc;
                var sy = cy - ri * rh - 2 * sc;
                var sway = Math.sin(t * 1.5 + ci * 0.7 + ri * 1.1) * 0.8 * sc;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + sway, sy - 4 * sc);
                ctx.stroke();
            }
        }
    } else if (stage === 1) {
        // Growing — green stalks
        var gg = ctx.createLinearGradient(cx - w/2, cy - totalH, cx - w/2, cy);
        gg.addColorStop(0, '#1e4018');
        gg.addColorStop(1, '#0e2010');
        ctx.fillStyle = gg;
        ctx.fillRect(cx - w/2, cy - totalH, w, totalH);
        
        // Terrace lines
        ctx.strokeStyle = 'rgba(30,100,20,0.4)';
        ctx.lineWidth = 0.8 * sc;
        for (var ri = 0; ri < rows; ri++) {
            ctx.beginPath();
            ctx.moveTo(cx - w/2, cy - ri * rh);
            ctx.lineTo(cx + w/2, cy - ri * rh);
            ctx.stroke();
        }
        
        // Green stalks swaying
        var cols = Math.floor(w / (5 * sc));
        for (var ri = 0; ri < rows; ri++) {
            for (var ci = 0; ci < cols; ci++) {
                var sx = cx - w/2 + 2.5 * sc + ci * 5 * sc;
                var sy = cy - ri * rh - 1 * sc;
                var sh = 5 * sc;
                var sway = Math.sin(t * 1.8 + ci * 0.5 + ri * 0.9) * 1.2 * sc;
                // Stalk
                ctx.strokeStyle = '#2a8020';
                ctx.lineWidth = 0.9 * sc;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + sway, sy - sh);
                ctx.stroke();
                // Leaf
                ctx.strokeStyle = '#38a028';
                ctx.lineWidth = 0.7 * sc;
                ctx.beginPath();
                ctx.moveTo(sx + sway * 0.5, sy - sh * 0.5);
                ctx.lineTo(sx + sway + 3 * sc, sy - sh * 0.5 - 2 * sc);
                ctx.stroke();
            }
        }
    } else {
        // Ripe — golden palay!
        var rg = ctx.createLinearGradient(cx - w/2, cy - totalH, cx - w/2, cy);
        rg.addColorStop(0, '#2a2a08');
        rg.addColorStop(1, '#181408');
        ctx.fillStyle = rg;
        ctx.fillRect(cx - w/2, cy - totalH, w, totalH);
        
        ctx.strokeStyle = 'rgba(100,90,10,0.35)';
        ctx.lineWidth = 0.8 * sc;
        for (var ri = 0; ri < rows; ri++) {
            ctx.beginPath();
            ctx.moveTo(cx - w/2, cy - ri * rh);
            ctx.lineTo(cx + w/2, cy - ri * rh);
            ctx.stroke();
        }
        
        var cols = Math.floor(w / (5 * sc));
        for (var ri = 0; ri < rows; ri++) {
            for (var ci = 0; ci < cols; ci++) {
                var sx = cx - w/2 + 2.5 * sc + ci * 5 * sc;
                var sy = cy - ri * rh - 1 * sc;
                var sway = Math.sin(t * 1.4 + ci * 0.5 + ri * 0.9) * 1.8 * sc;
                // Stalk
                ctx.strokeStyle = '#8a7010';
                ctx.lineWidth = 0.9 * sc;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + sway * 0.3, sy - 5 * sc);
                ctx.stroke();
                // Drooping grain head
                ctx.strokeStyle = '#c8a018';
                ctx.lineWidth = 1.1 * sc;
                ctx.beginPath();
                ctx.moveTo(sx + sway * 0.3, sy - 5 * sc);
                ctx.quadraticCurveTo(sx + sway * 0.3 + sway, sy - 7 * sc, sx + sway, sy - 4 * sc);
                ctx.stroke();
                // Grain dot
                ctx.fillStyle = '#e0b820';
                ctx.beginPath();
                ctx.arc(sx + sway, sy - 4 * sc, 1 * sc, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    // Field border dikes
    ctx.fillStyle = '#1a2810';
    ctx.fillRect(cx - w/2 - 3 * sc, cy - totalH, 3 * sc, totalH + 2 * sc);
    ctx.fillRect(cx + w/2, cy - totalH, 3 * sc, totalH + 2 * sc);
    ctx.fillRect(cx - w/2 - 3 * sc, cy, w + 6 * sc, 3 * sc);
    ctx.fillRect(cx - w/2 - 3 * sc, cy - totalH - 2 * sc, w + 6 * sc, 3 * sc);
}

function bahayKubo(ctx, x, y, scale, t, sc) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    
    // Stilts
    ctx.strokeStyle = '#5a3a10';
    ctx.lineWidth = 2 * sc;
    ctx.beginPath(); ctx.moveTo(-10 * sc, 0); ctx.lineTo(-10 * sc, -18 * sc); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10 * sc, 0); ctx.lineTo(10 * sc, -18 * sc); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6 * sc, 0); ctx.lineTo(-6 * sc, -18 * sc); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6 * sc, 0); ctx.lineTo(6 * sc, -18 * sc); ctx.stroke();
    
    // Floor
    ctx.fillStyle = '#6a4418';
    ctx.fillRect(-13 * sc, -20 * sc, 26 * sc, 4 * sc);
    
    // Walls
    ctx.fillStyle = '#8a6030';
    ctx.fillRect(-11 * sc, -36 * sc, 22 * sc, 16 * sc);
    
    // Wall texture lines
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.6 * sc;
    for (var wi = 0; wi < 4; wi++) {
        ctx.beginPath();
        ctx.moveTo(-11 * sc, -36 * sc + wi * 4 * sc);
        ctx.lineTo(11 * sc, -36 * sc + wi * 4 * sc);
        ctx.stroke();
    }
    
    // Door
    ctx.fillStyle = 'rgba(20,10,4,0.8)';
    ctx.fillRect(-3 * sc, -36 * sc, 6 * sc, 10 * sc);
    
    // Nipa roof — layered thatch
    ctx.fillStyle = '#4a3008';
    ctx.beginPath();
    ctx.moveTo(-16 * sc, -36 * sc);
    ctx.lineTo(0, -52 * sc);
    ctx.lineTo(16 * sc, -36 * sc);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#5a3c10';
    ctx.beginPath();
    ctx.moveTo(-14 * sc, -36 * sc);
    ctx.lineTo(0, -50 * sc);
    ctx.lineTo(14 * sc, -36 * sc);
    ctx.closePath();
    ctx.fill();
    
    // Thatch lines
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.7 * sc;
    for (var ti = 0; ti < 5; ti++) {
        var ty = -36 * sc - ti * 2.8 * sc;
        var tx = 14 * sc - ti * 2.8 * sc;
        ctx.beginPath();
        ctx.moveTo(-tx, ty);
        ctx.lineTo(tx, ty);
        ctx.stroke();
    }
    
    // Ridge
    ctx.strokeStyle = '#6a4c18';
    ctx.lineWidth = 1.5 * sc;
    ctx.beginPath();
    ctx.moveTo(-2 * sc, -50 * sc);
    ctx.lineTo(2 * sc, -50 * sc);
    ctx.stroke();
    
    // Smoke from window
    ctx.save();
    ctx.globalAlpha = 0.18 + Math.sin(t * 0.8) * 0.05;
    for (var pi = 0; pi < 3; pi++) {
        var frac = ((t * 0.3 + pi * 0.4) % 1);
        ctx.fillStyle = 'rgba(180,160,120,' + (0.4 * (1 - frac)) + ')';
        ctx.beginPath();
        ctx.arc(8 * sc - frac * 4 * sc, -38 * sc - frac * 12 * sc, (1 + frac * 3) * sc, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
    
    ctx.restore();
}

function scarecrow(ctx, x, y, t, sc) {
    var sway = Math.sin(t * 1.2 + x) * 3 * sc;
    ctx.save();
    ctx.translate(x, y);
    
    // Pole
    ctx.strokeStyle = '#5a3a10';
    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -30 * sc);
    ctx.stroke();
    
    // Crossbar
    ctx.beginPath();
    ctx.moveTo(-12 * sc, -22 * sc);
    ctx.lineTo(12 * sc, -22 * sc);
    ctx.stroke();
    
    // Body with sway
    ctx.save();
    ctx.rotate(sway * 0.02);
    
    // Shirt
    ctx.fillStyle = '#aa3030';
    ctx.fillRect(-7 * sc, -30 * sc, 14 * sc, 12 * sc);
    
    // Sleeves
    ctx.fillStyle = '#aa3030';
    ctx.fillRect(-14 * sc, -26 * sc, 7 * sc, 5 * sc);
    ctx.fillRect(7 * sc, -26 * sc, 7 * sc, 5 * sc);
    
    // Hands — straw wisps
    ctx.strokeStyle = '#c8a840';
    ctx.lineWidth = 0.8 * sc;
    for (var wi = -1; wi <= 1; wi++) {
        ctx.beginPath();
        ctx.moveTo(-14 * sc, wi * sc - 23 * sc);
        ctx.lineTo(-18 * sc, wi * sc - 22 * sc + sway * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(14 * sc, wi * sc - 23 * sc);
        ctx.lineTo(18 * sc, wi * sc - 22 * sc - sway * 0.3);
        ctx.stroke();
    }
    
    // Head
    ctx.fillStyle = '#c8a840';
    ctx.beginPath();
    ctx.arc(0, -33 * sc, 5 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    // Straw hat
    ctx.fillStyle = '#a88020';
    ctx.fillRect(-8 * sc, -39 * sc, 16 * sc, 3 * sc);
    ctx.beginPath();
    ctx.moveTo(-5 * sc, -39 * sc);
    ctx.lineTo(0, -45 * sc);
    ctx.lineTo(5 * sc, -39 * sc);
    ctx.closePath();
    ctx.fill();
    
    // Face X eyes
    ctx.strokeStyle = '#4a2808';
    ctx.lineWidth = 0.8 * sc;
    ctx.beginPath();
    ctx.moveTo(-2 * sc, -34 * sc);
    ctx.lineTo(0, -32 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -32 * sc);
    ctx.lineTo(2 * sc, -34 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-2 * sc, -32 * sc);
    ctx.lineTo(0, -34 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -34 * sc);
    ctx.lineTo(2 * sc, -32 * sc);
    ctx.stroke();
    
    // Straw peeking from shirt
    ctx.strokeStyle = '#c8a840';
    ctx.lineWidth = 0.8 * sc;
    for (var wi = -1; wi <= 1; wi++) {
        ctx.beginPath();
        ctx.moveTo(wi * 3 * sc, -18 * sc);
        ctx.lineTo(wi * 3 * sc + wi * sc, -12 * sc + sway * 0.1);
        ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
}

function kalabaw(ctx, x, y, t, flip, sc) {
    var step = Math.sin(t * 2 + x) * 1.5 * sc;
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    
    // Legs
    ctx.fillStyle = '#3a2810';
    ctx.fillRect(-10 * sc, 0, 4 * sc, 8 * sc + Math.abs(step));
    ctx.fillRect(-4 * sc, 0, 4 * sc, 8 * sc - Math.abs(step));
    ctx.fillRect(2 * sc, 0, 4 * sc, 8 * sc + Math.abs(step));
    ctx.fillRect(8 * sc, 0, 4 * sc, 8 * sc - Math.abs(step));
    
    // Body
    ctx.fillStyle = '#4a3418';
    ctx.beginPath();
    ctx.ellipse(0, -10 * sc, 16 * sc, 8 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Neck
    ctx.fillStyle = '#4a3418';
    ctx.fillRect(-12 * sc, -16 * sc, 8 * sc, 8 * sc);
    
    // Head
    ctx.beginPath();
    ctx.ellipse(-16 * sc, -18 * sc, 8 * sc, 6 * sc, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Horns
    ctx.strokeStyle = '#2a1c08';
    ctx.lineWidth = 1.5 * sc;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-20 * sc, -22 * sc);
    ctx.quadraticCurveTo(-26 * sc, -28 * sc, -22 * sc, -30 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12 * sc, -22 * sc);
    ctx.quadraticCurveTo(-8 * sc, -28 * sc, -12 * sc, -30 * sc);
    ctx.stroke();
    ctx.lineCap = 'butt';
    
    // Eye
    ctx.fillStyle = '#1a0e04';
    ctx.beginPath();
    ctx.arc(-19 * sc, -19 * sc, 1.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    // Nostril
    ctx.fillStyle = '#2a1808';
    ctx.beginPath();
    ctx.arc(-23 * sc, -17 * sc, 1 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    // Tail
    ctx.strokeStyle = '#3a2810';
    ctx.lineWidth = 1.5 * sc;
    ctx.beginPath();
    ctx.moveTo(14 * sc, -8 * sc);
    ctx.quadraticCurveTo(20 * sc, -4 * sc + step, 18 * sc, 0);
    ctx.stroke();
    
    ctx.restore();
}

function fence(ctx, x, y, len, sc) {
    ctx.strokeStyle = '#5a3a10';
    ctx.lineWidth = 1.5 * sc;
    ctx.beginPath();
    ctx.moveTo(x, y - 6 * sc);
    ctx.lineTo(x + len, y - 6 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 2 * sc);
    ctx.lineTo(x + len, y - 2 * sc);
    ctx.stroke();
    
    for (var fi = 0; fi <= len / (8 * sc); fi++) {
        ctx.fillStyle = fi % 2 === 0 ? '#6a4a18' : '#5a3a10';
        ctx.fillRect(x + fi * 8 * sc - 1 * sc, y - 10 * sc, 3 * sc, 12 * sc);
    }
}

function canal(ctx, x, y, w, t, sc) {
    ctx.fillStyle = '#0e2818';
    ctx.fillRect(x, y, w, 8 * sc);
    
    // Water shimmer
    ctx.fillStyle = 'rgba(40,160,80,0.28)';
    ctx.fillRect(x + 1 * sc, y + 1 * sc, w - 2 * sc, 6 * sc);
    
    ctx.strokeStyle = 'rgba(80,200,120,0.2)';
    ctx.lineWidth = 0.7 * sc;
    ctx.beginPath();
    ctx.moveTo(x, y + 4 * sc + Math.sin(t * 2) * 1 * sc);
    ctx.lineTo(x + w, y + 4 * sc + Math.sin(t * 2 + 2) * 1 * sc);
    ctx.stroke();
    
    // Canal walls
    ctx.fillStyle = '#1a3018';
    ctx.fillRect(x, y, w, 2 * sc);
    ctx.fillRect(x, y + 6 * sc, w, 2 * sc);
}

function silo(ctx, x, y, r, h, sc) {
    // Body
    ctx.fillStyle = '#3a3820';
    ctx.fillRect(x - r, y - h, r * 2, h);
    
    var sg = ctx.createLinearGradient(x - r, 0, x + r, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0.05)');
    sg.addColorStop(0.5, 'rgba(0,0,0,0)');
    sg.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = sg;
    ctx.fillRect(x - r, y - h, r * 2, h);
    
    // Conical roof
    ctx.fillStyle = '#2a2810';
    ctx.beginPath();
    ctx.moveTo(x - r - 2 * sc, y - h);
    ctx.lineTo(x, y - h - r * 1.2);
    ctx.lineTo(x + r + 2 * sc, y - h);
    ctx.closePath();
    ctx.fill();
    
    // Bands
    ctx.strokeStyle = 'rgba(255,220,80,0.15)';
    ctx.lineWidth = 0.8 * sc;
    for (var bi = 1; bi < 4; bi++) {
        ctx.beginPath();
        ctx.moveTo(x - r, y - h * (bi / 4));
        ctx.lineTo(x + r, y - h * (bi / 4));
        ctx.stroke();
    }
    
    // Door hatch
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x - 3 * sc, y - 8 * sc, 6 * sc, 8 * sc);
}

function tractor(ctx, x, y, t, flip, sc) {
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    
    // Big rear wheel
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(-6 * sc, 0, 10 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5 * sc;
    ctx.beginPath();
    ctx.arc(-6 * sc, 0, 10 * sc, 0, Math.PI * 2);
    ctx.stroke();
    
    // Tread pattern
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1 * sc;
    for (var ti = 0; ti < 8; ti++) {
        var ta = ti * (Math.PI / 4) + t * 2;
        ctx.beginPath();
        ctx.moveTo(-6 * sc + Math.cos(ta) * 7 * sc, Math.sin(ta) * 7 * sc);
        ctx.lineTo(-6 * sc + Math.cos(ta) * 10 * sc, Math.sin(ta) * 10 * sc);
        ctx.stroke();
    }
    
    // Small front wheel
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(12 * sc, 3 * sc, 5 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.arc(12 * sc, 3 * sc, 5 * sc, 0, Math.PI * 2);
    ctx.stroke();
    
    // Body
    ctx.fillStyle = '#2a6018';
    ctx.fillRect(-10 * sc, -14 * sc, 24 * sc, 14 * sc);
    
    // Hood
    ctx.fillStyle = '#1e4e10';
    ctx.fillRect(8 * sc, -10 * sc, 10 * sc, 10 * sc);
    
    // Cabin
    ctx.fillStyle = '#224c14';
    ctx.fillRect(-8 * sc, -22 * sc, 14 * sc, 8 * sc);
    
    // Glass
    ctx.fillStyle = 'rgba(80,200,255,0.35)';
    ctx.fillRect(-6 * sc, -21 * sc, 10 * sc, 6 * sc);
    
    // Exhaust pipe
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(14 * sc, -18 * sc, 3 * sc, 8 * sc);
    
    // Smoke puff
    var puffA = (t * 0.8) % 1;
    ctx.fillStyle = 'rgba(120,120,100,' + (0.3 * (1 - puffA)) + ')';
    ctx.beginPath();
    ctx.arc(15.5 * sc, -18 * sc - puffA * 10 * sc, (1 + puffA * 3) * sc, 0, Math.PI * 2);
    ctx.fill();
    
    // Mudflap
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(-16 * sc, -8 * sc, 6 * sc, 10 * sc);
    
    ctx.restore();
}

function windmill(ctx, x, y, h, t, sc) {
    // Tower
    ctx.strokeStyle = '#4a3a20';
    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    ctx.moveTo(x - 8 * sc, y);
    ctx.lineTo(x - 2 * sc, y - h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 8 * sc, y);
    ctx.lineTo(x + 2 * sc, y - h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 4 * sc, y - h * 0.4);
    ctx.lineTo(x + 4 * sc, y - h * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 5 * sc, y - h * 0.7);
    ctx.lineTo(x + 5 * sc, y - h * 0.7);
    ctx.stroke();
    
    // Hub
    ctx.fillStyle = '#5a4a28';
    ctx.beginPath();
    ctx.arc(x, y - h, 4 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    // 4 blades spinning
    ctx.save();
    ctx.translate(x, y - h);
    ctx.rotate(t * 2);
    ctx.fillStyle = '#c8a040';
    for (var bi = 0; bi < 4; bi++) {
        ctx.save();
        ctx.rotate(bi * Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(-1.5 * sc, 0);
        ctx.lineTo(-2 * sc, -14 * sc);
        ctx.lineTo(2 * sc, -14 * sc);
        ctx.lineTo(1.5 * sc, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
    
    // Tail vane
    ctx.save();
    ctx.translate(x, y - h);
    ctx.rotate(-0.4 + Math.sin(t * 0.3) * 0.1);
    ctx.fillStyle = '#b89030';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(16 * sc, -4 * sc);
    ctx.lineTo(16 * sc, 4 * sc);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    
    // Water tank at base
    ctx.fillStyle = '#3a3020';
    ctx.fillRect(x - 6 * sc, y - 12 * sc, 12 * sc, 12 * sc);
    ctx.fillStyle = 'rgba(40,140,80,0.4)';
    ctx.fillRect(x - 5 * sc, y - 8 * sc, 10 * sc, 4 * sc);
}

function harvester(ctx, x, y, t, flip, sc) {
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    
    // Main body
    ctx.fillStyle = '#c8800a';
    ctx.fillRect(-20 * sc, -20 * sc, 40 * sc, 20 * sc);
    
    // Cab
    ctx.fillStyle = '#a86008';
    ctx.fillRect(-18 * sc, -32 * sc, 22 * sc, 12 * sc);
    ctx.fillStyle = 'rgba(80,200,255,0.35)';
    ctx.fillRect(-16 * sc, -30 * sc, 18 * sc, 9 * sc);
    
    // Header / cutting bar
    ctx.fillStyle = '#8a5006';
    ctx.fillRect(-26 * sc, -8 * sc, 52 * sc, 6 * sc);
    
    // Reel spinning
    ctx.save();
    ctx.translate(-14 * sc, -4 * sc);
    ctx.rotate(t * 3);
    ctx.strokeStyle = '#6a3804';
    ctx.lineWidth = 1.2 * sc;
    for (var ri = 0; ri < 6; ri++) {
        var ra = ri * (Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ra) * 8 * sc, Math.sin(ra) * 8 * sc);
        ctx.stroke();
    }
    ctx.restore();
    
    // Grain auger
    ctx.fillStyle = '#b87008';
    ctx.fillRect(10 * sc, -34 * sc, 6 * sc, 14 * sc);
    ctx.fillStyle = '#a06008';
    ctx.fillRect(12 * sc, -40 * sc, 4 * sc, 8 * sc);
    
    // Big wheels
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(-12 * sc, 0, 10 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(12 * sc, 0, 8 * sc, 0, Math.PI * 2);
    ctx.fill();
    
    // Wheel tread
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1 * sc;
    for (var ti = 0; ti < 8; ti++) {
        var ta = ti * (Math.PI / 4) + t * 1.5;
        ctx.beginPath();
        ctx.moveTo(-12 * sc + Math.cos(ta) * 7 * sc, Math.sin(ta) * 7 * sc);
        ctx.lineTo(-12 * sc + Math.cos(ta) * 10 * sc, Math.sin(ta) * 10 * sc);
        ctx.stroke();
    }
    
    // Dust puff behind
    ctx.save();
    ctx.globalAlpha = 0.15 + Math.sin(t * 3) * 0.05;
    ctx.fillStyle = '#c8a840';
    for (var pi = 0; pi < 3; pi++) {
        var pf = ((t * 0.5 + pi * 0.35) % 1);
        ctx.beginPath();
        ctx.arc(22 * sc + pf * 10 * sc, -2 * sc, (2 + pf * 4) * sc, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
    
    ctx.restore();
}

function warehouse(ctx, x, y, w, h, sc) {
    wall(ctx, x, -h, w, h, '#2a2a1a', false, sc);
    
    // Arched roof
    ctx.fillStyle = '#1e1e10';
    ctx.beginPath();
    ctx.moveTo(x, -(h));
    ctx.quadraticCurveTo(x + w/2, -(h + w * 0.28), x + w, -(h));
    ctx.lineTo(x + w, -(h + 2 * sc));
    ctx.quadraticCurveTo(x + w/2, -(h + w * 0.3), x, -(h + 2 * sc));
    ctx.closePath();
    ctx.fill();
    
    // Roller doors
    ctx.fillStyle = '#1a1a0e';
    ctx.fillRect(x + 4 * sc, -(h * 0.7), w - 8 * sc, h * 0.7);
    ctx.strokeStyle = 'rgba(180,180,60,0.18)';
    ctx.lineWidth = 0.7 * sc;
    for (var ri = 0; ri < 6; ri++) {
        ctx.beginPath();
        ctx.moveTo(x + 4 * sc, -(h * 0.7) + ri * (h * 0.7 / 6));
        ctx.lineTo(x + w - 4 * sc, -(h * 0.7) + ri * (h * 0.7 / 6));
        ctx.stroke();
    }
    
    // Windows
    ctx.fillStyle = 'rgba(255,220,80,0.4)';
    ctx.fillRect(x + 4 * sc, -(h * 0.9), 10 * sc, 8 * sc);
    ctx.fillRect(x + w - 14 * sc, -(h * 0.9), 10 * sc, 8 * sc);
}

function wall(ctx, x, y, w, h, color, flipShade, sc) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    
    var sg = ctx.createLinearGradient(x, 0, x + w, 0);
    if (flipShade) {
        sg.addColorStop(0, 'rgba(0,0,0,0.15)');
        sg.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
        sg.addColorStop(0, 'rgba(255,255,255,0.05)');
        sg.addColorStop(0.7, 'rgba(0,0,0,0)');
        sg.addColorStop(1, 'rgba(0,0,0,0.18)');
    }
    ctx.fillStyle = sg;
    ctx.fillRect(x, y, w, h);
}