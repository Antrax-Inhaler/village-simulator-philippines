// ui/settings.js
// Settings panel module for Mini Bayan

let settingsPanel = null;
let isPanelOpen = false;

/**
 * Creates the settings panel DOM element and attaches it to the body
 */
export function initSettingsPanel() {
  // Check if panel already exists
  if (document.querySelector('.settings-panel')) {
    return;
  }
  
  // Create panel container
  const panel = document.createElement('div');
  panel.className = 'settings-panel';
  panel.id = 'settings-panel';
  panel.setAttribute('aria-hidden', 'true');
  
  // Build panel content
  panel.innerHTML = `
<!-- Settings Panel (Modal) -->
<div id="settings-panel" class="settings-modal">
  <div class="settings-modal-content">
    <div class="settings-modal-header">
      <span class="settings-modal-title">⚙️ MGA SETTING</span>
      <button class="settings-modal-close" onclick="closeSettingsPanel()">✕</button>
    </div>
    <div class="settings-modal-body">
      <!-- Save/Load -->
      <button class="settings-action-btn" onclick="triggerSave()">💾 I-save ang Laro</button>
      <button class="settings-action-btn" onclick="triggerLoad()">📂 I-load ang Laro</button>

      <!-- Fullscreen -->
      <div class="settings-sound-row">
        <span>🖥️ Fullscreen</span>
        <button id="fullscreen-btn" class="settings-action-btn" style="flex:1;">⛶ Pumasok sa Fullscreen</button>
      </div>

      <!-- Volume -->
      <div class="settings-sound-row">
        <span>🔊 Tunog</span>
        <input type="range" id="settings-volume-slider" class="settings-volume-slider" min="0" max="1" step="0.01" value="0.5">
        <span id="settings-vol-icon">🔊</span>
      </div>

      <!-- Make default -->
      <div class="settings-sound-row">
        <span>⭐ Default Settings</span>
        <label class="checkbox-label">
          <input type="checkbox" id="make-default-checkbox"> Tandaan ang mga setting na ito
        </label>
      </div>
    </div>
  </div>
</div>
  `;
  
  document.body.appendChild(panel);
  settingsPanel = panel;
  
  // Set up event listeners
  setupEventListeners();
}

/**
 * Sets up event listeners for settings panel buttons
 */
function setupEventListeners() {
  if (!settingsPanel) return;
  
  // Close button
  const closeBtn = settingsPanel.querySelector('#settings-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSettings);
  }
  
  // Save button
  const saveBtn = settingsPanel.querySelector('#settings-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (window.triggerSave) {
        window.triggerSave();
        showMessage('Laro ay na-save!');
      } else {
        console.warn('triggerSave not available');
      }
    });
  }
  
  // Load button
  const loadBtn = settingsPanel.querySelector('#settings-load');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      if (window.triggerLoad) {
        window.triggerLoad();
        showMessage('Laro ay na-load!');
      } else {
        console.warn('triggerLoad not available');
      }
    });
  }
  
  // Sound toggle button
  const soundToggle = settingsPanel.querySelector('#settings-sound-toggle');
  if (soundToggle) {
    soundToggle.addEventListener('click', toggleSound);
  }
  
  // Volume slider
  const volumeSlider = settingsPanel.querySelector('#settings-volume');
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      setVolume(parseFloat(e.target.value));
    });
  }
  
  // Close panel when clicking outside (optional)
  document.addEventListener('click', (e) => {
    if (isPanelOpen && settingsPanel && !settingsPanel.contains(e.target) && !e.target.closest('#settings-trigger')) {
      closeSettings();
    }
  });
}

/**
 * Opens the settings panel with animation
 */
export function openSettings() {
  if (!settingsPanel) {
    initSettingsPanel();
  }
  
  if (settingsPanel) {
    // Update UI to reflect current state before showing
    updateSoundUI();
    updateVolumeUI();
    
    settingsPanel.classList.add('open');
    settingsPanel.setAttribute('aria-hidden', 'false');
    isPanelOpen = true;
  }
}

/**
 * Closes the settings panel
 */
export function closeSettings() {
  if (settingsPanel) {
    settingsPanel.classList.remove('open');
    settingsPanel.setAttribute('aria-hidden', 'true');
    isPanelOpen = false;
  }
}

/**
 * Toggles sound (mute/unmute)
 */
export function toggleSound() {
  const isPlaying = window.isMusicPlaying ? window.isMusicPlaying() : false;
  const audio = window.getBackgroundAudio ? window.getBackgroundAudio() : null;
  
  if (audio) {
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(e => console.warn('Audio play blocked:', e));
    }
    updateSoundUI();
  }
}

/**
 * Sets the volume of background music
 * @param {number} value - Volume between 0 and 1
 */
export function setVolume(value) {
  const volume = Math.min(1, Math.max(0, value));
  if (window.setBackgroundVolume) {
    window.setBackgroundVolume(volume);
  } else {
    const audio = window.getBackgroundAudio ? window.getBackgroundAudio() : null;
    if (audio) audio.volume = volume;
  }
  updateVolumeUI();
}

/**
 * Updates the sound toggle button UI based on current playing state
 */
function updateSoundUI() {
  const soundToggle = settingsPanel?.querySelector('#settings-sound-toggle');
  if (!soundToggle) return;
  
  const isPlaying = window.isMusicPlaying ? window.isMusicPlaying() : false;
  soundToggle.textContent = isPlaying ? '🔇 I-mute' : '🔊 I-unmute';
}

/**
 * Updates the volume slider UI based on current volume
 */
function updateVolumeUI() {
  const volumeSlider = settingsPanel?.querySelector('#settings-volume');
  if (!volumeSlider) return;
  
  let currentVolume = 0.5;
  const audio = window.getBackgroundAudio ? window.getBackgroundAudio() : null;
  if (audio) {
    currentVolume = audio.volume;
  }
  volumeSlider.value = currentVolume;
}

/**
 * Shows a temporary message (reuses existing message system if available)
 * @param {string} message - Message to display
 */
function showMessage(message) {
  // Try to use the existing game message system
  if (window.showToastMessage) {
    window.showToastMessage(message);
  } else if (window.displayMessage) {
    window.displayMessage(message);
  } else {
    // Fallback: create a temporary toast
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '80px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = 'rgba(26, 18, 8, 0.95)';
    toast.style.color = '#f5c842';
    toast.style.padding = '8px 16px';
    toast.style.borderRadius = '8px';
    toast.style.border = '1px solid #c49a4e';
    toast.style.fontFamily = 'Oldenburg, serif';
    toast.style.fontSize = '13px';
    toast.style.zIndex = '2000';
    toast.style.pointerEvents = 'none';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 2000);
  }
}

// Attach to window for global access (for inline onclick handlers if needed)
window.openSettingsPanel = openSettings;
window.closeSettingsPanel = closeSettings;