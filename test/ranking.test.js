import './domShim.js';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { RANKS, getRankFromScore, getNextRank, calculateDailyScore } from '../ranking/rankingSystem.js';

function baseVS(villagers) {
  return {
    villagers: villagers || [],
    buildings: [],
    res: { gold: 0, rice: 0, langis: 0 },
    resCap: { gold: 2000, rice: 1500, langis: 800 },
  };
}

function basePrevStats(overrides) {
  return Object.assign({
    avgApproval: 50,
    population: 10,
    employed: 5,
    buildings: 3,
    totalLevels: 3,
    tradeProfit: 0,
    corruption: 0,
    waste: 0,
    resolvedEvents: 0,
    damagedBuildings: 0,
  }, overrides);
}

describe('rank lookup', () => {
  test('getRankFromScore picks the highest rank the score qualifies for', () => {
    assert.equal(getRankFromScore(0).id, 1);
    assert.equal(getRankFromScore(49).id, 1);
    assert.equal(getRankFromScore(50).id, 2);
    assert.equal(getRankFromScore(3200).id, 10);
    assert.equal(getRankFromScore(999999).id, 10); // caps at the top rank
  });

  test('getNextRank returns the next threshold, or null at max rank', () => {
    assert.equal(getNextRank(0).id, 2);
    assert.equal(getNextRank(49).id, 2);
    assert.equal(getNextRank(3199).id, 10);
    assert.equal(getNextRank(3200), null);
  });

  test('RANKS thresholds are strictly increasing', () => {
    for (let i = 1; i < RANKS.length; i++) {
      assert.ok(RANKS[i].scoreRequired > RANKS[i - 1].scoreRequired);
    }
  });
});

describe('calculateDailyScore', () => {
  test('rising happiness contributes a positive score', () => {
    const VS = baseVS([{ happiness: 70 }, { happiness: 74 }]); // avg 72
    const result = calculateDailyScore(VS, basePrevStats({ avgApproval: 50, population: 2, employed: 0, buildings: 0, totalLevels: 0 }));
    assert.ok(result.dailyScore > 0);
    assert.ok(result.breakdown.positive.some(b => b.label === 'Kasiyahan'));
  });

  test('falling happiness contributes a negative score', () => {
    const VS = baseVS([{ happiness: 20 }]);
    const result = calculateDailyScore(VS, basePrevStats({ avgApproval: 50 }));
    assert.ok(result.dailyScore < 0);
    assert.ok(result.breakdown.negative.some(b => b.label === 'Kasiyahan'));
  });

  test('population growth adds +2 per new villager', () => {
    const VS = baseVS(new Array(13).fill({ happiness: 50 })); // 13 vs prev 10 => +3
    const result = calculateDailyScore(VS, basePrevStats({ avgApproval: 50, population: 10 }));
    const pop = result.breakdown.positive.find(b => b.label === 'Populasyon');
    assert.ok(pop);
    assert.equal(pop.change, 6); // 3 new villagers * 2
  });

  test('villager deaths are penalized at -10 each', () => {
    const VS = baseVS(new Array(7).fill({ happiness: 50 })); // 7 vs prev 10 => -3 deaths
    const result = calculateDailyScore(VS, basePrevStats({ avgApproval: 50, population: 10 }));
    const deaths = result.breakdown.negative.find(b => b.label === 'Pagkamatay');
    assert.ok(deaths);
    assert.equal(deaths.change, -30); // 3 deaths * -10
  });

  test('corruption exposure growth is penalized', () => {
    const VS = baseVS([{ happiness: 50 }]);
    VS.corruption = { exposureLevel: 40 };
    const result = calculateDailyScore(VS, basePrevStats({ avgApproval: 50, population: 1, corruption: 10 }));
    const corrupt = result.breakdown.negative.find(b => b.label === 'Korapsyon');
    assert.ok(corrupt);
    assert.equal(corrupt.change, -15); // (40-10) * 0.5 = 15
  });

  test('newStats snapshot matches the current VS state for the next day comparison', () => {
    const VS = baseVS([{ happiness: 60 }, { happiness: 80 }]);
    const result = calculateDailyScore(VS, basePrevStats());
    assert.equal(result.newStats.population, 2);
    assert.equal(result.newStats.avgApproval, 70);
  });
});
