'use strict';

document.querySelectorAll('.tab-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = (type === 'error' ? '✗ ' : '✓ ') + msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  void t.offsetWidth;
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 2500);
}

const DEFAULT_KEYWORDS = ["Sachet", "Sashet", "Sashets", "(sachet)", "(sashets)"];
const STORAGE_KEY      = "invi_filter_keywords";
const ENABLED_KEY      = "invi_filter_enabled";

let keywords  = [...DEFAULT_KEYWORDS];
let isEnabled = true;
let isSaving  = false;

function loadFilterAll() {
  chrome.storage.sync.get([STORAGE_KEY, ENABLED_KEY], function (result) {
    if (chrome.runtime.lastError) {
      showToast('Storage error: ' + chrome.runtime.lastError.message, 'error');
      return;
    }
    if (result[STORAGE_KEY] && Array.isArray(result[STORAGE_KEY])) {
      keywords = result[STORAGE_KEY];
    }
    isEnabled = result[ENABLED_KEY] !== false;
    renderList();
    renderToggleUI();
    syncFilterToTab();
  });
}

function saveFilterAll(cb) {
  if (isSaving) return;
  isSaving = true;
  const data = {};
  data[STORAGE_KEY] = keywords;
  data[ENABLED_KEY] = isEnabled;
  chrome.storage.sync.set(data, function () {
    isSaving = false;
    if (chrome.runtime.lastError) {
      showToast('Save failed: ' + chrome.runtime.lastError.message, 'error');
      return;
    }
    if (cb) cb();
  });
}

function syncFilterToTab() {
  setSyncStatus('Syncing…', '');
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (chrome.runtime.lastError || !tabs || !tabs[0]) {
      setSyncStatus('No active tab', 'red'); return;
    }
    const tab = tabs[0];
    if (!tab.url || !tab.url.includes('invi.ragory.com')) {
      setSyncStatus('Not on INVI page', 'red'); return;
    }
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      args: [keywords, isEnabled],
      func: function (updatedKeywords, enabled) {
        document.dispatchEvent(new CustomEvent('INVI_UPDATE_KEYS_EVENT', {
          detail: { keywords: updatedKeywords, enabled: enabled }
        }));
        return true;
      }
    }, function () {
      if (chrome.runtime.lastError) {
        setSyncStatus('Sync failed', 'red');
      } else {
        setSyncStatus('Synced ✓', 'green');
        setTimeout(function () { setSyncStatus('—', ''); }, 3000);
      }
    });
  });
}

function renderList() {
  const list = document.getElementById('keywordList');
  document.getElementById('countVal').textContent = keywords.length;
  if (keywords.length === 0) {
    list.innerHTML = '<div class="empty-msg">No keywords — nothing will be filtered.</div>';
    return;
  }
  let html = '';
  for (let i = 0; i < keywords.length; i++) {
    html += '<div class="keyword-item">' +
      '<span class="keyword-text">' + escHtml(keywords[i]) + '</span>' +
      '<button class="delete-btn" data-index="' + i + '" title="Remove keyword">×</button>' +
      '</div>';
  }
  list.innerHTML = html;
  list.querySelectorAll('.delete-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const idx = parseInt(this.dataset.index, 10);
      if (!isNaN(idx) && idx >= 0 && idx < keywords.length) {
        keywords.splice(idx, 1);
        renderList();
      }
    });
  });
}

function renderToggleUI() {
  const checkbox   = document.getElementById('masterToggle');
  const statusTxt  = document.getElementById('toggleStatusText');
  const toggleRow  = document.getElementById('toggleRow');
  const filterBody = document.getElementById('filterBody');
  checkbox.checked = isEnabled;
  if (isEnabled) {
    statusTxt.textContent = '● Active — rows are being filtered';
    statusTxt.className   = 'on';
    toggleRow.className   = 'master-toggle-row active';
    filterBody.classList.remove('disabled');
  } else {
    statusTxt.textContent = '○ Paused — all rows are visible';
    statusTxt.className   = 'off';
    toggleRow.className   = 'master-toggle-row inactive';
    filterBody.classList.add('disabled');
  }
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setSyncStatus(text, color) {
  const el = document.getElementById('syncStatus');
  el.textContent = text;
  el.className = 'status-value' + (color ? ' ' + color : '');
}

function addKeyword() {
  const input = document.getElementById('newKeyword');
  const val   = input.value.trim();
  if (!val) return;
  if (keywords.some(k => k.toLowerCase() === val.toLowerCase())) {
    showToast('Keyword already exists', 'error');
    input.value = '';
    return;
  }
  keywords.push(val);
  input.value = '';
  renderList();
}

document.getElementById('masterToggle').addEventListener('change', function () {
  isEnabled = this.checked;
  renderToggleUI();
  saveFilterAll(function () {
    showToast(isEnabled ? 'Filter enabled' : 'Filter paused');
    syncFilterToTab();
  });
});
document.getElementById('addBtn').addEventListener('click', addKeyword);
document.getElementById('newKeyword').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') addKeyword();
});
document.getElementById('saveBtn').addEventListener('click', function () {
  saveFilterAll(function () {
    showToast('Saved & applied');
    syncFilterToTab();
  });
});
document.getElementById('resetBtn').addEventListener('click', function () {
  if (!confirm('Reset keywords to default list?')) return;
  keywords = [...DEFAULT_KEYWORDS];
  renderList();
  saveFilterAll(function () {
    showToast('Reset to defaults');
    syncFilterToTab();
  });
});

const COLOR_DEFAULTS = {
  childBg: '#1a1f2e',
  childText: '#a0aec0',
  childHoverBg: '#2d3748',
  childHoverText: '#e2e8f0',
  accentColor: '#4299e1',
};
const COLOR_KEYS = Object.keys(COLOR_DEFAULTS);

function updateHex(id, val) {
  const el = document.getElementById('hex-' + id);
  if (el) el.textContent = val;
}

function loadColorAll() {
  chrome.storage.local.get(COLOR_DEFAULTS, function (cfg) {
    COLOR_KEYS.forEach(function (k) {
      const input = document.getElementById(k);
      if (input) {
        input.value = cfg[k];
        updateHex(k, cfg[k]);
      }
    });
  });
}

COLOR_KEYS.forEach(function (k) {
  const input = document.getElementById(k);
  if (input) {
    input.addEventListener('input', function () { updateHex(k, input.value); });
  }
});

document.getElementById('colorSaveBtn').addEventListener('click', function () {
  const newCfg = {};
  COLOR_KEYS.forEach(function (k) {
    newCfg[k] = document.getElementById(k).value;
  });
  chrome.storage.local.set(newCfg, function () {
    showToast('Colors saved — refresh INVI tab', 'info');
  });
});

document.getElementById('colorResetBtn').addEventListener('click', function () {
  chrome.storage.local.set(COLOR_DEFAULTS, function () {
    COLOR_KEYS.forEach(function (k) {
      const input = document.getElementById(k);
      if (input) {
        input.value = COLOR_DEFAULTS[k];
        updateHex(k, COLOR_DEFAULTS[k]);
      }
    });
    showToast('Colors reset to defaults', 'info');
  });
});

loadFilterAll();
loadColorAll();
