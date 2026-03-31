/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — utils/uiHelpers.js
   UI helper functions for common display operations
═══════════════════════════════════════════════════════════════ */

export function formatTime(seconds) {
  var mins = Math.floor(seconds / 60);
  var secs = Math.floor(seconds % 60);
  return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

export function formatTimeLong(seconds) {
  if (seconds >= 3600) {
    var hours = Math.floor(seconds / 3600);
    var mins = Math.floor((seconds % 3600) / 60);
    return hours + 'h ' + mins + 'm';
  }
  if (seconds >= 60) {
    var mins = Math.floor(seconds / 60);
    var secs = Math.floor(seconds % 60);
    return mins + 'm ' + secs + 's';
  }
  return Math.floor(seconds) + 's';
}

export function getColorByPercent(value, isInverse) {
  var pct = Math.min(100, Math.max(0, value));
  if (isInverse) {
    if (pct >= 70) return '#e74c3c';
    if (pct >= 40) return '#f39c12';
    return '#27ae60';
  }
  if (pct >= 70) return '#27ae60';
  if (pct >= 40) return '#f39c12';
  return '#e74c3c';
}

export function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getStarRating(value, maxStars) {
  var stars = Math.floor((value / 100) * maxStars);
  var starStr = '';
  for (var i = 0; i < stars; i++) starStr += '⭐';
  for (var i = stars; i < maxStars; i++) starStr += '☆';
  return starStr;
}

export function createElementWithClass(tag, className) {
  var el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

export function setElementText(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}

export function showElement(id, show) {
  var el = document.getElementById(id);
  if (el) el.style.display = show ? 'block' : 'none';
}