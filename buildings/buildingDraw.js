/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/buildingDraw.js

   ALL CANVAS DRAWING LOGIC FOR BUILDINGS
   ─────────────────────────────────────────────────────────────
   Extracted from building.js to keep that file lean.
   Covers:
     - Building.prototype.draw          (main render entry point)
     - _drawWreck                       (destroyed building state)
     - _drawOccupancyBadge              (home / worker count badge)
     - _rrect / _rrectWreck             (rounded rect helpers)
     - _darken                          (colour utility)
     - All individual building shape renderers:
         _drawFarm, _drawStandard, _drawPaaralan, _drawCuartel,
         _drawMoog, _drawKuta, _drawBantayan, _drawTemplo,
         _drawHukuman, _drawOspital, _drawPulisya, _drawDaungan,
         _drawKalye, _drawMinalangis,
         _drawMissileSilo, _drawRadarStation, _drawInterceptor

   EXPORTS
   ─────────────────────────────────────────────────────────────
   applyDrawPrototypes(Building)
     Attaches Building.prototype.draw.
     Must be called after Building is defined in building.js.
═══════════════════════════════════════════════════════════════ */

import { perspScale } from '../utils/perspective.js';
import { drawBuilding } from './buildingSprites.js';

/* ══════════════════════════════════════════════════════════════
   applyDrawPrototypes
   Call once after Building is defined in building.js.
══════════════════════════════════════════════════════════════ */
export function applyDrawPrototypes(Building) {

  Building.prototype.draw = function(ctx, now) {
    var def = this.getDef();
    var sc  = perspScale(this.y);
    var w   = this.w * sc, h = this.h * sc;
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.isWreck) { _drawWreck(ctx, sc, w, h, this); ctx.restore(); return; }

    // Pulse ring on upgrade/complete
    if (this.pulse > 0) {
      ctx.globalAlpha = this.pulse * 0.6;
      ctx.strokeStyle = '#f5c842'; ctx.lineWidth = 3 * sc;
      ctx.beginPath(); ctx.ellipse(0, 0, w*0.75+(1-this.pulse)*20*sc, h*0.5, 0, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Langis shortage red overlay
    if (!this._hasLangis && this.getStats().langisConsumption > 0 && !this.underConstruction) {
      ctx.globalAlpha = 0.25 + Math.sin(Date.now() / 500) * 0.15;
      ctx.fillStyle = '#ff3300';
      ctx.fillRect(-w/2, -h/2, w, h);
      ctx.globalAlpha = 1;
    }

    // Missile reload progress bar (Missile Silo)
    if (def.missileCapacity !== undefined && this.reloadTimer > 0 && !this.underConstruction) {
      var reloadPct = 1 - (this.reloadTimer / this.getStats().missileReloadTime);
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = 'rgba(30,30,50,0.9)';
      ctx.strokeStyle = '#4a8aff';
      ctx.lineWidth = 2 * sc;
      var barW = w * 0.8, barH = 6 * sc;
      var barX = -barW/2, barY = -h * 1.6;
      _rrect(ctx, barX, barY, barW, barH, 3*sc);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4a8aff';
      _rrect(ctx, barX, barY, barW * reloadPct, barH, 3*sc);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + (7*sc) + 'px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(Math.ceil(this.reloadTimer) + 's', 0, barY + barH/2);
      ctx.restore();
    }

    // Interceptor cooldown progress bar
    if (def.interceptBaseChance !== undefined && this.interceptCooldown > 0 && !this.underConstruction) {
      var cdPct = 1 - (this.interceptCooldown / (def.cooldown || 30));
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = 'rgba(30,50,40,0.9)';
      ctx.strokeStyle = '#4aff8a';
      ctx.lineWidth = 2 * sc;
      var barW = w * 0.8, barH = 6 * sc;
      var barX = -barW/2, barY = -h * 1.6;
      _rrect(ctx, barX, barY, barW, barH, 3*sc);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4aff8a';
      _rrect(ctx, barX, barY, barW * cdPct, barH, 3*sc);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + (7*sc) + 'px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(Math.ceil(this.interceptCooldown) + 's', 0, barY + barH/2);
      ctx.restore();
    }

    // Under-construction scaffold
    if (this.underConstruction) {
      var pct = this.constructionMax > 0 ? 1 - this.constructionTime / this.constructionMax : 0;
      var renderer0 = _RENDERERS[this.type];
      ctx.globalAlpha = 0.25;
      if (renderer0) renderer0(ctx, sc, w, h, def, this.level, 0);
      else _drawStandard(ctx, sc, w, h, def, this.type, this.level);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#8b6030'; ctx.lineWidth = 2 * sc;
      ctx.beginPath(); ctx.moveTo(-w*0.5, 0); ctx.lineTo(-w*0.5, -h*1.25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo( w*0.5, 0); ctx.lineTo( w*0.5, -h*1.25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-w*0.5, -h*0.7); ctx.lineTo(w*0.5, -h*0.7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-w*0.5, -h*1.25); ctx.lineTo(w*0.5, -h*1.25); ctx.stroke();
      ctx.strokeStyle = 'rgba(139,96,48,0.5)';
      ctx.beginPath(); ctx.moveTo(-w*0.5,-h*1.25); ctx.lineTo(w*0.5, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo( w*0.5,-h*1.25); ctx.lineTo(-w*0.5, 0); ctx.stroke();
      var pbW = w * 1.1, pbH = 8 * sc, pbX = -pbW/2, pbY = -h*1.42;
      ctx.fillStyle = '#1a0e06'; ctx.fillRect(pbX, pbY, pbW, pbH);
      ctx.fillStyle = pct > 0.66 ? '#44aa44' : pct > 0.33 ? '#f5c842' : '#e67e22';
      ctx.fillRect(pbX, pbY, pbW * pct, pbH);
      ctx.strokeStyle = '#8b6030'; ctx.lineWidth = 1; ctx.strokeRect(pbX, pbY, pbW, pbH);
      var secsLeft = Math.ceil(this.constructionTime);
      var timeStr  = secsLeft > 60 ? Math.ceil(secsLeft/60)+'min '+secsLeft%60+'s' : secsLeft+'s';
      ctx.fillStyle = '#f5c842'; ctx.font = 'bold '+(10*sc)+'px Oldenburg,serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(timeStr, 0, pbY - 3*sc);
      if (this.workers && this.workers.length > 0) {
        ctx.fillStyle = '#44aa44'; ctx.font = 'bold '+(9*sc)+'px monospace';
        ctx.fillText('👷 '+this.workers.length+' manggagawa', 0, pbY - 14*sc);
      }
      ctx.restore();
      return;
    }

    // Ground shadow (all except farm)
    if (this.type !== 'farm') {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(0, h*0.12, w*0.62, h*0.2, 0, 0, Math.PI*2); ctx.fill();
    }

    // Main building shape via buildingSprites dispatcher
    drawBuilding(ctx, sc, w, h, def, this.type, this.level, now, _RENDERERS);

    // Occupancy / worker badge
    if (def.isHome) {
      var occ = this.getOccupancy(), cap = this.getCapacity();
      _drawOccupancyBadge(ctx, sc, w, h, occ, cap, 'home');
    } else if ((def.workerSlots || 0) > 0) {
      var wSlots = this.getWorkerSlots();
      var wCount = this._assignedWorkers ? this._assignedWorkers.length : 0;
      if (wSlots > 0) _drawOccupancyBadge(ctx, sc, w, h, wCount, wSlots, 'work');
    }

    // Attack-range ring (subtle)
    if (def.attackRange > 0) {
      ctx.globalAlpha = 0.07;
      ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, def.attackRange*sc, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Collectible resource indicators
    _drawResourceIndicators(ctx, sc, w, h, this);

    // Level badge (top-right)
    if (this.level > 1) {
      ctx.fillStyle = '#f5c842';
      ctx.beginPath(); ctx.arc(w*0.38, -h*1.22, 7*sc, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1a0f06'; ctx.font = 'bold '+(10*sc)+'px Oldenburg,serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this.level, w*0.38, -h*1.22+0.5*sc);
      ctx.textBaseline = 'alphabetic';
    }

    // Label
    ctx.fillStyle = 'rgba(255,225,155,0.82)';
    ctx.font = (11*sc)+'px Crimson Pro,serif'; ctx.textAlign = 'center';
    ctx.fillText(def.label, 0, h*0.28);
    ctx.restore();
  };
}

/* ══════════════════════════════════════════════════════════════
   _RENDERERS
   Lookup table used by draw() and buildingSprites.drawBuilding().
   buildingSprites.js calls back into these for custom shapes.
══════════════════════════════════════════════════════════════ */
var _RENDERERS = {
  farm:         _drawFarm,
  paaralan:     _drawPaaralan,
  cuartel:      _drawCuartel,
  moog:         _drawMoog,
  kuta:         _drawKuta,
  bantayan:     _drawBantayan,
  templo:       _drawTemplo,
  hukuman:      _drawHukuman,
  ospital:      _drawOspital,
  pulisya:      _drawPulisya,
  daungan:      _drawDaungan,
  kalye:        _drawKalye,
  minalangis:   _drawMinalangis,
  missilesilo:  _drawMissileSilo,
  radarstation: _drawRadarStation,
  interceptor:  _drawInterceptor,
};

/* ══════════════════════════════════════════════════════════════
   RESOURCE COLLECTION INDICATORS
   Bobbing circles above buildings when uncollected >= 40% cap.
══════════════════════════════════════════════════════════════ */
function _drawResourceIndicators(ctx, sc, w, h, building) {
  var showGold   = building.shouldShowGoldIndicator();
  var showFood   = building.shouldShowFoodIndicator();
  var showLangis = building.shouldShowLangisIndicator();

  if (showGold) {
    var ug   = Math.floor(building.uncollectedGold);
    var bob2 = Math.sin(Date.now()/600 + building.x) * 3 * sc;
    ctx.fillStyle = '#f5c842';
    ctx.beginPath(); ctx.arc(0, -h*1.55+bob2, 13*sc, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#c49a1a'; ctx.lineWidth = 1.5*sc; ctx.stroke();
    ctx.fillStyle = '#7a5010'; ctx.font = 'bold '+(9*sc)+'px Oldenburg,serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🪙', 0, -h*1.55+bob2);
    ctx.fillStyle = '#f5c842'; ctx.font = 'bold '+(8*sc)+'px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('+'+ug, 0, -h*1.55+bob2+15*sc);
    ctx.textBaseline = 'alphabetic';
  }

  if (showFood) {
    var uf   = Math.floor(building.uncollectedFood);
    var bob3 = Math.sin(Date.now()/700 + building.x + 1) * 3 * sc;
    var xOff = showGold ? w * 0.7 : 0;
    ctx.fillStyle = '#44bb44';
    ctx.beginPath(); ctx.arc(xOff, -h*1.55+bob3, 13*sc, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#228822'; ctx.lineWidth = 1.5*sc; ctx.stroke();
    ctx.fillStyle = '#0a2a0a'; ctx.font = 'bold '+(9*sc)+'px Oldenburg,serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🌾', xOff, -h*1.55+bob3);
    ctx.fillStyle = '#88ee88'; ctx.font = 'bold '+(8*sc)+'px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('+'+uf, xOff, -h*1.55+bob3+15*sc);
    ctx.textBaseline = 'alphabetic';
  }

  if (showLangis) {
    var ul   = Math.floor(building.uncollectedLangis);
    var bobL = Math.sin(Date.now()/800 + building.x + 2) * 3 * sc;
    var xOff = 0;
    if (showGold && showFood)      xOff = -w * 0.5;
    else if (showGold)             xOff =  w * 0.35;
    else if (showFood)             xOff = -w * 0.35;
    ctx.fillStyle = '#2a4a3a';
    ctx.beginPath(); ctx.arc(xOff, -h*1.55+bobL, 13*sc, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#4a8a6a'; ctx.lineWidth = 1.5*sc; ctx.stroke();
    ctx.fillStyle = '#0a2a1a'; ctx.font = 'bold '+(9*sc)+'px Oldenburg,serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⛽', xOff, -h*1.55+bobL);
    ctx.fillStyle = '#88eeaa'; ctx.font = 'bold '+(8*sc)+'px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('+'+ul, xOff, -h*1.55+bobL+15*sc);
    ctx.textBaseline = 'alphabetic';
  }
}

/* ══════════════════════════════════════════════════════════════
   WRECK
══════════════════════════════════════════════════════════════ */
function _drawWreck(ctx, sc, w, h, b) {
  var def = b.getDef ? b.getDef() : {};
  ctx.fillStyle = 'rgba(80,60,40,0.75)'; ctx.fillRect(-w*0.45,-h*0.28,w*0.9,h*0.32);
  ctx.fillStyle = 'rgba(100,80,55,0.65)';
  [[-w*0.3,-h*0.35,w*0.18,h*0.1],[w*0.15,-h*0.3,w*0.22,h*0.12],[-w*0.45,-h*0.1,w*0.15,h*0.1]].forEach(function(r){ctx.fillRect(r[0],r[1],r[2],r[3]);});
  if (def.wallColor) { ctx.globalAlpha=0.35; ctx.fillStyle=def.wallColor; ctx.fillRect(-w*0.42,-h*0.3,w*0.84,h*0.34); ctx.globalAlpha=1; }
  ctx.strokeStyle=def.roofColor||'#5a3a10'; ctx.lineWidth=2.5*sc;
  ctx.beginPath(); ctx.moveTo(-w*0.25,-h*0.28); ctx.lineTo(0,-h*0.58); ctx.lineTo(w*0.18,-h*0.28); ctx.stroke();
  ctx.fillStyle='rgba(10,6,2,0.78)';
  var pw=32*sc,ph=13*sc,px=-pw/2,py=-h*0.82;
  _rrectWreck(ctx,px,py,pw,ph,3*sc); ctx.fill();
  ctx.fillStyle='#ffcc44'; ctx.font='bold '+Math.max(7,Math.round(9*sc))+'px monospace';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('🔧 SIRA',0,py+ph/2); ctx.textBaseline='alphabetic';
}

/* ══════════════════════════════════════════════════════════════
   OCCUPANCY BADGE
══════════════════════════════════════════════════════════════ */
function _drawOccupancyBadge(ctx,sc,w,h,occ,cap,mode){
  var text=occ+'/'+cap; var icon=mode==='work'?'👷':'🏠'; var label=icon+text;
  var bx=-w*0.48,by=-h*1.28,bw=Math.max((label.length*6+10)*sc,28*sc),bh=12*sc;
  ctx.save();
  if(mode==='work'){
    ctx.fillStyle=occ>=cap?'#1a4a1a':occ>0?'#1a3a0a':'#1a1808';
    ctx.strokeStyle=occ>=cap?'#44aa44':'#5a8a3a';
  } else {
    ctx.fillStyle=occ>=cap?'#c0392b':occ>0?'#1a4a8a':'#1a1808';
    ctx.strokeStyle=occ>=cap?'#e74c3c':'#4a8abf';
  }
  ctx.lineWidth=0.8;
  _rrect(ctx,bx,by,bw,bh,2*sc); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font=(8*sc)+'px monospace';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(label,bx+bw/2,by+bh/2);
  ctx.textBaseline='alphabetic'; ctx.restore();
}

/* ══════════════════════════════════════════════════════════════
   SHARED CANVAS UTILITIES
══════════════════════════════════════════════════════════════ */
function _rrect(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}

function _rrectWreck(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}

function _darken(hex,amount){var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);r=Math.max(0,Math.round(r*(1-amount)));g=Math.max(0,Math.round(g*(1-amount)));b=Math.max(0,Math.round(b*(1-amount)));return '#'+('0'+r.toString(16)).slice(-2)+('0'+g.toString(16)).slice(-2)+('0'+b.toString(16)).slice(-2);}

/* ══════════════════════════════════════════════════════════════
   BUILDING SHAPE RENDERERS
   Signature: (ctx, sc, w, h, def, level, now?)
   All hoisted above _RENDERERS so the table can reference them.
══════════════════════════════════════════════════════════════ */

function _drawFarm(ctx,sc,w,h,def,level,now){var t=now?now/1000:0;var rows=Math.min(2+level,5);var fw=w*1.1,fh=h*0.9,top=-fh*0.5,rowH=fh/rows;for(var r=0;r<rows;r++){var ry=top+r*rowH;ctx.fillStyle=(r%2===0)?'rgba(80,140,160,0.72)':'rgba(60,120,140,0.65)';ctx.fillRect(-fw*0.5,ry,fw,rowH-1.5*sc);var shimmer=Math.sin(t*0.9+r*1.1)*0.12+0.10;ctx.fillStyle='rgba(200,240,255,'+shimmer+')';ctx.fillRect(-fw*0.3,ry+rowH*0.35,fw*0.6,1.5*sc);ctx.fillStyle='rgba(180,220,255,0.15)';ctx.fillRect(-fw*0.5,ry+1.5*sc,fw,rowH*0.18);ctx.fillStyle='#6b4c2a';ctx.fillRect(-fw*0.52,ry+rowH-1.5*sc,fw*1.04,3.5*sc);ctx.fillStyle='#7a5830';ctx.fillRect(-fw*0.52,ry,3*sc,rowH);ctx.fillRect(fw*0.49,ry,3*sc,rowH);var stalksPerRow=Math.floor(fw/(8*sc)),stalkSpacing=fw/(stalksPerRow+1);for(var s=0;s<stalksPerRow;s++){var sx2=-fw*0.5+stalkSpacing*(s+1);var sway=Math.sin(t*1.2+s*0.7+r*2.1)*0.8*sc;var stalkH=(rowH*0.62)*(0.85+0.3*((s*7+r*3)%5)/5);var stalkBase=ry+rowH-2*sc;ctx.strokeStyle='#4a7a28';ctx.lineWidth=1.2*sc;ctx.beginPath();ctx.moveTo(sx2,stalkBase);ctx.quadraticCurveTo(sx2+sway,stalkBase-stalkH*0.5,sx2+sway*1.5,stalkBase-stalkH);ctx.stroke();ctx.strokeStyle='#8aae38';ctx.lineWidth=1.8*sc;ctx.beginPath();ctx.moveTo(sx2+sway*1.5,stalkBase-stalkH);ctx.quadraticCurveTo(sx2+sway*1.5+2*sc,stalkBase-stalkH+2*sc,sx2+sway*1.5+1*sc,stalkBase-stalkH+4.5*sc);ctx.stroke();ctx.fillStyle='rgba(200,170,40,0.85)';ctx.beginPath();ctx.ellipse(sx2+sway*1.5+1*sc,stalkBase-stalkH+5.5*sc,1.4*sc,2.2*sc,0.3,0,Math.PI*2);ctx.fill();}}ctx.strokeStyle='#5a3c18';ctx.lineWidth=2*sc;ctx.strokeRect(-fw*0.52,top,fw*1.04,fh+2*sc);var scx=fw*0.32,scy=top+fh*0.25;ctx.strokeStyle='#6b4020';ctx.lineWidth=1.8*sc;ctx.beginPath();ctx.moveTo(scx,scy+10*sc);ctx.lineTo(scx,scy-14*sc);ctx.stroke();ctx.beginPath();ctx.moveTo(scx-7*sc,scy-5*sc);ctx.lineTo(scx+7*sc,scy-5*sc);ctx.stroke();ctx.fillStyle='#c8a040';ctx.beginPath();ctx.ellipse(scx,scy-15*sc,4.5*sc,2.5*sc,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(scx,scy-17*sc,2.5*sc,2.5*sc,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(200,80,40,0.7)';ctx.fillRect(scx-3.5*sc,scy-10*sc,7*sc,6*sc);}

function _drawStandard(ctx,sc,w,h,def,type,level){ctx.fillStyle=def.wallColor;ctx.fillRect(-w/2,-h*0.55,w,h*0.67);var ws=ctx.createLinearGradient(-w/2,0,w/2,0);ws.addColorStop(0,'rgba(0,0,0,0)');ws.addColorStop(0.7,'rgba(0,0,0,0)');ws.addColorStop(1,'rgba(0,0,0,0.18)');ctx.fillStyle=ws;ctx.fillRect(-w/2,-h*0.55,w,h*0.67);ctx.fillStyle=def.roofColor;ctx.beginPath();ctx.moveTo(-w*0.58,-h*0.55);ctx.lineTo(0,-h*1.12);ctx.lineTo(w*0.58,-h*0.55);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,255,255,0.08)';ctx.beginPath();ctx.moveTo(-w*0.1,-h*0.55);ctx.lineTo(0,-h*1.12);ctx.lineTo(w*0.1,-h*0.55);ctx.closePath();ctx.fill();ctx.fillStyle=def.doorColor||'rgba(30,15,5,0.8)';var dw=10*sc,dh=h*0.34;ctx.beginPath();ctx.rect(-dw/2,-dh,dw,dh);ctx.arc(0,-dh,dw/2,Math.PI,0,true);ctx.fill();var ww=9*sc,wh=7*sc;ctx.fillStyle=def.winColor||'rgba(255,230,140,0.6)';ctx.fillRect(-w*0.32,-h*0.48,ww,wh);ctx.fillRect(w*0.22,-h*0.48,ww,wh);ctx.strokeStyle='rgba(0,0,0,0.2)';ctx.lineWidth=0.8*sc;[-w*0.32+ww/2,w*0.22+ww/2].forEach(function(wx){ctx.beginPath();ctx.moveTo(wx,-h*0.48);ctx.lineTo(wx,-h*0.48+wh);ctx.moveTo(wx-ww/2,-h*0.48+wh/2);ctx.lineTo(wx+ww/2,-h*0.48+wh/2);ctx.stroke();});if(type==='storage'){ctx.fillStyle='rgba(100,80,40,0.7)';ctx.beginPath();ctx.ellipse(0,-h*0.28,8*sc,10*sc,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#6b4c2a';ctx.lineWidth=1.5*sc;for(var bi=0;bi<2;bi++){ctx.beginPath();ctx.ellipse(0,-h*0.28+(bi-0.5)*8*sc,8*sc,2.5*sc,0,0,Math.PI*2);ctx.stroke();}}}

function _drawPaaralan(ctx,sc,w,h,def,level){ctx.fillStyle=def.wallColor;ctx.fillRect(-w/2,-h*0.55,w,h*0.67);ctx.fillStyle=def.roofColor;ctx.fillRect(-w*0.6,-h*0.6,w*1.2,h*0.1);ctx.fillStyle=def.winColor;for(var wi=-1;wi<=1;wi++){ctx.fillRect(wi*w*0.28-7*sc,-h*0.5,14*sc,10*sc);ctx.strokeStyle='rgba(0,0,0,0.2)';ctx.lineWidth=0.8*sc;ctx.strokeRect(wi*w*0.28-7*sc,-h*0.5,14*sc,10*sc);}ctx.strokeStyle='#888';ctx.lineWidth=1.5*sc;ctx.beginPath();ctx.moveTo(w*0.38,-h*0.6);ctx.lineTo(w*0.38,-h*1.25);ctx.stroke();ctx.fillStyle='#3a80c0';ctx.fillRect(w*0.38,-h*1.23,12*sc,7*sc);ctx.fillStyle='#fff';ctx.fillRect(w*0.38,-h*1.23,12*sc,3*sc);ctx.fillStyle=def.doorColor||'rgba(80,60,0,0.8)';ctx.fillRect(-6*sc,-h*0.28,12*sc,h*0.28);ctx.fillStyle='#fff8c0';ctx.fillRect(-w*0.35,-h*0.68,w*0.7,9*sc);ctx.fillStyle='#5a3800';ctx.font=(9*sc)+'px Oldenburg,serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('PAARALAN',0,-h*0.68+4.5*sc);ctx.textBaseline='alphabetic';}

function _drawCuartel(ctx,sc,w,h,def,level){ctx.fillStyle=def.wallColor;ctx.fillRect(-w/2,-h*0.55,w,h*0.67);ctx.fillStyle=def.roofColor;ctx.fillRect(-w*0.55,-h*0.62,w*1.1,h*0.1);for(var bi=-2;bi<=2;bi++)ctx.fillRect(bi*w*0.22-5*sc,-h*0.76,10*sc,15*sc);ctx.fillStyle='rgba(10,20,5,0.7)';for(var si=-1;si<=1;si++)ctx.fillRect(si*w*0.28-2.5*sc,-h*0.53,5*sc,13*sc);ctx.fillStyle=def.doorColor||'rgba(10,30,5,0.9)';ctx.fillRect(-9*sc,-h*0.3,18*sc,h*0.3);ctx.strokeStyle='#6b4c2a';ctx.lineWidth=2*sc;ctx.strokeRect(-9*sc,-h*0.3,18*sc,h*0.3);ctx.fillStyle='#8b7040';for(var di=0;di<3;di++){ctx.beginPath();ctx.arc(-4*sc,-h*0.26+di*5*sc,1.5*sc,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(4*sc,-h*0.26+di*5*sc,1.5*sc,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#8b4513';ctx.fillRect(-w*0.42,-h*0.51,3*sc,12*sc);ctx.fillStyle='#ff8c00';ctx.beginPath();ctx.ellipse(-w*0.42+1.5*sc,-h*0.54,4*sc,5*sc,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,200,50,0.6)';ctx.beginPath();ctx.ellipse(-w*0.42+1.5*sc,-h*0.56,2.5*sc,3.5*sc,0,0,Math.PI*2);ctx.fill();}

function _drawMoog(ctx,sc,w,h,def,level){ctx.fillStyle=def.wallColor;ctx.beginPath();ctx.rect(-w*0.4,-h*0.9,w*0.8,h*1.05);ctx.fill();ctx.fillStyle=def.roofColor;ctx.fillRect(-w*0.5,-h*0.92,w*1.0,h*0.12);for(var mi=-2;mi<=2;mi++)ctx.fillRect(mi*w*0.22-4*sc,-h*1.05,8*sc,14*sc);ctx.fillStyle='rgba(10,8,5,0.7)';ctx.fillRect(-3*sc,-h*0.6,6*sc,14*sc);ctx.fillRect(-3*sc,-h*0.3,6*sc,14*sc);ctx.strokeStyle='rgba(0,0,0,0.15)';ctx.lineWidth=0.8*sc;for(var si2=0;si2<4;si2++){ctx.beginPath();ctx.moveTo(-w*0.4,-h*0.6+si2*h*0.2);ctx.lineTo(w*0.4,-h*0.6+si2*h*0.2);ctx.stroke();}ctx.fillStyle=def.doorColor||'rgba(50,30,5,0.9)';ctx.beginPath();ctx.rect(-5*sc,0,10*sc,h*0.2);ctx.arc(0,0,5*sc,Math.PI,0,true);ctx.fill();}

function _drawKuta(ctx,sc,w,h,def,level){ctx.fillStyle=def.wallColor;ctx.fillRect(-w*0.55,-h*0.4,w*1.1,h*0.55);ctx.fillStyle=def.roofColor;ctx.fillRect(-w*0.55,-h*0.45,w*1.1,h*0.1);var nParts=Math.floor(w*0.9/12);for(var ki=0;ki<nParts;ki++){var kx=-w*0.5+ki*(w/nParts);ctx.fillRect(kx,-h*0.56,w*0.04,h*0.15);}ctx.strokeStyle='rgba(0,0,0,0.12)';ctx.lineWidth=0.6*sc;ctx.beginPath();ctx.moveTo(-w*0.55,-h*0.15);ctx.lineTo(w*0.55,-h*0.15);ctx.stroke();ctx.beginPath();ctx.moveTo(-w*0.55,-h*0.3);ctx.lineTo(w*0.55,-h*0.3);ctx.stroke();}

function _drawBantayan(ctx,sc,w,h,def,level){ctx.fillStyle=def.wallColor;ctx.beginPath();ctx.rect(-w*0.35,-h*1.1,w*0.7,h*1.25);ctx.fill();ctx.fillStyle=def.roofColor;ctx.beginPath();ctx.moveTo(-w*0.42,-h*1.1);ctx.lineTo(0,-h*1.55);ctx.lineTo(w*0.42,-h*1.1);ctx.closePath();ctx.fill();ctx.fillStyle=def.roofColor;ctx.fillRect(-w*0.42,-h*0.55,w*0.84,h*0.08);for(var ai=-1;ai<=1;ai++)ctx.fillRect(ai*w*0.25-4*sc,-h*0.64,8*sc,10*sc);ctx.fillStyle='rgba(10,8,5,0.7)';ctx.fillRect(-2.5*sc,-h*0.9,5*sc,12*sc);ctx.fillRect(-2.5*sc,-h*0.35,5*sc,12*sc);ctx.fillStyle=def.doorColor||'rgba(20,15,5,0.95)';ctx.beginPath();ctx.rect(-5*sc,0,10*sc,h*0.2);ctx.arc(0,0,5*sc,Math.PI,0,true);ctx.fill();ctx.fillStyle='#DAA520';ctx.beginPath();ctx.moveTo(-3*sc,-h*1.53);ctx.lineTo(0,-h*1.7);ctx.lineTo(3*sc,-h*1.53);ctx.closePath();ctx.fill();}

function _drawTemplo(ctx,sc,w,h,def,level){ctx.fillStyle=def.wallColor;ctx.fillRect(-w/2,-h*0.55,w,h*0.67);ctx.fillStyle=def.roofColor;ctx.beginPath();ctx.moveTo(-w*0.58,-h*0.55);ctx.lineTo(0,-h*1.0);ctx.lineTo(w*0.58,-h*0.55);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,255,255,0.1)';ctx.beginPath();ctx.moveTo(-w*0.35,-h*0.55);ctx.lineTo(0,-h*1.0);ctx.lineTo(w*0.35,-h*0.55);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(50,30,0,0.9)';ctx.fillRect(-8*sc,-h*0.35,16*sc,h*0.35);ctx.fillStyle='#DAA520';ctx.beginPath();ctx.arc(0,-h*0.7,6*sc,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fffaaa';ctx.beginPath();ctx.arc(0,-h*0.7,3.5*sc,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(200,200,255,0.3)';ctx.lineWidth=1.5*sc;for(var ti=0;ti<2;ti++){ctx.beginPath();ctx.moveTo((ti?5:-5)*sc,-h*0.55);ctx.quadraticCurveTo((ti?12:-12)*sc,-h*0.75,(ti?6:-6)*sc,-h*0.95);ctx.stroke();}}

function _drawHukuman(ctx,sc,w,h,def,level){ctx.fillStyle=def.wallColor;ctx.fillRect(-w/2,-h*0.55,w,h*0.67);ctx.fillStyle=_darken(def.wallColor,0.15);for(var ci=-1;ci<=1;ci++){ctx.fillRect(ci*w*0.28-3*sc,-h*0.55,6*sc,h*0.5);}ctx.fillStyle=def.roofColor;ctx.beginPath();ctx.moveTo(-w*0.58,-h*0.55);ctx.lineTo(0,-h*0.9);ctx.lineTo(w*0.58,-h*0.55);ctx.closePath();ctx.fill();ctx.fillStyle=def.doorColor||'rgba(50,30,5,0.9)';ctx.fillRect(-9*sc,-h*0.3,18*sc,h*0.3);ctx.strokeStyle='#DAA520';ctx.lineWidth=1.5*sc;ctx.beginPath();ctx.moveTo(0,-h*0.72);ctx.lineTo(0,-h*0.62);ctx.stroke();ctx.beginPath();ctx.moveTo(-8*sc,-h*0.72);ctx.lineTo(8*sc,-h*0.72);ctx.stroke();ctx.beginPath();ctx.arc(-6*sc,-h*0.68,4*sc,0,Math.PI);ctx.stroke();ctx.beginPath();ctx.arc(6*sc,-h*0.68,4*sc,0,Math.PI);ctx.stroke();}

function _drawOspital(ctx,sc,w,h,def,level){ctx.fillStyle=def.wallColor;ctx.fillRect(-w/2,-h*0.55,w,h*0.67);ctx.fillStyle=def.roofColor;ctx.fillRect(-w*0.55,-h*0.6,w*1.1,h*0.1);ctx.fillStyle=def.winColor;for(var wi=-1;wi<=1;wi++){ctx.fillRect(wi*w*0.28-7*sc,-h*0.5,14*sc,10*sc);}ctx.fillStyle='#cc2222';ctx.fillRect(-3*sc,-h*0.48,6*sc,18*sc);ctx.fillRect(-9*sc,-h*0.38,18*sc,6*sc);ctx.fillStyle=def.doorColor;ctx.fillRect(-7*sc,-h*0.28,14*sc,h*0.28);}

function _drawPulisya(ctx,sc,w,h,def,level){ctx.fillStyle=def.wallColor;ctx.fillRect(-w/2,-h*0.55,w,h*0.67);ctx.fillStyle=def.roofColor;ctx.beginPath();ctx.moveTo(-w*0.58,-h*0.55);ctx.lineTo(0,-h*1.0);ctx.lineTo(w*0.58,-h*0.55);ctx.closePath();ctx.fill();ctx.fillStyle='#f5c842';ctx.beginPath();ctx.arc(0,-h*0.35,8*sc,0,Math.PI*2);ctx.fill();ctx.fillStyle=def.wallColor;ctx.font='bold '+(6*sc)+'px Oldenburg,serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('PNP',0,-h*0.35+0.5*sc);ctx.textBaseline='alphabetic';ctx.fillStyle=def.doorColor;ctx.fillRect(-7*sc,-h*0.28,14*sc,h*0.28);}

function _drawDaungan(ctx,sc,w,h,def,level){ctx.fillStyle='#5a4020';ctx.fillRect(-w*0.55,-h*0.25,w*1.1,h*0.35);for(var pi=-2;pi<=2;pi++){ctx.fillStyle='#4a3010';ctx.fillRect(pi*w*0.22-2*sc,0,4*sc,h*0.3);}ctx.fillStyle=def.wallColor;ctx.fillRect(-w*0.35,-h*0.55,w*0.7,h*0.32);ctx.fillStyle=def.roofColor;ctx.fillRect(-w*0.4,-h*0.6,w*0.8,h*0.1);ctx.fillStyle='rgba(60,120,180,0.35)';ctx.fillRect(-w*0.55,h*0.22,w*1.1,h*0.12);ctx.strokeStyle='#e8d4a0';ctx.lineWidth=1.5*sc;ctx.beginPath();ctx.arc(0,-h*0.38,4*sc,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(0,-h*0.38-4*sc);ctx.lineTo(0,-h*0.38+8*sc);ctx.stroke();}

function _drawKalye(ctx,sc,w,h,def,level){ctx.fillStyle='#7a6a50';ctx.fillRect(-w*0.55,-h*0.3,w*1.1,h*0.45);ctx.strokeStyle='rgba(240,230,180,0.5)';ctx.lineWidth=1.5*sc;ctx.setLineDash([8*sc,6*sc]);ctx.beginPath();ctx.moveTo(-w*0.5,0);ctx.lineTo(w*0.5,0);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='rgba(255,230,150,0.3)';ctx.lineWidth=1*sc;ctx.beginPath();ctx.moveTo(-w*0.55,-h*0.29);ctx.lineTo(w*0.55,-h*0.29);ctx.stroke();ctx.beginPath();ctx.moveTo(-w*0.55,h*0.14);ctx.lineTo(w*0.55,h*0.14);ctx.stroke();}

function _drawMinalangis(ctx, sc, w, h, def, level) {
  ctx.fillStyle = '#3a2808';
  ctx.fillRect(-w*0.5, -h*0.2, w, h*0.32);
  ctx.strokeStyle = '#5a3a10'; ctx.lineWidth = 3.5 * sc;
  ctx.beginPath(); ctx.moveTo(-w*0.35, 0); ctx.lineTo(0, -h*1.05); ctx.lineTo(w*0.35, 0); ctx.stroke();
  ctx.lineWidth = 2 * sc; ctx.strokeStyle = '#4a2a08';
  ctx.beginPath(); ctx.moveTo(-w*0.25, -h*0.35); ctx.lineTo(w*0.25, -h*0.35); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-w*0.18, -h*0.65); ctx.lineTo(w*0.18, -h*0.65); ctx.stroke();
  ctx.fillStyle = '#7a4018'; ctx.fillRect(-w*0.38, -h*0.38, w*0.28, h*0.2);
  ctx.strokeStyle = '#c87828'; ctx.lineWidth = 4 * sc;
  ctx.beginPath(); ctx.moveTo(-w*0.24, -h*0.3); ctx.lineTo(-w*0.08, -h*0.52); ctx.stroke();
  ctx.strokeStyle = '#1a1008'; ctx.lineWidth = 5 * sc;
  ctx.beginPath(); ctx.moveTo(-w*0.08, -h*0.52); ctx.lineTo(-w*0.08, 0); ctx.stroke();
  ctx.fillStyle = 'rgba(10,8,4,0.55)';
  ctx.beginPath(); ctx.ellipse(-w*0.08, h*0.08, 10*sc, 4*sc, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#5a3810';
  ctx.beginPath(); ctx.ellipse(w*0.3, -h*0.1, 11*sc, 11*sc, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#8a5820'; ctx.lineWidth = 1.5 * sc;
  for (var ring = -1; ring <= 1; ring++) {
    ctx.beginPath(); ctx.ellipse(w*0.3, -h*0.1 + ring*5*sc, 11*sc, 3*sc, 0, 0, Math.PI*2); ctx.stroke();
  }
  ctx.fillStyle = '#f5c842'; ctx.fillRect(-3*sc, -h*1.08, 6*sc, 6*sc);
  ctx.fillStyle = '#cc2222'; ctx.fillRect(-3*sc, -h*1.08, 3*sc, 3*sc); ctx.fillRect(0, -h*1.05, 3*sc, 3*sc);
  if (level >= 2) {
    ctx.fillStyle = '#2a1808';
    ctx.beginPath(); ctx.ellipse(w*0.44, -h*0.22, 5*sc, 7*sc, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#5a3010'; ctx.lineWidth = 1 * sc;
    ctx.beginPath(); ctx.ellipse(w*0.44, -h*0.22, 5*sc, 2*sc, 0, 0, Math.PI); ctx.stroke();
  }
}

function _drawMissileSilo(ctx, sc, w, h, def, level, now) {
  ctx.fillStyle = def.wallColor;
  ctx.fillRect(-w*0.45, -h*0.3, w*0.9, h*0.45);
  ctx.strokeStyle = '#5a5a7a'; ctx.lineWidth = 3 * sc;
  ctx.strokeRect(-w*0.45, -h*0.3, w*0.9, h*0.45);
  ctx.fillStyle = def.doorColor;
  ctx.fillRect(-w*0.35, -h*0.15, w*0.7, h*0.25);
  ctx.strokeStyle = '#3a3a5a'; ctx.lineWidth = 2 * sc;
  ctx.strokeRect(-w*0.35, -h*0.15, w*0.7, h*0.25);
  ctx.fillStyle = def.roofColor;
  ctx.beginPath();
  ctx.moveTo(-w*0.5, -h*0.3); ctx.lineTo(0, -h*0.85); ctx.lineTo(w*0.5, -h*0.3);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4a6aff';
  ctx.beginPath(); ctx.ellipse(0, -h*0.92, 12*sc, 8*sc, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#2a4aff'; ctx.lineWidth = 2 * sc; ctx.stroke();
  if (level >= 2) {
    ctx.fillStyle = '#8a4a2a';
    ctx.fillRect(-w*0.08, -h*0.12, w*0.16, h*0.18);
    ctx.fillStyle = '#cc2222';
    ctx.beginPath();
    ctx.moveTo(0, -h*0.12); ctx.lineTo(-w*0.05, -h*0.05); ctx.lineTo(w*0.05, -h*0.05);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = def.winColor;
  ctx.fillRect(-w*0.15, -h*0.55, w*0.3, h*0.15);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1 * sc;
  ctx.strokeRect(-w*0.15, -h*0.55, w*0.3, h*0.15);
  ctx.fillStyle = 'rgba(255,100,100,0.6)';
  for (var i = 0; i < 3; i++) ctx.fillRect(-w*0.42 + i*w*0.28, -h*0.35, w*0.12, h*0.08);
  if (level >= 3) {
    ctx.globalAlpha = 0.3 + 0.2 * Math.sin((now||0)/300);
    ctx.fillStyle = '#4aff8a';
    ctx.beginPath(); ctx.arc(0, -h*0.95, 6*sc, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function _drawRadarStation(ctx, sc, w, h, def, level, now) {
  ctx.fillStyle = '#3a4a5a';
  ctx.beginPath(); ctx.ellipse(0, 0, w*0.55, h*0.15, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = def.wallColor;
  ctx.fillRect(-w*0.12, -h*0.65, w*0.24, h*0.7);
  ctx.strokeStyle = '#2a3a4a'; ctx.lineWidth = 2 * sc;
  ctx.strokeRect(-w*0.12, -h*0.65, w*0.24, h*0.7);
  ctx.strokeStyle = '#5a6a7a'; ctx.lineWidth = 1.5 * sc;
  for (var rung = 0; rung < 5; rung++) {
    ctx.beginPath();
    ctx.moveTo(-w*0.08, -h*0.55 + rung*h*0.12);
    ctx.lineTo(w*0.08, -h*0.55 + rung*h*0.12);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(0, -h*0.72);
  ctx.rotate((now || 0) / 800);
  ctx.fillStyle = '#4a5a6a'; ctx.fillRect(-2*sc, -h*0.05, 4*sc, h*0.25);
  ctx.fillStyle = '#5a8aff';
  ctx.beginPath(); ctx.ellipse(0, -h*0.15, w*0.35, w*0.12, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#3a6aff'; ctx.lineWidth = 2 * sc; ctx.stroke();
  ctx.fillStyle = '#2a4a6a';
  ctx.beginPath(); ctx.arc(0, -h*0.15, 5*sc, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  if (level >= 2) {
    ctx.globalAlpha = 0.2 + 0.15 * Math.sin((now||0)/200);
    ctx.strokeStyle = '#4affff'; ctx.lineWidth = 2 * sc;
    ctx.setLineDash([8*sc, 6*sc]);
    ctx.beginPath(); ctx.arc(0, -h*0.72, w*0.6, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  ctx.fillStyle = def.winColor;
  ctx.fillRect(-w*0.08, -h*0.45, w*0.16, h*0.12);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1 * sc;
  ctx.strokeRect(-w*0.08, -h*0.45, w*0.16, h*0.12);
  if (level >= 3) {
    ctx.fillStyle = '#6a8aff';
    for (var ant = -1; ant <= 1; ant++) {
      ctx.fillRect(ant*w*0.18 - 2*sc, -h*0.82, 4*sc, h*0.12);
    }
  }
}

function _drawInterceptor(ctx, sc, w, h, def, level, now) {
  ctx.fillStyle = '#4a5a4a';
  ctx.fillRect(-w*0.5, -h*0.25, w, h*0.35);
  ctx.fillStyle = def.roofColor;
  ctx.beginPath();
  ctx.moveTo(-w*0.55, -h*0.25); ctx.lineTo(0, -h*0.55); ctx.lineTo(w*0.55, -h*0.25);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = def.doorColor;
  ctx.fillRect(-w*0.25, -h*0.15, w*0.5, h*0.2);
  ctx.strokeStyle = '#2a3a2a'; ctx.lineWidth = 3 * sc;
  ctx.strokeRect(-w*0.25, -h*0.15, w*0.5, h*0.2);
  ctx.fillStyle = '#6a7a6a';
  for (var hinge = -1; hinge <= 1; hinge += 2) {
    ctx.fillRect(hinge*w*0.22 - 3*sc, -h*0.1, 6*sc, h*0.12);
  }
  ctx.save();
  ctx.translate(0, -h*0.35);
  ctx.rotate(Math.sin((now||0)/1000) * 0.3);
  ctx.fillStyle = '#3a5a3a';
  ctx.beginPath(); ctx.ellipse(0, 0, w*0.25, h*0.08, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#4a6a4a';
  for (var arm = -1; arm <= 1; arm += 2) {
    ctx.save();
    ctx.rotate(arm * 0.4);
    ctx.fillRect(-3*sc, -h*0.05, 6*sc, h*0.35);
    ctx.fillStyle = '#8a4a2a'; ctx.fillRect(-2*sc, -h*0.28, 4*sc, h*0.25);
    ctx.fillStyle = '#cc2222';
    ctx.beginPath();
    ctx.moveTo(0, -h*0.28); ctx.lineTo(-2*sc, -h*0.22); ctx.lineTo(2*sc, -h*0.22);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  ctx.fillStyle = '#4a8aff';
  ctx.beginPath(); ctx.arc(w*0.35, -h*0.32, 5*sc, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#2a6aff'; ctx.lineWidth = 1.5 * sc; ctx.stroke();
  if (level >= 2) {
    ctx.globalAlpha = 0.4 + 0.4 * Math.sin((now||0)/150);
    ctx.fillStyle = '#ff4444';
    ctx.beginPath(); ctx.arc(-w*0.35, -h*0.32, 4*sc, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#5a6a5a';
  for (var vent = -1; vent <= 1; vent += 2) {
    ctx.fillRect(vent*w*0.4 - 4*sc, -h*0.28, 8*sc, h*0.15);
    ctx.fillStyle = '#3a4a3a';
    ctx.fillRect(vent*w*0.4 - 3*sc, -h*0.35, 6*sc, h*0.08);
    ctx.fillStyle = '#5a6a5a';
  }
  if (level >= 3) {
    ctx.fillStyle = 'rgba(100,255,150,0.3)';
    ctx.beginPath(); ctx.arc(0, -h*0.65, w*0.4, 0, Math.PI*2); ctx.fill();
  }
}
