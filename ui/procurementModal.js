/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — ui/procurementModal.js

   BUILDING PROCUREMENT MODAL
   ─────────────────────────────────────────────────────────────
   Mirrors real Philippine government procurement (RA 9184).
   Shows a Project Description & BOM, lets the governor declare
   resource amounts (≥ actual cost), sign, and confirm.

   Over-declaration → corruption exposure + personal wealth.

   EXPORTS
   ─────────────────────────────────────────────────────────────
   showProcurementModal(config)
     config = {
       mode:          'build' | 'upgrade'
       buildingType:  string key (for build)
       buildingObj:   Building instance (for upgrade)
       def:           BUILDING_DEF object
       actualCost:    { gold, rice, langis }
       buildTime:     number (seconds)
       wx, wy:        world position (for build mode)
       VS:            village state
       dayCount:      number
       onConfirm:     function(declaredCost) — called after signing
       onCancel:      function()
       showMsg:       function
     }
═══════════════════════════════════════════════════════════════ */

import { addPersonalIncome } from '../government/personalFinance.js';

/* ── Cached styles flag ───────────────────────────────────── */
var _stylesInjected = false;

/* ══════════════════════════════════════════════════════════════
   showProcurementModal
══════════════════════════════════════════════════════════════ */
export function showProcurementModal(cfg) {
  _injectStyles();

  /* Remove any existing modal */
  var old = document.getElementById('procurement-modal');
  if (old) old.remove();

  var def        = cfg.def;
  var actual     = cfg.actualCost;
  var btime      = cfg.buildTime || 0;
  var timeStr    = btime >= 60 ? Math.ceil(btime / 60) + ' minuto' : btime + ' segundo';
  var label      = def.label || cfg.buildingType || 'Gusali';
  var mode       = cfg.mode || 'build';
  var VS         = cfg.VS;

  /* Labour (15%) and permit (5%) costs based on gold */
  var labourCost = Math.ceil(actual.gold * 0.15);
  var permitCost = Math.ceil(actual.gold * 0.05);

  /* Game date string */
  var hour  = Math.floor(VS.time || 12);
  var ampm  = hour >= 12 ? 'PM' : 'AM';
  var h12   = hour % 12 || 12;
  var dateStr = 'Araw ' + (cfg.dayCount || 1) + ', ' + h12 + ':00 ' + ampm;

  /* Location string with actual world coordinates */
  var zoneName = cfg.wx !== undefined
    ? 'X: ' + Math.round(cfg.wx) + ', Y: ' + Math.round(cfg.wy)
    : 'Lokasyon hindi pa napili';

  /* Project description auto-gen */
  var benefits = _buildBenefitDescription(def);

  /* Build the BOM rows */
  var bomRows = '';
  if (actual.gold > 0) {
    bomRows += _bomRow('Ginto', actual.gold, '🪙', actual.gold);
  }
  if (actual.rice > 0) {
    bomRows += _bomRow('Bigas', actual.rice, '🌾', actual.rice);
  }
  if ((actual.langis || 0) > 0) {
    bomRows += _bomRow('Langis', actual.langis, '🛢️', actual.langis);
  }
  bomRows += _bomRowFlat('Paggawa (15%)', labourCost + ' 🪙');
  bomRows += _bomRowFlat('Permit Fee (5%)', permitCost + ' 🪙');

  var modal = document.createElement('div');
  modal.id  = 'procurement-modal';

  modal.innerHTML = [
    '<div class="pcm-backdrop"></div>',
    '<div class="pcm-box">',

      /* Header */
      '<div class="pcm-header">',
        '<span class="pcm-header-icon">📋</span>',
        '<span class="pcm-header-title">PROYEKTO: ' + label.toUpperCase() + '</span>',
        '<button class="pcm-close-btn" id="pcm-cancel-x">✕</button>',
      '</div>',

      '<div class="pcm-scroll">',

        /* Meta block */
        '<div class="pcm-meta-block">',
          '<div class="pcm-meta-row"><span class="pcm-meta-lbl">📍 Lokasyon</span><span class="pcm-meta-val">' + zoneName + '</span></div>',
          '<div class="pcm-meta-row"><span class="pcm-meta-lbl">👤 Proponente</span><span class="pcm-meta-val">' + label + ' ng Bayan</span></div>',
          '<div class="pcm-meta-row"><span class="pcm-meta-lbl">🏗️ Kontratista</span><span class="pcm-meta-val">Kontratista ng Bayan</span></div>',
          '<div class="pcm-meta-row"><span class="pcm-meta-lbl">⏱️ Tagal</span><span class="pcm-meta-val">' + timeStr + '</span></div>',
          '<div class="pcm-meta-row"><span class="pcm-meta-lbl">📅 Petsa</span><span class="pcm-meta-val">' + dateStr + '</span></div>',
        '</div>',

        /* BOM */
        '<div class="pcm-section-label">BILL OF MATERIALS</div>',
        '<div class="pcm-bom">',
          '<div class="pcm-bom-header">',
            '<span>Materyales</span><span>Qty</span><span>Unit</span><span>Kabuuan</span>',
          '</div>',
          bomRows,
        '</div>',

        /* Project description */
        '<div class="pcm-section-label">PAGLALARAWAN NG PROYEKTO</div>',
        '<div class="pcm-desc">' + benefits + '</div>',

        /* ABC — Approved Budget */
        '<div class="pcm-section-label">APPROVED BUDGET FOR CONTRACT (ABC)</div>',
        '<div class="pcm-abc">',
          actual.gold > 0 ? _abcRow('pcm-gold', '🪙 Ginto', actual.gold) : '',
          actual.rice > 0 ? _abcRow('pcm-rice', '🌾 Bigas',  actual.rice) : '',
          (actual.langis || 0) > 0 ? _abcRow('pcm-langis', '🛢️ Langis', actual.langis) : '',
          '<div class="pcm-abc-note">Minimum = aktwal na halaga. Ang labis ay mapupunta sa inyong personal na pondo.</div>',
        '</div>',

        /* Signature */
        '<div class="pcm-section-label">LAGDA NG GOBERNADOR</div>',
        '<div class="pcm-sig-block">',
          '<input type="text" id="pcm-sig" class="pcm-input" placeholder="I-type ang inyong pangalan bilang lagda…" autocomplete="off" />',
          '<div class="pcm-sig-witness">👥 Saksi: Sekretarya ng Bayan (awtomatiko)</div>',
        '</div>',

        /* Agreement */
        '<label class="pcm-agree-row" id="pcm-agree-label">',
          '<input type="checkbox" id="pcm-agree" />',
          '<span>☑ Pinapatunayan ko na ang mga impormasyon sa itaas ay totoo at tama.</span>',
        '</label>',

        /* Error message */
        '<div class="pcm-error" id="pcm-error" style="display:none"></div>',

        /* Buttons */
        '<div class="pcm-foot">',
          '<button class="pcm-btn-cancel" id="pcm-cancel">❌ Kanselahin</button>',
          '<button class="pcm-btn-confirm" id="pcm-confirm">🔨 Kumpirmahin</button>',
        '</div>',

      '</div>', /* end pcm-scroll */
    '</div>',  /* end pcm-box */
  ].join('');

  var container = document.getElementById('canvas-container') || document.body;
  container.appendChild(modal);

  /* Wire buttons */
  document.getElementById('pcm-cancel-x').addEventListener('click', function() { _closeModal(cfg); });
  document.getElementById('pcm-cancel').addEventListener('click',   function() { _closeModal(cfg); });
  document.getElementById('pcm-confirm').addEventListener('click',  function() { _onConfirm(cfg, actual, label, labourCost, permitCost); });

  /* Focus signature field */
  setTimeout(function() {
    var sig = document.getElementById('pcm-sig');
    if (sig) sig.focus();
  }, 120);
}

/* ── Confirm handler ─────────────────────────────────────── */
function _onConfirm(cfg, actual, label, labourCost, permitCost) {
  var sig     = (document.getElementById('pcm-sig')    || {}).value || '';
  var agreed  = (document.getElementById('pcm-agree')  || {}).checked;
  var errEl   = document.getElementById('pcm-error');

  /* Validation */
  if (!sig.trim()) {
    _showError(errEl, '✍️ Pakiusap mag-lagda bago kumpirmahin.');
    return;
  }
  if (!agreed) {
    _showError(errEl, '☑ Kailangan suriin ang agreement checkbox.');
    return;
  }

  /* Read declared amounts */
  var declGold   = _readInt('pcm-gold',   actual.gold   || 0);
  var declRice   = _readInt('pcm-rice',   actual.rice   || 0);
  var declLangis = _readInt('pcm-langis', actual.langis || 0);

  /* Validate minimums */
  if (declGold < (actual.gold || 0)) {
    _showError(errEl, '🪙 Ang declared na Ginto ay dapat hindi bababa sa ' + actual.gold + '.'); return;
  }
  if (declRice < (actual.rice || 0)) {
    _showError(errEl, '🌾 Ang declared na Bigas ay dapat hindi bababa sa ' + actual.rice + '.'); return;
  }
  if (declLangis < (actual.langis || 0)) {
    _showError(errEl, '🛢️ Ang declared na Langis ay dapat hindi bababa sa ' + (actual.langis||0) + '.'); return;
  }

  /* Afford check against DECLARED amounts (village pays declared) */
  var VS = cfg.VS;
  if (VS.res.gold   < declGold)   { _showError(errEl, '🪙 Hindi sapat ang ginto ng nayon. Kailangan: ' + declGold); return; }
  if (VS.res.rice   < declRice)   { _showError(errEl, '🌾 Hindi sapat ang bigas ng nayon. Kailangan: ' + declRice); return; }
  if (VS.res.langis < declLangis) { _showError(errEl, '🛢️ Hindi sapat ang langis ng nayon. Kailangan: ' + declLangis); return; }

  /* ── Corruption calculation ────────────────────────────── */
  var overGold   = declGold   - (actual.gold   || 0);
  var overRice   = declRice   - (actual.rice   || 0);
  var overLangis = declLangis - (actual.langis || 0);
  var overTotal  = overGold + overRice + overLangis;   /* treat all as gold-equivalent */

  if (overTotal > 0) {
    addPersonalIncome(overTotal, 'building_project', true, label);
    /* Extra exposure: 1 per 10 over-declared */
    if (VS.corruption) {
      VS.corruption.exposureLevel = Math.min(100,
        (VS.corruption.exposureLevel || 0) + overTotal / 10
      );
    }
    if (cfg.showMsg) {
      cfg.showMsg('💀 Nag-deklara ka ng mas mataas na halaga. +' + overTotal + '🪙 sa personal mong pondo.');
    }
    /* Activity log */
    if (!VS.activityLog) VS.activityLog = [];
    VS.activityLog.unshift({
      msg: '⚠️ Labis na deklarasyon sa ' + label + ': +' + overTotal + '🪙 sa personal na pondo.',
      ts:  Date.now(),
    });
  }

  /* ── Deduct DECLARED from village resources ────────────── */
  VS.res.gold   -= declGold;
  VS.res.rice   -= declRice;
  VS.res.langis -= declLangis;

  /* ── Activity log entry ────────────────────────────────── */
  var timeStr = cfg.buildTime >= 60
    ? Math.ceil(cfg.buildTime / 60) + ' min'
    : (cfg.buildTime || 0) + 's';
  var totalDecl = declGold + declRice + declLangis;
  if (!VS.activityLog) VS.activityLog = [];
  VS.activityLog.unshift({
    msg: 'Naaprubahan ang proyektong ' + label + ' sa halagang ' + totalDecl + '🪙. Inaasahang matatapos sa ' + timeStr + '.',
    ts:  Date.now(),
  });
  if (VS.activityLog.length > 30) VS.activityLog.pop();

  /* Close modal, then fire onConfirm */
  var modal = document.getElementById('procurement-modal');
  if (modal) modal.remove();

  if (cfg.onConfirm) cfg.onConfirm({ gold: declGold, rice: declRice, langis: declLangis });
}

function _closeModal(cfg) {
  var modal = document.getElementById('procurement-modal');
  if (modal) modal.remove();
  if (cfg.onCancel) cfg.onCancel();
}

function _showError(el, msg) {
  if (!el) return;
  el.textContent   = msg;
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function _readInt(inputId, fallback) {
  var el = document.getElementById(inputId);
  if (!el) return fallback;
  var v = parseInt(el.value, 10);
  return isNaN(v) ? fallback : v;
}

/* ── BOM row helpers ─────────────────────────────────────── */
function _bomRow(name, qty, icon, total) {
  return '<div class="pcm-bom-row">' +
    '<span>' + name + '</span>' +
    '<span>' + qty + '</span>' +
    '<span>1 ' + icon + '</span>' +
    '<span>' + total + ' ' + icon + '</span>' +
  '</div>';
}
function _bomRowFlat(name, val) {
  return '<div class="pcm-bom-row pcm-bom-derived">' +
    '<span>' + name + '</span><span>—</span><span>—</span><span>' + val + '</span>' +
  '</div>';
}

/* ── ABC input row ───────────────────────────────────────── */
function _abcRow(inputId, label, minVal) {
  return '<div class="pcm-abc-row">' +
    '<label class="pcm-abc-lbl">' + label + '</label>' +
    '<input type="number" id="' + inputId + '" class="pcm-abc-input" ' +
      'value="' + minVal + '" min="' + minVal + '" step="1" />' +
    '<span class="pcm-abc-min">min: ' + minVal + '</span>' +
  '</div>';
}

/* ── Benefit description ─────────────────────────────────── */
function _buildBenefitDescription(def) {
  var parts = [];
  if (def.prodRate > 0) {
    var resName = def.prodRes === 'gold' ? 'ginto' : def.prodRes === 'rice' ? 'bigas' : 'langis';
    parts.push('Nagbibigay ng ' + def.prodRate + ' ' + resName + ' bawat segundo');
  }
  if (def.storageBonus) {
    if (def.storageBonus.gold)   parts.push('Nagdaragdag ng ' + def.storageBonus.gold + ' sa kapasidad ng ginto');
    if (def.storageBonus.rice)   parts.push('Nagdaragdag ng ' + def.storageBonus.rice + ' sa kapasidad ng bigas');
    if (def.storageBonus.langis) parts.push('Nagdaragdag ng ' + def.storageBonus.langis + ' sa kapasidad ng langis');
  }
  if (def.popBonus)   parts.push('Tumatanggap ng ' + def.popBonus + ' karagdagang mamamayan');
  if (def.isHome)     parts.push('Nagbibigay ng tirahan para sa mga mamamayan');
  if (def.attackDPS)  parts.push('Nagtatanggol sa nayon (' + def.attackDPS + ' dps)');
  if (parts.length === 0) parts.push('Nagpapalakas ng nayon at nagpapabuti ng kalidad ng buhay ng mga mamamayan');
  return parts.join('. ') + '.';
}

/* ── Style injection ─────────────────────────────────────── */
function _injectStyles() {
  if (_stylesInjected || document.getElementById('pcm-styles')) return;
  _stylesInjected = true;

  var s = document.createElement('style');
  s.id  = 'pcm-styles';
  s.textContent = `
/* ── Procurement Modal ─────────────────────────────────── */
#procurement-modal {
  position: absolute;
  inset: 0;
  z-index: 95;
  pointer-events: all;
}
.pcm-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.80);
}
.pcm-box {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(540px, 96vw);
  max-height: 90vh;
  background: linear-gradient(160deg,#1a1208,#0e0905);
  border: 2px solid #8a6030;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 12px 60px rgba(0,0,0,0.85);
  animation: pcmPop .22s ease;
}
@keyframes pcmPop {
  from { opacity:0; transform:translate(-50%,-48%); }
  to   { opacity:1; transform:translate(-50%,-50%); }
}
.pcm-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px 12px;
  background: rgba(10,6,2,0.98);
  border-bottom: 2px solid #5a3a10;
  flex-shrink: 0;
}
.pcm-header-icon { font-size: 20px; }
.pcm-header-title {
  flex: 1;
  font-family: 'Oldenburg', serif;
  font-size: 14px;
  color: #f5c842;
  letter-spacing: .08em;
}
.pcm-close-btn {
  background: #2a1808;
  border: 1px solid #8a6030;
  color: #f5c842;
  width: 28px; height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.pcm-close-btn:hover { background: #4a2810; }

.pcm-scroll {
  overflow-y: auto;
  padding: 16px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scrollbar-width: thin;
  scrollbar-color: #3a2010 transparent;
}
.pcm-scroll::-webkit-scrollbar { width: 4px; }
.pcm-scroll::-webkit-scrollbar-thumb { background:#3a2010; border-radius:2px; }

.pcm-section-label {
  font-family: 'Oldenburg', serif;
  font-size: 10px;
  color: #7a5028;
  letter-spacing: .1em;
  text-transform: uppercase;
  border-bottom: 1px solid #2a1808;
  padding-bottom: 5px;
  margin-top: 4px;
}

/* Meta block */
.pcm-meta-block {
  background: #1a1208;
  border: 1px solid #2a1808;
  border-radius: 6px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.pcm-meta-row {
  display: flex;
  gap: 10px;
  font-size: 13px;
  align-items: baseline;
}
.pcm-meta-lbl { color: #6a5030; min-width: 110px; font-family: monospace; }
.pcm-meta-val { color: #e8d4a0; flex: 1; }

/* BOM */
.pcm-bom {
  background: #0e0905;
  border: 1px solid #3a2010;
  border-radius: 6px;
  overflow: hidden;
  font-family: monospace;
  font-size: 12px;
}
.pcm-bom-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr;
  background: #2a1808;
  padding: 6px 12px;
  color: #8a6030;
  font-size: 11px;
  letter-spacing: .05em;
  text-transform: uppercase;
}
.pcm-bom-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr;
  padding: 6px 12px;
  border-top: 1px solid #1a1208;
  color: #e8d4a0;
}
.pcm-bom-derived { color: #8a7050; }

/* Project description */
.pcm-desc {
  font-size: 13px;
  color: #8a7050;
  line-height: 1.6;
  font-style: italic;
  background: #1a1208;
  border: 1px solid #2a1808;
  border-radius: 6px;
  padding: 10px 14px;
}

/* ABC block */
.pcm-abc {
  background: #1a1208;
  border: 1px solid #2a1808;
  border-radius: 6px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pcm-abc-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pcm-abc-lbl {
  font-size: 13px;
  color: #8a6040;
  min-width: 90px;
  font-family: monospace;
}
.pcm-abc-input {
  flex: 1;
  background: #0e0905;
  border: 1px solid #5a3a10;
  border-radius: 4px;
  color: #f5c842;
  font-family: monospace;
  font-size: 14px;
  padding: 6px 10px;
  text-align: right;
  outline: none;
  transition: border-color .15s;
}
.pcm-abc-input:focus { border-color: #f5c842; }
.pcm-abc-min {
  font-size: 11px;
  color: #5a4030;
  font-family: monospace;
  white-space: nowrap;
}
.pcm-abc-note {
  font-size: 11px;
  color: #5a4030;
  font-style: italic;
  line-height: 1.5;
}

/* Signature */
.pcm-sig-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pcm-input {
  background: #0e0905;
  border: 1px solid #5a3a10;
  border-radius: 4px;
  color: #f5c842;
  font-family: 'Oldenburg', serif;
  font-size: 14px;
  padding: 8px 12px;
  outline: none;
  transition: border-color .15s;
  width: 100%;
}
.pcm-input:focus { border-color: #f5c842; }
.pcm-input::placeholder { color: #4a3020; }
.pcm-sig-witness {
  font-size: 11px;
  color: #5a4030;
  font-style: italic;
}

/* Agreement */
.pcm-agree-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  font-size: 12px;
  color: #8a7050;
  line-height: 1.5;
  padding: 8px 10px;
  background: #1a1208;
  border: 1px solid #2a1808;
  border-radius: 6px;
  transition: border-color .15s;
}
.pcm-agree-row:hover { border-color: #5a3a10; }
.pcm-agree-row input[type=checkbox] {
  flex-shrink: 0;
  margin-top: 2px;
  accent-color: #f5c842;
  width: 16px; height: 16px;
  cursor: pointer;
}

/* Error */
.pcm-error {
  background: rgba(180,40,10,0.22);
  border: 1px solid #7a2808;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 13px;
  color: #ff9966;
  line-height: 1.5;
}

/* Footer */
.pcm-foot {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 4px;
}
.pcm-btn-cancel {
  padding: 10px 22px;
  font-family: 'Oldenburg', serif;
  font-size: 13px;
  background: #2a0a08;
  border: 1.5px solid #aa4444;
  color: #ee8888;
  border-radius: 6px;
  cursor: pointer;
  transition: background .15s;
}
.pcm-btn-cancel:hover { background: #3a1010; }
.pcm-btn-confirm {
  padding: 10px 26px;
  font-family: 'Oldenburg', serif;
  font-size: 13px;
  font-weight: bold;
  background: #1a3010;
  border: 1.5px solid #44aa44;
  color: #88ee88;
  border-radius: 6px;
  cursor: pointer;
  transition: background .15s;
  letter-spacing: .04em;
}
.pcm-btn-confirm:hover { background: #2a4a18; }
  `;
  document.head.appendChild(s);
}