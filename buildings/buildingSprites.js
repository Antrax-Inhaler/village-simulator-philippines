/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/buildingSprites.js

   LEVEL-AWARE SPRITE SYSTEM
   ─────────────────────────────────────────────────────────────
   Each building type can have its own dedicated sprite file that
   draws different visuals per upgrade level. If a sprite module
   has not been created yet, this dispatcher falls back gracefully
   to the generic _drawStandard() function (with a small level
   badge), so the game never breaks.

   HOW IT WORKS
   ─────────────────────────────────────────────────────────────
   1. Each building type may export a drawSprite(ctx, sc, w, h, def, level, now)
      function from its own file under buildings/sprites/<type>.js
   2. This file imports those that exist, and exports one master
      function: drawBuilding(ctx, sc, w, h, def, type, level, now)
   3. building.js calls drawBuilding() instead of the inline renderer
      map it currently has, so no other file needs to change.

   ADDING A NEW SPRITE FILE
   ─────────────────────────────────────────────────────────────
   1. Create  buildings/sprites/<type>.js
   2. Export  drawSprite(ctx, sc, w, h, def, level, now)
   3. Import it here and add it to SPRITE_MAP below.
      That's it — the fallback system handles the rest.

   CURRENTLY IMPLEMENTED
   ─────────────────────────────────────────────────────────────
   house       → sprites/house.js     (Lv1–5 full designs)
   storage     → sprites/storage.js   (Lv1–5 full designs)

   USING BUILDING.JS INLINE RENDERERS (until sprite files exist)
   ─────────────────────────────────────────────────────────────
   farm, paaralan, cuartel, moog, kuta, bantayan, templo,
   hukuman, ospital, pulisya, daungan, kalye, minalangis
   — These use their existing inline functions, passed in via
     the inlineRenderers param so this file stays decoupled.

   FALLBACK (no sprite file, no inline renderer)
   ─────────────────────────────────────────────────────────────
   mainHall, storage, mine, palengke, and any future type
   without a sprite yet → _drawStandard() + level badge.

   EXPORTS
   ─────────────────────────────────────────────────────────────
   drawBuilding(ctx, sc, w, h, def, type, level, now, inlineRenderers)
═══════════════════════════════════════════════════════════════ */

/* ── Import sprite files that exist ──────────────────────── */
import { drawSprite as drawHouseSprite }   from './sprites/house.js';
import { drawSprite as drawStorageSprite } from './sprites/storage.js';
import { drawSprite as drawPalengkeSprite }   from './sprites/palengke.js';
import { drawSprite as drawMainHallSprite }   from './sprites/mainHall.js';
import { drawSprite as drawPulisyaSprite }    from './sprites/pulisya.js';
import { drawSprite as drawFarmSprite }       from './sprites/farm.js';
   import { drawSprite as drawMineSprite }       from './sprites/mine.js';
   import { drawSprite as drawMinalangisSprite } from './sprites/mine.js';
import { drawSprite as drawCuartelSprite }    from './sprites/cuartel.js';
/*
   Future imports — uncomment as sprite files are created:

   
   
   import { drawSprite as drawPaaralan Sprite }  from './sprites/paaralan.js';
   
   import { drawSprite as drawTemploSprite }     from './sprites/templo.js';
   import { drawSprite as drawMoogSprite }       from './sprites/moog.js';
   import { drawSprite as drawKutaSprite }       from './sprites/kuta.js';
   import { drawSprite as drawBantayanSprite }   from './sprites/bantayan.js';
   import { drawSprite as drawHukumanSprite }    from './sprites/hukuman.js';
   import { drawSprite as drawOspitalSprite }    from './sprites/ospital.js';
   
   import { drawSprite as drawDaunganSprite }    from './sprites/daungan.js';
   import { drawSprite as drawKalyeSprite }      from './sprites/kalye.js';
*/

/* ── Sprite map — populated as sprite files are created ─── */
var SPRITE_MAP = {
  house:   drawHouseSprite,
  storage: drawStorageSprite,
palengke:   drawPalengkeSprite,
  mainHall:   drawMainHallSprite,
pulisya:    drawPulisyaSprite,
farm:       drawFarmSprite,
 mine:       drawMineSprite,
 minalangis: drawMinalangisSprite,
 cuartel:    drawCuartelSprite,
  /*
  
  
 
  
  paaralan:   drawPaaralan Sprite,
  
  templo:     drawTemploSprite,
  moog:       drawMoogSprite,
  kuta:       drawKutaSprite,
  bantayan:   drawBantayanSprite,
  hukuman:    drawHukumanSprite,
  ospital:    drawOspitalSprite,
  
  daungan:    drawDaunganSprite,
  kalye:      drawKalyeSprite,
  */
};

/* ══════════════════════════════════════════════════════════════
   drawBuilding  — master dispatch
   Called by building.js Building.prototype.draw() in place of
   its current inline renderer map.

   @param ctx             Canvas 2D context (translated to building origin)
   @param sc              perspScale result
   @param w               building width  (= def.w * sc)
   @param h               building height (= def.h * sc)
   @param def             BUILDING_DEFS entry
   @param type            building.type string key
   @param level           building.level (1–5)
   @param now             performance.now() timestamp
   @param inlineRenderers Object map of type→fn from building.js
                          (the existing _drawFarm, _drawTemplo etc.)
                          passed in so this file stays decoupled.
══════════════════════════════════════════════════════════════ */
export function drawBuilding(ctx, sc, w, h, def, type, level, now, inlineRenderers) {
  /* 1. Dedicated sprite file — richest, level-aware artwork */
  if (SPRITE_MAP[type]) {
    try {
      SPRITE_MAP[type](ctx, sc, w, h, def, level, now);
      return;
    } catch (e) {
      /* If the sprite throws (e.g. partial implementation), fall through */
      console.warn('[buildingSprites] ' + type + ' sprite error, falling back:', e);
    }
  }

  /* 2. Legacy inline renderer from building.js */
  if (inlineRenderers && inlineRenderers[type]) {
    inlineRenderers[type](ctx, sc, w, h, def, level, now);
    return;
  }

  /* 3. Generic fallback — standard shape + level badge overlay */
  _drawStandardFallback(ctx, sc, w, h, def, type, level);
}

/* ══════════════════════════════════════════════════════════════
   _drawStandardFallback
   Mirrors the existing _drawStandard() from building.js so any
   building type without a sprite still looks reasonable.
   The level badge is drawn larger/more prominent here because
   it's the only level indicator for these buildings.
══════════════════════════════════════════════════════════════ */
function _drawStandardFallback(ctx, sc, w, h, def, type, level) {
  /* Wall */
  ctx.fillStyle = def.wallColor;
  ctx.fillRect(-w / 2, -h * 0.55, w, h * 0.67);

  /* Side shading */
  var ws = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  ws.addColorStop(0, 'rgba(0,0,0,0)');
  ws.addColorStop(0.7, 'rgba(0,0,0,0)');
  ws.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = ws;
  ctx.fillRect(-w / 2, -h * 0.55, w, h * 0.67);

  /* Roof */
  ctx.fillStyle = def.roofColor;
  ctx.beginPath();
  ctx.moveTo(-w * 0.58, -h * 0.55);
  ctx.lineTo(0, -h * 1.12);
  ctx.lineTo(w * 0.58, -h * 0.55);
  ctx.closePath();
  ctx.fill();

  /* Roof ridge highlight */
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(-w * 0.1, -h * 0.55);
  ctx.lineTo(0, -h * 1.12);
  ctx.lineTo(w * 0.1, -h * 0.55);
  ctx.closePath();
  ctx.fill();

  /* Door */
  ctx.fillStyle = def.doorColor || 'rgba(30,15,5,0.8)';
  var dw = 10 * sc, dh = h * 0.34;
  ctx.beginPath();
  ctx.rect(-dw / 2, -dh, dw, dh);
  ctx.arc(0, -dh, dw / 2, Math.PI, 0, true);
  ctx.fill();

  /* Windows */
  var ww = 9 * sc, wh = 7 * sc;
  ctx.fillStyle = def.winColor || 'rgba(255,230,140,0.6)';
  ctx.fillRect(-w * 0.32, -h * 0.48, ww, wh);
  ctx.fillRect(w * 0.22, -h * 0.48, ww, wh);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.8 * sc;
  [-w * 0.32 + ww / 2, w * 0.22 + ww / 2].forEach(function(wx) {
    ctx.beginPath();
    ctx.moveTo(wx, -h * 0.48); ctx.lineTo(wx, -h * 0.48 + wh);
    ctx.moveTo(wx - ww / 2, -h * 0.48 + wh / 2); ctx.lineTo(wx + ww / 2, -h * 0.48 + wh / 2);
    ctx.stroke();
  });

  /* Bodega barrel detail */
  if (type === 'storage') {
    ctx.fillStyle = 'rgba(100,80,40,0.7)';
    ctx.beginPath(); ctx.ellipse(0, -h * 0.28, 8 * sc, 10 * sc, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#6b4c2a'; ctx.lineWidth = 1.5 * sc;
    for (var bi = 0; bi < 2; bi++) {
      ctx.beginPath(); ctx.ellipse(0, -h * 0.28 + (bi - 0.5) * 8 * sc, 8 * sc, 2.5 * sc, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }

  /* Level badge — more prominent on fallback since no per-level art */
  if (level > 1) {
    ctx.fillStyle = '#f5c842';
    ctx.beginPath(); ctx.arc(w * 0.38, -h * 1.22, 8 * sc, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c49a1a'; ctx.lineWidth = 1.2 * sc; ctx.stroke();
    ctx.fillStyle = '#1a0f06';
    ctx.font = 'bold ' + (10 * sc) + 'px Oldenburg,serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(level, w * 0.38, -h * 1.22 + 0.5 * sc);
    ctx.textBaseline = 'alphabetic';
  }
}