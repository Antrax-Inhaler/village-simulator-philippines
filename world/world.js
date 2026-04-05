import { perspScale } from '../utils/perspective.js';
var RH = 6.4;

var ZX = 427;
var ZY = 240;
var ZW = 426;
var ZH = 240;

var x0 = ZX;
var x1 = ZX + 85;
var x2 = ZX + 149;
var x3 = ZX + 255;
var x4 = ZX + 340;
var x5 = ZX + ZW;

var y0 = ZY;
var y1 = ZY + 36;
var y2 = ZY + 96;
var y3 = ZY + 134;
var y4 = ZY + 175;
var y5 = ZY + 192;
var y6 = ZY + ZH;

export var ROAD_SEGMENTS = [
  { x1:x1, y1:y0, x2:x1, y2:y1, axis:'v' },
  { x1:x1, y1:y2, x2:x1, y2:y5, axis:'v' },
  { x1:x0, y1:y1, x2:x1, y2:y1, axis:'h' },
  { x1:x0, y1:y2, x2:x2, y2:y2, axis:'h' },
  { x1:x0, y1:y4, x2:x1, y2:y4, axis:'h' },

  { x1:x2, y1:y0, x2:x2, y2:y4, axis:'v' },
  { x1:x2, y1:y5, x2:x2, y2:y6, axis:'v' },
  { x1:x3, y1:y0, x2:x3, y2:y4, axis:'v' },
  { x1:x3, y1:y5, x2:x3, y2:y6, axis:'v' },
  { x1:x2, y1:y2, x2:x3, y2:y2, axis:'h' },
  { x1:x2, y1:y3, x2:x3, y2:y3, axis:'h' },
  { x1:x2, y1:y4, x2:x3, y2:y4, axis:'h' },

  { x1:x4, y1:y1, x2:x4, y2:y5, axis:'v' },
  { x1:x3, y1:y2, x2:x5, y2:y2, axis:'h' },
  { x1:x4, y1:y4, x2:x5, y2:y4, axis:'h' },

  { x1:x1, y1:y5, x2:x2, y2:y5, axis:'h' },
  { x1:x3, y1:y5, x2:x4, y2:y5, axis:'h' },
];

var _seen = {};
var _deduped = [];
for (var _i = 0; _i < ROAD_SEGMENTS.length; _i++) {
  var _s = ROAD_SEGMENTS[_i];
  var _k = _s.axis+'_'+_s.x1+'_'+_s.y1+'_'+_s.x2+'_'+_s.y2;
  if (!_seen[_k]) { _seen[_k] = true; _deduped.push(_s); }
}
export var ROAD_SEGMENTS_DEDUPED = _deduped;

export var ROAD_RECTS = (function() {
  var rects = [];
  var VH = window._VH || 660;
  for (var i = 0; i < ROAD_SEGMENTS_DEDUPED.length; i++) {
    var s = ROAD_SEGMENTS_DEDUPED[i];
    if (s.axis === 'h') {
      var scale = perspScale(s.y1);
      var currentRH = RH * scale;
      rects.push({
        x: Math.min(s.x1,s.x2) - currentRH,
        y: s.y1 - currentRH,
        w: Math.abs(s.x2-s.x1) + currentRH*2,
        h: currentRH * 2
      });
    } else {
      var yMid = (s.y1 + s.y2) / 2;
      var scale = perspScale(yMid);
      var currentRH = RH * scale;
      rects.push({
        x: s.x1 - currentRH,
        y: Math.min(s.y1,s.y2) - currentRH,
        w: currentRH * 2,
        h: Math.abs(s.y2-s.y1) + currentRH*2
      });
    }
  }
  return rects;
})();
export function isOnRoad(wx, wy) {
  for (var i = 0; i < ROAD_RECTS.length; i++) {
    var r = ROAD_RECTS[i];
    if (wx >= r.x && wx <= r.x + r.w &&
        wy >= r.y && wy <= r.y + r.h) return true;
  }
  return false;
}

export function isBuildingOnRoad(bx, by, bw, bh) {
  for (var i = 0; i < ROAD_RECTS.length; i++) {
    var r = ROAD_RECTS[i];
    if (bx < r.x + r.w && bx + bw > r.x &&
        by < r.y + r.h && by + bh > r.y) return true;
  }
  return false;
}

export function drawRoads(ctx) {
  var segs = ROAD_SEGMENTS_DEDUPED;
  var VH = window._VH || 660;

  ctx.fillStyle = '#CDBE9F';
  for (var i = 0; i < segs.length; i++) {
    var s = segs[i];
    if (s.axis === 'h') {
      var yMid = s.y1;
      var scale = perspScale(yMid);
      var currentRH = RH * scale;
      ctx.fillRect(
        Math.min(s.x1,s.x2) - currentRH,
        s.y1 - currentRH,
        Math.abs(s.x2-s.x1) + currentRH*2,
        currentRH * 2
      );
    } else {
      var yMid = (s.y1 + s.y2) / 2;
      var scale = perspScale(yMid);
      var currentRH = RH * scale;
      ctx.fillRect(
        s.x1 - currentRH,
        Math.min(s.y1,s.y2) - currentRH,
        currentRH * 2,
        Math.abs(s.y2-s.y1) + currentRH*2
      );
    }
  }

  ctx.strokeStyle = 'rgba(140,125,95,0.55)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 3]);
  ctx.lineCap = 'round';
  for (var j = 0; j < segs.length; j++) {
    var s2 = segs[j];
    ctx.beginPath();
    ctx.moveTo(s2.x1, s2.y1);
    ctx.lineTo(s2.x2, s2.y2);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.lineWidth = 0.8;
  ctx.strokeStyle = 'rgba(180,165,135,0.25)';
  for (var k = 0; k < segs.length; k++) {
    var s3 = segs[k];
    if (s3.axis === 'h') {
      var yMid = s3.y1;
      var scale = perspScale(yMid);
      var currentRH = RH * scale;
      var hx1 = Math.min(s3.x1,s3.x2), hx2 = Math.max(s3.x1,s3.x2);
      ctx.beginPath(); ctx.moveTo(hx1, s3.y1 - currentRH*0.85); ctx.lineTo(hx2, s3.y1 - currentRH*0.85); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx1, s3.y1 + currentRH*0.85); ctx.lineTo(hx2, s3.y1 + currentRH*0.85); ctx.stroke();
    } else {
      var yMid = (s3.y1 + s3.y2) / 2;
      var scale = perspScale(yMid);
      var currentRH = RH * scale;
      var vy1 = Math.min(s3.y1,s3.y2), vy2 = Math.max(s3.y1,s3.y2);
      ctx.beginPath(); ctx.moveTo(s3.x1 - currentRH*0.85, vy1); ctx.lineTo(s3.x1 - currentRH*0.85, vy2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s3.x1 + currentRH*0.85, vy1); ctx.lineTo(s3.x1 + currentRH*0.85, vy2); ctx.stroke();
    }
  }
}