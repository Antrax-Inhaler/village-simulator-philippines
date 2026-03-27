/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — resources/economy.js  (with Debt System)

   CHANGES FROM ORIGINAL
   ─────────────────────────────────────────────────────────────
   DEBT SYSTEM ADDED:
   - National debt tracking (principal, interest, credit score)
   - Take loans with interest
   - Make debt payments
   - Credit score affects loan limits and interest rates
   - Missed payments lead to default
═══════════════════════════════════════════════════════════════ */

import { clamp } from '../utils/perspective.js';
import { isPolicyActive } from '../government/policy.js';

/* ── Tax constants ─────────────────────────────────────────── */
var BASE_TAX_RATE = 0.25;          // 25% base tax
var TAX_REVENUE_PER_POP = 5;       // Base revenue per citizen per day
var MAX_TAX_RATE = 0.80;           // Maximum 80% tax
var MIN_TAX_RATE = 0.05;           // Minimum 5% tax

/* ── Waste constants ───────────────────────────────────────── */
var WASTE_GENERATION_RATE = 0.001;  // Waste per resource consumed
var WASTE_CLEANUP_COST = 2;         // Gold per waste unit to clean

/* ── Debt constants ────────────────────────────────────────── */
var DEBT_INTEREST_RATE = 0.05;       // 5% per day
var MAX_CREDIT_SCORE = 100;
var MIN_CREDIT_SCORE = 0;
var DEFAULT_CREDIT_SCORE = 60;

/* ── Internal state ────────────────────────────────────────── */
var _taxRate = BASE_TAX_RATE;
var _lastTaxDay = 0;

/* ══════════════════════════════════════════════════════════════
   DEBT SYSTEM FUNCTIONS
══════════════════════════════════════════════════════════════ */

// Initialize debt in VS
export function initDebt(VS) {
  if (!VS.debt) {
    VS.debt = {
      principal: 0,                    // Total debt owed
      interestRate: DEBT_INTEREST_RATE,
      lastInterestDay: 0,              // Last day interest was applied
      paymentHistory: [],              // Track payments (max 30 entries)
      creditScore: DEFAULT_CREDIT_SCORE,
      defaulted: false,                // Has defaulted before
      lastPaymentDay: 0,               // Track when last payment was made
      missedPayments: 0                // Consecutive missed payments
    };
  }
  return VS.debt;
}

// Calculate daily interest
export function calculateDebtInterest(VS) {
  if (!VS.debt || VS.debt.principal <= 0) return 0;
  
  var baseInterest = Math.floor(VS.debt.principal * VS.debt.interestRate);
  
  // Credit score affects interest (higher score = lower interest)
  // Max 50% discount at 100 credit score
  var discount = (VS.debt.creditScore / 100) * 0.5;
  var adjustedInterest = Math.floor(baseInterest * (1 - discount));
  
  VS.debt.principal += adjustedInterest;
  return adjustedInterest;
}

// Make debt payment
export function makeDebtPayment(amount, VS, showMsgFn) {
  if (!VS.debt) initDebt(VS);
  
  if (amount <= 0) {
    if (showMsgFn) showMsgFn('Walang halaga ang bayad.', 'warning');
    return false;
  }
  
  if (VS.res.gold < amount) {
    if (showMsgFn) showMsgFn('Kulang ang ginto para sa bayad.', 'danger');
    return false;
  }
  
  // Deduct payment
  VS.res.gold -= amount;
  var actualPayment = Math.min(amount, VS.debt.principal);
  VS.debt.principal -= actualPayment;
  
  // Track payment
  VS.debt.paymentHistory.unshift({
    amount: actualPayment,
    date: Date.now(),
    day: window.dayCount || 1
  });
  
  // Keep only last 30 payments
  if (VS.debt.paymentHistory.length > 30) VS.debt.paymentHistory.pop();
  
  // Update credit score for making payments
  updateCreditScore(VS, true, actualPayment);
  
  VS.debt.lastPaymentDay = window.dayCount || 1;
  VS.debt.missedPayments = 0;
  
  if (showMsgFn) showMsgFn(`Nagbayad ng ${actualPayment} 🪙 sa utang. Natitira: ${VS.debt.principal} 🪙`, 'success');
  return true;
}

// Take new loan
export function takeLoan(amount, VS, showMsgFn) {
  if (!VS.debt) initDebt(VS);
  
  // Check if player has defaulted before
  if (VS.debt.defaulted) {
    if (showMsgFn) showMsgFn('Hindi ka na pwedeng umutang dahil sa nakaraang hindi pagbabayad.', 'danger');
    return false;
  }
  
  // Credit score affects maximum loan amount
  var maxLoan = getMaxLoanAmount(VS);
  if (amount > maxLoan) {
    if (showMsgFn) showMsgFn(`Ang maximum na pwedeng utangin ay ${maxLoan} 🪙 batay sa credit score.`, 'warning');
    return false;
  }
  
  // Add to principal
  VS.debt.principal += amount;
  VS.res.gold += amount;
  
  // Update credit score for taking loan (slight decrease)
  updateCreditScore(VS, false, amount);
  
  if (showMsgFn) showMsgFn(`Nakautang ng ${amount} 🪙. Kabuuang utang: ${VS.debt.principal} 🪙`, 'info');
  return true;
}

// Update credit score based on payment behavior
function updateCreditScore(VS, madePayment, amount) {
  if (!VS.debt) return;
  
  var oldScore = VS.debt.creditScore;
  
  if (madePayment) {
    // Payments increase credit score (max +5 per payment)
    var increase = Math.min(5, Math.floor(amount / 100) + 1);
    VS.debt.creditScore = Math.min(MAX_CREDIT_SCORE, VS.debt.creditScore + increase);
  } else {
    // Taking loans slightly decreases credit score
    var decrease = Math.min(3, Math.floor(amount / 200) + 1);
    VS.debt.creditScore = Math.max(MIN_CREDIT_SCORE, VS.debt.creditScore - decrease);
  }
  
  // Apply penalty for missed payments
  if (VS.debt.missedPayments > 0) {
    var penalty = Math.min(10, VS.debt.missedPayments * 2);
    VS.debt.creditScore = Math.max(MIN_CREDIT_SCORE, VS.debt.creditScore - penalty);
  }
  
  if (oldScore !== VS.debt.creditScore && window.showMsg) {
    window.showMsg(`Credit Score: ${oldScore} → ${VS.debt.creditScore}`, 'info');
  }
}

// Get maximum loan amount based on credit score
export function getMaxLoanAmount(VS) {
  if (!VS.debt) initDebt(VS);
  
  var baseMax = 1000;
  // Credit score bonus: up to +2000 at 100 credit score
  var creditBonus = (VS.debt.creditScore / 100) * 2000;
  return Math.floor(baseMax + creditBonus);
}

// Get interest rate based on credit score
export function getInterestRate(VS) {
  if (!VS.debt) return DEBT_INTEREST_RATE;
  
  var baseRate = DEBT_INTEREST_RATE;
  // Credit discount: up to 3% discount at 100 credit score
  var creditDiscount = (VS.debt.creditScore / 100) * 0.03;
  return Math.max(0.01, baseRate - creditDiscount);
}

// Process missed payments and default
export function processMissedPayments(VS, dayCount) {
  if (!VS.debt) return;
  
  // Check if payment was missed this day
  if (VS.debt.principal > 0 && VS.debt.lastPaymentDay !== dayCount) {
    VS.debt.missedPayments++;
    
    // Update interest rate based on missed payments
    if (VS.debt.missedPayments >= 10 && !VS.debt.defaulted) {
      VS.debt.defaulted = true;
      if (window.showMsg) window.showMsg('⚠️ DEFAULTED! Hindi ka nakapagbayad ng utang ng 10 araw! Mataas na ang interes!', 'danger');
    }
  }
}

// Get debt summary for UI
export function getDebtSummary(VS) {
  if (!VS.debt) initDebt(VS);
  
  return {
    principal: VS.debt.principal,
    interestRate: getInterestRate(VS),
    creditScore: VS.debt.creditScore,
    defaulted: VS.debt.defaulted,
    missedPayments: VS.debt.missedPayments,
    maxLoan: getMaxLoanAmount(VS),
    lastPaymentDay: VS.debt.lastPaymentDay,
    paymentHistory: VS.debt.paymentHistory.slice(0, 5)
  };
}

/* ══════════════════════════════════════════════════════════════
   TAX SYSTEM FUNCTIONS
══════════════════════════════════════════════════════════════ */

// Set tax rate (0-100%)
export function setTaxRate(rate, VS, showMsgFn) {
  var newRate = clamp(rate, MIN_TAX_RATE, MAX_TAX_RATE);
  var oldRate = _taxRate;
  _taxRate = newRate;
  
  // Apply happiness/anger effects based on tax change
  var taxDiff = newRate - oldRate;
  if (Math.abs(taxDiff) > 0.01 && VS && VS.villagers) {
    var angerChange = taxDiff * 100 * 0.2;  // 20% of tax increase as anger
    var trustChange = -taxDiff * 100 * 0.15; // 15% of tax increase as trust loss
    
    VS.villagers.forEach(function(v) {
      if (angerChange > 0 && v.anger !== undefined) {
        v.anger = clamp(v.anger + angerChange, 0, 100);
      }
      if (trustChange < 0 && v.govTrust !== undefined) {
        v.govTrust = clamp(v.govTrust + trustChange, 0, 100);
      }
    });
    
    if (showMsgFn) {
      var msg = taxDiff > 0 
        ? `Buwis itinaas sa ${Math.round(newRate * 100)}%. Galit ang mamamayan!`
        : `Binuwisan sa ${Math.round(newRate * 100)}%.`;
      showMsgFn(msg, taxDiff > 0 ? 'warning' : 'info');
    }
  }
  
  return newRate;
}

// Get current tax rate
export function getTaxRate(VS) {
  return _taxRate;
}

// Calculate daily tax revenue
export function calculateTaxRevenue(VS, dayCount) {
  var pop = VS.villagers.length;
  var baseRevenue = pop * TAX_REVENUE_PER_POP;
  var taxRevenue = Math.floor(baseRevenue * _taxRate);
  
  // Policy: Manggagawa (worker policy) increases tax revenue
  if (isPolicyActive('manggagawa', VS)) {
    taxRevenue = Math.floor(taxRevenue * 1.2);
  }
  
  return taxRevenue;
}

/* ══════════════════════════════════════════════════════════════
   WASTE SYSTEM FUNCTIONS
══════════════════════════════════════════════════════════════ */

// Generate waste from resource consumption
export function generateWaste(resource, amount, VS) {
  if (!VS.waste) VS.waste = { gold: 0, rice: 0, langis: 0, total: 0 };
  
  var wasteGenerated = Math.floor(amount * WASTE_GENERATION_RATE);
  if (wasteGenerated <= 0) return;
  
  if (resource === 'gold') VS.waste.gold += wasteGenerated;
  else if (resource === 'rice') VS.waste.rice += wasteGenerated;
  else if (resource === 'langis') VS.waste.langis += wasteGenerated;
  
  VS.waste.total = VS.waste.gold + VS.waste.rice + VS.waste.langis;
}

// Get waste stats
export function getWasteStats(VS) {
  if (!VS.waste) return { gold: 0, rice: 0, langis: 0, total: 0 };
  return {
    gold: Math.floor(VS.waste.gold),
    rice: Math.floor(VS.waste.rice),
    langis: Math.floor(VS.waste.langis),
    total: Math.floor(VS.waste.total)
  };
}

// Clean waste (costs gold)
export function cleanWaste(amount, VS, showMsgFn) {
  if (!VS.waste) VS.waste = { gold: 0, rice: 0, langis: 0, total: 0 };
  
  var cleanAmount = Math.min(amount, VS.waste.total);
  var cost = cleanAmount * WASTE_CLEANUP_COST;
  
  if (VS.res.gold < cost) {
    if (showMsgFn) showMsgFn(`Kulang ang ginto! Kailangan ng ${cost} 🪙 para linisin ang basura.`, 'warning');
    return false;
  }
  
  VS.res.gold -= cost;
  VS.waste.gold = 0;
  VS.waste.rice = 0;
  VS.waste.langis = 0;
  VS.waste.total = 0;
  
  // Small happiness boost from cleaning
  VS.villagers.forEach(function(v) {
    if (v.happiness !== undefined) {
      v.happiness = clamp(v.happiness + 2, 0, 100);
    }
  });
  
  if (showMsgFn) showMsgFn(`Nalinis ang ${cleanAmount} basura. Gastos: ${cost} 🪙`, 'success');
  return true;
}

/* ══════════════════════════════════════════════════════════════
   INCOME SYSTEM
══════════════════════════════════════════════════════════════ */

// Calculate citizen income based on work and economy
export function calculateCitizenIncome(villager, VS) {
  var baseIncome = 5;
  
  // Work bonus
  if (villager.workBuilding) {
    var workType = villager.workBuilding.type;
    if (workType === 'mine' || workType === 'minalangis') baseIncome += 3;
    else if (workType === 'palengke' || workType === 'daungan') baseIncome += 2;
    else if (workType === 'farm') baseIncome += 1;
  }
  
  // Policy bonus
  if (isPolicyActive('manggagawa', VS)) baseIncome = Math.floor(baseIncome * 1.2);
  
  // Tax deduction
  var taxDeduction = Math.floor(baseIncome * _taxRate);
  var netIncome = baseIncome - taxDeduction;
  
  return {
    gross: baseIncome,
    tax: taxDeduction,
    net: Math.max(0, netIncome)
  };
}

/* ══════════════════════════════════════════════════════════════
   TICK ECONOMY - Main update function
   Call this from main.js every tick
══════════════════════════════════════════════════════════════ */

export function tickEconomy(dt, VS) {
  // Initialize debt if needed
  if (!VS.debt) initDebt(VS);
  
  var currentDay = window.dayCount || 1;
  
  // Apply interest only once per day (when day changes)
  if (VS.debt.lastInterestDay !== currentDay && VS.debt.principal > 0) {
    VS.debt.lastInterestDay = currentDay;
    var interest = calculateDebtInterest(VS);
    if (interest > 0 && window.showMsg && Math.random() < 0.1) {
      window.showMsg(`➕ Dagdag interes sa utang: +${interest} 🪙`, 'warning');
    }
  }
  
  // Process missed payments
  processMissedPayments(VS, currentDay);
  
  // Collect taxes once per day
  if (_lastTaxDay !== currentDay) {
    _lastTaxDay = currentDay;
    var taxRevenue = calculateTaxRevenue(VS, currentDay);
    
    if (taxRevenue > 0) {
      VS.res.gold += taxRevenue;
      
      // Show tax collection message occasionally
      if (Math.random() < 0.2 && window.showMsg) {
        window.showMsg(`💰 Nakolekta: ${taxRevenue} 🪙 na buwis`, 'info');
      }
    }
  }
  
  // Update citizen incomes (for display purposes)
  VS.villagers.forEach(function(v) {
    var income = calculateCitizenIncome(v, VS);
    v.income = income.net;
  });
  
  // Generate waste from economic activity
  if (VS.waste && VS.waste.total > 0 && Math.random() < 0.01) {
    // Waste decays very slowly over time
    VS.waste.total = Math.max(0, VS.waste.total - 1);
  }
}

/* ══════════════════════════════════════════════════════════════
   ON NEW DAY - Called from main.js when day advances
══════════════════════════════════════════════════════════════ */

export function onNewDay(VS, showMsgFn) {
  var currentDay = window.dayCount || 1;
  
  // Reset any daily counters
  // (Add any daily economy resets here)
  
  // Check if any debts are due
  if (VS.debt && VS.debt.principal > 0) {
    var minPayment = Math.floor(VS.debt.principal * 0.05); // 5% minimum payment
    if (VS.debt.lastPaymentDay !== currentDay && showMsgFn) {
      showMsgFn(`💸 May utang na ${VS.debt.principal} 🪙. Inirerekomendang bayad: ${minPayment} 🪙`, 'warning');
    }
  }
  
  // Update credit score based on economic health
  if (VS.debt) {
    var economicHealth = (VS.res.gold / VS.resCap.gold) * 0.5 + (VS.pop.cur / VS.pop.max) * 0.5;
    if (economicHealth > 0.7 && VS.debt.creditScore < MAX_CREDIT_SCORE) {
      VS.debt.creditScore = Math.min(MAX_CREDIT_SCORE, VS.debt.creditScore + 1);
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
══════════════════════════════════════════════════════════════ */

// Get economic summary for dashboard
export function getEconomicSummary(VS) {
  var taxRate = getTaxRate(VS);
  var waste = getWasteStats(VS);
  var debt = getDebtSummary(VS);
  
  return {
    taxRate: taxRate,
    taxRatePercent: Math.round(taxRate * 100),
    waste: waste,
    debt: debt,
    treasury: VS.res.gold,
    rice: VS.res.rice,
    langis: VS.res.langis
  };
}