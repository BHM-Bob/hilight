document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const enableSwitch = document.getElementById('enable-switch');
  const statusText = document.querySelector('.status-text');
  const clearAllButton = document.getElementById('clear-all-button');
  
  // 初始化：从存储中获取启用状态
  chrome.storage.sync.get(['hilightEnabled'], function(result) {
    const isEnabled = result.hilightEnabled !== false; // 默认为启用
    enableSwitch.checked = isEnabled;
    updateStatusText(isEnabled);
  });
  
  // 监听开关切换
  enableSwitch.addEventListener('change', function() {
    const isEnabled = enableSwitch.checked;
    
    // 保存状态到存储
    chrome.storage.sync.set({ hilightEnabled: isEnabled });
    
    // 更新状态文本
    updateStatusText(isEnabled);
    
    // 向当前活动标签页发送消息
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "toggle",
        enabled: isEnabled
      });
    });
  });
  
  // 监听清除所有高亮按钮点击
  clearAllButton.addEventListener('click', function() {
    // 向当前活动标签页发送清除高亮消息
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "clearAllHighlights"
      });
    });
    
    // 添加按钮点击反馈
    clearAllButton.textContent = "已清除!";
    clearAllButton.style.backgroundColor = "#4CAF50";
    
    // 1秒后恢复按钮状态
    setTimeout(function() {
      clearAllButton.textContent = "清除所有高亮";
      clearAllButton.style.backgroundColor = "";
    }, 1000);
  });
  
  // 更新状态文本
  function updateStatusText(isEnabled) {
    statusText.textContent = isEnabled ? "插件已启用" : "插件已禁用";
  }
});