/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — utils/economyHelpers.js
   Economic helper functions for resource management
═══════════════════════════════════════════════════════════════ */

export function getAverageHappiness(villagers) {
  if (!villagers || !villagers.length) return 50;
  var sum = 0;
  villagers.forEach(function(v) { sum += v.happiness || 50; });
  return sum / villagers.length;
}

export function getWasteTotal(res, resCap) {
  var waste = 0;
  if (res.gold > resCap.gold) waste += res.gold - resCap.gold;
  if (res.rice > resCap.rice) waste += res.rice - resCap.rice;
  if (res.langis > resCap.langis) waste += res.langis - resCap.langis;
  return waste;
}

export function getResourcePercent(res, resCap, type) {
  if (!resCap[type] || resCap[type] === 0) return 0;
  return Math.min(100, Math.max(0, (res[type] / resCap[type]) * 100));
}

export function canAfford(res, cost) {
  if (!cost) return true;
  if (cost.gold && res.gold < cost.gold) return false;
  if (cost.rice && res.rice < cost.rice) return false;
  if (cost.langis && res.langis < cost.langis) return false;
  return true;
}

export function deductCost(res, cost) {
  if (!canAfford(res, cost)) return false;
  if (cost.gold) res.gold -= cost.gold;
  if (cost.rice) res.rice -= cost.rice;
  if (cost.langis) res.langis -= cost.langis;
  return true;
}

export function formatResourceNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return Math.floor(num).toString();
}