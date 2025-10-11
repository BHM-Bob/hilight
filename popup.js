// 弹出页面脚本

// 初始化
function init() {
  // 获取当前插件状态
  chrome.storage.sync.get(['isEnabled', 'highlightColor'], (result) => {
    const isEnabled = result.isEnabled !== undefined ? result.isEnabled : true;
    const enableSwitch = document.getElementById('enable-switch');
    enableSwitch.checked = isEnabled;
    updateStatusText(isEnabled);
  });
  
  // 监听开关变化
  document.getElementById('enable-switch').addEventListener('change', handleSwitchChange);
}

// 处理开关变化
function handleSwitchChange(event) {
  const isEnabled = event.target.checked;
  
  // 更新状态文本
  updateStatusText(isEnabled);
  
  // 保存状态到存储
  chrome.storage.sync.set({ isEnabled }, () => {
    // 发送消息到内容脚本更新状态
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'updateState', isEnabled });
      }
    });
  });
}

// 更新状态文本
function updateStatusText(isEnabled) {
  const statusText = document.querySelector('.status-text');
  statusText.textContent = isEnabled ? '插件已启用' : '插件已禁用';
}

// 当DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}