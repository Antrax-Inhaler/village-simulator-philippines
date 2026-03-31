/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — ui/missilePanel.js
   Missile Warfare Management Panel
   
   Features:
   - Missile inventory display with purchase options
   - Target coordinate input (manual or from scout)
   - Launch confirmation with cost/ETA preview
   - Active missile tracking integration
   - Launch history (last 10 missiles)
   - Spam warning indicators
   - Integration with economy.js for costs
═══════════════════════════════════════════════════════════════ */

import { 
  MISSILE_COSTS, 
  getMissileInventorySummary,
  canAffordMissileLaunch,
  getMissileTypeInfo
} from '../resources/economy.js';

import { 
  createMissileTracking, 
  formatETA,
  getMissileDisplayInfo
} from '../attack/missileTrackingCanvas.js';

import { 
  MISSILE_CONFIG 
} from '../attack/missileWarfare.js';

/* ══════════════════════════════════════════════════════════════
   MissilePanel Class
   Main UI controller for missile management
══════════════════════════════════════════════════════════════ */
export function MissilePanel(containerElement, options) {
  this.container = containerElement;
  this.options = options || {};
  
  // State
  this.isOpen = false;
  this.selectedMissileType = null;
  this.launchCount = 1;
  this.targetCoords = options.prefill || null;
  this.activeTrackings = [];
  this.onLaunch = options.onLaunch || null;
  this.onClose = options.onClose || null;
  
  // DOM elements
  this.panel = null;
  this.inventoryEl = null;
  this.targetInputEl = null;
  this.launchBtn = null;
  this.historyEl = null;
  this.trackingContainer = null;
  
  this._init();
}

/* ══════════════════════════════════════════════════════════════
   Initialize the panel DOM structure
══════════════════════════════════════════════════════════════ */
MissilePanel.prototype._init = function() {
  // Create main panel
  this.panel = document.createElement('div');
  this.panel.id = 'missile-panel';
  this.panel.style.cssText = [
    'position: fixed;',
    'top: 50%; left: 50%;',
    'transform: translate(-50%, -50%);',
    'width: 720px; max-height: 85vh;',
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
  this.inventoryEl = this.panel.querySelector('#missile-inventory');
  this.targetInputEl = this.panel.querySelector('#target-coords-input');
  this.launchBtn = this.panel.querySelector('#launch-missile-btn');
  this.historyEl = this.panel.querySelector('#missile-history');
  this.trackingContainer = this.panel.querySelector('#missile-tracking-container');
  this.cancelBtn = this.panel.querySelector('#close-missile-panel');
  
  // Bind events
  this._bindEvents();
  
  // Load initial data
  this._refreshInventory();
  this._refreshHistory();
  
  // Pre-fill target if provided
  if (this.targetCoords) {
    this._fillTargetCoords(this.targetCoords);
  }
};

/* ══════════════════════════════════════════════════════════════
   Build panel HTML structure
══════════════════════════════════════════════════════════════ */
MissilePanel.prototype._buildPanelHTML = function() {
  return `
    <!-- Header -->
    <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; background:rgba(0,0,0,0.4); border-bottom:1px solid #8a6030;">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:28px;">🚀</span>
        <div>
          <h2 style="margin:0; font-size:18px; color:#f5c842; text-shadow:0 1px 4px rgba(245,200,66,0.4);">Missile Command</h2>
          <p style="margin:2px 0 0; font-size:10px; color:#8a8a8a; font-family:'Crimson Pro',serif;">Long-Range Strike System</p>
        </div>
      </div>
      <button id="close-missile-panel" style="background:none; border:none; color:#8a8a8a; font-size:24px; cursor:pointer; padding:4px 8px;">✕</button>
    </div>
    
    <!-- Content Grid -->
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0; height:calc(85vh - 80px); overflow:hidden;">
      
      <!-- Left Column: Inventory & Launch -->
      <div style="padding:16px; border-right:1px solid #8a6030; overflow-y:auto;">
        
        <!-- Missile Inventory -->
        <div id="missile-inventory" style="margin-bottom:16px;">
          <h3 style="margin:0 0 10px; font-size:13px; color:#f5c842; border-bottom:1px solid #8a6030; padding-bottom:6px;">📦 Missile Inventory</h3>
          <div id="inventory-list" style="display:grid; grid-template-columns:1fr; gap:8px;"></div>
        </div>
        
        <!-- Target Coordinates -->
        <div style="margin-bottom:16px;">
          <h3 style="margin:0 0 10px; font-size:13px; color:#f5c842; border-bottom:1px solid #8a6030; padding-bottom:6px;">🎯 Target Coordinates</h3>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:8px;">
            <input type="text" id="target-x" placeholder="X Coordinate" style="background:rgba(0,0,0,0.5); border:1px solid #6a4a18; color:#e8d8a0; padding:8px; border-radius:4px; font-family:'Crimson Pro',serif; font-size:12px;"/>
            <input type="text" id="target-y" placeholder="Y Coordinate" style="background:rgba(0,0,0,0.5); border:1px solid #6a4a18; color:#e8d8a0; padding:8px; border-radius:4px; font-family:'Crimson Pro',serif; font-size:12px;"/>
          </div>
          <input type="text" id="target-zone" placeholder="Zone (e.g., SENTRO)" style="width:100%; background:rgba(0,0,0,0.5); border:1px solid #6a4a18; color:#e8d8a0; padding:8px; border-radius:4px; font-family:'Crimson Pro',serif; font-size:12px; margin-bottom:8px; box-sizing:border-box;"/>
          <input type="text" id="target-name" placeholder="Target Name (e.g., Nayon ni Juan)" style="width:100%; background:rgba(0,0,0,0.5); border:1px solid #6a4a18; color:#e8d8a0; padding:8px; border-radius:4px; font-family:'Crimson Pro',serif; font-size:12px; box-sizing:border-box;"/>
          <button id="paste-coords-btn" style="width:100%; margin-top:8px; background:#2a4a6a; color:#88ccff; border:1px solid #4a6a8a; padding:6px; border-radius:4px; cursor:pointer; font-size:11px;">📋 Paste from Clipboard</button>
        </div>
        
        <!-- Launch Count -->
        <div style="margin-bottom:16px;">
          <h3 style="margin:0 0 10px; font-size:13px; color:#f5c842; border-bottom:1px solid #8a6030; padding-bottom:6px;">🔢 Launch Count</h3>
          <div style="display:flex; align-items:center; gap:10px;">
            <button id="decount-btn" style="width:32px; height:32px; background:#4a3a28; color:#e8d8a0; border:1px solid #6a4a18; border-radius:4px; cursor:pointer; font-size:16px;">−</button>
            <input type="number" id="launch-count" value="1" min="1" max="5" style="width:60px; text-align:center; background:rgba(0,0,0,0.5); border:1px solid #6a4a18; color:#e8d8a0; padding:6px; border-radius:4px; font-family:'Crimson Pro',serif; font-size:14px;"/>
            <button id="incount-btn" style="width:32px; height:32px; background:#4a3a28; color:#e8d8a0; border:1px solid #6a4a18; border-radius:4px; cursor:pointer; font-size:16px;">+</button>
          </div>
          <p style="margin:6px 0 0; font-size:9px; color:#8a8a8a;">Max 5 missiles per launch sequence</p>
        </div>
        
        <!-- Launch Button -->
        <button id="launch-missile-btn" style="width:100%; background:linear-gradient(135deg, #cc3333, #882222); color:#fff; border:none; padding:12px; border-radius:6px; cursor:pointer; font-size:14px; font-weight:bold; font-family:'Oldenburg',serif; text-shadow:0 1px 2px rgba(0,0,0,0.5); transition:opacity 0.2s, transform 0.1s;">🚀 ILUNSAD!</button>
        <p id="launch-warning" style="margin:8px 0 0; font-size:9px; color:#ff6666; text-align:center; display:none;"></p>
      </div>
      
      <!-- Right Column: Tracking & History -->
      <div style="padding:16px; overflow-y:auto; background:rgba(0,0,0,0.2);">
        
        <!-- Active Missiles -->
        <div style="margin-bottom:16px;">
          <h3 style="margin:0 0 10px; font-size:13px; color:#4a8aff; border-bottom:1px solid #4a6a8a; padding-bottom:6px;">✈️ Active Missiles</h3>
          <div id="missile-tracking-container" style="display:grid; grid-template-columns:1fr; gap:12px;"></div>
          <p id="no-active-missiles" style="margin:0; font-size:10px; color:#6a6a6a; text-align:center; padding:20px 0;">No active missiles</p>
        </div>
        
        <!-- Launch History -->
        <div>
          <h3 style="margin:0 0 10px; font-size:13px; color:#8a8a8a; border-bottom:1px solid #6a6a6a; padding-bottom:6px;">📜 Launch History</h3>
          <div id="missile-history" style="display:grid; grid-template-columns:1fr; gap:6px; max-height:200px; overflow-y:auto;"></div>
        </div>
      </div>
    </div>
    
    <!-- Footer: Cost Summary -->
    <div style="padding:12px 20px; background:rgba(0,0,0,0.4); border-top:1px solid #8a6030; display:flex; justify-content:space-between; align-items:center;">
      <div id="cost-summary" style="font-size:11px; color:#8a8a8a; font-family:'Crimson Pro',serif;">
        Select a missile type to see cost
      </div>
      <div id="spam-warning" style="font-size:9px; color:#ff6666; display:none;">
        ⚠️ Spam penalty may apply
      </div>
    </div>
  `;
};

/* ══════════════════════════════════════════════════════════════
   Bind event listeners
══════════════════════════════════════════════════════════════ */
MissilePanel.prototype._bindEvents = function() {
  var self = this;
  
  // Close button
  this.cancelBtn.addEventListener('click', function() {
    self.close();
  });
  
  // Launch count controls
  var countInput = this.panel.querySelector('#launch-count');
  this.panel.querySelector('#decount-btn').addEventListener('click', function() {
    countInput.value = Math.max(1, parseInt(countInput.value || 1) - 1);
    self.launchCount = parseInt(countInput.value);
    self._updateCostSummary();
  });
  
  this.panel.querySelector('#incount-btn').addEventListener('click', function() {
    countInput.value = Math.min(5, parseInt(countInput.value || 1) + 1);
    self.launchCount = parseInt(countInput.value);
    self._updateCostSummary();
  });
  
  countInput.addEventListener('change', function() {
    self.launchCount = Math.max(1, Math.min(5, parseInt(this.value || 1)));
    this.value = self.launchCount;
    self._updateCostSummary();
  });
  
  // Paste coordinates button
  this.panel.querySelector('#paste-coords-btn').addEventListener('click', function() {
    self._pasteFromClipboard();
  });
  
  // Launch button
  this.launchBtn.addEventListener('click', function() {
    self._handleLaunch();
  });
  
  // Hover effects for launch button
  this.launchBtn.addEventListener('mouseenter', function() {
    if (!this.disabled) {
      this.style.opacity = '0.9';
      this.style.transform = 'scale(1.02)';
    }
  });
  
  this.launchBtn.addEventListener('mouseleave', function() {
    this.style.opacity = '1';
    this.style.transform = 'scale(1)';
  });
};

/* ══════════════════════════════════════════════════════════════
   Refresh missile inventory display
══════════════════════════════════════════════════════════════ */
MissilePanel.prototype._refreshInventory = function() {
  var self = this;  // ✅ ADD THIS LINE
  
  var inventoryList = this.panel.querySelector('#inventory-list');
  if (!inventoryList) return;
  
  // Get inventory from VS (via window._VS)
  var VS = window._VS;
  var inv = { basic: 0, precision: 0, ballistic: 0, mirv: 0, interceptor: 0 };
  var canAfford = {};
  
  if (VS && VS.missileInventory) {
    inv = VS.missileInventory;
  }
  
  // Check affordability
  if (VS && VS.res) {
    Object.keys(MISSILE_COSTS).forEach(function(type) {
      var cost = MISSILE_COSTS[type];
      canAfford[type] = VS.res.gold >= cost.gold && VS.res.langis >= cost.langis;
    });
  }
  
  // Build inventory items
  var html = '';
  var missileTypes = ['basic', 'precision', 'ballistic', 'mirv'];
  
  missileTypes.forEach(function(type) {  // Now 'self' is defined here
    var info = getMissileDisplayInfo(type);
    var cost = MISSILE_COSTS[type];
    var count = inv[type] || 0;
    var canBuy = canAfford[type] || false;
    var selected = self.selectedMissileType === type ? 'border:2px solid #f5c842; background:rgba(245,200,66,0.1);' : 'border:1px solid #6a4a18;';
    
    html += `
      <div class="missile-type-item" data-type="${type}" style="
        padding:10px; border-radius:6px; cursor:pointer; transition:all 0.2s; ${selected}
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:18px;">${info.icon}</span>
            <div>
              <div style="font-size:12px; font-weight:bold; color:${info.color};">${info.label}</div>
              <div style="font-size:9px; color:#8a8a8a;">${info.description}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px; color:#e8d8a0;">In Stock: <span style="color:${count > 0 ? '#44ff88' : '#ff6666'};">${count}</span></div>
            <div style="font-size:9px; color:#8a8a8a;">${cost.gold}🪙 ${cost.langis}🛢️</div>
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="buy-missile-btn" data-type="${type}" style="flex:1; background:${canBuy ? '#2a4a2a' : '#4a3a28'}; color:${canBuy ? '#88ff88' : '#8a8a8a'}; border:1px solid ${canBuy ? '#4a6a4a' : '#6a4a18'}; padding:4px; border-radius:3px; cursor:${canBuy ? 'pointer' : 'not-allowed'}; font-size:9px;">
            ${canBuy ? '✓ Buy' : 'Need Resources'}
          </button>
          <button class="select-missile-btn" data-type="${type}" style="flex:1; background:#4a3a28; color:#e8d8a0; border:1px solid #6a4a18; padding:4px; border-radius:3px; cursor:pointer; font-size:9px;">
            Select
          </button>
        </div>
      </div>
    `;
  });
  
  inventoryList.innerHTML = html;
  
  // Bind missile type selection
  inventoryList.querySelectorAll('.select-missile-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var type = this.getAttribute('data-type');
      self.selectedMissileType = type;
      self._refreshInventory();
      self._updateCostSummary();
    });
  });
  
  // Bind buy buttons
  inventoryList.querySelectorAll('.buy-missile-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var type = this.getAttribute('data-type');
      if (canAfford[type]) {
        self._buyMissile(type);
      }
    });
  });
};

/* ══════════════════════════════════════════════════════════════
   Buy missile (add to inventory)
══════════════════════════════════════════════════════════════ */
MissilePanel.prototype._buyMissile = function(type) {
  var VS = window._VS;
  if (!VS) return;
  
  var cost = MISSILE_COSTS[type];
  if (VS.res.gold < cost.gold || VS.res.langis < cost.langis) {
    if (window.showMsg) window.showMsg('Kulang ang resources!', 'warning');
    return;
  }
  
  // Deduct resources
  VS.res.gold -= cost.gold;
  VS.res.langis -= cost.langis;
  
  // Add to inventory
  VS.missileInventory = VS.missileInventory || { basic: 0, precision: 0, ballistic: 0, mirv: 0, interceptor: 0 };
  VS.missileInventory[type] = (VS.missileInventory[type] || 0) + 1;
  
  if (window.showMsg) {
    window.showMsg('✓ Binili ang ' + type.toUpperCase() + ' missile! (' + cost.gold + '🪙 ' + cost.langis + '🛢️)', 'success');
  }
  
  this._refreshInventory();
};

/* ══════════════════════════════════════════════════════════════
   Fill target coordinates from scout or clipboard
══════════════════════════════════════════════════════════════ */
MissilePanel.prototype._fillTargetCoords = function(coords) {
  if (!coords) return;
  
  this.panel.querySelector('#target-x').value = coords.targetX || coords.x || '';
  this.panel.querySelector('#target-y').value = coords.targetY || coords.y || '';
  this.panel.querySelector('#target-zone').value = coords.targetZone || coords.zone || '';
  this.panel.querySelector('#target-name').value = coords.targetName || coords.name || '';
  
  this.targetCoords = coords;
  this._updateCostSummary();
};

/* ══════════════════════════════════════════════════════════════
   Paste coordinates from clipboard
══════════════════════════════════════════════════════════════ */
MissilePanel.prototype._pasteFromClipboard = function() {
  var self = this;
  
  if (navigator.clipboard) {
    navigator.clipboard.readText().then(function(text) {
      // Parse coordinate string: "X:123.45, Y:678.90, ZONE:SENTRO"
      var xMatch = text.match(/X:([\d.]+)/i);
      var yMatch = text.match(/Y:([\d.]+)/i);
      var zoneMatch = text.match(/ZONE:(\w+)/i);
      
      if (xMatch && yMatch) {
        self.panel.querySelector('#target-x').value = xMatch[1];
        self.panel.querySelector('#target-y').value = yMatch[1];
        if (zoneMatch) {
          self.panel.querySelector('#target-zone').value = zoneMatch[1];
        }
        self._updateCostSummary();
        if (window.showMsg) window.showMsg('📋 Coordinates pasted!', 'info');
      } else {
        if (window.showMsg) window.showMsg('Invalid coordinate format!', 'warning');
      }
    }).catch(function() {
      if (window.showMsg) window.showMsg('Clipboard access denied!', 'warning');
    });
  } else {
    if (window.showMsg) window.showMsg('Clipboard API not supported!', 'warning');
  }
};

/* ══════════════════════════════════════════════════════════════
   Update cost summary display
══════════════════════════════════════════════════════════════ */
MissilePanel.prototype._updateCostSummary = function() {
  var summaryEl = this.panel.querySelector('#cost-summary');
  if (!summaryEl || !this.selectedMissileType) {
    summaryEl.textContent = 'Select a missile type to see cost';
    return;
  }
  
  var cost = MISSILE_COSTS[this.selectedMissileType];
  var totalGold = cost.gold * this.launchCount;
  var totalLangis = cost.langis * this.launchCount;
  
  summaryEl.innerHTML = `
    <span style="color:#f5c842;">${this.selectedMissileType.toUpperCase()}</span> × ${this.launchCount} = 
    <span style="color:#f5c842;">${totalGold}🪙</span> 
    <span style="color:#88ccff;">${totalLangis}🛢️</span>
  `;
  
  // Check affordability
  var VS = window._VS;
  var canAfford = VS && VS.res && VS.res.gold >= totalGold && VS.res.langis >= totalLangis;
  var hasMissiles = VS && VS.missileInventory && (VS.missileInventory[this.selectedMissileType] || 0) >= this.launchCount;
  
  this.launchBtn.disabled = !canAfford || !hasMissiles;
  this.launchBtn.style.opacity = this.launchBtn.disabled ? '0.5' : '1';
  this.launchBtn.style.cursor = this.launchBtn.disabled ? 'not-allowed' : 'pointer';
  
  // Show warning if can't afford
  if (!canAfford) {
    summaryEl.innerHTML += ' <span style="color:#ff6666;">(Kulang ang resources!)</span>';
  }
  if (!hasMissiles) {
    summaryEl.innerHTML += ' <span style="color:#ff6666;">(Kulang ang missile stock!)</span>';
  }
};

/* ══════════════════════════════════════════════════════════════
   Handle launch button click
══════════════════════════════════════════════════════════════ */
MissilePanel.prototype._handleLaunch = function() {
  var self = this;
  
  if (!this.selectedMissileType) {
    if (window.showMsg) window.showMsg('Pumili muna ng missile type!', 'warning');
    return;
  }
  
  // Get target coordinates
  var targetX = parseFloat(this.panel.querySelector('#target-x').value);
  var targetY = parseFloat(this.panel.querySelector('#target-y').value);
  var targetZone = this.panel.querySelector('#target-zone').value.trim();
  var targetName = this.panel.querySelector('#target-name').value.trim();
  
  if (!targetX || !targetY || !targetZone || !targetName) {
    if (window.showMsg) window.showMsg('Kumpletuhin ang target coordinates!', 'warning');
    return;
  }
  
  // Check inventory
  var VS = window._VS;
  var inv = VS?.missileInventory || {};
  var hasMissiles = (inv[this.selectedMissileType] || 0) >= this.launchCount;
  
  if (!hasMissiles) {
    if (window.showMsg) window.showMsg('Kulang ang missile sa inventory!', 'warning');
    return;
  }
  
  // Check resources
  var cost = MISSILE_COSTS[this.selectedMissileType];
  var totalGold = cost.gold * this.launchCount;
  var totalLangis = cost.langis * this.launchCount;
  
  if (VS.res.gold < totalGold || VS.res.langis < totalLangis) {
    if (window.showMsg) window.showMsg('Kulang ang resources!', 'warning');
    return;
  }
  
  // Call launch function from main.js
  if (window._launchMissile) {
    var result = window._launchMissile(
      this.selectedMissileType,
      targetX,
      targetY,
      targetZone,
      targetName,
      this.launchCount
    );
    
    if (result?.ok) {
      // Create tracking canvas for each missile
      for (var i = 0; i < this.launchCount; i++) {
        this._createTrackingCanvas(result.missile);
      }
      
      // Refresh UI
      this._refreshInventory();
      this._refreshHistory();
      this._refreshActiveMissiles();
      
      // Close panel or keep open for more launches
      if (this.options.autoCloseOnLaunch) {
        this.close();
      }
    } else {
      if (window.showMsg) window.showMsg(result?.msg || 'Launch failed!', 'danger');
    }
  } else {
    if (window.showMsg) window.showMsg('Missile system not initialized!', 'danger');
  }
};

/* ══════════════════════════════════════════════════════════════
   Create tracking canvas for active missile
══════════════════════════════════════════════════════════════ */
MissilePanel.prototype._createTrackingCanvas = function(missile) {
  if (!missile) return;
  
  var container = document.createElement('div');
  container.id = 'track-' + missile.id;
  container.style.cssText = 'border:1px solid #4a6aff; border-radius:6px; overflow:hidden;';
  
  this.trackingContainer.appendChild(container);
  document.getElementById('no-active-missiles').style.display = 'none';
  
  // Create tracking instance
  var tracking = createMissileTracking(container, {
    missile: missile,
    target: { name: missile.targetName, zone: missile.targetZone },
    missileType: missile.type,
    launchTime: missile.launchTime,
    impactTime: missile.impactTime,
    eta: missile.eta,
    onCancel: function() {
      if (window._cancelMissile) {
        window._cancelMissile(missile.id);
      }
    },
    onComplete: function() {
      // Remove tracking after completion
      setTimeout(function() {
        container.remove();
      }, 3000);
    },
    onUpdate: function(state) {
      // Update external state if needed
    }
  });
  
  tracking.start();
  this.activeTrackings.push({ id: missile.id, tracking: tracking, container: container });
};

/* ══════════════════════════════════════════════════════════════
   Refresh active missiles display
══════════════════════════════════════════════════════════════ */
MissilePanel.prototype._refreshActiveMissiles = function() {
  var VS = window._VS;
  if (!VS || !VS.missiles) return;
  
  // Get tracking data from missileWarfare.js
  if (window._getMissileTracking) {
    var data = window._getMissileTracking();
    
    // Clear existing trackings
    this.activeTrackings.forEach(function(t) {
      t.tracking.destroy();
      t.container.remove();
    });
    this.activeTrackings = [];
    
    // Create new trackings for outgoing missiles
    if (data.outgoing && data.outgoing.length > 0) {
      document.getElementById('no-active-missiles').style.display = 'none';
      data.outgoing.forEach(function(m) {
        self._createTrackingCanvas(m);
      });
    } else {
      document.getElementById('no-active-missiles').style.display = 'block';
    }
  }
};

/* ══════════════════════════════════════════════════════════════
   Refresh launch history display
══════════════════════════════════════════════════════════════ */
MissilePanel.prototype._refreshHistory = function() {
  var VS = window._VS;
  if (!VS || !VS.missiles || !VS.missiles.history) {
    this.historyEl.innerHTML = '<p style="font-size:10px; color:#6a6a6a; text-align:center; padding:10px;">No history yet</p>';
    return;
  }
  
  var history = VS.missiles.history.slice(0, 10);
  var html = '';
  
  history.forEach(function(entry) {
    var icon = entry.type === 'outgoing' ? '🚀' : '⚠️';
    var resultIcon = entry.result === 'hit' ? '💥' : (entry.result === 'intercepted' ? '🛡️' : '✗');
    var resultColor = entry.result === 'hit' ? '#44ff88' : (entry.result === 'intercepted' ? '#88ccff' : '#ff6666');
    var timeAgo = Math.floor((Date.now() - entry.timestamp) / 1000);
    var timeStr = timeAgo < 60 ? timeAgo + 's ago' : Math.floor(timeAgo / 60) + 'm ago';
    
    html += `
      <div style="padding:8px; background:rgba(0,0,0,0.3); border-radius:4px; border-left:3px solid ${resultColor};">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <span style="font-size:11px; color:#e8d8a0;">${icon} ${entry.missileType?.toUpperCase() || 'UNKNOWN'}</span>
          <span style="font-size:9px; color:#6a6a6a;">${timeStr}</span>
        </div>
        <div style="font-size:10px; color:#8a8a8a;">
          ${entry.type === 'outgoing' ? '→ ' + (entry.target || entry.attacker || 'Unknown') : '← ' + (entry.attacker || 'Unknown')}
        </div>
        <div style="font-size:9px; color:${resultColor}; margin-top:4px;">
          ${resultIcon} ${entry.result?.toUpperCase() || 'UNKNOWN'}
          ${entry.buildingsHit ? ' • ' + entry.buildingsHit + ' buildings' : ''}
          ${entry.loot?.gold ? ' • +' + entry.loot.gold + '🪙' : ''}
        </div>
      </div>
    `;
  });
  
  this.historyEl.innerHTML = html || '<p style="font-size:10px; color:#6a6a6a; text-align:center; padding:10px;">No history yet</p>';
};

/* ══════════════════════════════════════════════════════════════
   Open the panel
══════════════════════════════════════════════════════════════ */
MissilePanel.prototype.open = function(prefillData) {
  this.panel.style.display = 'block';
  
  // Trigger reflow for transition
  void this.panel.offsetWidth;
  
  this.panel.style.opacity = '1';
  this.isOpen = true;
  
  // Refresh data
  this._refreshInventory();
  this._refreshHistory();
  this._refreshActiveMissiles();
  
  // Pre-fill coordinates if provided
  if (prefillData) {
    this._fillTargetCoords(prefillData);
  }
  
  // Reset selection
  this.selectedMissileType = null;
  this._updateCostSummary();
};

/* ══════════════════════════════════════════════════════════════
   Close the panel
══════════════════════════════════════════════════════════════ */
MissilePanel.prototype.close = function() {
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
MissilePanel.prototype.update = function() {
  if (!this.isOpen) return;
  
  // Refresh inventory (may have changed from other actions)
  this._refreshInventory();
  
  // Update active missile tracking
  this._refreshActiveMissiles();
};

/* ══════════════════════════════════════════════════════════════
   Destroy the panel
══════════════════════════════════════════════════════════════ */
MissilePanel.prototype.destroy = function() {
  // Clean up tracking canvases
  this.activeTrackings.forEach(function(t) {
    t.tracking.destroy();
  });
  this.activeTrackings = [];
  
  // Remove panel from DOM
  if (this.panel && this.panel.parentNode) {
    this.panel.parentNode.removeChild(this.panel);
  }
};

/* ══════════════════════════════════════════════════════════════
   Factory Function: Create missile panel instance
══════════════════════════════════════════════════════════════ */
export function createMissilePanel(container, options) {
  return new MissilePanel(container, options);
}

/* ══════════════════════════════════════════════════════════════
   Global Panel Instance (for window access)
══════════════════════════════════════════════════════════════ */
var _globalPanel = null;

/* ══════════════════════════════════════════════════════════════
   Initialize global missile panel
   Called from main.js init()
══════════════════════════════════════════════════════════════ */
export function initMissilePanel() {
  if (_globalPanel) return _globalPanel;
  
  // Create hidden container for panel
  var container = document.createElement('div');
  container.id = 'missile-panel-container';
  container.style.display = 'none';
  document.body.appendChild(container);
  
  _globalPanel = createMissilePanel(container, {
    prefill: null,
    autoCloseOnLaunch: false,
    onLaunch: function(missile) {
      console.log('[MissilePanel] Launched:', missile);
    },
    onClose: function() {
      console.log('[MissilePanel] Closed');
    }
  });
  
  // Expose to window for main.js integration
  window.showMissilePanel = function(prefillData) {
    if (_globalPanel) {
      _globalPanel.open(prefillData);
    }
  };
  
  window.closeMissilePanel = function() {
    if (_globalPanel) {
      _globalPanel.close();
    }
  };
  
  window.updateMissilePanel = function() {
    if (_globalPanel) {
      _globalPanel.update();
    }
  };
  
  return _globalPanel;
}

/* ══════════════════════════════════════════════════════════════
   Export Public API
══════════════════════════════════════════════════════════════ */
// export {
//   MissilePanel,
//   createMissilePanel,
//   initMissilePanel,
//   _globalPanel as getGlobalMissilePanel
// };