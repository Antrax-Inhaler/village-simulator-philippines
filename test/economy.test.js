import './domShim.js';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  initDebt, calculateDebtInterest, makeDebtPayment, takeLoan,
  getMaxLoanAmount, getInterestRate, getDebtSummary,
  setTaxRate, getTaxRate, calculateTaxRevenue,
  calculateWarLoot, applyWarLoot, canAffordMissileLaunch,
  deductMissileCost, MISSILE_COSTS, tickEconomy,
} from '../resources/economy.js';

function makeVS(overrides) {
  return Object.assign({
    res: { gold: 1000, rice: 500, langis: 500 },
    resCap: { gold: 2000, rice: 1500, langis: 800 },
    villagers: [],
    pop: { cur: 0, max: 30 },
  }, overrides);
}

describe('debt system', () => {
  test('initDebt sets sane defaults', () => {
    const VS = makeVS();
    const debt = initDebt(VS);
    assert.equal(debt.principal, 0);
    assert.equal(debt.creditScore, 60);
    assert.equal(debt.defaulted, false);
  });

  test('getMaxLoanAmount scales up with credit score', () => {
    const low = makeVS({ debt: { creditScore: 0 } });
    const high = makeVS({ debt: { creditScore: 100 } });
    assert.equal(getMaxLoanAmount(low), 1000);
    assert.equal(getMaxLoanAmount(high), 3000);
  });

  test('getInterestRate decreases as credit score rises', () => {
    const low = makeVS({ debt: { creditScore: 0 } });
    const high = makeVS({ debt: { creditScore: 100 } });
    assert.ok(getInterestRate(high) < getInterestRate(low));
    assert.equal(getInterestRate(low), 0.05);
    assert.ok(Math.abs(getInterestRate(high) - 0.02) < 1e-9);
  });

  test('takeLoan adds to principal and gold, refuses over the max', () => {
    const VS = makeVS();
    initDebt(VS);
    VS.debt.creditScore = 60; // maxLoan = 1000 + 0.6*2000 = 2200
    assert.equal(takeLoan(2200, VS, null), true);
    assert.equal(VS.debt.principal, 2200);
    assert.equal(VS.res.gold, 1000 + 2200);

    assert.equal(takeLoan(999999, VS, null), false); // exceeds max loan, rejected
    assert.equal(VS.debt.principal, 2200); // unchanged
  });

  test('takeLoan is refused once defaulted', () => {
    const VS = makeVS();
    initDebt(VS);
    VS.debt.defaulted = true;
    assert.equal(takeLoan(100, VS, null), false);
    assert.equal(VS.debt.principal, 0);
  });

  test('makeDebtPayment reduces principal and refuses insufficient gold', () => {
    const VS = makeVS();
    initDebt(VS);
    VS.debt.principal = 500;
    VS.res.gold = 100;
    assert.equal(makeDebtPayment(200, VS, null), false); // can't afford
    assert.equal(VS.debt.principal, 500);

    VS.res.gold = 1000;
    assert.equal(makeDebtPayment(200, VS, null), true);
    assert.equal(VS.debt.principal, 300);
    assert.equal(VS.res.gold, 800);
  });

  test('makeDebtPayment never pays more than the outstanding principal', () => {
    const VS = makeVS();
    initDebt(VS);
    VS.debt.principal = 50;
    VS.res.gold = 1000;
    makeDebtPayment(500, VS, null);
    assert.equal(VS.debt.principal, 0);
    assert.equal(VS.res.gold, 950); // only 50 actually deducted, not 500
  });

  test('calculateDebtInterest applies a credit-score discount', () => {
    const VS = makeVS();
    initDebt(VS);
    VS.debt.principal = 1000;
    VS.debt.creditScore = 100; // 50% discount => 5% * 0.5 = 2.5% => 25
    const interest = calculateDebtInterest(VS);
    assert.equal(interest, 25);
    assert.equal(VS.debt.principal, 1025);
  });

  test('getDebtSummary reflects current state', () => {
    const VS = makeVS();
    initDebt(VS);
    VS.debt.principal = 42;
    const summary = getDebtSummary(VS);
    assert.equal(summary.principal, 42);
    assert.equal(summary.defaulted, false);
  });

  test('tickEconomy does not default a fresh loan within the same day, no matter how many ticks run', () => {
    // Regression test: tickEconomy used to be called every simulation frame
    // (~30x/sec) with no per-day gate on the missed-payment check, so any
    // debt at all raced past the 10-missed-payments default threshold in a
    // fraction of a second of real time. A whole in-game day is many ticks;
    // simulate that by calling tickEconomy 500 times for day 1 alone.
    const VS = makeVS();
    initDebt(VS);
    takeLoan(500, VS, null);
    assert.equal(VS.debt.defaulted, false);

    for (let i = 0; i < 500; i++) {
      tickEconomy(1 / 30, VS, 1); // still day 1 for all 500 calls
    }

    assert.equal(VS.debt.missedPayments, 1); // evaluated once for day 1, not 500 times
    assert.equal(VS.debt.defaulted, false);
  });

  test('tickEconomy counts one missed payment per distinct day the debt goes unpaid', () => {
    const VS = makeVS();
    initDebt(VS);
    takeLoan(100, VS, null);

    for (let day = 1; day <= 9; day++) {
      tickEconomy(1 / 30, VS, day);
    }
    assert.equal(VS.debt.missedPayments, 9);
    assert.equal(VS.debt.defaulted, false);

    tickEconomy(1 / 30, VS, 10); // 10th unpaid day crosses the default threshold
    assert.equal(VS.debt.missedPayments, 10);
    assert.equal(VS.debt.defaulted, true);
  });

  test('a same-day payment resets the missed-payment counter for that day', () => {
    const VS = makeVS();
    initDebt(VS);
    takeLoan(100, VS, null);
    tickEconomy(1 / 30, VS, 1);
    assert.equal(VS.debt.missedPayments, 1);

    makeDebtPayment(50, VS, null, 1);
    tickEconomy(1 / 30, VS, 1); // still day 1, but paid today — should not re-count as missed
    assert.equal(VS.debt.missedPayments, 0);
  });

  test('makeDebtPayment records the real day passed in, not a hardcoded day', () => {
    const VS = makeVS();
    initDebt(VS);
    VS.debt.principal = 100;
    makeDebtPayment(50, VS, null, 7);
    assert.equal(VS.debt.paymentHistory[0].day, 7);
  });
});

describe('tax system', () => {
  test('setTaxRate clamps to [5%, 80%]', () => {
    assert.equal(setTaxRate(2.0, null, null), 0.80);
    assert.equal(setTaxRate(-1, null, null), 0.05);
    assert.equal(setTaxRate(0.25, null, null), 0.25);
    assert.equal(getTaxRate(), 0.25);
  });

  test('calculateTaxRevenue is population * per-capita rate * tax rate', () => {
    setTaxRate(0.25, null, null);
    const VS = makeVS({ villagers: new Array(10).fill({}) });
    // 10 pop * 5 gold/pop = 50 base revenue; 25% tax => floor(12.5) = 12
    assert.equal(calculateTaxRevenue(VS), 12);
  });

  test('raising tax increases anger and lowers trust', () => {
    const VS = makeVS({
      villagers: [{ anger: 10, govTrust: 50 }],
    });
    setTaxRate(0.05, VS, null);
    setTaxRate(0.55, VS, null); // +50 percentage points
    assert.ok(VS.villagers[0].anger > 10);
    assert.ok(VS.villagers[0].govTrust < 50);
  });
});

describe('war loot', () => {
  test('calculateWarLoot scales with missile strength and buildings hit', () => {
    const defender = makeVS({ res: { gold: 1000, rice: 1000, langis: 1000 } });
    const basicLoot = calculateWarLoot(null, defender, 'basic', 1);
    const mirvLoot = calculateWarLoot(null, defender, 'mirv', 1);
    assert.ok(mirvLoot.gold > basicLoot.gold);

    const oneBuilding = calculateWarLoot(null, defender, 'basic', 1);
    const threeBuildings = calculateWarLoot(null, defender, 'basic', 3);
    assert.ok(threeBuildings.gold >= oneBuilding.gold);
  });

  test('calculateWarLoot never exceeds 30% of the defender stash before multiplier', () => {
    const defender = makeVS({ res: { gold: 1000, rice: 0, langis: 0 } });
    // mirv multiplier is 0.60 + up to 0.3 bonus = max 0.90 of the 30% pool
    const loot = calculateWarLoot(null, defender, 'mirv', 10);
    assert.ok(loot.gold <= Math.floor(1000 * 0.30));
  });

  test('applyWarLoot moves resources from defender to attacker, capped by resCap', () => {
    const attacker = makeVS({ res: { gold: 1900, rice: 0, langis: 0 }, resCap: { gold: 2000, rice: 1500, langis: 800 } });
    const defender = makeVS({ res: { gold: 500, rice: 0, langis: 0 } });
    const loot = { gold: 200, rice: 0, langis: 0 };
    applyWarLoot(attacker, defender, loot, null);
    assert.equal(attacker.res.gold, 2000); // capped at resCap, not 2100
    assert.equal(defender.res.gold, 300);
  });
});

describe('missile affordability', () => {
  test('canAffordMissileLaunch checks both gold and langis', () => {
    const rich = makeVS({ res: { gold: 10000, rice: 0, langis: 10000 } });
    const poor = makeVS({ res: { gold: 10, rice: 0, langis: 10 } });
    assert.equal(canAffordMissileLaunch('basic', 1, rich), true);
    assert.equal(canAffordMissileLaunch('basic', 1, poor), false);
  });

  test('deductMissileCost deducts exactly cost * count and refuses if short', () => {
    const cost = MISSILE_COSTS.basic;
    const VS = makeVS({ res: { gold: cost.gold * 2, rice: 0, langis: cost.langis * 2 } });
    assert.equal(deductMissileCost('basic', 2, VS, null), true);
    assert.equal(VS.res.gold, 0);
    assert.equal(VS.res.langis, 0);

    assert.equal(deductMissileCost('basic', 1, VS, null), false); // nothing left
  });
});
