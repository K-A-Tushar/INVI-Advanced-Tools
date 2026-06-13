(function () {
  'use strict';

  const DEFAULT_KEYWORDS = ["Sachet", "Sashet", "Sashets", "(sachet)", "(sashets)"];
  let LOWER_KEYS = DEFAULT_KEYWORDS.map(k => k.toLowerCase());
  let FILTER_ENABLED = true;

  function getText(node) {
    return (node ? (node.innerText || node.textContent || '') : '').trim();
  }

  function isSachetRow(row) {
    if (!FILTER_ENABLED || LOWER_KEYS.length === 0) return false;
    const text = getText(row).toLowerCase();
    return LOWER_KEYS.some(k => k && text.includes(k));
  }

  function applyKeywordFilter() {
    document.querySelectorAll('#summery_table tbody tr, table tbody tr').forEach(function (row) {
      if (isSachetRow(row)) {
        row.setAttribute('data-invi-hidden', '1');
        row.style.setProperty('display', 'none', 'important');
      } else {
        if (row.getAttribute('data-invi-hidden') === '1') {
          row.removeAttribute('data-invi-hidden');
          row.style.removeProperty('display');
        }
      }
    });
  }

  function clearKeywordFilter() {
    document.querySelectorAll('tr[data-invi-hidden="1"]').forEach(function (row) {
      row.removeAttribute('data-invi-hidden');
      row.style.removeProperty('display');
    });
  }

  document.addEventListener('INVI_UPDATE_KEYS_EVENT', function (e) {
    if (!e.detail) return;
    if (Array.isArray(e.detail)) {
      LOWER_KEYS = e.detail.map(k => k.toLowerCase());
    } else {
      if (Array.isArray(e.detail.keywords)) {
        LOWER_KEYS = e.detail.keywords.map(k => k.toLowerCase());
      }
      if (typeof e.detail.enabled === 'boolean') {
        FILTER_ENABLED = e.detail.enabled;
      }
    }
    if (FILTER_ENABLED) {
      applyKeywordFilter();
    } else {
      clearKeywordFilter();
    }
  });

  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(['invi_filter_keywords', 'invi_filter_enabled'], function (result) {
        if (result && result.invi_filter_keywords && Array.isArray(result.invi_filter_keywords)) {
          LOWER_KEYS = result.invi_filter_keywords.map(k => k.toLowerCase());
        }
        if (result && typeof result.invi_filter_enabled === 'boolean') {
          FILTER_ENABLED = result.invi_filter_enabled;
        }
        if (FILTER_ENABLED) applyKeywordFilter();
      });
    }
  } catch (e) { /* MAIN world may not have chrome.storage */ }

  // ── EXPORT ──────────────────────────────────────────────────────────────────
  function loadSheetJS(cb) {
    if (window.XLSX) { cb(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = cb;
    s.onerror = function () { alert('Failed to load SheetJS. Check your internet connection.'); };
    document.head.appendChild(s);
  }

  function getVisibleColumns(headerRow) {
    const visibleColIndexes = [], headers = [];
    headerRow.querySelectorAll('th, td').forEach(function (th, i) {
      const style = window.getComputedStyle(th);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      if (th.classList.contains('dtr-hidden')) return;

      let text = getText(th);

      const inputNode = th.querySelector('input');
      if (inputNode && text === '') {
        text = inputNode.getAttribute('placeholder') || '';
      }

      if (text === '') {
        text = 'Column_' + (i + 1);
      }

      visibleColIndexes.push(i);
      headers.push(text);
    });
    return { visibleColIndexes, headers };
  }

  function exportFilteredXlsx() {
    loadSheetJS(function () {
      const tableNode = document.getElementById('summery_table') || document.querySelector('table');
      if (!tableNode) { alert('Table not found!'); return; }

      // FIX 3: DataTables dynamic wrapper components search block target definition
      let allHeaderRows = document.querySelectorAll('.dataTables_scrollHead table thead tr');
      if (!allHeaderRows.length) {
        allHeaderRows = tableNode.querySelectorAll('thead tr');
      }
      if (!allHeaderRows.length) { alert('Table header not found!'); return; }

      // Ekdom accurately raw text data elements array filter extract korar trigger row targeting
      const lastHeaderRow = allHeaderRows[allHeaderRows.length - 1];
      const { visibleColIndexes, headers } = getVisibleColumns(lastHeaderRow);
      if (headers.length === 0) { alert('Could not read table headers.'); return; }

      const rows = [];
      tableNode.querySelectorAll('tbody tr').forEach(function (tr) {
        const style = window.getComputedStyle(tr);
        if (style.display === 'none') return;
        if (tr.classList.contains('dtr-hidden')) return;
        if (isSachetRow(tr)) return;
        const allCells = tr.querySelectorAll('td');
        const cells = [];
        visibleColIndexes.forEach(function (ci) {
          cells.push(allCells[ci] ? getText(allCells[ci]) : '');
        });
        if (cells.some(c => c !== '')) rows.push(cells);
      });

      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData, { raw: false });
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          if (!ws[addr]) continue;
          if (r === 0) {
            ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'E9ECEF' } } };
          } else {
            ws[addr].t = 's';
          }
        }
      }
      ws['!cols'] = headers.map(function (h, ci) {
        let max = h.length;
        rows.forEach(function (row) {
          const v = row[ci] != null ? String(row[ci]) : '';
          if (v.length > max) max = v.length;
        });
        return { wch: Math.min(max + 2, 55) };
      });
      const date = new Date();
      const year = date.getFullYear();
      // const month = date.toLocaleString('en-US', { month: 'short' });
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      const formattedDate = `${year}_${month}_${day}`;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventory Report');
      XLSX.writeFile(wb, `Inventory_Report_Filtered-${formattedDate}.xlsx`);
    });
  }

  let exportHookAttached = false;
  function hookExportButton() {
    const jq = window.jQuery || window.$;
    if (!jq) return false;
    jq(document).off('click.inviExport', '.buttons-excel, .dt-button.buttons-excel');
    jq(document).on('click.inviExport', '.buttons-excel, .dt-button.buttons-excel', function (e) {
      e.stopImmediatePropagation();
      e.preventDefault();
      exportFilteredXlsx();
    });
    exportHookAttached = true;
    return true;
  }

  let debounceTimer = null;
  const observer = new MutationObserver(function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      if (FILTER_ENABLED) applyKeywordFilter();
      if (!exportHookAttached) hookExportButton();
    }, 100);
  });

  function init() {
    if (FILTER_ENABLED) applyKeywordFilter();
    hookExportButton();
    observer.observe(document.documentElement, {
      childList: true, subtree: true,
      attributes: false, characterData: false
    });
    let tries = 0;
    const retryInterval = setInterval(function () {
      tries++;
      if (hookExportButton() || tries > 100) clearInterval(retryInterval);
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();