/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — ui/scoutPanel.js
   Scout Tower Interface for Enemy Village Reconnaissance
   
   Features:
   - Search for random enemy villages (simulated)
   - View enemy village info (level, defense, resources, buildings)
   - Capture coordinates for missile targeting
   - Copy coordinates to clipboard
   - Scout history (last 10 scanned villages)
   - Integration with missile panel for quick launch
   - Spam warning for repeated scouting same target
═══════════════════════════════════════════════════════════════ */

import { 
  generateDefenderVillage 
} from '../attack/attack.js';

import { 
  BUILDING_DEFS 
} from '../buildings/building.js';

import { 
  getDistanceBetweenPoints,
  calculateETA 
} from '../attack/attack.js';

import { 
  WORLD_W, 
  WORLD_H 
} from '../render/camera.js';

/* ══════════════════════════════════════════════════════════════
   ScoutPanel Class
   Main UI controller for scout tower interface
══════════════════════════════════════════════════════════════ */
export function ScoutPanel(containerElement, options) {
  this.container = containerElement;
  this.options = options || {};
  
  // State
  this.isOpen = false;
  this.currentScout = null;
  this.scoutHistory = [];
  this.isScanning = false;
  this.onScout = options.onScout || null;
  this.onClose = options.onClose || null;
  
  // DOM elements
  this.panel = null;
  this.scanBtn = null;
  this.villageInfoEl = null;
  this.historyEl = null;
  this.coordsDisplayEl = null;
  
  this._init();
}

/* ══════════════════════════════════════════════════════════════
   Initialize the panel DOM structure
══════════════════════════════════════════════════════════════ */
ScoutPanel.prototype._init = function() {
  // Create main panel
  this.panel = document.createElement('div');
  this.panel.id = 'scout-panel';
  this.panel.style.cssText = [
    'position: fixed;',
    'top: 50%; left: 50%;',
    'transform: translate(-50%, -50%);',
    'width: 680px; max-height: 85vh;',
    'background: linear-gradient(160deg, #1a1208 0%, #0d0a04 100%);',
    'border: 2px solid #8a6030; border-radius: 12px;',
    'box-shadow: 0 10px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(245,200,66,0.1);',
    'z-index: 10000; overflow: hidden;',
    'font-family: "Oldenburg", serif; color: #e8d8a0;',
    'display: none; opacity: 0; transition: opacity 0.2s;',
    'padding: 0;'
  ].join('');
  
  // Build panel content
  this.panel.innerHTML = this._buildPanelHTML();
  document.body.appendChild(this.panel);
  
  // Cache DOM elements
  this.scanBtn = this.panel.querySelector('#scan-enemy-btn');
  this.villageInfoEl = this.panel.querySelector('#village-info');
  this.historyEl = this.panel.querySelector('#scout-history');
  this.coordsDisplayEl = this.panel.querySelector('#coords-display');
  this.cancelBtn = this.panel.querySelector('#close-scout-panel');
  
  // Bind events
  this._bindEvents();
  
  // Load scout history from VS
  this._loadScoutHistory();
};

/* ══════════════════════════════════════════════════════════════
   Build panel HTML structure
══════════════════════════════════════════════════════════════ */
ScoutPanel.prototype._buildPanelHTML = function() {
  return `
    <!-- Header -->
    <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; background:rgba(0,0,0,0.4); border-bottom:1px solid #8a6030;">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:28px;">🔭</span>
        <div>
          <h2 style="margin:0; font-size:18px; color:#f5c842; text-shadow:0 1px 4px rgba(245,200,66,0.4);">Scout Tower</h2>
          <p style="margin:2px 0 0; font-size:10px; color:#8a8a8a; font-family:'Crimson Pro',serif;">Enemy Village Reconnaissance</p>
        </div>
      </div>
      <button id="close-scout-panel" style="background:none; border:none; color:#8a8a8a; font-size:24px; cursor:pointer; padding:4px 8px;">✕</button>
    </div>
    
    <!-- Content Grid -->
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0; height:calc(85vh - 80px); overflow:hidden;">
      
      <!-- Left Column: Scan & Village Info -->
      <div style="padding:16px; border-right:1px solid #8a6030; overflow-y:auto;">
        
        <!-- Scan Button -->
        <div style="margin-bottom:16px;">
          <button id="scan-enemy-btn" style="width:100%; background:linear-gradient(135deg, #4a8aff, #2a4a8a); color:#fff; border:none; padding:14px; border-radius:6px; cursor:pointer; font-size:14px; font-weight:bold; font-family:'Oldenburg',serif; text-shadow:0 1px 2px rgba(0,0,0,0.5); transition:opacity 0.2s, transform 0.1s;">
            📡 SCAN FOR ENEMY
          </button>
          <p style="margin:6px 0 0; font-size:9px; color:#8a8a8a; text-align:center;">Generates random enemy village for targeting</p>
        </div>
        
        <!-- Village Info Display -->
        <div id="village-info" style="background:rgba(0,0,0,0.3); border-radius:8px; padding:12px; min-height:280px;">
          <div id="no-village-selected" style="text-align:center; padding:60px 20px; color:#6a6a6a;">
            <span style="font-size:48px; display:block; margin-bottom:12px;">🗺️</span>
            <p style="font-size:11px;">Click "SCAN FOR ENEMY" to find a target</p>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div id="village-actions" style="margin-top:12px; display:none; grid-template-columns:1fr 1fr; gap:8px;">
          <button id="copy-coords-btn" style="background:#2a4a6a; color:#88ccff; border:1px solid #4a6a8a; padding:10px; border-radius:6px; cursor:pointer; font-size:11px; font-family:'Oldenburg',serif;">
            📋 Copy Coords
          </button>
          <button id="launch-missile-btn" style="background:linear-gradient(135deg, #cc3333, #882222); color:#fff; border:none; padding:10px; border-radius:6px; cursor:pointer; font-size:11px; font-weight:bold; font-family:'Oldenburg',serif;">
            🚀 Launch Missile
          </button>
        </div>
      </div>
      
      <!-- Right Column: Coordinates & History -->
      <div style="padding:16px; overflow-y:auto; background:rgba(0,0,0,0.2);">
        
        <!-- Coordinates Display -->
        <div style="margin-bottom:16px;">
          <h3 style="margin:0 0 10px; font-size:13px; color:#4a8aff; border-bottom:1px solid #4a6a8a; padding-bottom:6px;">📍 Captured Coordinates</h3>
          <div id="coords-display" style="background:rgba(0,0,0,0.5); border:1px solid #4a6a8a; border-radius:6px; padding:12px; min-height:80px;">
            <p style="font-size:10px; color:#6a6a6a; text-align:center; margin:0;">No coordinates captured</p>
          </div>
        </div>
        
        <!-- Scout History -->
        <div>
          <h3 style="margin:0 0 10px; font-size:13px; color:#8a8a8a; border-bottom:1px solid #6a6a6a; padding-bottom:6px;">📜 Scout History</h3>
          <div id="scout-history" style="display:grid; grid-template-columns:1fr; gap:6px; max-height:320px; overflow-y:auto;"></div>
        </div>
      </div>
    </div>
    
    <!-- Footer: Scan Cost Info -->
    <div style="padding:12px 20px; background:rgba(0,0,0,0.4); border-top:1px solid #8a6030; display:flex; justify-content:space-between; align-items:center;">
      <div style="font-size:10px; color:#8a8a8a; font-family:'Crimson Pro',serif;">
        ℹ️ Scouting is free • Coordinates valid for 24h
      </div>
      <div id="scan-cooldown" style="font-size:9px; color:#f5c842; display:none;">
        ⏱️ Scan cooldown: <span id="cooldown-timer">0</span>s
      </div>
    </div>
  `;
};

/* ══════════════════════════════════════════════════════════════
   Bind event listeners
══════════════════════════════════════════════════════════════ */
ScoutPanel.prototype._bindEvents = function() {
  var self = this;
  
  // Close button
  this.cancelBtn.addEventListener('click', function() {
    self.close();
  });
  
  // Scan button
  this.scanBtn.addEventListener('click', function() {
    self._handleScan();
  });
  
  // Copy coordinates button
  this.panel.querySelector('#copy-coords-btn').addEventListener('click', function() {
    self._copyCoordinates();
  });
  
  // Launch missile button
  this.panel.querySelector('#launch-missile-btn').addEventListener('click', function() {
    self._openMissilePanel();
  });
  
  // Hover effects for scan button
  this.scanBtn.addEventListener('mouseenter', function() {
    if (!this.disabled) {
      this.style.opacity = '0.9';
      this.style.transform = 'scale(1.02)';
    }
  });
  
  this.scanBtn.addEventListener('mouseleave', function() {
    this.style.opacity = '1';
    this.style.transform = 'scale(1)';
  });
};

/* ══════════════════════════════════════════════════════════════
   Handle scan button click
══════════════════════════════════════════════════════════════ */
ScoutPanel.prototype._handleScan = function() {
  var self = this;
  
  if (this.isScanning) return;
  
  // Show scanning state
  this.isScanning = true;
  this.scanBtn.disabled = true;
  this.scanBtn.textContent = '📡 SCANNING...';
  this.scanBtn.style.opacity = '0.7';
  
  // Simulate scan delay (1-2 seconds)
  var scanTime = 1000 + Math.random() * 1000;
  
  setTimeout(function() {
    // Generate random enemy village
    var level = Math.floor(Math.random() * 6) + 1;  // Level 1-6
    var village = generateDefenderVillage(level);
    
    // Generate random coordinates within world bounds
    var targetX = Math.round((Math.random() * (WORLD_W - 200) + 100) * 100) / 100;
    var targetY = Math.round((Math.random() * (WORLD_H - 200) + 100) * 100) / 100;
    var zones = ['SENTRO', 'HILAGA', 'TIMOG', 'SILANGAN', 'KANLURAN'];
    var zone = zones[Math.floor(Math.random() * zones.length)];
    
    // Create scout data
    var scoutData = {
      id: 'scout_' + Date.now(),
      name: village.name,
      level: village.level,
      defPower: village.defPower,
      goldLoot: village.goldLoot,
      riceLoot: village.riceLoot,
      targetX: targetX,
      targetY: targetY,
      zone: zone,
      buildings: village.buildings.map(function(b) {
        return {
          type: b.type,
          level: b.level || 1,
          hp: b.hp,
          maxHp: b.maxHp,
          attackRange: b.attackRange || 0,
          attackDPS: b.attackDPS || 0
        };
      }),
      villagers: village.villagers.length,
      scannedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000  // 24 hours
    };
    
    // Set as current scout
    self.currentScout = scoutData;
    
    // Add to history
    self.scoutHistory.unshift(scoutData);
    if (self.scoutHistory.length > 10) {
      self.scoutHistory.pop();
    }
    
    // Save to VS
    self._saveScoutHistory();
    
    // Update UI
    self._displayVillageInfo(scoutData);
    self._displayCoordinates(scoutData);
    self._refreshHistory();
    
    // Reset scan button
    self.isScanning = false;
    self.scanBtn.disabled = false;
    self.scanBtn.textContent = '📡 SCAN FOR ENEMY';
    self.scanBtn.style.opacity = '1';
    
    // Show success message
    if (window.showMsg) {
      window.showMsg('🔭 Enemy village located: ' + scoutData.name, 'success');
    }
    
    // Callback
    if (self.onScout) {
      self.onScout(scoutData);
    }
    
  }, scanTime);
};

/* ══════════════════════════════════════════════════════════════
   Display village information
══════════════════════════════════════════════════════════════ */
ScoutPanel.prototype._displayVillageInfo = function(scout) {
  var infoEl = this.panel.querySelector('#village-info');
  var actionsEl = this.panel.querySelector('#village-actions');
  var noVillageEl = this.panel.querySelector('#no-village-selected');
  
  if (!infoEl || !scout) return;
  
  // Hide "no village" message
  if (noVillageEl) noVillageEl.style.display = 'none';
  
  // Show action buttons
  if (actionsEl) actionsEl.style.display = 'grid';
  
  // Calculate defense rating
  var defRating = scout.defPower < 200 ? 'Weak' : scout.defPower < 400 ? 'Moderate' : scout.defPower < 600 ? 'Strong' : 'Fortified';
  var defColor = scout.defPower < 200 ? '#44ff88' : scout.defPower < 400 ? '#f5c842' : scout.defPower < 600 ? '#ff8844' : '#ff4444';
  
  // Count building types
  var buildingCounts = {};
  scout.buildings.forEach(function(b) {
    buildingCounts[b.type] = (buildingCounts[b.type] || 0) + 1;
  });
  
  var defBuildings = (buildingCounts['moog'] || 0) + (buildingCounts['bantayan'] || 0) + (buildingCounts['kuta'] || 0) + (buildingCounts['pulisya'] || 0) + (buildingCounts['cuartel'] || 0);
  var econBuildings = (buildingCounts['farm'] || 0) + (buildingCounts['mine'] || 0) + (buildingCounts['storage'] || 0) + (buildingCounts['palengke'] || 0);
  
  // Calculate estimated travel time for basic missile
  var playerPos = { x: WORLD_W / 2, y: WORLD_H / 2 };  // Simplified player position
  var distance = Math.sqrt(Math.pow(scout.targetX - playerPos.x, 2) + Math.pow(scout.targetY - playerPos.y, 2));
  var eta = calculateETA(distance, 'basic');
  
  var html = `
    <div style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <h3 style="margin:0; font-size:15px; color:#f5c842;">${scout.name}</h3>
        <span style="background:${defColor}; color:#1a0e00; padding:3px 8px; border-radius:4px; font-size:9px; font-weight:bold;">${defRating}</span>
      </div>
      <div style="font-size:10px; color:#8a8a8a; margin-bottom:8px;">
        Hall Level ${scout.level} • ${scout.villagers} Villagers • ${scout.buildings.length} Buildings
      </div>
    </div>
    
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px;">
      <div style="background:rgba(0,0,0,0.4); border-radius:6px; padding:8px;">
        <div style="font-size:9px; color:#8a8a8a; margin-bottom:4px;">🛡️ Defense Power</div>
        <div style="font-size:13px; font-weight:bold; color:${defColor};">${scout.defPower}</div>
      </div>
      <div style="background:rgba(0,0,0,0.4); border-radius:6px; padding:8px;">
        <div style="font-size:9px; color:#8a8a8a; margin-bottom:4px;">💰 Est. Loot</div>
        <div style="font-size:13px; font-weight:bold; color:#f5c842;">${scout.goldLoot}🪙 ${scout.riceLoot}🌾</div>
      </div>
    </div>
    
    <div style="margin-bottom:12px;">
      <div style="font-size:9px; color:#8a8a8a; margin-bottom:4px;">🏗️ Building Composition</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <span style="background:rgba(255,68,68,0.2); color:#ff6666; padding:2px 6px; border-radius:3px; font-size:9px;">🏰 ${defBuildings} Defense</span>
        <span style="background:rgba(68,255,136,0.2); color:#44ff88; padding:2px 6px; border-radius:3px; font-size:9px;">🌾 ${econBuildings} Economic</span>
        <span style="background:rgba(74,106,255,0.2); color:#4a8aff; padding:2px 6px; border-radius:3px; font-size:9px;">🏠 ${scout.buildings.length - defBuildings - econBuildings} Other</span>
      </div>
    </div>
    
    <div style="margin-bottom:12px;">
      <div style="font-size:9px; color:#8a8a8a; margin-bottom:4px;">✈️ Missile ETA (Basic)</div>
      <div style="font-size:12px; color:#4a8aff;">${formatETA(eta)}</div>
    </div>
    
    <div style="border-top:1px solid #6a4a18; padding-top:12px;">
      <div style="font-size:9px; color:#8a8a8a; margin-bottom:6px;">📋 Key Buildings</div>
      <div style="display:grid; grid-template-columns:1fr; gap:4px; max-height:100px; overflow-y:auto;">
        ${scout.buildings.filter(function(b) { return b.attackRange > 0 || b.type === 'mainHall' || b.type === 'storage'; }).slice(0, 5).map(function(b) {
          var def = BUILDING_DEFS[b.type];
          var icon = b.attackRange > 0 ? '🗡️' : b.type === 'mainHall' ? '🏰' : '📦';
          return `
            <div style="font-size:9px; color:#e8d8a0; display:flex; justify-content:space-between;">
              <span>${icon} ${def ? def.label : b.type}</span>
              <span style="color:#8a8a8a;">Lv${b.level} ${b.attackRange > 0 ? '(Range:' + b.attackRange + ')' : ''}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    
    <div style="margin-top:12px; font-size:8px; color:#6a6a6a; text-align:center;">
      ⚠️ Coordinates expire in 24h • Spam penalties may apply
    </div>
  `;
  
  infoEl.innerHTML = html;
};

/* ══════════════════════════════════════════════════════════════
   Display captured coordinates
══════════════════════════════════════════════════════════════ */
ScoutPanel.prototype._displayCoordinates = function(scout) {
  var coordsEl = this.coordsDisplayEl;
  if (!coordsEl || !scout) return;
  
  var coordsStr = `X:${scout.targetX}, Y:${scout.targetY}, ZONE:${scout.zone}`;
  var timeUntilExpiry = Math.floor((scout.expiresAt - Date.now()) / 1000);
  var expiryStr = formatETA(timeUntilExpiry);
  
  coordsEl.innerHTML = `
    <div style="font-size:10px; color:#8a8a8a; margin-bottom:6px;">Target: <span style="color:#f5c842;">${scout.name}</span></div>
    <div style="font-family:'Crimson Pro',serif; font-size:11px; color:#4a8aff; margin-bottom:6px; word-break:break-all;">
      ${coordsStr}
    </div>
    <div style="font-size:9px; color:#6a6a6a;">
      ⏱️ Expires: ${expiryStr}
    </div>
  `;
  
  // Store coords for clipboard
  coordsEl.dataset.coords = coordsStr;
  coordsEl.dataset.targetX = scout.targetX;
  coordsEl.dataset.targetY = scout.targetY;
  coordsEl.dataset.zone = scout.zone;
  coordsEl.dataset.name = scout.name;
};

/* ══════════════════════════════════════════════════════════════
   Copy coordinates to clipboard
══════════════════════════════════════════════════════════════ */
ScoutPanel.prototype._copyCoordinates = function() {
  var coordsEl = this.coordsDisplayEl;
  if (!coordsEl || !coordsEl.dataset.coords) {
    if (window.showMsg) window.showMsg('No coordinates to copy!', 'warning');
    return;
  }
  
  var coordsStr = coordsEl.dataset.coords;
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(coordsStr).then(function() {
      if (window.showMsg) window.showMsg('📋 Coordinates copied to clipboard!', 'success');
    }).catch(function() {
      if (window.showMsg) window.showMsg('Clipboard access denied!', 'warning');
    });
  } else {
    // Fallback for older browsers
    var textArea = document.createElement('textarea');
    textArea.value = coordsStr;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      if (window.showMsg) window.showMsg('📋 Coordinates copied!', 'success');
    } catch (err) {
      if (window.showMsg) window.showMsg('Failed to copy!', 'warning');
    }
    document.body.removeChild(textArea);
  }
};

/* ══════════════════════════════════════════════════════════════
   Open missile panel with pre-filled coordinates
══════════════════════════════════════════════════════════════ */
ScoutPanel.prototype._openMissilePanel = function() {
  var coordsEl = this.coordsDisplayEl;
  if (!coordsEl || !coordsEl.dataset.targetX) {
    if (window.showMsg) window.showMsg('Scan for enemy first!', 'warning');
    return;
  }
  
  var prefillData = {
    targetX: parseFloat(coordsEl.dataset.targetX),
    targetY: parseFloat(coordsEl.dataset.targetY),
    targetZone: coordsEl.dataset.zone,
    targetName: coordsEl.dataset.name
  };
  
  // Close scout panel
  this.close();
  
  // Open missile panel
  if (window.showMissilePanel) {
    window.showMissilePanel(prefillData);
  } else {
    if (window.showMsg) window.showMsg('Missile system not initialized!', 'danger');
  }
};

/* ══════════════════════════════════════════════════════════════
   Refresh scout history display
══════════════════════════════════════════════════════════════ */
ScoutPanel.prototype._refreshHistory = function() {
  var historyEl = this.historyEl;
  if (!historyEl) return;
  
  if (this.scoutHistory.length === 0) {
    historyEl.innerHTML = '<p style="font-size:10px; color:#6a6a6a; text-align:center; padding:20px;">No scout history yet</p>';
    return;
  }
  
  var html = '';
  var now = Date.now();
  
  this.scoutHistory.forEach(function(scout, index) {
    var timeAgo = Math.floor((now - scout.scannedAt) / 1000);
    var timeStr = timeAgo < 60 ? timeAgo + 's ago' : timeAgo < 3600 ? Math.floor(timeAgo / 60) + 'm ago' : Math.floor(timeAgo / 3600) + 'h ago';
    
    var isExpired = now > scout.expiresAt;
    var isCurrent = index === 0;
    
    html += `
      <div class="scout-history-item" data-index="${index}" style="
        padding:8px; 
        background:${isCurrent ? 'rgba(74,106,255,0.2)' : 'rgba(0,0,0,0.3)'}; 
        border-radius:4px; 
        border-left:3px solid ${isExpired ? '#6a6a6a' : '#4a8aff'};
        cursor:${isCurrent ? 'default' : 'pointer'};
        opacity:${isExpired ? '0.5' : '1'};
        transition:opacity 0.2s;
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <span style="font-size:10px; color:${isCurrent ? '#4a8aff' : '#e8d8a0'};">${scout.name}</span>
          <span style="font-size:8px; color:#6a6a6a;">${timeStr}</span>
        </div>
        <div style="font-size:9px; color:#8a8a8a;">
          Lv${scout.level} • ${scout.defPower} DEF • ${scout.goldLoot}🪙
        </div>
        ${isExpired ? '<div style="font-size:8px; color:#6a6a6a; margin-top:4px;">⚠️ Expired</div>' : ''}
      </div>
    `;
  });
  
  historyEl.innerHTML = html;
  
  // Bind click events to history items
  var self = this;
  historyEl.querySelectorAll('.scout-history-item').forEach(function(item) {
    item.addEventListener('click', function() {
      var index = parseInt(this.getAttribute('data-index'));
      if (index > 0 && !self.scoutHistory[index].expiresAt < now) {
        // Load old scout data
        self.currentScout = self.scoutHistory[index];
        self._displayVillageInfo(self.currentScout);
        self._displayCoordinates(self.currentScout);
      }
    });
  });
};

/* ══════════════════════════════════════════════════════════════
   Load scout history from VS
══════════════════════════════════════════════════════════════ */
ScoutPanel.prototype._loadScoutHistory = function() {
  var VS = window._VS;
  if (VS && VS.scoutHistory) {
    this.scoutHistory = VS.scoutHistory.slice(0, 10);
    this._refreshHistory();
  }
};

/* ══════════════════════════════════════════════════════════════
   Save scout history to VS
══════════════════════════════════════════════════════════════ */
ScoutPanel.prototype._saveScoutHistory = function() {
  var VS = window._VS;
  if (VS) {
    VS.scoutHistory = this.scoutHistory.slice(0, 10);
    
    // Trigger autosave
    if (window.triggerSave) {
      // Optional: auto-save on scout
    }
  }
};

/* ══════════════════════════════════════════════════════════════
   Open the panel
══════════════════════════════════════════════════════════════ */
ScoutPanel.prototype.open = function() {
  this.panel.style.display = 'block';
  
  // Trigger reflow for transition
  void this.panel.offsetWidth;
  
  this.panel.style.opacity = '1';
  this.isOpen = true;
  
  // Refresh data
  this._loadScoutHistory();
  this._refreshHistory();
  
  // Reset current scout display if expired
  if (this.currentScout && Date.now() > this.currentScout.expiresAt) {
    this.currentScout = null;
    var noVillageEl = this.panel.querySelector('#no-village-selected');
    var actionsEl = this.panel.querySelector('#village-actions');
    if (noVillageEl) noVillageEl.style.display = 'block';
    if (actionsEl) actionsEl.style.display = 'none';
  }
};

/* ══════════════════════════════════════════════════════════════
   Close the panel
══════════════════════════════════════════════════════════════ */
ScoutPanel.prototype.close = function() {
  this.panel.style.opacity = '0';
  
  var self = this;
  setTimeout(function() {
    self.panel.style.display = 'none';
    self.isOpen = false;
  }, 200);
  
  if (this.onClose) {
    this.onClose();
  }
};

/* ══════════════════════════════════════════════════════════════
   Update panel data (called from game loop)
══════════════════════════════════════════════════════════════ */
ScoutPanel.prototype.update = function() {
  if (!this.isOpen) return;
  
  // Check for expired scouts
  var now = Date.now();
  if (this.currentScout && now > this.currentScout.expiresAt) {
    this.currentScout = null;
    this._refreshHistory();
  }
  
  // Update cooldown timer if scanning
  if (this.isScanning) {
    // Handled by scan timeout
  }
};

/* ══════════════════════════════════════════════════════════════
   Destroy the panel
══════════════════════════════════════════════════════════════ */
ScoutPanel.prototype.destroy = function() {
  if (this.panel && this.panel.parentNode) {
    this.panel.parentNode.removeChild(this.panel);
  }
};

/* ══════════════════════════════════════════════════════════════
   Factory Function: Create scout panel instance
══════════════════════════════════════════════════════════════ */
export function createScoutPanel(container, options) {
  return new ScoutPanel(container, options);
}

/* ══════════════════════════════════════════════════════════════
   Global Panel Instance (for window access)
══════════════════════════════════════════════════════════════ */
var _globalScoutPanel = null;

/* ══════════════════════════════════════════════════════════════
   Initialize global scout panel
   Called from main.js init()
══════════════════════════════════════════════════════════════ */
export function initScoutPanel() {
  if (_globalScoutPanel) return _globalScoutPanel;
  
  // Create hidden container for panel
  var container = document.createElement('div');
  container.id = 'scout-panel-container';
  container.style.display = 'none';
  document.body.appendChild(container);
  
  _globalScoutPanel = createScoutPanel(container, {
    onScout: function(scoutData) {
      console.log('[ScoutPanel] Scouted:', scoutData.name);
    },
    onClose: function() {
      console.log('[ScoutPanel] Closed');
    }
  });
  
  // Expose to window for main.js integration
  window.showScoutPanel = function() {
    if (_globalScoutPanel) {
      _globalScoutPanel.open();
    }
  };
  
  window.closeScoutPanel = function() {
    if (_globalScoutPanel) {
      _globalScoutPanel.close();
    }
  };
  
  window.updateScoutPanel = function() {
    if (_globalScoutPanel) {
      _globalScoutPanel.update();
    }
  };
  
  return _globalScoutPanel;
}

/* ══════════════════════════════════════════════════════════════
   Utility: Format ETA for display
══════════════════════════════════════════════════════════════ */
function formatETA(seconds) {
  if (seconds < 60) {
    return seconds + 's';
  } else if (seconds < 3600) {
    var mins = Math.floor(seconds / 60);
    var secs = seconds % 60;
    return mins + 'm ' + secs + 's';
  } else {
    var hours = Math.floor(seconds / 3600);
    var mins = Math.floor((seconds % 3600) / 60);
    return hours + 'h ' + mins + 'm';
  }
}

/* ══════════════════════════════════════════════════════════════
   Export Public API
══════════════════════════════════════════════════════════════ */
// export {
//   ScoutPanel,
//   createScoutPanel,
//   initScoutPanel,
//   _globalScoutPanel as getGlobalScoutPanel,
//   formatETA
// };