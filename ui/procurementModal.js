/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — ui/procurementModal.js

   BUILDING PROCUREMENT MODAL
   ─────────────────────────────────────────────────────────────
   Mirrors real Philippine government procurement (RA 9184).
   Redesigned as an official paper document / government letter.

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

var _stylesInjected = false;

/* ══════════════════════════════════════════════════════════════
   showProcurementModal
══════════════════════════════════════════════════════════════ */
export function showProcurementModal(cfg) {
  _injectStyles();

  var old = document.getElementById('procurement-modal');
  if (old) old.remove();

  var def      = cfg.def;
  var actual   = cfg.actualCost;
  var btime    = cfg.buildTime || 0;
  var timeStr  = btime >= 60 ? Math.ceil(btime / 60) + ' minuto' : btime + ' segundo';
  var label    = def.label || cfg.buildingType || 'Gusali';
  var VS       = cfg.VS;

  var labourCost = Math.ceil(actual.gold * 0.15);
  var permitCost = Math.ceil(actual.gold * 0.05);

  var hour    = Math.floor(VS.time || 12);
  var ampm    = hour >= 12 ? 'PM' : 'AM';
  var h12     = hour % 12 || 12;
  var dateStr = 'Ika-' + (cfg.dayCount || 1) + ' Araw, ' + h12 + ':00 ' + ampm;

  var zoneName = cfg.wx !== undefined
    ? 'Coord. X: ' + Math.round(cfg.wx) + ', Y: ' + Math.round(cfg.wy)
    : 'Lokasyon hindi pa napili';

  var benefits = _buildBenefitDescription(def);

  /* Build BOM lines for the letter body */
  var bomLines = '';
  if (actual.gold   > 0) bomLines += '<tr><td>Ginto 🪙</td><td class="pcm-td-num">' + actual.gold   + '</td><td class="pcm-td-num">' + actual.gold   + ' 🪙</td></tr>';
  if (actual.rice   > 0) bomLines += '<tr><td>Bigas 🌾</td><td class="pcm-td-num">' + actual.rice   + '</td><td class="pcm-td-num">' + actual.rice   + ' 🌾</td></tr>';
  if ((actual.langis||0)>0) bomLines += '<tr><td>Langis 🛢️</td><td class="pcm-td-num">' + actual.langis + '</td><td class="pcm-td-num">' + actual.langis + ' 🛢️</td></tr>';
  bomLines += '<tr class="pcm-tr-derived"><td>Paggawa (15%)</td><td class="pcm-td-num">—</td><td class="pcm-td-num">' + labourCost + ' 🪙</td></tr>';
  bomLines += '<tr class="pcm-tr-derived"><td>Bayad sa Permit (5%)</td><td class="pcm-td-num">—</td><td class="pcm-td-num">' + permitCost + ' 🪙</td></tr>';

  /* ABC declaration with underlined blanks instead of input boxes */
  var abcInputs = '';
  if (actual.gold   > 0) abcInputs += _abcBlank('pcm-gold',   '🪙 Ginto',  actual.gold);
  if (actual.rice   > 0) abcInputs += _abcBlank('pcm-rice',   '🌾 Bigas',   actual.rice);
  if ((actual.langis||0)>0) abcInputs += _abcBlank('pcm-langis','🛢️ Langis', actual.langis);

  var modal = document.createElement('div');
  modal.id  = 'procurement-modal';

  modal.innerHTML = [
    '<div class="pcm-backdrop"></div>',
    '<div class="pcm-paper">',

      /* ── CLOSE BUTTON ── */
      '<button class="pcm-close-btn" id="pcm-cancel-x" title="Isara">✕</button>',

      /* ── LETTERHEAD ── */
      '<div class="pcm-letterhead">',
        '<div class="pcm-lh-seal">🏛️</div>',
        '<div class="pcm-lh-text">',
          '<div class="pcm-lh-republic">Republika ng Mini Bayan</div>',
          '<div class="pcm-lh-office">Tanggapan ng Gobernador</div>',
          '<div class="pcm-lh-sub">Kagawaran ng Imprastraktura at Pabahay</div>',
        '</div>',
      '</div>',

      '<div class="pcm-ruled-line"></div>',

      /* ── DOCUMENT TITLE ── */
      '<div class="pcm-doc-title">OPISYAL NA KAHILINGAN SA PAGTATAYO</div>',
      '<div class="pcm-doc-subtitle">Procurement Request Form — Batay sa R.A. 9184</div>',

      /* ── META (ref / date) ── */
      '<div class="pcm-ref-block">',
        '<span><strong>Blg.:</strong> PRF-' + String(cfg.dayCount || 1).padStart(4,'0') + '-' + Math.floor(Math.random()*900+100) + '</span>',
        '<span><strong>Petsa:</strong> ' + dateStr + '</span>',
      '</div>',

      '<div class="pcm-scroll">',

        /* ── SALUTATION ── */
        '<p class="pcm-salutation">Sa Kinauukulan,</p>',

        /* ── LETTER BODY ── */
        '<p class="pcm-body">',
          'Ako, ang Gobernador ng Mini Bayan, ay naghaharap ng opisyal na kahilingan para sa ',
          '<strong>pagtatayo ng ' + label.toUpperCase() + '</strong> ',
          'sa lokasyong <em>' + zoneName + '</em>. ',
          'Ang proyektong ito ay inaasahang matatapos sa loob ng <strong>' + timeStr + '</strong> ',
          'at magbibigay ng sumusunod na benepisyo sa ating pamayanan: ',
          '<em>' + benefits + '</em>',
        '</p>',

        /* ── BOM TABLE ── */
        '<p class="pcm-section-heading">I. Listahan ng mga Materyales (Bill of Materials)</p>',
        '<p class="pcm-body">',
          'Ang sumusunod ay ang kumpletong listahan ng mga kinakailangang materyales, ',
          'kasama na ang bayad sa paggawa at bayad sa permit, para sa nasabing proyekto:',
        '</p>',
        '<div class="pcm-table-wrap">',
          '<table class="pcm-table">',
            '<thead><tr><th>Materyales</th><th>Dami</th><th>Kabuuan</th></tr></thead>',
            '<tbody>' + bomLines + '</tbody>',
          '</table>',
        '</div>',

        /* ── ABC SECTION with underlined blanks ── */
        '<p class="pcm-section-heading">II. Aprubadong Badyet para sa Kontrata (ABC)</p>',
        '<p class="pcm-body">',
          'Bilang Gobernador, kayo ay may karapatang magdeklara ng halagang katumbas o ',
          '<strong>higit pa</strong> sa aktwal na gastos. ',
          'Ang anumang labis na halaga ay <em>direktang mapupunta sa inyong personal na pondo</em> ',
          'ngunit maaaring magpataas ng antas ng korapsyon.',
        '</p>',
        '<div class="pcm-abc-block">',
          abcInputs,
          '<p class="pcm-abc-note">⚠️ Minimum na halaga ay ang aktwal na gastos. Ang labis ay mapupunta sa personal na pondo ng Gobernador.</p>',
        '</div>',

        /* ── SIGNATURE SECTION ── */
        '<p class="pcm-section-heading">III. Pagpapatunay at Lagda</p>',
        '<p class="pcm-body">',
          'Ang dokumentong ito ay opisyal at legal na nagtatatag ng nasabing proyekto ',
          'sa ilalim ng batas ng Mini Bayan. Sa pamamagitan ng paglalagay ng inyong ',
          'pangalan sa ibaba, <strong>pinapatunayan ninyo na ang lahat ng impormasyon sa ',
          'dokumentong ito ay tama, totoo, at kumpleto</strong>, at kayo ay personal na ',
          'mananagot sa anumang hindi pagkakatugma sa aktwal na gastos ng proyekto.',
        '</p>',

        '<div class="pcm-sig-area">',
          '<div class="pcm-sig-field-wrap">',
            '<input type="text" id="pcm-sig" class="pcm-sig-input" ',
              'placeholder="Ilagay ang inyong buong pangalan…" autocomplete="off" />',
            '<div class="pcm-sig-line-label">Lagda ng Gobernador</div>',
          '</div>',
          '<div class="pcm-sig-witness-col">',
            '<div class="pcm-sig-witness-name">Sekretarya ng Bayan</div>',
            '<div class="pcm-sig-line-label">Saksi</div>',
          '</div>',
        '</div>',

        '<p class="pcm-notarial">',
          'Nilagdaan at pinatunayan sa harap ng <strong>Sekretarya ng Bayan</strong> ',
          'bilang opisyal na saksi. Ang lagda ay nagsisilbing legal na pahintulot ',
          'at kasunduan sa lahat ng nakasaad sa dokumentong ito.',
        '</p>',

        /* ── ERROR ── */
        '<div class="pcm-error" id="pcm-error" style="display:none"></div>',

        /* ── FOOTER BUTTONS ── */
        '<div class="pcm-foot">',
          '<button class="pcm-btn-cancel" id="pcm-cancel">❌ Kanselahin</button>',
          '<button class="pcm-btn-confirm" id="pcm-confirm">🔏 Lagdaan at Kumpirmahin</button>',
        '</div>',

        /* ── DOCUMENT FOOTER ── */
        '<div class="pcm-doc-footer">',
          'Opisyal na Dokumento ng Pamahalaan ng Mini Bayan · Lahat ng karapatan ay nakalaan · R.A. 9184',
        '</div>',

      '</div>', /* end pcm-scroll */
    '</div>',  /* end pcm-paper */
  ].join('');

  var container = document.getElementById('canvas-container') || document.body;
  container.appendChild(modal);

  document.getElementById('pcm-cancel-x').addEventListener('click', function() { _closeModal(cfg); });
  document.getElementById('pcm-cancel').addEventListener('click',   function() { _closeModal(cfg); });
  document.getElementById('pcm-confirm').addEventListener('click',  function() { _onConfirm(cfg, actual, label, labourCost, permitCost); });

  setTimeout(function() {
    var sig = document.getElementById('pcm-sig');
    if (sig) sig.focus();
  }, 120);
}

/* ── Confirm handler ─────────────────────────────────────── */
function _onConfirm(cfg, actual, label, labourCost, permitCost) {
  var sig   = (document.getElementById('pcm-sig') || {}).value || '';
  var errEl = document.getElementById('pcm-error');

  if (!sig.trim()) {
    _showError(errEl, '✍️ Pakiusap ilagay ang inyong pangalan bilang lagda bago kumpirmahin.');
    return;
  }

  var declGold   = _readFromBlank('pcm-gold',   actual.gold   || 0);
  var declRice   = _readFromBlank('pcm-rice',   actual.rice   || 0);
  var declLangis = _readFromBlank('pcm-langis', actual.langis || 0);

  if (declGold   < (actual.gold   || 0)) { _showError(errEl, '🪙 Ang declared na Ginto ay dapat hindi bababa sa ' + actual.gold + '.'); return; }
  if (declRice   < (actual.rice   || 0)) { _showError(errEl, '🌾 Ang declared na Bigas ay dapat hindi bababa sa ' + actual.rice + '.'); return; }
  if (declLangis < (actual.langis || 0)) { _showError(errEl, '🛢️ Ang declared na Langis ay dapat hindi bababa sa ' + (actual.langis||0) + '.'); return; }

  var VS = cfg.VS;
  if (VS.res.gold   < declGold)   { _showError(errEl, '🪙 Hindi sapat ang ginto ng nayon. Kailangan: ' + declGold); return; }
  if (VS.res.rice   < declRice)   { _showError(errEl, '🌾 Hindi sapat ang bigas ng nayon. Kailangan: ' + declRice); return; }
  if (VS.res.langis < declLangis) { _showError(errEl, '🛢️ Hindi sapat ang langis ng nayon. Kailangan: ' + declLangis); return; }

  var overGold   = declGold   - (actual.gold   || 0);
  var overRice   = declRice   - (actual.rice   || 0);
  var overLangis = declLangis - (actual.langis || 0);
  var overTotal  = overGold + overRice + overLangis;

  if (overTotal > 0) {
    addPersonalIncome(overTotal, 'building_project', true, label);
    if (VS.corruption) {
      VS.corruption.exposureLevel = Math.min(100, (VS.corruption.exposureLevel || 0) + overTotal / 10);
    }
    if (cfg.showMsg) {
      cfg.showMsg('💀 Nag-deklara ka ng mas mataas na halaga. +' + overTotal + '🪙 sa personal mong pondo.');
    }
    if (!VS.activityLog) VS.activityLog = [];
    VS.activityLog.unshift({
      msg: '⚠️ Labis na deklarasyon sa ' + label + ': +' + overTotal + '🪙 sa personal na pondo.',
      ts:  Date.now(),
    });
  }

  VS.res.gold   -= declGold;
  VS.res.rice   -= declRice;
  VS.res.langis -= declLangis;

  var timeStr   = cfg.buildTime >= 60 ? Math.ceil(cfg.buildTime / 60) + ' min' : (cfg.buildTime || 0) + 's';
  var totalDecl = declGold + declRice + declLangis;
  if (!VS.activityLog) VS.activityLog = [];
  VS.activityLog.unshift({
    msg: 'Naaprubahan ang proyektong ' + label + ' sa halagang ' + totalDecl + '🪙. Inaasahang matatapos sa ' + timeStr + '.',
    ts:  Date.now(),
  });
  if (VS.activityLog.length > 30) VS.activityLog.pop();

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

function _readFromBlank(blankId, fallback) {
  var el = document.getElementById(blankId);
  if (!el) return fallback;
  var text = el.textContent || el.innerText || '';
  var num = parseInt(text.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? fallback : num;
}

function _abcBlank(blankId, label, minVal) {
  return '<div class="pcm-abc-row">' +
    '<label class="pcm-abc-lbl">' + label + '</label>' +
    '<span class="pcm-abc-blank" id="' + blankId + '" contenteditable="true" data-placeholder="' + minVal + '">' + minVal + '</span>' +
    '<span class="pcm-abc-min">min: ' + minVal + '</span>' +
  '</div>';
}

function _buildBenefitDescription(def) {
  var parts = [];
  if (def.prodRate > 0) {
    var resName = def.prodRes === 'gold' ? 'ginto' : def.prodRes === 'rice' ? 'bigas' : 'langis';
    parts.push('Nagbibigay ng ' + def.prodRate + ' ' + resName + ' bawat segundo');
  }
  if (def.storageBonus) {
    if (def.storageBonus.gold)   parts.push('Nagdaragdag ng ' + def.storageBonus.gold   + ' sa kapasidad ng ginto');
    if (def.storageBonus.rice)   parts.push('Nagdaragdag ng ' + def.storageBonus.rice   + ' sa kapasidad ng bigas');
    if (def.storageBonus.langis) parts.push('Nagdaragdag ng ' + def.storageBonus.langis + ' sa kapasidad ng langis');
  }
  if (def.popBonus)  parts.push('Tumatanggap ng ' + def.popBonus + ' karagdagang mamamayan');
  if (def.isHome)    parts.push('Nagbibigay ng tirahan para sa mga mamamayan');
  if (def.attackDPS) parts.push('Nagtatanggol sa nayon (' + def.attackDPS + ' dps)');
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

/* ════════════════════════════════════════════
   PROCUREMENT MODAL — Paper / Letter Design
════════════════════════════════════════════ */

@import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Special+Elite&display=swap');

#procurement-modal {
  position: absolute;
  inset: 0;
  z-index: 95;
  pointer-events: all;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pcm-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.78);
  backdrop-filter: blur(2px);
}

/* ── THE PAPER ─────────────────────────────── */
.pcm-paper {
  position: relative;
  z-index: 1;
  width: min(600px, 94vw);
  max-height: 92vh;
  display: flex;
  flex-direction: column;

  /* aged paper texture */
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 27px,
      rgba(160,120,60,0.07) 27px,
      rgba(160,120,60,0.07) 28px
    ),
    linear-gradient(160deg, #f5ead0 0%, #ede0bc 40%, #e8d8aa 100%);

  border-radius: 3px;
  box-shadow:
    0 2px 0  #c8a860,
    0 4px 0  #b89040,
    0 6px 0  #a87830,
    0 8px 28px rgba(0,0,0,0.7),
    inset 0 0 80px rgba(160,110,30,0.12);

  /* torn/deckled left edge illusion */
  border-left: 4px solid rgba(180,130,50,0.4);
  border-right: 1px solid rgba(160,110,30,0.3);
  border-top: 1px solid rgba(180,140,60,0.5);
  border-bottom: 4px solid rgba(140,100,30,0.5);

  animation: pcmSlideIn .28s cubic-bezier(.22,.68,0,1.2);
  overflow: hidden;
}

@keyframes pcmSlideIn {
  from { opacity:0; transform:translateY(-18px) scale(0.97); }
  to   { opacity:1; transform:translateY(0)     scale(1);    }
}

/* ── CLOSE BUTTON ──────────────────────────── */
.pcm-close-btn {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 26px; height: 26px;
  background: rgba(120,80,20,0.15);
  border: 1px solid rgba(120,80,20,0.35);
  color: #7a5020;
  border-radius: 50%;
  cursor: pointer;
  font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s, color .15s;
  z-index: 2;
}
.pcm-close-btn:hover { background: rgba(140,60,20,0.25); color: #4a1a08; }

/* ── LETTERHEAD ────────────────────────────── */
.pcm-letterhead {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 24px 12px;
  border-bottom: 2px double rgba(140,100,30,0.5);
}
.pcm-lh-seal {
  font-size: 36px;
  line-height: 1;
  flex-shrink: 0;
}
.pcm-lh-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.pcm-lh-republic {
  font-family: 'IM Fell English', 'Georgia', serif;
  font-size: 15px;
  font-weight: bold;
  color: #3a2008;
  letter-spacing: .06em;
}
.pcm-lh-office {
  font-family: 'IM Fell English', 'Georgia', serif;
  font-size: 12px;
  color: #5a3010;
  letter-spacing: .04em;
}
.pcm-lh-sub {
  font-size: 10px;
  color: #8a6040;
  letter-spacing: .04em;
  font-style: italic;
}

/* ── RULED LINE ────────────────────────────── */
.pcm-ruled-line {
  height: 1px;
  margin: 0 24px;
  background: linear-gradient(90deg, transparent, rgba(140,100,30,0.6), transparent);
}

/* ── DOCUMENT TITLE ────────────────────────── */
.pcm-doc-title {
  font-family: 'Special Elite', 'Courier New', monospace;
  font-size: 13px;
  color: #2a1408;
  letter-spacing: .14em;
  text-align: center;
  padding: 12px 24px 2px;
}
.pcm-doc-subtitle {
  font-size: 10px;
  color: #8a6040;
  text-align: center;
  letter-spacing: .08em;
  font-style: italic;
  padding-bottom: 8px;
}

/* ── REF / DATE ROW ────────────────────────── */
.pcm-ref-block {
  display: flex;
  justify-content: space-between;
  padding: 4px 24px 8px;
  font-size: 10px;
  color: #7a5828;
  font-family: 'Special Elite', monospace;
  border-bottom: 1px solid rgba(140,100,30,0.25);
}

/* ── SCROLL AREA ───────────────────────────── */
.pcm-scroll {
  overflow-y: auto;
  padding: 14px 28px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scrollbar-width: thin;
  scrollbar-color: rgba(140,100,30,0.4) transparent;
}
.pcm-scroll::-webkit-scrollbar { width: 4px; }
.pcm-scroll::-webkit-scrollbar-thumb { background: rgba(140,100,30,0.35); border-radius: 2px; }

/* ── SALUTATION ────────────────────────────── */
.pcm-salutation {
  font-family: 'IM Fell English', Georgia, serif;
  font-size: 13px;
  color: #3a2008;
  margin-bottom: -4px;
}

/* ── BODY PARAGRAPH ────────────────────────── */
.pcm-body {
  font-family: 'IM Fell English', Georgia, serif;
  font-size: 13px;
  color: #2e1c08;
  line-height: 1.75;
  text-align: justify;
  text-indent: 2em;
}
.pcm-body strong { color: #1a0e04; }
.pcm-body em     { color: #5a3818; }

/* ── SECTION HEADINGS ──────────────────────── */
.pcm-section-heading {
  font-family: 'Special Elite', 'Courier New', monospace;
  font-size: 11px;
  color: #5a3818;
  letter-spacing: .08em;
  margin-top: 4px;
  margin-bottom: -4px;
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* ── BOM TABLE ─────────────────────────────── */
.pcm-table-wrap {
  overflow-x: auto;
}
.pcm-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Special Elite', monospace;
  font-size: 11.5px;
  color: #2e1c08;
}
.pcm-table thead tr {
  border-bottom: 2px solid rgba(140,100,30,0.5);
}
.pcm-table th {
  padding: 5px 8px;
  text-align: left;
  color: #5a3818;
  font-size: 10px;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.pcm-table td {
  padding: 5px 8px;
  border-bottom: 1px solid rgba(140,100,30,0.18);
  color: #2e1c08;
}
.pcm-td-num { text-align: right; font-variant-numeric: tabular-nums; }
.pcm-tr-derived td { color: #8a6040; font-style: italic; font-size: 11px; }

/* ── ABC BLOCK with underlined blanks ─────────────────────────── */
.pcm-abc-block {
  background: rgba(140,100,30,0.07);
  border: 1px solid rgba(140,100,30,0.25);
  border-radius: 4px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pcm-abc-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.pcm-abc-lbl {
  font-family: 'Special Elite', monospace;
  font-size: 12px;
  color: #5a3818;
  min-width: 88px;
}
.pcm-abc-blank {
  flex: 1;
  min-width: 100px;
  background: transparent;
  border: none;
  border-bottom: 2px solid #5a3818;
  color: #1a0e04;
  font-family: 'Special Elite', monospace;
  font-size: 13px;
  padding: 4px 8px;
  text-align: right;
  outline: none;
  cursor: text;
  transition: border-color .15s, background .15s;
}
.pcm-abc-blank:focus {
  border-bottom-color: #d49c4a;
  background: rgba(255,255,240,0.3);
}
.pcm-abc-blank:empty:before {
  content: attr(data-placeholder);
  color: #b09060;
  font-style: italic;
}
.pcm-abc-min {
  font-size: 10px;
  color: #9a7850;
  white-space: nowrap;
  font-style: italic;
}
.pcm-abc-note {
  font-size: 10.5px;
  color: #8a5828;
  font-style: italic;
  line-height: 1.5;
  border-top: 1px solid rgba(140,100,30,0.2);
  padding-top: 6px;
  margin-top: 2px;
}

/* ── SIGNATURE AREA ────────────────────────── */
.pcm-sig-area {
  display: flex;
  gap: 24px;
  align-items: flex-end;
  margin-top: 6px;
  padding: 0 4px;
}
.pcm-sig-field-wrap {
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pcm-sig-input {
  background: transparent;
  border: none;
  border-bottom: 2px solid #5a3818;
  color: #1a0e04;
  font-family: 'IM Fell English', Georgia, serif;
  font-style: italic;
  font-size: 15px;
  padding: 4px 4px 2px;
  outline: none;
  width: 100%;
  transition: border-color .15s;
  text-align: center;
}
.pcm-sig-input:focus { border-bottom-color: #2a1008; }
.pcm-sig-input::placeholder { color: #b09060; font-size: 12px; }
.pcm-sig-line-label {
  font-size: 9px;
  color: #9a7848;
  letter-spacing: .1em;
  text-transform: uppercase;
  text-align: center;
  margin-top: 2px;
}
.pcm-sig-witness-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  border-bottom: 1.5px solid #8a6840;
  padding-bottom: 2px;
}
.pcm-sig-witness-name {
  font-family: 'IM Fell English', Georgia, serif;
  font-style: italic;
  font-size: 12px;
  color: #6a4828;
}

/* ── NOTARIAL TEXT ─────────────────────────── */
.pcm-notarial {
  font-size: 10px;
  color: #9a7848;
  font-style: italic;
  text-align: center;
  line-height: 1.6;
  border-top: 1px dashed rgba(140,100,30,0.3);
  padding-top: 8px;
  margin-top: 2px;
}

/* ── ERROR ─────────────────────────────────── */
.pcm-error {
  background: rgba(160,40,10,0.12);
  border: 1px solid rgba(160,60,20,0.4);
  border-radius: 3px;
  padding: 8px 12px;
  font-size: 12px;
  color: #8a2808;
  font-family: 'Special Elite', monospace;
  line-height: 1.5;
}

/* ── FOOTER BUTTONS ────────────────────────── */
.pcm-foot {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 6px;
  border-top: 1px solid rgba(140,100,30,0.25);
}
.pcm-btn-cancel {
  padding: 9px 18px;
  font-family: 'Special Elite', monospace;
  font-size: 12px;
  background: transparent;
  border: 1.5px solid rgba(160,60,20,0.5);
  color: #8a3818;
  border-radius: 3px;
  cursor: pointer;
  transition: background .15s;
  letter-spacing: .04em;
}
.pcm-btn-cancel:hover { background: rgba(160,60,20,0.1); }
.pcm-btn-confirm {
  padding: 9px 20px;
  font-family: 'Special Elite', monospace;
  font-size: 12px;
  background: #2a1808;
  border: 1.5px solid rgba(100,70,20,0.7);
  color: #e8c870;
  border-radius: 3px;
  cursor: pointer;
  transition: background .15s;
  letter-spacing: .04em;
}
.pcm-btn-confirm:hover { background: #3a2410; }

/* ── DOCUMENT FOOTER ───────────────────────── */
.pcm-doc-footer {
  font-size: 9px;
  color: #b09060;
  text-align: center;
  letter-spacing: .06em;
  padding: 8px 0 4px;
  border-top: 1px double rgba(140,100,30,0.3);
  font-style: italic;
}

/* ════════════════════════════════════════════
   MOBILE / SMALL SCREEN
════════════════════════════════════════════ */
@media (max-width: 480px) {
  .pcm-paper {
    width: 98vw;
    max-height: 95vh;
    border-radius: 2px;
  }
  .pcm-letterhead {
    padding: 12px 14px 10px;
    gap: 10px;
  }
  .pcm-lh-seal { font-size: 28px; }
  .pcm-lh-republic { font-size: 12px; }
  .pcm-lh-office   { font-size: 10px; }
  .pcm-lh-sub      { display: none; }

  .pcm-doc-title    { font-size: 11px; letter-spacing: .08em; padding: 8px 14px 2px; }
  .pcm-doc-subtitle { font-size: 9px; }

  .pcm-ref-block { padding: 4px 14px 6px; flex-direction: column; gap: 2px; }

  .pcm-scroll { padding: 10px 14px 16px; gap: 8px; }

  .pcm-body          { font-size: 12px; line-height: 1.65; }
  .pcm-section-heading { font-size: 10px; }
  .pcm-salutation    { font-size: 12px; }

  .pcm-table th, .pcm-table td { font-size: 10px; padding: 4px 5px; }

  .pcm-abc-lbl   { font-size: 11px; min-width: 70px; }
  .pcm-abc-blank { font-size: 12px; min-width: 80px; }

  .pcm-sig-area  { flex-direction: column; gap: 16px; align-items: stretch; }
  .pcm-sig-witness-col { align-items: flex-start; }

  .pcm-sig-input { font-size: 14px; }

  .pcm-foot { flex-direction: column-reverse; }
  .pcm-btn-cancel, .pcm-btn-confirm { width: 100%; text-align: center; }

  .pcm-notarial { font-size: 9px; }
  .pcm-doc-footer { font-size: 8px; }
}

@media (max-width: 360px) {
  .pcm-lh-seal { font-size: 22px; }
  .pcm-lh-republic { font-size: 10.5px; }
  .pcm-doc-title { font-size: 9.5px; }
  .pcm-body { font-size: 11px; }
  .pcm-abc-row { flex-direction: column; align-items: flex-start; }
  .pcm-abc-blank { width: 100%; }
}
  `;
  document.head.appendChild(s);
}