// FILE: ui/rankModal.js (ENHANCED 3D HOLOGRAPHIC DESIGN)
/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — Rank Modal
   Enhanced 3D holographic card design with hype animations
═══════════════════════════════════════════════════════════════ */

import { getRankFromScore, getNextRank, getRankColor } from '../ranking/rankingSystem.js';
import { RANK_DRAWERS, BADGE_SIZE } from '../ranking/rankBadges.js';

let modalContainer = null;
let animationFrame = null;
let canvasesToDraw = [];
let hoverEffectTimeout = null;

// Rank definitions with enhanced colors and hype elements
export const RANK_LIST = [
  { id: 1, name: 'Humble Start', vibe: 'Baguhan', scoreRequired: 0, accent: '#9aa0b4', badge: '🌱', color: '#4a5568', darkColor: '#2d3748', glow: '#718096', achievement: 'First Step' },
  { id: 2, name: 'Rising Leader', vibe: 'Sumisikat', scoreRequired: 50, accent: '#f39c12', badge: '📈', color: '#e67e22', darkColor: '#b85e0a', glow: '#f39c12', achievement: 'Community Builder' },
  { id: 3, name: 'Respected Noble', vibe: 'Kagalang-galang', scoreRequired: 150, accent: '#3498db', badge: '👑', color: '#2980b9', darkColor: '#1f618d', glow: '#5dade2', achievement: 'Esteemed Leader' },
  { id: 4, name: 'Town Leader', vibe: 'Pinuno ng Bayan', scoreRequired: 250, accent: '#f1c40f', badge: '🏛️', color: '#f39c12', darkColor: '#d35400', glow: '#f5c842', achievement: 'Town Hero' },
  { id: 5, name: 'Provincial Leader', vibe: 'Lalawigan', scoreRequired: 500, accent: '#2ecc71', badge: '🌾', color: '#27ae60', darkColor: '#1f8a4c', glow: '#2ecc71', achievement: 'Regional Icon' },
  { id: 6, name: 'National Figure', vibe: 'Pambansa', scoreRequired: 800, accent: '#1abc9c', badge: '🇵🇭', color: '#16a085', darkColor: '#117a65', glow: '#1abc9c', achievement: 'National Pride' },
  { id: 7, name: 'Monument to the People', vibe: 'Monumento', scoreRequired: 1200, accent: '#9b59b6', badge: '🏆', color: '#8e44ad', darkColor: '#6c3483', glow: '#9b59b6', achievement: 'Living Monument' },
  { id: 8, name: 'Living Hero', vibe: 'Bayani', scoreRequired: 1900, accent: '#e74c3c', badge: '⭐', color: '#c0392b', darkColor: '#a93226', glow: '#e74c3c', achievement: 'True Hero' },
  { id: 9, name: "People's Chosen", vibe: 'Hinirang', scoreRequired: 2500, accent: '#3498db', badge: '👑✨', color: '#2980b9', darkColor: '#1f618d', glow: '#5dade2', achievement: 'Voice of the People' },
  { id: 10, name: 'Legend', vibe: 'Alamat', scoreRequired: 3200, accent: '#f39c12', badge: '🏆🌟', color: '#e67e22', darkColor: '#b85e0a', glow: '#f5c842', achievement: 'Eternal Legend' }
];

// Open rank modal
export function openRankModal(VS) {
  if (modalContainer) {
    closeRankModal();
  }
  
  createModal();
  renderRankModal(VS);
  
  function animate() {
    if (!modalContainer || !modalContainer.classList.contains('visible')) {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      return;
    }
    updateRankBadgeAnimations();
    updateHolographicEffects();
    animationFrame = requestAnimationFrame(animate);
  }
  animate();
}

// Close rank modal
export function closeRankModal() {
  if (modalContainer) {
    modalContainer.classList.remove('visible');
    setTimeout(() => {
      if (modalContainer && modalContainer.parentNode) {
        modalContainer.parentNode.removeChild(modalContainer);
        modalContainer = null;
      }
    }, 300);
  }
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  canvasesToDraw = [];
}

// Create modal DOM structure
function createModal() {
  modalContainer = document.createElement('div');
  modalContainer.className = 'rank-modal-overlay';
  modalContainer.onclick = (e) => {
    if (e.target === modalContainer) closeRankModal();
  };
  
  modalContainer.innerHTML = `
    <div class="rank-modal-seamless">
      <div class="rank-modal-header-seamless">
        <div class="rank-modal-title-seamless">
          <span class="rank-icon-seamless">🏆</span>
          <div>
            <div class="rank-title-main-seamless">RANKING SYSTEM</div>
            <div class="rank-title-sub-seamless">LINGKOD NG BAYAN</div>
          </div>
        </div>
        <button class="rank-modal-close-seamless" onclick="window.closeRankModalInstance && window.closeRankModalInstance()">✕</button>
      </div>
      
      <div class="rank-scroll-seamless">
        <div class="rank-scroll-track-seamless" id="rank-scroll-track-seamless"></div>
      </div>
      
      <div class="rank-modal-footer-seamless">
        <div class="rank-progress-summary" id="rank-progress-summary"></div>
        <button class="rank-modal-close-btn-seamless" onclick="window.closeRankModalInstance && window.closeRankModalInstance()">SARADO</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modalContainer);
  
  window.closeRankModalInstance = closeRankModal;
  
  setTimeout(() => {
    if (modalContainer) modalContainer.classList.add('visible');
  }, 10);
}

// Render all ranks in seamless horizontal scroll
function renderRankModal(VS) {
  const track = document.getElementById('rank-scroll-track-seamless');
  if (!track) return;
  
  const currentRank = getRankFromScore(VS.rank.score);
  const currentScore = VS.rank.score;
  const nextRank = getNextRank(currentScore);
  
  let html = '';
  
  RANK_LIST.forEach((rank, index) => {
    const isUnlocked = currentScore >= rank.scoreRequired;
    const isCurrent = currentRank.id === rank.id;
    const isNext = nextRank?.id === rank.id;
    const isMaxRank = rank.id === RANK_LIST.length;
    const pointsToNext = rank.scoreRequired - currentScore;
    const pointsFromPrev = index > 0 ? currentScore - RANK_LIST[index - 1].scoreRequired : currentScore;
    const rankRange = index > 0 ? rank.scoreRequired - RANK_LIST[index - 1].scoreRequired : rank.scoreRequired;
    const progressPercent = isCurrent && index < RANK_LIST.length - 1 
      ? Math.min(100, Math.max(0, (pointsFromPrev / rankRange) * 100))
      : (isNext ? Math.min(100, Math.max(0, ((currentScore - RANK_LIST[index - 1]?.scoreRequired || 0) / rankRange) * 100)) : 0);
    
    let statusClass = '';
    let statusText = '';
    let statusIcon = '';
    if (isCurrent) {
      statusClass = 'current-seamless';
      statusText = 'CURRENT';
      statusIcon = '👑';
    } else if (isUnlocked) {
      statusClass = 'unlocked-seamless';
      statusText = 'ACHIEVED';
      statusIcon = '🏅';
    } else if (isNext) {
      statusClass = 'next-seamless';
      statusText = 'NEXT';
      statusIcon = '🎯';
    } else {
      statusClass = 'locked-seamless';
      statusText = 'LOCKED';
      statusIcon = '🔒';
    }
    
    // Calculate points needed hype message
    let hypeMessage = '';
    if (!isUnlocked && !isCurrent) {
      const pointsNeeded = rank.scoreRequired - currentScore;
      if (pointsNeeded <= 50) {
        hypeMessage = `<div class="rank-hype-seamless close">✨ ${pointsNeeded} points away! So close! ✨</div>`;
      } else if (pointsNeeded <= 150) {
        hypeMessage = `<div class="rank-hype-seamless medium">🔥 ${pointsNeeded} more to go! You can do it! 🔥</div>`;
      } else {
        hypeMessage = `<div class="rank-hype-seamless far">💪 ${pointsNeeded} points to unlock ${rank.name} 💪</div>`;
      }
    } else if (isCurrent && !isMaxRank) {
      const toNext = nextRank?.scoreRequired - currentScore || 0;
      hypeMessage = `<div class="rank-hype-seamless current-hype">🌟 ${toNext} points to ${nextRank?.name || 'next rank'}! Keep going! 🌟</div>`;
    } else if (isMaxRank && isCurrent) {
      hypeMessage = `<div class="rank-hype-seamless legend">🏆 LEGENDARY LEADER! Maximum Achievement! 🏆</div>`;
    }
    
    // Progress HTML for next rank
    let progressHtml = '';
    if ((isNext && !isCurrent) || (isCurrent && !isMaxRank)) {
      progressHtml = `
        <div class="rank-progress-seamless">
          <div class="rank-progress-bar-seamless">
            <div class="rank-progress-fill-seamless" style="width: ${Math.min(100, Math.max(0, progressPercent))}%"></div>
          </div>
          <div class="rank-progress-text-seamless">${Math.floor(progressPercent)}% to ${isCurrent ? (nextRank?.name || rank.name) : rank.name}</div>
        </div>
      `;
    }
    
    // Achievement badge
    let achievementBadge = '';
    if (isUnlocked || isCurrent) {
      achievementBadge = `<div class="rank-achievement-seamless">🏆 ${rank.achievement}</div>`;
    }
    
    // 3D holographic gradient background
    const bgGradient = `linear-gradient(145deg, ${rank.color}, ${rank.darkColor})`;
    
    // Card animation delay for staggered entrance
    const animationDelay = index * 0.05;
    
    html += `
      <div class="rank-card-seamless ${statusClass}" data-rank="${rank.id}" style="background: ${bgGradient}; animation-delay: ${animationDelay}s">
        <div class="rank-card-inner-seamless">
          <div class="rank-status-seamless ${statusClass}">
            <span class="status-icon">${statusIcon}</span>
            <span class="status-text">${statusText}</span>
          </div>
          <div class="rank-badge-seamless">
            <canvas class="rank-badge-canvas-seamless" width="${BADGE_SIZE}" height="${BADGE_SIZE}" data-rank="${rank.id}" style="width: ${BADGE_SIZE}px; height: ${BADGE_SIZE}px;"></canvas>
          </div>
          <div class="rank-info-seamless">
            <div class="rank-name-seamless">${rank.name}</div>
            <div class="rank-vibe-seamless">${rank.vibe}</div>
            <div class="rank-points-seamless">
              <span class="points-icon">⭐</span>
              ${rank.scoreRequired} pts
              ${rank.id === RANK_LIST.length ? '<span class="max-badge">MAX</span>' : ''}
            </div>
            ${achievementBadge}
            ${progressHtml}
            ${hypeMessage}
          </div>
        </div>
      </div>
    `;
  });
  
  track.innerHTML = html;
  
  // Auto-scroll to current rank with smooth animation
  setTimeout(() => {
    const currentCard = track.querySelector('.rank-card-seamless.current-seamless');
    if (currentCard) {
      currentCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      // Add pulse effect on current card
      currentCard.classList.add('pulse-effect');
      setTimeout(() => {
        if (currentCard) currentCard.classList.remove('pulse-effect');
      }, 800);
    }
  }, 150);
  
  // Collect canvases for animation
  canvasesToDraw = [];
  const canvases = document.querySelectorAll('.rank-badge-canvas-seamless');
  canvases.forEach(canvas => {
    const rankId = parseInt(canvas.getAttribute('data-rank'));
    const drawer = RANK_DRAWERS[rankId];
    if (drawer) {
      canvasesToDraw.push({ canvas, drawer, rankId });
      const ctx = canvas.getContext('2d');
      drawer(ctx, BADGE_SIZE, BADGE_SIZE, performance.now());
    }
  });
  
  // Update progress summary in footer with hype animation
  const summaryEl = document.getElementById('rank-progress-summary');
  if (summaryEl) {
    const progressPercent = nextRank ? ((currentScore - currentRank.scoreRequired) / (nextRank.scoreRequired - currentRank.scoreRequired)) * 100 : 100;
    const hypeEmoji = progressPercent >= 80 ? '🚀' : progressPercent >= 50 ? '⚡' : '🌟';
    summaryEl.innerHTML = `
      <div class="progress-summary-content">
        <div class="summary-rank">${currentRank.badge} ${currentRank.title}</div>
        <div class="summary-score">${Math.floor(currentScore)} pts</div>
        ${nextRank ? `
          <div class="summary-next">→ ${nextRank.title} (${nextRank.scoreRequired - currentScore} pts left)</div>
          <div class="summary-progress">
            <div class="summary-progress-bar">
              <div class="summary-progress-fill" style="width: ${Math.min(100, Math.max(0, progressPercent))}%"></div>
            </div>
          </div>
          <div class="summary-hype">${hypeEmoji} ${Math.floor(nextRank.scoreRequired - currentScore)} points to glory! ${hypeEmoji}</div>
        ` : '<div class="summary-max">🏆 MAXIMUM RANK! YOU ARE A LEGEND! 🏆</div>'}
      </div>
    `;
  }
  
  // Add hover effects to cards
  attachCardHoverEffects();
}

// Attach hover effects to cards for hype
function attachCardHoverEffects() {
  const cards = document.querySelectorAll('.rank-card-seamless');
  cards.forEach(card => {
    card.removeEventListener('mouseenter', onCardHover);
    card.addEventListener('mouseenter', onCardHover);
    card.removeEventListener('mouseleave', onCardLeave);
    card.addEventListener('mouseleave', onCardLeave);
  });
}

function onCardHover(e) {
  const card = e.currentTarget;
  const isLocked = card.classList.contains('locked-seamless');
  const isCurrent = card.classList.contains('current-seamless');
  
  if (isLocked) {
    card.style.transform = 'translateY(-8px) scale(1.02)';
    if (hoverEffectTimeout) clearTimeout(hoverEffectTimeout);
    hoverEffectTimeout = setTimeout(() => {
      if (card) card.style.transform = '';
    }, 300);
  } else if (isCurrent) {
    card.style.transform = 'translateY(-4px) scale(1.01)';
    card.style.transition = 'transform 0.2s ease';
  } else {
    card.style.transform = 'translateY(-6px) scale(1.02)';
    card.style.transition = 'transform 0.2s ease';
  }
}

function onCardLeave(e) {
  const card = e.currentTarget;
  card.style.transform = '';
}

// Update holographic effects (glow, shine)
let holographicTime = 0;
function updateHolographicEffects() {
  holographicTime += 0.02;
  const cards = document.querySelectorAll('.rank-card-seamless');
  cards.forEach((card, idx) => {
    const isCurrent = card.classList.contains('current-seamless');
    const isUnlocked = card.classList.contains('unlocked-seamless');
    const isNext = card.classList.contains('next-seamless');
    
    if (isCurrent) {
      // Pulsing glow for current rank
      const pulseIntensity = 0.3 + Math.sin(holographicTime * 4) * 0.15;
      card.style.boxShadow = `0 0 ${20 + Math.sin(holographicTime * 5) * 5}px rgba(245, 200, 66, ${0.4 + Math.sin(holographicTime * 6) * 0.15})`;
      card.style.transition = 'box-shadow 0.05s linear';
    } else if (isNext) {
      const pulseIntensity = 0.2 + Math.sin(holographicTime * 3) * 0.1;
      card.style.boxShadow = `0 0 ${15 + Math.sin(holographicTime * 4) * 4}px rgba(230, 126, 34, ${0.3 + Math.sin(holographicTime * 5) * 0.1})`;
    } else if (isUnlocked) {
      const pulseIntensity = 0.1 + Math.sin(holographicTime * 2) * 0.05;
      card.style.boxShadow = `0 0 ${10 + Math.sin(holographicTime * 3) * 3}px rgba(68, 170, 68, ${0.2 + Math.sin(holographicTime * 4) * 0.08})`;
    }
  });
}

// Update badge animations
function updateRankBadgeAnimations() {
  if (!canvasesToDraw.length) {
    const canvases = document.querySelectorAll('.rank-badge-canvas-seamless');
    canvases.forEach(canvas => {
      const rankId = parseInt(canvas.getAttribute('data-rank'));
      const drawer = RANK_DRAWERS[rankId];
      if (drawer && !canvasesToDraw.find(c => c.canvas === canvas)) {
        canvasesToDraw.push({ canvas, drawer, rankId });
      }
    });
  }
  
  const now = performance.now();
  canvasesToDraw.forEach(({ canvas, drawer }) => {
    try {
      const ctx = canvas.getContext('2d');
      drawer(ctx, BADGE_SIZE, BADGE_SIZE, now);
    } catch (e) {
      console.warn(`Failed to draw rank badge:`, e);
    }
  });
}

// Draw rank badge (fallback)
function drawRankBadge(canvas, rankId) {
  if (!canvas || !rankId) return;
  const ctx = canvas.getContext('2d');
  const drawer = RANK_DRAWERS[rankId];
  if (drawer) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawer(ctx, canvas.width, canvas.height, performance.now());
  }
}

// Expose to window
window.openRankModal = openRankModal;
window.closeRankModalInstance = closeRankModal;