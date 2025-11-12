document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const enableSwitch = document.getElementById('enable-switch');
  const positionModeSelect = document.getElementById('position-mode');
  const clearAllBtn = document.getElementById('clear-all-btn');
  
  // 初始化
  init();
  
  // 初始化函数
  function init() {
    // 获取当前插件状态
    chrome.storage.sync.get(['isEnabled', 'iconPositionMode'], function(result) {
      if (result.isEnabled !== undefined) {
        enableSwitch.checked = result.isEnabled;
      }
      
      if (result.iconPositionMode !== undefined) {
        positionModeSelect.value = result.iconPositionMode;
      }
    });
    
    // 添加事件监听器
    enableSwitch.addEventListener('change', handleSwitchChange);
    positionModeSelect.addEventListener('change', handlePositionModeChange);
    clearAllBtn.addEventListener('click', handleClearAllHighlights);
  }
  
  // 处理开关状态变化
  function handleSwitchChange() {
    const isEnabled = enableSwitch.checked;
    
    // 保存状态
    chrome.storage.sync.set({ isEnabled: isEnabled });
    
    // 通知内容脚本更新状态
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'updateState',
        isEnabled: isEnabled
      });
    });
    
    // 更新状态文本
    updateStatusText(isEnabled);
  }
  
  // 处理位置模式变化
  function handlePositionModeChange() {
    const iconPositionMode = positionModeSelect.value;
    
    // 保存状态
    chrome.storage.sync.set({ iconPositionMode: iconPositionMode });
    
    // 通知内容脚本更新状态
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'updateState',
        iconPositionMode: iconPositionMode
      });
    });
  }
  
  // 处理清除所有高亮
  function handleClearAllHighlights() {
    // 通知内容脚本清除所有高亮
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'clearAllHighlights'
      });
    });
    
    // 显示清除成功的反馈
    const originalText = clearAllBtn.textContent;
    clearAllBtn.textContent = '已清除！';
    clearAllBtn.style.backgroundColor = '#4CAF50';
    
    // 1秒后恢复原始文本
    setTimeout(() => {
      clearAllBtn.textContent = originalText;
      clearAllBtn.style.backgroundColor = '';
    }, 1000);
  }
  
  // 更新状态文本
  function updateStatusText(isEnabled) {
    // 这里可以根据需要更新UI状态文本
    // 由于当前popup.html中没有状态文本元素，所以暂时留空
  }
});