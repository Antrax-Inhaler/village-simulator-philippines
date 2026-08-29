/* ═══════════════════════════════════════════════════════════════
   MINI BAYAN — Side Panel Engine
   Renders the FAB side panels: Requests, Log, Policy, Tax/Debt, Trade.
═══════════════════════════════════════════════════════════════ */

var _activeSidePanel = null;
var _seenLogCount = 0;

// These will be populated after modules load
var _tradeModule = null;

// Function to check if request render is ready
function _isRequestsReady() {
  return typeof window._renderRequestsToSidePanel === 'function';
}

// Helper functions for colors
function _avg(villagers, field) {
  if (!villagers || !villagers.length) return 0;
  var s = 0; villagers.forEach(function(v) { s += (v[field] || 0); });
  return s / villagers.length;
}
function _rg(v) { return v > 60 ? '#44aa44' : v > 40 ? '#f5c842' : '#e74c3c'; }
function _gr(v) { return v < 30 ? '#44aa44' : v < 60 ? '#e67e22' : '#e74c3c'; }

function _spShell(title, body) {
  return '<div class="sp-header"><span class="sp-title">' + title + '</span>' +
         '<button class="sp-close" onclick="closeSidePanel()">✕</button></div>' +
         '<div class="sp-body">' + body + '</div>';
}

// Tax panel functions
window.spTaxSlider = function(val) {
  var v = document.getElementById('sp-tax-val');
  var w = document.getElementById('sp-tax-warn');
  if (v) v.textContent = val + '%';
  if (w) w.style.display = val > 50 ? 'block' : 'none';
};

window.spApplyTax = function() {
  var s = document.getElementById('sp-tax-slider');
  if (!s || !window.setTaxRate) return;
  window.setTaxRate(parseInt(s.value) / 100);
  setTimeout(() => window.refreshSidePanel(), 100);
};

// Debt payment function
window.spMakePayment = function() {
  var amountInput = document.getElementById('sp-payment-amount');
  if (!amountInput) {
    console.warn('Payment amount input not found');
    return;
  }

  var amount = parseInt(amountInput.value);
  if (isNaN(amount) || amount <= 0) {
    window.showMsg('Ilagay ang tamang halaga ng babayaran.', 'warning');
    return;
  }

  var VS = window._VS;
  if (!VS) {
    window.showMsg('Game state not ready', 'danger');
    return;
  }

  if (VS.res.gold < amount) {
    window.showMsg(`Kulang ang ginto! Mayroon lamang ${Math.floor(VS.res.gold)} 🪙.`, 'danger');
    return;
  }

  if (window._makeDebtPayment) {
    window._makeDebtPayment(amount);
  } else {
    if (!VS.debt) VS.debt = { principal: 0, creditScore: 60, defaulted: false, missedPayments: 0, paymentHistory: [] };
    var payment = Math.min(amount, VS.debt.principal);
    VS.res.gold -= payment;
    VS.debt.principal -= payment;
    VS.debt.paymentHistory.unshift({ amount: payment, day: window.dayCount || 1 });
    if (VS.debt.paymentHistory.length > 30) VS.debt.paymentHistory.pop();
    VS.debt.missedPayments = 0;
    window.showMsg(`Nagbayad ng ${payment} 🪙. Natitirang utang: ${VS.debt.principal} 🪙`, 'success');
  }

  setTimeout(() => window.refreshSidePanel(), 100);
};

// Loan function
window.spTakeLoan = function() {
  var amountInput = document.getElementById('sp-loan-amount');
  if (!amountInput) {
    console.warn('Loan amount input not found');
    return;
  }

  var amount = parseInt(amountInput.value);
  if (isNaN(amount) || amount <= 0) {
    window.showMsg('Ilagay ang tamang halaga ng uutangin.', 'warning');
    return;
  }

  var VS = window._VS;
  if (!VS) {
    window.showMsg('Game state not ready', 'danger');
    return;
  }

  if (VS.debt && VS.debt.defaulted) {
    window.showMsg('Hindi ka na pwedeng umutang dahil sa nakaraang hindi pagbabayad.', 'danger');
    return;
  }

  var maxLoan = window._getMaxLoanAmount ? window._getMaxLoanAmount(VS) : 1000;
  if (amount > maxLoan) {
    window.showMsg(`Ang maximum na pwedeng utangin ay ${maxLoan} 🪙 batay sa credit score.`, 'warning');
    return;
  }

  if (window._takeLoan) {
    window._takeLoan(amount);
  } else {
    if (!VS.debt) VS.debt = { principal: 0, creditScore: 60, defaulted: false, missedPayments: 0, paymentHistory: [] };
    VS.debt.principal += amount;
    VS.res.gold += amount;
    window.showMsg(`Nakautang ng ${amount} 🪙. Kabuuang utang: ${VS.debt.principal} 🪙`, 'info');
  }

  setTimeout(() => window.refreshSidePanel(), 100);
};

// Render tax panel with debt UI
function _spRenderTaxPanel() {
  var VS = window._VS;
  if (!VS) return '<div class="sp-empty">Loading...</div>';

  var rate = window.getTaxRate ? Math.round(window.getTaxRate() * 100) : 25;
  var happiness = _avg(VS.villagers, 'happiness') || 50;
  var anger = _avg(VS.villagers, 'anger') || 0;
  var govTrust = _avg(VS.villagers, 'govTrust') || 50;

  var debt = VS.debt || { principal: 0, creditScore: 60, defaulted: false, missedPayments: 0, paymentHistory: [] };
  var maxLoan = window._getMaxLoanAmount ? window._getMaxLoanAmount(VS) : 1000;
  var interestRate = window._getInterestRate ? Math.round(window._getInterestRate(VS) * 100) : 5;

  var debtColor = debt.principal > 0 ? '#e74c3c' : '#44aa44';
  var creditColor = debt.creditScore >= 70 ? '#44aa44' : debt.creditScore >= 40 ? '#f5c842' : '#e74c3c';

  var paymentHistoryHtml = '';
  if (debt.paymentHistory && debt.paymentHistory.length > 0) {
    paymentHistoryHtml = '<div class="sp-section-lbl" style="margin-top: 12px;">📜 Recent Payments</div>' +
      '<div class="sp-payment-list">' +
      debt.paymentHistory.slice(0, 3).map(function(p) {
        return '<div class="sp-payment-row">' +
          '<span>Araw ' + p.day + '</span>' +
          '<span class="sp-stat-val good">-' + p.amount + ' 🪙</span>' +
        '</div>';
      }).join('') +
      '</div>';
  }

  var loanSection = '';
  if (!debt.defaulted) {
    loanSection = '<div class="sp-section-lbl" style="margin-top: 12px;">💰 Uutang</div>' +
      '<div class="sp-loan-row">' +
        '<input type="number" id="sp-loan-amount" class="sp-loan-input" placeholder="Halaga" min="100" max="' + maxLoan + '" step="100" value="100">' +
        '<button class="sp-btn sp-btn-on" style="margin-left: 8px;" onclick="spTakeLoan()">Umutang</button>' +
      '</div>' +
      '<div class="sp-stat-row" style="margin-top: 8px;"><span class="sp-stat-lbl">Max na pwedeng utangin</span><span class="sp-stat-val">' + maxLoan + ' 🪙</span></div>';
  } else {
    loanSection = '<div class="sp-warn" style="background:#3a1a1a; margin-top: 12px;">⚠️ NAKAPAGDEFAULT NA! Hindi na pwedeng umutang muli.</div>';
  }

  return '<div class="sp-stat-block">' +
    '<div class="sp-stat-row"><span class="sp-stat-lbl">Buwis</span><span class="sp-stat-val" id="sp-tax-cur">' + rate + '%</span></div>' +
    '<div class="sp-stat-row"><span class="sp-stat-lbl">Avg Kasiyahan</span><span class="sp-stat-val" style="color:' + _rg(happiness) + '">' + Math.round(happiness) + '%</span></div>' +
    '<div class="sp-stat-row"><span class="sp-stat-lbl">Avg Galit</span><span class="sp-stat-val" style="color:' + _gr(anger) + '">' + Math.round(anger) + '%</span></div>' +
    '<div class="sp-stat-row"><span class="sp-stat-lbl">Tiwala sa Gobyerno</span><span class="sp-stat-val" style="color:' + _rg(govTrust) + '">' + Math.round(govTrust) + '%</span></div>' +
    '</div>' +

    '<div class="sp-debt-section" style="border-top: 1px solid #3a2a18; margin-top: 8px; padding-top: 12px;">' +
      '<div class="sp-section-lbl">🏦 Pambansang Utang</div>' +
      '<div class="sp-stat-row"><span class="sp-stat-lbl">Kabuuang Utang</span><span class="sp-stat-val" style="color:' + debtColor + '">' + Math.floor(debt.principal) + ' 🪙</span></div>' +
      '<div class="sp-stat-row"><span class="sp-stat-lbl">Interest Rate</span><span class="sp-stat-val">' + interestRate + '% / araw</span></div>' +
      '<div class="sp-stat-row"><span class="sp-stat-lbl">Credit Score</span><span class="sp-stat-val" style="color:' + creditColor + '">' + debt.creditScore + '/100</span></div>' +
      (debt.missedPayments > 0 ? '<div class="sp-stat-row"><span class="sp-stat-lbl">Hindi nabayarang araw</span><span class="sp-stat-val bad">' + debt.missedPayments + '</span></div>' : '') +
      (debt.defaulted ? '<div class="sp-warn" style="background:#3a1a1a; margin-top: 8px;">⚠️ DEFAULTED - Mataas na interes!</div>' : '') +
    '</div>' +

    '<div class="sp-payment-section" style="margin-top: 12px;">' +
      '<div class="sp-section-lbl">💸 Magbayad ng Utang</div>' +
      '<div class="sp-payment-row">' +
        '<input type="number" id="sp-payment-amount" class="sp-payment-input" placeholder="Halaga" min="10" max="' + Math.floor(VS.res.gold) + '" step="100" value="' + Math.min(500, Math.floor(VS.res.gold)) + '">' +
        '<button class="sp-btn sp-btn-on" style="margin-left: 8px;" onclick="spMakePayment()">Magbayad</button>' +
      '</div>' +
      '<div class="sp-stat-row" style="margin-top: 8px;"><span class="sp-stat-lbl">Ginto sa Treasury</span><span class="sp-stat-val">' + Math.floor(VS.res.gold) + ' 🪙</span></div>' +
      paymentHistoryHtml +
    '</div>' +

    loanSection +

    '<div class="sp-section-lbl" style="margin-top: 12px;">⚙️ Itakda ang Buwis</div>' +
    '<div class="sp-slider-row">' +
      '<input type="range" id="sp-tax-slider" min="5" max="80" value="' + rate + '" oninput="spTaxSlider(this.value)" />' +
      '<span class="sp-stat-val" id="sp-tax-val">' + rate + '%</span>' +
    '</div>' +
    '<div id="sp-tax-warn" class="sp-warn" style="display:' + (rate > 50 ? 'block' : 'none') + '">' +
      '⚠️ Ang mataas na buwis ay nagpapataas ng galit ng mamamayan!' +
    '</div>' +
    '<button class="sp-btn sp-btn-on" style="width:100%;margin-top:14px" onclick="spApplyTax()">Ilapat ang Bagong Buwis</button>';
}

// Load trade module dynamically
async function _loadTradeModule() {
  if (_tradeModule) return _tradeModule;
  try {
    const module = await import('../resources/trade.js');
    _tradeModule = module;
    return module;
  } catch(e) {
    console.warn('Trade module not loaded yet', e);
    return null;
  }
}

// Render trade panel content
async function _renderTradePanelContent() {
  var VS = window._VS;
  if (!VS) return '<div class="sp-empty">Loading game data...</div>';

  const trade = await _loadTradeModule();
  if (!trade) return '<div class="sp-empty">Loading trade system...</div>';

  var tradeState = trade.getTradeState(VS);
  if (!tradeState) return '<div class="sp-empty">Trade system loading...</div>';

  var reputation = tradeState.reputation || 50;
  var contracts = tradeState.contracts || [];
  var pendingImports = tradeState.pendingImports || [];
  var importPrices = trade.getImportPrices(VS);

  var repColor = reputation >= 70 ? '#88dd88' : reputation >= 40 ? '#f5c842' : '#e74c3c';

  var contractsHtml = '';
  if (contracts.length === 0) {
    contractsHtml = '<div class="sp-empty">Walang aktibong kontrata. Maghintay ng mag-aalok.</div>';
  } else {
    contractsHtml = contracts.map(function(c) {
      var timerSecs = Math.ceil(c.timeLeft);
      var timerStr = timerSecs >= 60 ? Math.floor(timerSecs/60) + 'm ' + (timerSecs%60) + 's' : timerSecs + 's';
      var resIcon = c.res === 'rice' ? '🌾' : c.res === 'langis' ? '💧' : '🪙';
      return '<div class="trade-contract">' +
        '<div class="trade-contract-header">' +
          '<span class="trade-flag">' + (c.flag || '📦') + '</span>' +
          '<span class="trade-country">' + c.country + '</span>' +
        '</div>' +
        '<div class="trade-res">Bibili: ' + c.amount + ' ' + resIcon + ' ' + c.res + '</div>' +
        '<div class="trade-reward">Gantimpala: ' + c.reward + ' 🪙</div>' +
        '<div class="trade-timer">⏱️ ' + timerStr + '</div>' +
        '<button class="trade-fulfill-btn" onclick="fulfillTradeContract(\'' + c.id + '\')">✅ Ipasa ang Kalakal</button>' +
      '</div>';
    }).join('');
  }

  var pendingHtml = '';
  if (pendingImports.length > 0) {
    pendingHtml = '<div class="trade-pending"><div class="sp-section-lbl" style="margin-bottom: 8px;">📦 Naghihintay na Import</div>';
    pendingImports.forEach(function(imp) {
      var timerSecs = Math.ceil(imp.timeLeft);
      var timerStr = timerSecs >= 60 ? Math.floor(timerSecs/60) + 'm' : timerSecs + 's';
      var resIcon = imp.res === 'rice' ? '🌾' : '💧';
      pendingHtml += '<div style="padding: 6px 0; border-bottom: 1px solid #2a1808;">' +
        '➕ ' + imp.amount + ' ' + resIcon + ' ' + imp.res + ' <span class="trade-timer">(' + timerStr + ')</span>' +
      '</div>';
    });
    pendingHtml += '</div>';
  }

  return '' +
    '<div class="trade-reputation" style="border-color:' + repColor + '; color:' + repColor + '">' +
      '🏛️ Reputasyon: ' + reputation + '/100' +
    '</div>' +
    '<div class="sp-section-lbl">📤 Mga Alok na Export</div>' +
    contractsHtml +
    '<div class="trade-import-section">' +
      '<div class="sp-section-lbl">📥 Mag-import</div>' +
      '<div class="trade-import-row">' +
        '<span>🌾 Bigas</span>' +
        '<input type="number" id="trade-rice-amount" class="trade-import-input" value="' + (window._tradeImportAmount?.rice || 100) + '" min="10" max="500" step="10">' +
        '<span>' + importPrices.rice + '🪙/unit</span>' +
        '<button class="trade-import-btn" onclick="importResource(\'rice\')">Bumili</button>' +
      '</div>' +
      '<div class="trade-import-row">' +
        '<span>💧 Langis</span>' +
        '<input type="number" id="trade-langis-amount" class="trade-import-input" value="' + (window._tradeImportAmount?.langis || 50) + '" min="10" max="500" step="10">' +
        '<span>' + importPrices.langis + '🪙/unit</span>' +
        '<button class="trade-import-btn" onclick="importResource(\'langis\')">Bumili</button>' +
      '</div>' +
    '</div>' +
    pendingHtml;
}

// Log entries helper
function _getLogEntries() {
  var VS = window._VS;
  var entries = [];
  if (VS && VS.events && VS.events.log) {
    VS.events.log.slice(0, 12).forEach(function(e) {
      var icon = e.severity >= 3 ? '🚨' :
                 e.category === 'natural'   ? '🌪️' :
                 e.category === 'economic'  ? '📉' :
                 e.category === 'political' ? '⚡' : '📌';
      entries.push({ id: e.id, icon: icon, text: e.message, tag: e.category || 'default', detail: e.detail, severity: e.severity });
    });
  }
  if (VS && VS.election && VS.election.lastVotesTotal > 0) {
    var E = VS.election;
    var pct = Math.round(E.lastApproval * 100);
    var bd = E.lastBreakdown;
    var detail = bd ? ' (Tiwala:' + bd.trust + ' Kasiyahan:' + bd.happy + ' Pagkain:' + bd.food + ' Trabaho:' + bd.employ + '%)' : '';
    entries.push({ id: 'election', icon: '🗳️', text: 'Eleksyon Termino ' + ((E.termNumber-1)||1) + ': ' + pct + '% boto' + detail, tag: 'election', detail: null });
  }
  if (VS && VS.trade && VS.trade.history) {
    VS.trade.history.slice(0, 6).forEach(function(h, i) {
      var icon = h.success ? '✅' : '❌';
      var text = (h.flag||'') + ' ' + (h.country||'Import') + ': ' + (h.success?'+':'') + h.amount + ' ' + ({rice:'🌾',gold:'🪙',langis:'💎'}[h.res]||h.res);
      entries.push({ id: 'trade_' + i, icon: icon, text: text.trim(), tag: 'trade', detail: null });
    });
  }
  if (VS && VS.activityLog) {
    VS.activityLog.slice(0, 8).forEach(function(entry, i) {
      entries.push({ id: 'waste_' + i, icon: '🗑️', text: entry.msg, tag: 'waste', detail: null });
    });
  }
  return entries;
}

function _updateLogBadge(count) {
  var badge = document.getElementById('fab-log-badge');
  if (badge) { badge.textContent = Math.min(count, 99); badge.style.display = count > 0 ? 'flex' : 'none'; }
}

function _spRenderLog() {
  var entries = _getLogEntries();
  var body = entries.length === 0
    ? '<div class="sp-empty">Walang naitalang kaganapan pa.</div>'
    : entries.map(function(e) {
        var hasDetail = e.detail && ( (e.detail.affectedBuildings && e.detail.affectedBuildings.length > 0) || e.detail.goldLost || e.detail.riceLost || e.detail.healthHit );
        var clickAttr = hasDetail ? ' onclick="window.showEventModal(' + JSON.stringify(e).replace(/"/g, '&quot;') + ')" style="cursor:pointer"' : '';
        var hint = hasDetail ? '<span class="sp-log-hint">Tap para sa detalye ›</span>' : '';
        return '<div class="sp-log-row sp-log-' + e.tag + '"' + clickAttr + '>' +
          '<span class="sp-log-icon">' + e.icon + '</span>' +
          '<span class="sp-log-text">' + e.text + hint + '</span>' +
        '</div>';
      }).join('');
  return _spShell('📋 Talaan ng Buhay', body);
}

function _spRender(key) {
  var VS = window._VS;
  switch (key) {
    case 'requests':
      if (_isRequestsReady()) {
        var requestsHtml = window._renderRequestsToSidePanel();
        return _spShell('📋 Mga Kahilingan ng Mamamayan', requestsHtml);
      }
      return _spShell('📋 Mga Kahilingan', '<div class="sp-empty">Loading requests system...</div>');
    case 'trade':
      return _spShell('⚓ Kalakalan at Import', '<div class="sp-empty" id="trade-loading">Loading trade system...</div>');
    case 'policy': {
      var states = window.getPolicyState ? window.getPolicyState() : [];
      if (!states.length) return _spShell('📜 Mga Patakaran', '<div class="sp-empty">Walang available na patakaran.</div>');
      var html = states.map(function(p) {
        var canAfford = VS && (VS.res.gold >= p.cost.gold) && (VS.res.rice >= (p.cost.rice||0));
        var costStr   = p.cost.gold + '🪙' + (p.cost.rice ? ' ' + p.cost.rice + '🌾' : '');
        var drainStr  = p.drainPerSec > 0 ? Math.round(p.drainPerSec * 60) + '🪙/min · ' : '';
        return '<div class="sp-card' + (p.isActive ? ' sp-card-on' : '') + '">' +
          '<div class="sp-card-head">' +
            '<span class="sp-card-name">' + p.label + '</span>' +
            (p.isActive ? '<span class="sp-pill sp-pill-on">AKTIBO</span>' : '') +
          '</div>' +
          '<div class="sp-card-desc">' + p.description + '</div>' +
          '<div class="sp-card-meta">' + drainStr + 'Hall Lv' + p.minHallLevel + '</div>' +
          '<div class="sp-card-foot">' +
            (p.isActive
              ? '<button class="sp-btn sp-btn-off" onclick="window.deactivatePolicy(\'' + p.key + '\');window.openSidePanel(\'policy\')">Ihinto</button>'
              : '<button class="sp-btn sp-btn-on' + (canAfford ? '' : ' sp-btn-dim') + '" onclick="window.activatePolicy(\'' + p.key + '\');window.openSidePanel(\'policy\')">' +
                'Isaaktibo · ' + costStr + '</button>'
            ) +
          '</div>' +
        '</div>';
      }).join('');
      return _spShell('📜 Mga Patakaran', html);
    }
    case 'tax': {
      return _spShell('💰 Buwis at Utang', _spRenderTaxPanel());
    }
    case 'log': return _spRenderLog();
    default: return _spShell('?', '<div class="sp-empty">Hindi kilala.</div>');
  }
}

function _spWire(key) {
  if (key === 'trade') {
    (async () => {
      var inner = document.getElementById('side-panel-inner');
      if (inner) {
        var tradeHtml = await _renderTradePanelContent();
        inner.innerHTML = _spShell('⚓ Kalakalan at Import', tradeHtml);
        _wireTradeButtons();
      }
    })();
  }
  if (key === 'requests') {
    setTimeout(function() {
      if (window._wireRequestButtons) window._wireRequestButtons();
    }, 100);
  }
}

function _wireTradeButtons() {
  var riceInput = document.getElementById('trade-rice-amount');
  var langisInput = document.getElementById('trade-langis-amount');
  if (riceInput) riceInput.onchange = (e) => window._tradeImportAmount.rice = parseInt(e.target.value) || 100;
  if (langisInput) langisInput.onchange = (e) => window._tradeImportAmount.langis = parseInt(e.target.value) || 50;
}

window.openSidePanel = function(key) {
  if (_activeSidePanel === key) { _closeSidePanel(); return; }
  _activeSidePanel = key;
  var inner = document.getElementById('side-panel-inner');
  var panel = document.getElementById('side-panel');
  if (!inner || !panel) return;
  inner.innerHTML = _spRender(key);
  panel.classList.add('open');
  _spMarkActive(key);
  _spWire(key);
  if (key === 'log') {
    var entries = _getLogEntries();
    _seenLogCount = entries.length;
    _updateLogBadge(0);
  }
};

window.closeSidePanel = function() { _closeSidePanel(); };
window.openPolicy = function() { window.openSidePanel('policy'); };
window.openTaxPanel = function() { window.openSidePanel('tax'); };

function _closeSidePanel() {
  _activeSidePanel = null;
  var panel = document.getElementById('side-panel');
  if (panel) panel.classList.remove('open');
  _spMarkActive(null);
}

function _spMarkActive(key) {
  document.querySelectorAll('.fab-item').forEach(function(el) { el.classList.remove('fab-active'); });
  if (!key) return;
  document.querySelectorAll('.fab-item').forEach(function(el) {
    var h = el.getAttribute('onclick') || '';
    if (h.indexOf("'" + key + "'") !== -1) el.classList.add('fab-active');
  });
}

// Refresh side panel function
window.refreshSidePanel = async function() {
  if (_activeSidePanel === 'requests' && _isRequestsReady()) {
    var inner = document.getElementById('side-panel-inner');
    if (inner) {
      var html = window._renderRequestsToSidePanel();
      inner.innerHTML = _spShell('📋 Mga Kahilingan ng Mamamayan', html);
      setTimeout(() => { if (window._wireRequestButtons) window._wireRequestButtons(); }, 100);
    }
  }
  if (_activeSidePanel === 'trade') {
    var inner = document.getElementById('side-panel-inner');
    if (inner) {
      var tradeHtml = await _renderTradePanelContent();
      inner.innerHTML = _spShell('⚓ Kalakalan at Import', tradeHtml);
      _wireTradeButtons();
    }
  }
  if (_activeSidePanel === 'tax') {
    var inner = document.getElementById('side-panel-inner');
    if (inner) {
      inner.innerHTML = _spShell('💰 Buwis at Utang', _spRenderTaxPanel());
    }
  }
};

// Global trade action handlers
window.fulfillTradeContract = async function(contractId) {
  const trade = await _loadTradeModule();
  if (!trade) { window.showMsg('Trade system not ready', 'warning'); return; }
  var result = trade.fulfillExport(contractId, window._VS, window.showMsg);
  if (result && result.ok) setTimeout(() => window.refreshSidePanel(), 100);
};

window.importResource = async function(res) {
  var amount = res === 'rice' ? (window._tradeImportAmount?.rice || 100) : (window._tradeImportAmount?.langis || 50);
  const trade = await _loadTradeModule();
  if (!trade) { window.showMsg('Import system not ready', 'warning'); return; }
  var result = trade.placeImportOrder(res, amount, window._VS, window.showMsg);
  if (result && result.ok) setTimeout(() => window.refreshSidePanel(), 100);
};

window._tradeImportAmount = { rice: 100, langis: 50 };

// Auto-refresh every 6 seconds
setInterval(function() {
  var entries = _getLogEntries();
  var newCount = Math.max(0, entries.length - _seenLogCount);
  _updateLogBadge(newCount);
  if (_activeSidePanel === 'log') {
    var inner = document.getElementById('side-panel-inner');
    if (inner) inner.innerHTML = _spRenderLog();
  }
  if (_activeSidePanel === 'requests' || _activeSidePanel === 'trade' || _activeSidePanel === 'tax') {
    window.refreshSidePanel();
  }
}, 6000);
