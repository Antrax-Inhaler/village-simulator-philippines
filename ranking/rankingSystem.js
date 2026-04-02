/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — Ranking System

   Daily score calculation and rank progression.
   Shows detailed daily report banners and rank-up celebrations.
═══════════════════════════════════════════════════════════════ */

// Rank definitions
export const RANKS = [
  { id: 1, title: "Humble Start", scoreRequired: 0, bonus: 0, badge: "🌱", color: "#6c757d", darkColor: "#495057" },
  { id: 2, title: "Rising Leader", scoreRequired: 50, bonus: 5, badge: "📈", color: "#e67e22", darkColor: "#b85e0a" },
  { id: 3, title: "Respected Noble", scoreRequired: 150, bonus: 8, badge: "👑", color: "#3498db", darkColor: "#1f618d" },
  { id: 4, title: "Town Leader", scoreRequired: 250, bonus: 10, badge: "🏛️", color: "#f1c40f", darkColor: "#b8860b" },
  { id: 5, title: "Provincial Leader", scoreRequired: 500, bonus: 12, badge: "🌾", color: "#2ecc71", darkColor: "#1f8a4c" },
  { id: 6, title: "National Figure", scoreRequired: 850, bonus: 15, badge: "🇵🇭", color: "#1abc9c", darkColor: "#117a65" },
  { id: 7, title: "Monument to the People", scoreRequired: 1200, bonus: 18, badge: "🏆", color: "#9b59b6", darkColor: "#6c3483" },
  { id: 8, title: "Living Hero", scoreRequired: 1900, bonus: 20, badge: "⭐", color: "#e74c3c", darkColor: "#c0392b" },
  { id: 9, title: "People's Chosen", scoreRequired: 2500, bonus: 25, badge: "👑✨", color: "#3498db", darkColor: "#1f618d" },
  { id: 10, title: "Legend", scoreRequired: 3200, bonus: 30, badge: "🏆🌟", color: "#f39c12", darkColor: "#d35400" }
];

// Get current rank from score
export function getRankFromScore(score) {
  let currentRank = RANKS[0];
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].scoreRequired) {
      currentRank = RANKS[i];
      break;
    }
  }
  return currentRank;
}

// Get next rank (if any)
export function getNextRank(currentScore) {
  for (let i = 0; i < RANKS.length; i++) {
    if (currentScore < RANKS[i].scoreRequired) {
      return RANKS[i];
    }
  }
  return null;
}

// Calculate daily score and breakdown
export function calculateDailyScore(VS, previousDayStats) {
  let dailyScore = 0;
  let breakdown = { positive: [], negative: [], neutral: [] };
  let details = {};

  // 1. Approval change (avg happiness)
  let currentApproval = _avg(VS.villagers, 'happiness', 50);
  let approvalChange = currentApproval - previousDayStats.avgApproval;
  let approvalScore = approvalChange / 10;
  if (Math.abs(approvalScore) >= 0.1) {
    dailyScore += approvalScore;
    let type = approvalScore > 0 ? 'positive' : 'negative';
    breakdown[type].push({
      label: "Kasiyahan",
      change: approvalScore,
      detail: `${Math.round(previousDayStats.avgApproval)}% → ${Math.round(currentApproval)}%`,
      icon: approvalScore > 0 ? "😊" : "😞"
    });
    details.approval = approvalScore;
  }

  // 2. Population growth
  let newVillagers = VS.villagers.length - previousDayStats.population;
  if (newVillagers !== 0) {
    let gain = newVillagers * 2;
    dailyScore += gain;
    let type = gain > 0 ? 'positive' : 'negative';
    breakdown[type].push({
      label: "Populasyon",
      change: gain,
      detail: `${previousDayStats.population} → ${VS.villagers.length} (${newVillagers > 0 ? '+' : ''}${newVillagers})`,
      icon: gain > 0 ? "👥" : "💀"
    });
    details.population = gain;
  }

  // 3. Employment change
  let currentEmployed = VS.villagers.filter(v => v.workBuilding).length;
  let newJobs = currentEmployed - previousDayStats.employed;
  if (newJobs !== 0) {
    let gain = newJobs * 1.5;
    dailyScore += gain;
    let type = gain > 0 ? 'positive' : 'negative';
    breakdown[type].push({
      label: "Trabaho",
      change: gain,
      detail: `${previousDayStats.employed} → ${currentEmployed} (${newJobs > 0 ? '+' : ''}${newJobs})`,
      icon: gain > 0 ? "⚙️" : "📉"
    });
    details.employment = gain;
  }

  // 4. New buildings built (excluding construction)
  let currentBuildings = VS.buildings.filter(b => !b.underConstruction).length;
  let newBuildings = currentBuildings - previousDayStats.buildings;
  if (newBuildings > 0) {
    let gain = newBuildings * 2;
    dailyScore += gain;
    breakdown.positive.push({
      label: "Bagong Gusali",
      change: gain,
      detail: `${newBuildings} bagong gusali`,
      icon: "🏗️"
    });
    details.buildings = gain;
  }

  // 5. Building upgrades (level ups)
  let currentTotalLevels = VS.buildings.reduce((sum, b) => sum + (b.level || 1), 0);
  let newUpgrades = currentTotalLevels - (previousDayStats.totalLevels || 0);
  if (newUpgrades > 0) {
    let gain = newUpgrades * 1;
    dailyScore += gain;
    breakdown.positive.push({
      label: "Pag-upgrade",
      change: gain,
      detail: `${newUpgrades} upgrade(s)`,
      icon: "⬆️"
    });
    details.upgrades = gain;
  }

  // 6. Trade profit
  let currentTradeProfit = VS.trade?.todayProfit || 0;
  let tradeProfitChange = currentTradeProfit - (previousDayStats.tradeProfit || 0);
  if (Math.abs(tradeProfitChange) > 50) {
    let gain = Math.floor(tradeProfitChange / 100);
    dailyScore += gain;
    let type = gain > 0 ? 'positive' : 'negative';
    breakdown[type].push({
      label: "Kalakalan",
      change: gain,
      detail: `${tradeProfitChange > 0 ? '+' : ''}${Math.floor(tradeProfitChange)}🪙 tubo`,
      icon: gain > 0 ? "⚓" : "📉"
    });
    details.trade = gain;
  }

  // 7. Corruption penalty
  let currentCorruption = VS.corruption?.exposureLevel || 0;
  let corruptionGain = currentCorruption - (previousDayStats.corruption || 0);
  if (corruptionGain > 0) {
    let penalty = Math.floor(corruptionGain * 0.5);
    dailyScore -= penalty;
    breakdown.negative.push({
      label: "Korapsyon",
      change: -penalty,
      detail: `exposure +${Math.floor(corruptionGain)}%`,
      icon: "💰"
    });
    details.corruption = -penalty;
  }

  // 8. Waste penalty
  let currentWaste = _getWasteTotal(VS);
  let wasteGenerated = currentWaste - (previousDayStats.waste || 0);
  if (wasteGenerated > 0) {
    let penalty = Math.floor(wasteGenerated / 500);
    if (penalty > 0) {
      dailyScore -= penalty;
      breakdown.negative.push({
        label: "Nasayang",
        change: -penalty,
        detail: `${wasteGenerated} resources`,
        icon: "🗑️"
      });
      details.waste = -penalty;
    }
  }

  // 9. Ignored requests
  let ignoredCount = (VS.needs?.requests || []).filter(r => r.resolved === false && r.ignored).length;
  if (ignoredCount > 0) {
    let penalty = ignoredCount * 3;
    dailyScore -= penalty;
    breakdown.negative.push({
      label: "Di-pinansyang Kahilingan",
      change: -penalty,
      detail: `${ignoredCount} hindi pinansin`,
      icon: "🙅"
    });
    details.ignored = -penalty;
  }

  // 10. Resolved events
  let currentResolvedEvents = VS.events?.resolvedToday || 0;
  let resolvedEvents = currentResolvedEvents - (previousDayStats.resolvedEvents || 0);
  if (resolvedEvents > 0) {
    let gain = resolvedEvents * 5;
    dailyScore += gain;
    breakdown.positive.push({
      label: "Nalutas na Kaganapan",
      change: gain,
      detail: `${resolvedEvents} pangyayari`,
      icon: "✅"
    });
    details.events = gain;
  }

  // 11. Calamity damage
  let currentDamagedBuildings = VS.events?.damagedBuildingsToday || 0;
  let damagedBuildings = currentDamagedBuildings - (previousDayStats.damagedBuildings || 0);
  if (damagedBuildings > 0) {
    let penalty = damagedBuildings * 2;
    dailyScore -= penalty;
    breakdown.negative.push({
      label: "Sakuna",
      change: -penalty,
      detail: `${damagedBuildings} gusali nasira`,
      icon: "🌪️"
    });
    details.calamity = -penalty;
  }

  // 12. Villager deaths
  let deaths = (previousDayStats.population - VS.villagers.length);
  if (deaths > 0) {
    let penalty = deaths * 10;
    dailyScore -= penalty;
    breakdown.negative.push({
      label: "Pagkamatay",
      change: -penalty,
      detail: `${deaths} mamamayan`,
      icon: "🕊️"
    });
    details.deaths = -penalty;
  }

  // Round daily score to nearest integer
  dailyScore = Math.round(dailyScore);
  
  return { 
    dailyScore, 
    breakdown, 
    details, 
    newStats: {
      avgApproval: currentApproval,
      population: VS.villagers.length,
      employed: currentEmployed,
      buildings: currentBuildings,
      totalLevels: currentTotalLevels,
      tradeProfit: currentTradeProfit,
      corruption: currentCorruption,
      waste: currentWaste,
      resolvedEvents: currentResolvedEvents,
      damagedBuildings: currentDamagedBuildings
    }
  };
}

function _avg(arr, field, fallback) {
  if (!arr || !arr.length) return fallback;
  let s = 0, c = 0;
  arr.forEach(v => { if (v[field] !== undefined) { s += v[field]; c++; } });
  return c > 0 ? s / c : fallback;
}

function _getWasteTotal(VS) {
  let waste = 0;
  if (VS.res.gold > VS.resCap.gold) waste += VS.res.gold - VS.resCap.gold;
  if (VS.res.rice > VS.resCap.rice) waste += VS.res.rice - VS.resCap.rice;
  if (VS.res.langis > VS.resCap.langis) waste += VS.res.langis - VS.resCap.langis;
  return waste;
}

// Generate daily report HTML (kept for compatibility, but not used by new UI)
export function generateDailyReport(dayCount, dailyScore, breakdown, previousScore, newScore, rank, nextRank) {
  let positiveItems = breakdown.positive || [];
  let negativeItems = breakdown.negative || [];
  
  let positiveHtml = positiveItems.map(item => 
    `<div class="report-positive-item">
       <span class="report-icon">${item.icon || '✅'}</span>
       <span class="report-label">${item.label}:</span>
       <span class="report-change">+${Math.round(item.change)}</span>
       <span class="report-detail">${item.detail}</span>
     </div>`
  ).join('');
  
  let negativeHtml = negativeItems.map(item => 
    `<div class="report-negative-item">
       <span class="report-icon">${item.icon || '❌'}</span>
       <span class="report-label">${item.label}:</span>
       <span class="report-change">${Math.round(item.change)}</span>
       <span class="report-detail">${item.detail}</span>
     </div>`
  ).join('');
  
  let totalColor = dailyScore >= 0 ? '#88dd88' : '#e74c3c';
  let totalSign = dailyScore >= 0 ? '+' : '';
  
  let progressHtml = '';
  let nextRankHtml = '';
  
  if (nextRank) {
    let pointsNeeded = nextRank.scoreRequired - newScore;
    let progressPercent = ((newScore - rank.scoreRequired) / (nextRank.scoreRequired - rank.scoreRequired)) * 100;
    progressHtml = `
      <div class="report-progress">
        <div class="report-progress-bar" style="width: ${Math.min(100, Math.max(0, progressPercent))}%"></div>
        <div class="report-progress-text">
          ${Math.round(progressPercent)}% to ${nextRank.title}
        </div>
      </div>
    `;
    nextRankHtml = `
      <div class="report-next-rank">
        🎯 Next: ${nextRank.title} (${pointsNeeded} points left!)
      </div>
    `;
  } else {
    nextRankHtml = `<div class="report-next-rank">🏆 MAXIMUM RANK REACHED! Legendary Leader!</div>`;
  }
  
  return `
    <div class="daily-report">
      <div class="report-header">
        <span class="report-day">📊 DAY ${dayCount}</span>
        <span class="report-title">LINGKOD NG BAYAN REPORT</span>
      </div>
      <div class="report-divider"></div>
      
      <div class="report-rank-info">
        <span class="rank-badge">${rank.badge}</span>
        <span class="rank-title">${rank.title}</span>
        <span class="rank-score">${Math.floor(newScore)} pts</span>
      </div>
      
      ${positiveHtml ? `
        <div class="report-section positive">
          <div class="report-section-title">📈 POSITIVE CHANGES</div>
          ${positiveHtml}
        </div>
      ` : ''}
      
      ${negativeHtml ? `
        <div class="report-section negative">
          <div class="report-section-title">📉 NEGATIVE CHANGES</div>
          ${negativeHtml}
        </div>
      ` : ''}
      
      ${positiveHtml === '' && negativeHtml === '' ? `
        <div class="report-neutral">
          <span>⚖️ Walang malaking pagbabago ngayong araw.</span>
        </div>
      ` : ''}
      
      <div class="report-divider"></div>
      
      <div class="report-total">
        <span>TODAY'S TOTAL:</span>
        <span style="color: ${totalColor}">${totalSign}${Math.floor(dailyScore)}</span>
      </div>
      
      <div class="report-cumulative">
        <span>CUMULATIVE SCORE:</span>
        <span>${Math.floor(previousScore)} → ${Math.floor(newScore)}</span>
      </div>
      
      ${progressHtml}
      ${nextRankHtml}
      
      <div class="report-footer">
        🎉 Patuloy ang magandang serbisyo!
      </div>
    </div>
  `;
}

// Generate rank up banner
export function generateRankUpBanner(oldRank, newRank, newBonuses) {
  return `
    <div class="rankup-banner">
      <div class="rankup-header">
        <span>🏆 RANK UP! 🏆</span>
      </div>
      <div class="rankup-divider"></div>
      <div class="rankup-change">
        <span class="old-rank">${oldRank.badge} ${oldRank.title}</span>
        <span class="rankup-arrow">→</span>
        <span class="new-rank">${newRank.badge} ${newRank.title}</span>
      </div>
      <div class="rankup-message">
        "You have proven yourself worthy<br>of greater responsibility."
      </div>
      <div class="rankup-bonuses">
        ${newBonuses.map(b => `<div class="rankup-bonus">${b.icon} ${b.text}</div>`).join('')}
      </div>
      <button class="rankup-close-btn" onclick="closeRankUpBanner()">IPAGPATULOY</button>
    </div>
  `;
}

// Show daily report banner (legacy - kept for compatibility)
export function showDailyReport(dayCount, dailyScore, breakdown, previousScore, newScore, rank, nextRank) {
  const html = generateDailyReport(dayCount, dailyScore, breakdown, previousScore, newScore, rank, nextRank);
  _showBanner(html, 'daily-report-banner');
}

// Show rank up banner
export function showRankUpBanner(oldRank, newRank) {
  let newBonuses = [];
  
  if (newRank.bonus > 0) {
    newBonuses.push({ icon: "✨", text: `+${newRank.bonus}% approval bonus unlocked` });
  }
  if (newRank.id >= 3) {
    newBonuses.push({ icon: "🏗️", text: "New building types available" });
  }
  if (newRank.id >= 4) {
    newBonuses.push({ icon: "👥", text: "Villagers greet you with respect" });
  }
  if (newRank.id >= 6) {
    newBonuses.push({ icon: "⚓", text: "New trade routes available" });
  }
  if (newRank.id >= 8) {
    newBonuses.push({ icon: "🏆", text: "Special events unlocked" });
  }
  
  const html = generateRankUpBanner(oldRank, newRank, newBonuses);
  _showBanner(html, 'rankup-banner-container');
}

function _showBanner(html, containerId) {
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.className = 'banner-overlay';
    document.body.appendChild(container);
  }
  
  container.innerHTML = html;
  container.classList.add('visible');
  
  // Auto-close daily report after 8 seconds, but not rank-up banner
  if (containerId === 'daily-report-banner') {
    setTimeout(() => {
      container.classList.remove('visible');
      setTimeout(() => {
        if (container.parentNode) container.parentNode.removeChild(container);
      }, 500);
    }, 8000);
  }
}

// Close rank up banner
window.closeRankUpBanner = function() {
  const container = document.getElementById('rankup-banner-container');
  if (container) {
    container.classList.remove('visible');
    setTimeout(() => {
      if (container.parentNode) container.parentNode.removeChild(container);
    }, 500);
  }
};

// Export rank colors for other modules
export function getRankColor(rankId) {
  const rank = RANKS.find(r => r.id === rankId);
  return rank ? { color: rank.color, darkColor: rank.darkColor } : { color: '#6c757d', darkColor: '#495057' };
}