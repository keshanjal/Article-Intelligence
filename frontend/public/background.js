chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "analyze-text",
    title: "Summarize selected text",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "analyze-page",
    title: "Summarize this page",
    contexts: ["page"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "analyze-text" && info.selectionText) {
    chrome.storage.local.set({ ai_ext_text: info.selectionText, ai_ext_mode: 'text' });
    chrome.tabs.create({ url: 'index.html' });
  } else if (info.menuItemId === "analyze-page") {
    chrome.storage.local.set({ ai_ext_url: tab.url, ai_ext_mode: 'url' });
    chrome.tabs.create({ url: 'index.html' });
  }
});