// 后台服务工作线程

// 初始化插件状态
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    isEnabled: true,
    highlightColor: '#ffff00',
    iconPositionMode: 'follow', // 'follow' 或 'dock'
    customColors: []
  });
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getHighlightState') {
    chrome.storage.sync.get(['isEnabled', 'highlightColor', 'iconPositionMode', 'customColors'], (result) => {
      sendResponse({
        isEnabled: result.isEnabled !== undefined ? result.isEnabled : true,
        highlightColor: result.highlightColor || '#ffff00',
        iconPositionMode: result.iconPositionMode || 'follow',
        customColors: result.customColors || []
      });
    });
    return true; // 保持消息通道开放，等待异步响应
  }
  
  // 监听来自选项页面的更新消息
  if (message.action === 'updateHighlightSettings') {
    // 保存设置
    chrome.storage.sync.set({
      isEnabled: message.isEnabled,
      highlightColor: message.highlightColor,
      iconPositionMode: message.iconPositionMode,
      customColors: message.customColors
    });
    
    // 向所有标签页发送更新消息
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateState',
          isEnabled: message.isEnabled,
          highlightColor: message.highlightColor,
          iconPositionMode: message.iconPositionMode,
          customColors: message.customColors
        });
      });
    });
  }
});