/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — Daily Report UI
   Minimal design with counting animation and day count overlay
═══════════════════════════════════════════════════════════════ */

import { RANK_DRAWERS, BADGE_SIZE } from '../ranking/rankBadges.js';
import { getRankFromScore, getNextRank } from '../ranking/rankingSystem.js';

let reportContainer = null;
let dayCountContainer = null;
let currentResolve = null;

// Create and inject styles
function injectStyles() {
  if (document.getElementById('daily-report-styles')) return;
  
  const styles = `
    /* Day Count Overlay - Victory Style */
    .day-count-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(20px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeInOverlay 0.3s ease;
    }
    
    @keyframes fadeInOverlay {
      from { opacity: 0; backdrop-filter: blur(0); }
      to { opacity: 1; backdrop-filter: blur(20px); }
    }
    
    .day-count-content {
      text-align: center;
      animation: scaleIn 0.5s cubic-bezier(0.34, 1.2, 0.64, 1);
    }
    
    @keyframes scaleIn {
      from { transform: scale(0.5); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    
    .day-count-text {
      font-family: 'Slackey', sans-serif;
      font-size: clamp(60px, 20vw, 160px);
      color: #f5c842;
      text-shadow: 0 0 30px rgba(245, 200, 66, 0.5), 0 10px 20px rgba(0, 0, 0, 0.3);
      letter-spacing: 4px;
      animation: glowPulse 1s ease-in-out infinite;
    }
    
    @keyframes glowPulse {
      0%, 100% { text-shadow: 0 0 30px rgba(245, 200, 66, 0.5); }
      50% { text-shadow: 0 0 60px rgba(245, 200, 66, 0.8); }
    }
    
    .day-count-sub {
      font-size: clamp(14px, 3.5vw, 20px);
      color: #c49a4e;
      margin-top: 16px;
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    
    /* Daily Report Banner - Transparent Background with Blur */
    .daily-report-banner-minimal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: transparent;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    
    .daily-report-content-minimal {
      width: 90%;
      max-width: 900px;
      max-height: 85vh;
      padding: 30px 24px;
      background: rgba(10, 8, 6, 0.6);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 28px;
      pointer-events: auto;
      animation: slideUpFade 0.5s cubic-bezier(0.2, 0.9, 0.4, 1.1);
      display: flex;
      justify-content: center;
      flex-direction: column;
      align-items: center;
      overflow-y: auto;
      border: 1px solid rgba(245, 200, 66, 0.2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }
    
    @keyframes slideUpFade {
      from {
        opacity: 0;
        transform: translateY(50px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    /* Scrollbar for content */
    .daily-report-content-minimal::-webkit-scrollbar {
      width: 4px;
    }
    
    .daily-report-content-minimal::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 10px;
    }
    
    .daily-report-content-minimal::-webkit-scrollbar-thumb {
      background: #f5c842;
      border-radius: 10px;
    }
    
    /* Big Score Text */
    .score-container-minimal {
      text-align: center;
      margin-bottom: 20px;
    }
    
    .big-score-minimal {
      font-family: 'Slackey', sans-serif;
      font-size: clamp(60px, 18vw, 140px);
      font-weight: bold;
      line-height: 1;
      letter-spacing: 2px;
      background: linear-gradient(135deg, #f5c842, #ffdd88);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      text-shadow: 0 0 40px rgba(245, 200, 66, 0.3);
      animation: scorePulse 0.5s ease-out;
    }
    
    @keyframes scorePulse {
      0% { transform: scale(0.8); opacity: 0; }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); opacity: 1; }
    }
    
    /* Rank and Progress Row - Mobile Responsive */
    .rank-progress-row-minimal {
      display: flex;
      align-items: center;
      gap: 16px;
      backdrop-filter: blur(10px);
      border-radius: 60px;
      width: 100%;
      margin-bottom: 20px;
      flex-wrap: wrap;
      justify-content: center;
    }
    
    .current-rank-badge-minimal {
      flex-shrink: 0;
      width: clamp(50px, 12vw, 70px);
      height: clamp(50px, 12vw, 70px);
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
    }
    
    .rank-badge-canvas-minimal {
      width: 100%;
      height: 100%;
      display: block;
    }
    
    .progress-container-minimal {
      flex: 1;
      min-width: 150px;
    }
    
    .progress-label-minimal {
      display: flex;
      justify-content: space-between;
      font-size: clamp(9px, 2.5vw, 11px);
      color: #b88c54;
      margin-bottom: 6px;
      font-family: monospace;
    }
    
    .progress-bar-bg-minimal {
      background: rgba(0, 0, 0, 0.5);
      border-radius: 20px;
      height: 6px;
      overflow: hidden;
    }
    
    .progress-bar-fill-minimal {
      background: linear-gradient(90deg, #f5c842, #ffdd88);
      height: 100%;
      width: 0%;
      transition: width 1s cubic-bezier(0.2, 0.9, 0.4, 1.1);
      border-radius: 20px;
      position: relative;
      overflow: hidden;
    }
    
    .progress-bar-fill-minimal::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, 
        rgba(255,255,255,0) 0%,
        rgba(255,255,255,0.3) 50%,
        rgba(255,255,255,0) 100%);
      animation: shimmer 1.5s infinite;
    }
    
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    .progress-stats-minimal {
      display: flex;
      justify-content: space-between;
      font-size: clamp(8px, 2vw, 9px);
      color: #8a6a48;
      margin-top: 5px;
      font-family: monospace;
    }
    
    .next-rank-badge-minimal {
      flex-shrink: 0;
      width: clamp(45px, 10vw, 60px);
      height: clamp(45px, 10vw, 60px);
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
      opacity: 0.8;
    }
    
    .next-rank-canvas-minimal {
      width: 100%;
      height: 100%;
      display: block;
    }
    
    /* Items Grid - Horizontal Scroll */
    .items-container-minimal {
      overflow-x: auto;
      overflow-y: visible;
      padding: 8px 4px 16px;
      width: 100%;
      margin: 10px 0;
    }
    
    .items-scroll-minimal {
      display: flex;
      gap: 12px;
      min-width: min-content;
      justify-content: flex-start;
      padding: 4px 2px;
    }
    
    .items-scroll-minimal::-webkit-scrollbar {
      height: 3px;
    }
    
    .items-scroll-minimal::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 10px;
    }
    
    .items-scroll-minimal::-webkit-scrollbar-thumb {
      background: #f5c842;
      border-radius: 10px;
    }
    
    /* Individual Item Card - Responsive */
    .item-card-minimal {
      flex-shrink: 0;
      width: clamp(90px, 25vw, 105px);
      backdrop-filter: blur(8px);
      background: rgba(0, 0, 0, 0.4);
      border-radius: 16px;
      padding: 10px 8px;
      text-align: center;
      transition: all 0.2s ease;
      animation: itemFadeIn 0.4s ease-out forwards;
      opacity: 0;
      transform: translateY(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    @keyframes itemFadeIn {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .item-change-minimal {
      font-family: 'Slackey', sans-serif;
      font-size: clamp(13px, 3.5vw, 15px);
      font-weight: bold;
      line-height: 1;
      margin-bottom: 6px;
    }
    
    .item-card-minimal.positive .item-change-minimal {
      color: #88dd88;
    }
    
    .item-card-minimal.negative .item-change-minimal {
      color: #e74c3c;
    }
    
    .item-label-minimal {
      font-size: clamp(7px, 2vw, 8px);
      color: #c49a4e;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
      text-transform: uppercase;
    }
    
    .item-detail-minimal {
      font-size: clamp(8px, 2.2vw, 9px);
      color: #8a6a48;
      line-height: 1.3;
      word-break: break-word;
    }
    
    /* Continue Button - Responsive */
    .continue-btn-minimal {
      display: flex;
      justify-content: center;
      margin-top: 16px;
      width: 100%;
    }
    
    .continue-btn-minimal button {
      background: linear-gradient(135deg, #f5c842, #c49a4e);
      border: none;
      padding: clamp(8px, 2.5vw, 12px) clamp(20px, 8vw, 32px);
      font-family: 'Slackey', sans-serif;
      font-size: clamp(11px, 3vw, 14px);
      font-weight: bold;
      color: #1a1208;
      border-radius: 60px;
      cursor: pointer;
      transition: all 0.2s ease;
      letter-spacing: 1px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      width: auto;
      min-width: 140px;
    }
    
    .continue-btn-minimal button:hover {
      transform: scale(1.02);
      box-shadow: 0 6px 20px rgba(245, 200, 66, 0.4);
    }
    
    .continue-btn-minimal button:active {
      transform: scale(0.98);
    }
    
    /* Mobile Responsive - Portrait */
    @media (max-width: 768px) {
      .daily-report-content-minimal {
        width: 95%;
        max-height: 90vh;
        padding: 20px 16px;
        border-radius: 20px;
      }
      
      .rank-progress-row-minimal {
        gap: 12px;
        margin-bottom: 16px;
      }
      
      .progress-container-minimal {
        min-width: 120px;
      }
      
      .items-container-minimal {
        padding: 4px 2px 12px;
      }
      
      .items-scroll-minimal {
        gap: 10px;
      }
      
      .score-container-minimal {
        margin-bottom: 12px;
      }
    }
    
    /* Small Mobile Devices */
    @media (max-width: 480px) {
      .daily-report-content-minimal {
        width: 98%;
        padding: 16px 12px;
        border-radius: 16px;
      }
      
      .rank-progress-row-minimal {
        gap: 8px;
      }
      
      .progress-label-minimal {
        font-size: 8px;
      }
      
      .progress-stats-minimal {
        font-size: 7px;
      }
      
      .items-scroll-minimal {
        gap: 8px;
      }
      
      .item-card-minimal {
        padding: 8px 6px;
      }
      
      .item-change-minimal {
        font-size: 12px;
        margin-bottom: 4px;
      }
      
      .item-label-minimal {
        font-size: 6px;
      }
      
      .item-detail-minimal {
        font-size: 7px;
      }
      
      .continue-btn-minimal button {
        padding: 8px 20px;
        font-size: 11px;
        min-width: 120px;
      }
    }
    
    /* Landscape Mobile */
    @media (max-width: 900px) and (orientation: landscape) {
      .daily-report-content-minimal {
        max-height: 95vh;
        padding: 12px 20px;
      }
      
      .rank-progress-row-minimal {
        gap: 12px;
        margin-bottom: 12px;
      }
      
      .current-rank-badge-minimal {
        width: 45px;
        height: 45px;
      }
      
      .next-rank-badge-minimal {
        width: 40px;
        height: 40px;
      }
      
      .score-container-minimal {
        margin-bottom: 8px;
      }
      
      .big-score-minimal {
        font-size: 60px;
      }
      
      .items-container-minimal {
        padding: 4px 2px 8px;
      }
      
      .item-card-minimal {
        width: 85px;
        padding: 6px;
      }
      
      .continue-btn-minimal {
        margin-top: 8px;
      }
      
      .continue-btn-minimal button {
        padding: 6px 16px;
        font-size: 10px;
        min-width: 100px;
      }
    }
    
    /* Tablet */
    @media (min-width: 769px) and (max-width: 1024px) {
      .daily-report-content-minimal {
        max-width: 800px;
        padding: 24px 20px;
      }
      
      .rank-progress-row-minimal {
        gap: 20px;
      }
      
      .current-rank-badge-minimal {
        width: 65px;
        height: 65px;
      }
      
      .next-rank-badge-minimal {
        width: 55px;
        height: 55px;
      }
      
      .item-card-minimal {
        width: 100px;
      }
    }
    
    /* Hide class */
    .hidden-minimal {
      display: none !important;
    }
    
    /* Animation for closing */
    @keyframes slideOutDown {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(50px);
      }
    }
    
    @keyframes fadeOutOverlay {
      from { opacity: 1; backdrop-filter: blur(20px); }
      to { opacity: 0; backdrop-filter: blur(0); }
    }
  `;
  
  const styleEl = document.createElement('style');
  styleEl.id = 'daily-report-styles';
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
}

// Counting animation function
function countAnimation(element, start, end, duration = 1000) {
  return new Promise((resolve) => {
    let startTime = null;
    const isPositive = end >= 0;
    const prefix = isPositive ? '+' : '';
    
    function animate(currentTime) {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const current = Math.floor(start + (end - start) * progress);
      element.textContent = `${prefix}${current}`;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.textContent = `${prefix}${end}`;
        resolve();
      }
    }
    
    requestAnimationFrame(animate);
  });
}

// Draw rank badge on canvas
function drawRankBadge(canvas, rankId) {
  if (!canvas || !rankId) return;
  const ctx = canvas.getContext('2d');
  const drawer = RANK_DRAWERS[rankId];
  if (drawer) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawer(ctx, canvas.width, canvas.height, performance.now());
  }
}

// Show day count overlay
export function showDayCount(dayNumber) {
  return new Promise((resolve) => {
    injectStyles();
    
    const overlay = document.createElement('div');
    overlay.className = 'day-count-overlay';
    overlay.innerHTML = `
      <div class="day-count-content">
        <div class="day-count-text">ARAW ${dayNumber}</div>
        <div class="day-count-sub">COMPLETE</div>
      </div>
    `;
    document.body.appendChild(overlay);
    
    setTimeout(() => {
      overlay.style.animation = 'fadeOutOverlay 0.3s ease forwards';
      setTimeout(() => {
        overlay.remove();
        resolve();
      }, 300);
    }, 2500);
  });
}

// Show daily report
export function showDailyReport(VS, dayCount, result, previousScore, newScore, oldRank, nextRank) {
  return new Promise((resolve) => {
    injectStyles();
    
    currentResolve = resolve;
    
    const reportDiv = document.createElement('div');
    reportDiv.className = 'daily-report-banner-minimal';
    reportDiv.id = 'daily-report-minimal';
    
    // Prepare items HTML
    let itemsHtml = '';
    const allItems = [...(result.breakdown.positive || []), ...(result.breakdown.negative || [])];
    
    allItems.forEach((item, index) => {
      const type = item.change >= 0 ? 'positive' : 'negative';
      const changeValue = item.change >= 0 ? `+${Math.round(item.change)}` : `${Math.round(item.change)}`;
      itemsHtml += `
        <div class="item-card-minimal ${type}" style="animation-delay: ${index * 0.05}s">
          <div class="item-change-minimal">${changeValue}</div>
          <div class="item-label-minimal">${item.label}</div>
          <div class="item-detail-minimal">${item.detail || ''}</div>
        </div>
      `;
    });
    
    // Calculate progress
    const pointsInRank = newScore - (oldRank.scoreRequired || 0);
    const rankRange = nextRank ? (nextRank.scoreRequired - (oldRank.scoreRequired || 0)) : 100;
    const progressPercent = nextRank ? (pointsInRank / rankRange) * 100 : 100;
    
    reportDiv.innerHTML = `
      <div class="daily-report-content-minimal">
        <div class="score-container-minimal">
          <div class="big-score-minimal" id="bigScoreMinimal">+0</div>
        </div>
        
        <div class="rank-progress-row-minimal">
          <div class="current-rank-badge-minimal">
            <canvas id="currentRankCanvasMinimal" width="70" height="70" style="width: 70px; height: 70px;"></canvas>
          </div>
          <div class="progress-container-minimal">
            <div class="progress-label-minimal">
              <span>PROGRESS</span>
              <span id="nextRankNameMinimal">${nextRank ? nextRank.title : 'MAX RANK'}</span>
            </div>
            <div class="progress-bar-bg-minimal">
              <div class="progress-bar-fill-minimal" id="progressFillMinimal" style="width: 0%"></div>
            </div>
            <div class="progress-stats-minimal">
              <span id="currentPointsMinimal">${Math.floor(pointsInRank)}</span>
              <span id="totalPointsMinimal">/ ${rankRange}</span>
            </div>
          </div>
          <div class="next-rank-badge-minimal">
            <canvas id="nextRankCanvasMinimal" width="60" height="60" style="width: 60px; height: 60px;"></canvas>
          </div>
        </div>
        
        <div class="items-container-minimal">
          <div class="items-scroll-minimal" id="itemsScrollMinimal">
            ${itemsHtml || '<div style="color:#8a6a48; text-align:center; width:100%; padding:20px;">Walang malaking pagbabago ngayong araw.</div>'}
          </div>
        </div>
        
        <div class="continue-btn-minimal">
          <button id="continueBtnMinimal">IPAGPATULOY</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(reportDiv);
    
    // Resize canvases based on actual display size
    const currentCanvas = document.getElementById('currentRankCanvasMinimal');
    const nextCanvas = document.getElementById('nextRankCanvasMinimal');
    
    if (currentCanvas) {
      const size = currentCanvas.offsetWidth;
      currentCanvas.width = size;
      currentCanvas.height = size;
      drawRankBadge(currentCanvas, oldRank.id);
    }
    
    if (nextCanvas && nextRank) {
      const size = nextCanvas.offsetWidth;
      nextCanvas.width = size;
      nextCanvas.height = size;
      drawRankBadge(nextCanvas, nextRank.id);
    }
    
    // Animate score
    const scoreEl = document.getElementById('bigScoreMinimal');
    countAnimation(scoreEl, 0, result.dailyScore, 1500);
    
    // Animate progress bar
    setTimeout(() => {
      const fillEl = document.getElementById('progressFillMinimal');
      if (fillEl) fillEl.style.width = `${Math.min(100, Math.max(0, progressPercent))}%`;
    }, 100);
    
    // Continue button handler
    const continueBtn = document.getElementById('continueBtnMinimal');
    if (continueBtn) {
      continueBtn.onclick = () => {
        const reportElement = document.getElementById('daily-report-minimal');
        if (reportElement) {
          reportElement.style.animation = 'slideOutDown 0.3s ease forwards';
          setTimeout(() => {
            reportElement.remove();
            resolve();
          }, 300);
        } else {
          resolve();
        }
      };
    }
  });
}

// Export debug functions for testing
export function debugShowReport(VS, dayCount) {
  const oldRank = getRankFromScore(VS.rank.score);
  const nextRank = getNextRank(VS.rank.score);
  const mockResult = {
    dailyScore: 18,
    breakdown: {
      positive: [
        { label: 'Kasiyahan', change: 3.5, detail: '65% → 72%' },
        { label: 'Populasyon', change: 16, detail: '+8 bagong mamamayan' },
        { label: 'Bagong Gusali', change: 8, detail: '2 farms, 1 palengke' },
        { label: 'Kalakalan', change: 5, detail: '+500🪙 profit' }
      ],
      negative: [
        { label: 'Korapsyon', change: -12, detail: 'exposure +24%' },
        { label: 'Nasayang', change: -3, detail: '1,500 resources' }
      ]
    }
  };
  return showDailyReport(VS, dayCount, mockResult, VS.rank.score, VS.rank.score + 18, oldRank, nextRank);
}

export function debugShowDayCount(dayCount) {
  return showDayCount(dayCount);
}