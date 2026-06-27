chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "unwind-translate",
    title: "Unwind Translation",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info: any, tab: any) => {
  if (info.menuItemId === "unwind-translate") {
    const text = info.selectionText;
    if (tab && text) {
      // Store the selected text so the side panel can read it when it loads
      chrome.storage.local.set({ unwindSelection: text }, () => {
        // Open the side panel for the current window
        chrome.sidePanel.open({ windowId: tab.windowId });
        // Also send a message in case the side panel is already open and doesn't reload
        chrome.runtime.sendMessage({ type: "UNWIND_TEXT", text });
      });
    }
  }
});

// Also allow opening the side panel when the extension action (icon) is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error: any) => console.error(error));
