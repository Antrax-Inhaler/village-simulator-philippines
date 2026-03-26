/**
 * Settings UI Module for Mini Bayan
 * Handles settings panel functionality, save/load, fullscreen, volume, and default settings persistence
 */

// Storage key for default settings
const DEFAULT_SETTINGS_KEY = 'miniBayan_defaultSettings';

/**
 * Initialize settings UI and event handlers
 */
export function initSettingsUI() {
  // Setup settings panel open/close functions if not already defined
  if (typeof window.openSettingsPanel === 'undefined') {
    window.openSettingsPanel = function() {
      const panel = document.getElementById('settings-panel');
      if (panel) panel.classList.add('open');
    };
  }
  
  if (typeof window.closeSettingsPanel === 'undefined') {
    window.closeSettingsPanel = function() {
      const panel = document.getElementById('settings-panel');
      if (panel) panel.classList.remove('open');
    };
  }
  
  // Add click outside to close
  document.addEventListener('click', function(e) {
    const panel = document.getElementById('settings-panel');
    if (panel && panel.classList.contains('open') && e.target === panel) {
      window.closeSettingsPanel();
    }
  });
  
  // Setup fullscreen button
  setupFullscreen();
  
  // Setup volume controls
  setupVolumeControls();
  
  // Setup default settings checkbox
  setupDefaultSettingsCheckbox();
  
  // Load saved default settings on startup
  loadDefaultSettings();
}

/**
 * Setup fullscreen functionality
 */
function setupFullscreen() {
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  if (!fullscreenBtn) return;
  
  function requestFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => {
        console.warn(`Fullscreen error: ${err.message}`);
        showToast('Hindi ma-fullscreen', 'warning');
      });
    } else {
      showToast('Hindi supported ang fullscreen', 'warning');
    }
  }
  
  function exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => {
        console.warn(`Exit fullscreen error: ${err.message}`);
      });
    }
  }
  
  function toggleFullscreen() {
    if (document.fullscreenElement) {
      exitFullscreen();
    } else {
      requestFullscreen();
    }
  }
  
  function updateFullscreenButton() {
    fullscreenBtn.textContent = document.fullscreenElement ? '✕ Lumabas sa Fullscreen' : '⛶ Pumasok sa Fullscreen';
  }
  
  fullscreenBtn.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', updateFullscreenButton);
  updateFullscreenButton();
}

/**
 * Setup volume controls and sync between audio widget and settings
 */
function setupVolumeControls() {
  const settingsVolumeSlider = document.getElementById('settings-volume-slider');
  const audioVolumeSlider = document.getElementById('audioVolumeSlider');
  const settingsVolIcon = document.getElementById('settings-vol-icon');
  const audioVolIcon = document.getElementById('audioVolIcon');
  const defaultCheckbox = document.getElementById('make-default-checkbox');
  
  if (!settingsVolumeSlider) return;
  
  function updateVolumeIcon(value, iconSpan) {
    const vol = parseFloat(value);
    if (!iconSpan) return;
    if (vol === 0) iconSpan.textContent = '🔇';
    else if (vol < 0.3) iconSpan.textContent = '🔈';
    else if (vol < 0.7) iconSpan.textContent = '🔉';
    else iconSpan.textContent = '🔊';
  }
  
  function setVolume(value) {
    const vol = Math.min(1, Math.max(0, parseFloat(value)));
    
    // Update both sliders
    if (settingsVolumeSlider) settingsVolumeSlider.value = vol;
    if (audioVolumeSlider) audioVolumeSlider.value = vol;
    
    // Update icons
    updateVolumeIcon(vol, settingsVolIcon);
    updateVolumeIcon(vol, audioVolIcon);
    
    // Update background audio if available
    if (window.setBackgroundVolume) {
      window.setBackgroundVolume(vol);
    }
    
    // If default checkbox is checked, save on change
    if (defaultCheckbox && defaultCheckbox.checked) {
      saveDefaultSettings();
    }
  }
  
  settingsVolumeSlider.addEventListener('input', (e) => setVolume(e.target.value));
  if (audioVolumeSlider) {
    audioVolumeSlider.addEventListener('input', (e) => setVolume(e.target.value));
  }
  
  // Initialize volume icon
  updateVolumeIcon(settingsVolumeSlider.value, settingsVolIcon);
}

/**
 * Setup default settings checkbox behavior
 */
function setupDefaultSettingsCheckbox() {
  const defaultCheckbox = document.getElementById('make-default-checkbox');
  if (!defaultCheckbox) return;
  
  // Check if there are existing default settings
  if (localStorage.getItem(DEFAULT_SETTINGS_KEY)) {
    defaultCheckbox.checked = true;
  }
  
  defaultCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      saveDefaultSettings();
      showToast('Default settings saved!', 'success');
    } else {
      // User can uncheck to stop auto-saving, but we keep the stored defaults
      showToast('Auto-save disabled', 'info');
    }
  });
}

/**
 * Save current settings to localStorage as default
 */
export function saveDefaultSettings() {
  const volumeSlider = document.getElementById('settings-volume-slider');
  const settings = {
    volume: volumeSlider ? volumeSlider.value : 0.5,
    fullscreenPreference: document.fullscreenElement !== null,
    timestamp: Date.now()
  };
  localStorage.setItem(DEFAULT_SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Load default settings from localStorage and apply them
 * @returns {boolean} True if settings were loaded and applied
 */
export function loadDefaultSettings() {
  const stored = localStorage.getItem(DEFAULT_SETTINGS_KEY);
  if (!stored) return false;
  
  try {
    const settings = JSON.parse(stored);
    
    // Apply volume
    if (settings.volume !== undefined) {
      const volumeSlider = document.getElementById('settings-volume-slider');
      const audioVolumeSlider = document.getElementById('audioVolumeSlider');
      if (volumeSlider) volumeSlider.value = settings.volume;
      if (audioVolumeSlider) audioVolumeSlider.value = settings.volume;
      
      if (window.setBackgroundVolume) {
        window.setBackgroundVolume(settings.volume);
      }
      
      // Update volume icons
      const settingsVolIcon = document.getElementById('settings-vol-icon');
      const audioVolIcon = document.getElementById('audioVolIcon');
      const updateIcon = (iconSpan) => {
        if (!iconSpan) return;
        const vol = parseFloat(settings.volume);
        if (vol === 0) iconSpan.textContent = '🔇';
        else if (vol < 0.3) iconSpan.textContent = '🔈';
        else if (vol < 0.7) iconSpan.textContent = '🔉';
        else iconSpan.textContent = '🔊';
      };
      updateIcon(settingsVolIcon);
      updateIcon(audioVolIcon);
    }
    
    // Apply fullscreen preference (if saved as true, request fullscreen)
    if (settings.fullscreenPreference && !document.fullscreenElement) {
      requestFullscreenDelayed();
    }
    
    return true;
  } catch(e) {
    console.warn('Failed to parse default settings', e);
    return false;
  }
}

/**
 * Request fullscreen with a slight delay (to ensure DOM is ready)
 */
function requestFullscreenDelayed() {
  setTimeout(() => {
    const elem = document.documentElement;
    if (elem.requestFullscreen && !document.fullscreenElement) {
      elem.requestFullscreen().catch(err => {
        console.warn(`Auto fullscreen error: ${err.message}`);
      });
    }
  }, 500);
}

/**
 * Show a toast notification
 * @param {string} msg - Message to display
 * @param {string} type - Type of message ('info', 'success', 'warning')
 */
function showToast(msg, type = 'info') {
  if (window.showMsg) {
    window.showMsg(msg, type);
  } else {
    // Fallback toast
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.position = 'fixed';
    toast.style.bottom = '80px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = 'rgba(26,18,8,0.95)';
    toast.style.color = '#f5c842';
    toast.style.padding = '8px 16px';
    toast.style.borderRadius = '8px';
    toast.style.border = '1px solid #c49a4e';
    toast.style.fontFamily = 'Oldenburg, serif';
    toast.style.fontSize = '13px';
    toast.style.zIndex = '2000';
    toast.style.pointerEvents = 'none';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }
}

// Export for use in main.js
export default {
  initSettingsUI,
  saveDefaultSettings,
  loadDefaultSettings
};