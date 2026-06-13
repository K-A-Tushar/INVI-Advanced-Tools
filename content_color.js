(function () {
  const DEFAULTS = {
    childBg: '#1a1f2e',
    childText: '#a0aec0',
    childHoverBg: '#2d3748',
    childHoverText: '#e2e8f0',
    accentColor: '#4299e1',
  };

  let hasScrolled = false;

  const styleEl = document.createElement('style');
  styleEl.id = 'invi-custom-style';
  document.documentElement.appendChild(styleEl);

  function applyStyles(cfg) {
    styleEl.textContent = `
      .nav-treeview {
        background: ${cfg.childBg} !important;
      }
      .nav-treeview .nav-item .nav-link {
        color: ${cfg.childText} !important;
        border-left: 3px solid transparent !important;
        padding-left: 14px !important;
        transition: background 0.18s, color 0.18s, border-color 0.18s !important;
      }
      .nav-treeview .nav-item .nav-link:hover,
      .nav-sidebar .nav-item .nav-link.active {
        background: ${cfg.childHoverBg} !important;
        color: ${cfg.childHoverText} !important;
        border-left-color: ${cfg.accentColor} !important;
        font-weight: 500 !important;
      }
      .nav-treeview .far.fa-circle {
        display: none !important;
      }
    `;
  }

  function highlightActiveMenu() {
    const currentUrl = window.location.href.split('?')[0].split('#')[0];
    const sidebarLinks = document.querySelectorAll('.nav-sidebar a.nav-link');
    let matchedLink = null;

    sidebarLinks.forEach(link => {
      const linkUrl = link.href.split('?')[0].split('#')[0];
      if (linkUrl === currentUrl && link.getAttribute('href') !== '#') {
        link.classList.add('active');
        matchedLink = link;
        let parentTreeview = link.closest('.nav-treeview');
        while (parentTreeview) {
          parentTreeview.style.display = 'block';
          const parentNavItem = parentTreeview.closest('.nav-item');
          if (parentNavItem) {
            const mainLink = parentNavItem.querySelector(':scope > a.nav-link');
            if (mainLink) mainLink.classList.add('active');
            parentNavItem.classList.add('menu-open');
          }
          const upperLevel = parentNavItem ? parentNavItem.parentElement.closest('.nav-treeview') : null;
          parentTreeview = upperLevel;
        }
      }
    });

    if (matchedLink && !hasScrolled) {
      setTimeout(() => {
        matchedLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
        hasScrolled = true;
      }, 100);
    }
  }

  highlightActiveMenu();
  const observer = new MutationObserver(() => highlightActiveMenu());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  chrome.storage.local.get(DEFAULTS, (cfg) => applyStyles(cfg));
  chrome.storage.onChanged.addListener(() => {
    chrome.storage.local.get(DEFAULTS, (cfg) => {
      applyStyles(cfg);
      highlightActiveMenu();
    });
  });
})();
