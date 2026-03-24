/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — resources/trade.js  (hybrid economy)

   Offers are shaped by: exchange rate API × supply pressure ×
   country preference × reputation × market noise.
   Player sees only: amount, reward, country, timer.
═══════════════════════════════════════════════════════════════ */

import { clamp, randInt, randRange } from '../utils/perspective.js';

var COUNTRIES = [
  { name:'Japan',        flag:'🇯🇵', currency:'JPY', pref:['rice','langis'], style:'fair'      },
  { name:'China',        flag:'🇨🇳', currency:'CNY', pref:['rice','gold'],   style:'aggressive'},
  { name:'USA',          flag:'🇺🇸', currency:'USD', pref:['gold','langis'], style:'balanced'  },
  { name:'South Korea',  flag:'🇰🇷', currency:'KRW', pref:['rice','langis'], style:'fair'      },
  { name:'Saudi Arabia', flag:'🇸🇦', currency:'SAR', pref:['gold'],          style:'aggressive'},
  { name:'Malaysia',     flag:'🇲🇾', currency:'MYR', pref:['rice','langis'], style:'balanced'  },
  { name:'Indonesia',    flag:'🇮🇩', currency:'IDR', pref:['rice','gold'],   style:'aggressive'},
  { name:'Vietnam',      flag:'🇻🇳', currency:'VND', pref:['rice'],          style:'aggressive'},
  { name:'India',        flag:'🇮🇳', currency:'INR', pref:['langis','rice'], style:'balanced'  },
  { name:'Australia',    flag:'🇦🇺', currency:'AUD', pref:['gold'],          style:'fair'      },
  { name:'UAE',          flag:'🇦🇪', currency:'AED', pref:['gold','langis'], style:'fair'      },
  { name:'Singapore',    flag:'🇸🇬', currency:'SGD', pref:['rice','gold'],   style:'balanced'  },
  { name:'Germany',      flag:'🇩🇪', currency:'EUR', pref:['gold'],          style:'fair'      },
  { name:'Thailand',     flag:'🇹🇭', currency:'THB', pref:['rice'],          style:'balanced'  },
];

/* Internal base gold value per resource unit (hidden from player) */
var BASE_VALUE   = { rice: 3.5, langis: 8.0 };
var IMPORT_BASE  = { rice: 5,   langis: 14  };

var MAX_CONTRACTS     = 3;
var CONTRACT_LIFE_MIN = 200;
var CONTRACT_LIFE_MAX = 420;
var COOLDOWN_BASE     = 45;
var REP_GAIN = 3, REP_LOSS = 5;
var IMPORT_DELAY_MIN = 25, IMPORT_DELAY_MAX = 100;
var _idCounter = 0;

/* ── Exchange rate cache ───────────────────────────────────── */
var _fxRates    = null;
var _fxFetching = false;

var FX_FALLBACK = {
  JPY:150, CNY:7.2, USD:1, KRW:1330, SAR:3.75,
  MYR:4.7, IDR:15800, VND:25400, INR:83, AUD:1.55,
  AED:3.67, SGD:1.34, EUR:0.92, THB:35,
};

function _loadFX() {
  if (_fxRates || _fxFetching) return;
  _fxFetching = true;
  fetch('https://open.er-api.com/v6/latest/USD')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      _fxRates    = (d && d.rates) ? d.rates : FX_FALLBACK;
      _fxFetching = false;
    })
    .catch(function() {
      _fxRates    = FX_FALLBACK;
      _fxFetching = false;
    });
}

/* Currency purchasing power [0.6 … 1.8], stronger = pays more */
function _fxMult(currency) {
  if (!_fxRates) return 1.0;
  var rate = _fxRates[currency] || 1;
  /* log-normalize to [0.6, 1.8] */
  var logPow = Math.log(1 / (rate + 1e-10));
  var minLog = Math.log(1 / 25400);  /* VND weakest */
  var maxLog = Math.log(1 / 0.92);   /* EUR strongest */
  var t = clamp((logPow - minLog) / (maxLog - minLog + 1e-10), 0, 1);
  return 0.6 + t * 1.2;
}

/* Supply pressure: oversupply lowers price, scarcity raises it */
function _supplyMult(VS, res) {
  var ratio = (VS.res[res] || 0) / Math.max(VS.resCap[res] || 1, 1);
  if (ratio > 0.70) return clamp(1.0 - (ratio - 0.70) * 1.5, 0.55, 1.0);
  if (ratio < 0.30) return clamp(1.0 + (0.30 - ratio) * 1.8, 1.0, 1.75);
  return 1.0;
}

/* Reputation effect on both export rewards and import costs */
function _repMult(rep) {
  return rep <= 50
    ? 0.75 + (rep / 50) * 0.25
    : 1.0  + ((rep - 50) / 50) * 0.35;
}

/* Trading style noise */
function _noise(style) {
  if (style === 'aggressive') return randRange(0.75, 1.25);
  if (style === 'fair')       return randRange(0.90, 1.10);
  return randRange(0.82, 1.18);
}

function _icon(res) {
  return { rice:'🌾', gold:'🪙', langis:'💧' }[res] || res;
}

/* ── State init ────────────────────────────────────────────── */
function _ensure(VS) {
  if (!VS.trade) {
    VS.trade = {
      reputation: 50, contracts: [], pendingImports: [],
      history: [], contractCooldown: 20,
      totalExported: 0, totalImported: 0,
    };
  }
  _loadFX();
}

function _producible(VS) {
  var can = {};
  (VS.buildings || []).forEach(function(b) {
    var d = b.getDef ? b.getDef() : {};
    if (d.prodRes) can[d.prodRes] = true;
  });
  (VS.resourceNodes || []).forEach(function(n) {
    if (n.giveRes) can[n.giveRes] = true;
  });
  return Object.keys(can);
}

function _surplus(VS, res) {
  var have = VS.res[res] || 0, cap = VS.resCap[res] || 1;
  var avail = have - cap * 0.35;
  if (avail < 30) return 0;
  return Math.max(30, Math.floor(avail * randRange(0.25, 0.55)));
}

function _makeContract(VS, res, co) {
  var T      = VS.trade;
  var amount = _surplus(VS, res);
  if (amount < 30) return null;

  var base  = BASE_VALUE[res] || 3;
  var pref  = co.pref.indexOf(res) !== -1 ? randRange(1.10, 1.40) : randRange(0.70, 0.95);
  var reward = Math.max(10, Math.round(
    amount * base * _fxMult(co.currency) * _supplyMult(VS, res) * _repMult(T.reputation) * pref * _noise(co.style)
  ));

  var life = randRange(CONTRACT_LIFE_MIN, CONTRACT_LIFE_MAX) * (0.8 + (T.reputation / 100) * 0.4);

  return { id:'exp_'+(_idCounter++), country:co.name, flag:co.flag, currency:co.currency,
           res:res, amount:amount, reward:reward, timeLeft:life, timeMax:life };
}

/* ══════════════════════════════════════════════════════════════
   tickTrade
══════════════════════════════════════════════════════════════ */
export function tickTrade(dt, VS, notifyFn) {
  _ensure(VS);
  var T = VS.trade;

  for (var i = T.contracts.length - 1; i >= 0; i--) {
    var con = T.contracts[i];
    con.timeLeft -= dt;
    if (con.timeLeft <= 0) {
      T.reputation = clamp(T.reputation - REP_LOSS, 0, 100);
      _archive(T, con, false);
      T.contracts.splice(i, 1);
      if (notifyFn) notifyFn(con.flag+' '+con.country+': Nag-expire. −'+REP_LOSS+' reputasyon.','warning');
    }
  }

  for (var j = T.pendingImports.length - 1; j >= 0; j--) {
    var imp = T.pendingImports[j];
    imp.timeLeft -= dt;
    if (imp.timeLeft <= 0) {
      VS.res[imp.res] = Math.min(VS.resCap[imp.res]||9999, (VS.res[imp.res]||0) + imp.amount);
      T.totalImported += imp.amount;
      T.pendingImports.splice(j, 1);
      if (notifyFn) notifyFn('📦 Dumating ang import! +'+imp.amount+' '+_icon(imp.res)+'.','success');
    }
  }

  T.contractCooldown -= dt;
  if (T.contractCooldown > 0 || T.contracts.length >= MAX_CONTRACTS) return;

  var producible = _producible(VS);
  if (!producible.length) { T.contractCooldown = 30; return; }

  var res = null;
  producible.slice().sort(function(){ return Math.random()-0.5; }).forEach(function(r) {
    if (!res && _surplus(VS, r) >= 30) res = r;
  });
  if (!res) { T.contractCooldown = 25; return; }

  var preferred = COUNTRIES.filter(function(co){ return co.pref.indexOf(res) !== -1; });
  var pool = preferred.length ? preferred : COUNTRIES;
  var co   = Math.random() < 0.78 ? pool[randInt(0,pool.length-1)] : COUNTRIES[randInt(0,COUNTRIES.length-1)];

  var contract = _makeContract(VS, res, co);
  if (!contract) { T.contractCooldown = 20; return; }

  T.contracts.push(contract);
  T.contractCooldown = COOLDOWN_BASE + randRange(-10, 20);
  if (notifyFn) notifyFn(co.flag+' '+co.name+' nag-request ng '+contract.amount+' '+_icon(res)+' — alok: '+contract.reward+' 🪙','info');
}

/* ══════════════════════════════════════════════════════════════
   fulfillExport
══════════════════════════════════════════════════════════════ */
export function fulfillExport(contractId, VS, notifyFn) {
  _ensure(VS);
  var T = VS.trade, idx = -1;
  for (var i = 0; i < T.contracts.length; i++) { if (T.contracts[i].id === contractId) { idx=i; break; } }
  if (idx === -1) return { ok:false, msg:'Hindi nahanap ang kontrata.' };

  var con  = T.contracts[idx];
  var have = VS.res[con.res] || 0;
  if (have < con.amount) return { ok:false, msg:'Kulang! Kailangan: '+con.amount+' '+_icon(con.res)+'. Mayroon: '+Math.floor(have)+'.' };

  VS.res[con.res] = Math.max(0, VS.res[con.res] - con.amount);
  VS.res.gold     = Math.min(VS.resCap.gold||9999, (VS.res.gold||0) + con.reward);
  T.reputation    = clamp(T.reputation + REP_GAIN, 0, 100);
  T.totalExported += con.amount;
  T.contracts.splice(idx, 1);
  _archive(T, con, true);
  T.contractCooldown = Math.max(T.contractCooldown, COOLDOWN_BASE * 0.4);

  var msg = con.flag+' '+con.country+': Naibenta! +'+con.reward+' 🪙  Rep: '+Math.round(T.reputation)+'/100';
  if (notifyFn) notifyFn(msg,'success');
  return { ok:true, msg:msg };
}

/* ══════════════════════════════════════════════════════════════
   placeImportOrder
══════════════════════════════════════════════════════════════ */
export function placeImportOrder(res, amount, VS, notifyFn) {
  _ensure(VS);
  var T    = VS.trade;
  var base = IMPORT_BASE[res];
  if (!base)     return { ok:false, msg:'Hindi mabibili ang '+res+'.' };
  if (amount < 1) return { ok:false, msg:'Mag-enter ng tamang dami.' };

  var avgHunger = 0;
  if (VS.villagers && VS.villagers.length) {
    VS.villagers.forEach(function(v){ avgHunger += (v.hunger||0); });
    avgHunger /= VS.villagers.length;
  }
  var shortage  = res === 'rice' && avgHunger > 55;
  var surcharge = shortage ? randRange(1.5, 2.2) : randRange(0.95, 1.15);
  var repD      = T.reputation > 70 ? randRange(0.80,0.90) : T.reputation < 30 ? randRange(1.10,1.25) : 1.0;
  var noise     = randRange(0.90, 1.10);

  var pricePerUnit = Math.ceil(base * surcharge * repD * noise);
  var totalCost    = pricePerUnit * amount;

  if ((VS.res.gold||0) < totalCost) return { ok:false, msg:'Kulang ang ginto! Kailangan: '+totalCost+' 🪙 ('+pricePerUnit+'/unit).' };

  VS.res.gold -= totalCost;

  var delay = Math.round(randRange(IMPORT_DELAY_MIN, IMPORT_DELAY_MAX) * (1.3 - (T.reputation/100)*0.5));
  T.pendingImports.push({ id:'imp_'+(_idCounter++), res:res, amount:amount, cost:totalCost, timeLeft:delay, timeMax:delay });

  var timeStr = delay >= 60 ? Math.ceil(delay/60)+' min' : delay+'s';
  var msg = 'Order: '+amount+' '+_icon(res)+' para '+totalCost+' 🪙. Darating sa ~'+timeStr+'.';
  if (notifyFn) notifyFn(msg,'info');
  return { ok:true, msg:msg, cost:totalCost, delay:delay };
}

function _archive(T, con, success) {
  T.history.unshift({ country:con.country||'Import', flag:con.flag||'📦', res:con.res, amount:con.amount, reward:con.reward, success:success });
  if (T.history.length > 8) T.history.pop();
}

export function getTradeState(VS) {
  _ensure(VS);
  var T = VS.trade;
  return { reputation:Math.round(T.reputation), contracts:T.contracts.slice(),
           pendingImports:T.pendingImports.slice(), history:T.history.slice(),
           contractCooldown:Math.max(0,Math.ceil(T.contractCooldown)),
           totalExported:T.totalExported, totalImported:T.totalImported, fxLoaded:!!_fxRates };
}

export function getImportPrices(VS) {
  _ensure(VS);
  var T = VS.trade;
  var disc = T.reputation > 70 ? 0.85 : T.reputation < 30 ? 1.15 : 1.0;
  var avgHunger = 0;
  if (VS.villagers && VS.villagers.length) { VS.villagers.forEach(function(v){ avgHunger+=(v.hunger||0); }); avgHunger/=VS.villagers.length; }
  return { rice:Math.ceil(IMPORT_BASE.rice*(avgHunger>55?1.8:1.0)*disc), langis:Math.ceil(IMPORT_BASE.langis*disc) };
}