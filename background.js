// chrome.action.onClicked.addListener((tab) => {
//   chrome.sidePanel.open({ windowId: tab.windowId });
// });
//============================
const TARGET_URL = "https://invi.ragory.com/";

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;

  if (tab.url.startsWith(TARGET_URL)) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel.html',
      enabled: true
    });
  } else {
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: false
    });
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.startsWith(TARGET_URL)) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});