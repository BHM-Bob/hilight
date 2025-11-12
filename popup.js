document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const enableSwitch = document.getElementById('enable-switch');
  const statusText = document.querySelector('.status-text');
  const clearAllButton = document.getElementById('clear-all-button');
  
  // 数据管理按钮
  const saveButton = document.getElementById('save-button');
  const loadButton = document.getElementById('load-button');
  const deleteButton = document.getElementById('delete-button');
  const exportButton = document.getElementById('export-button');
  const importButton = document.getElementById('import-button');
  const importFileInput = document.getElementById('import-file-input');
  
  // 显示通知函数
  function showNotification(title, message) {
    // 检查通知API是否可用
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'images/icon48.svg',
        title: title,
        message: message,
        priority: 0,
        isClickable: false
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.log('通知创建失败:', chrome.runtime.lastError.message);
        }
      });
    } else {
      // 如果通知API不可用，使用控制台日志作为备选方案
      console.log(`通知: ${title} - ${message}`);
    }
  }
  
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
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'clearAllHighlights'});
      
      // 显示清除成功提示
      statusText.textContent = '已清除所有高亮';
      showNotification('高亮清除', '已成功清除所有高亮');
      setTimeout(() => {
        updateStatusText();
      }, 2000);
    });
  });
  
  // 数据管理按钮事件
  saveButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'savePageHighlights'});
      
      // 显示保存成功提示
      statusText.textContent = '页面高亮已保存';
      showNotification('高亮保存', '页面高亮已成功保存');
      setTimeout(() => {
        updateStatusText();
      }, 2000);
    });
  });
  
  loadButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'loadPageHighlights'});
      
      // 显示加载提示
      statusText.textContent = '正在加载页面高亮...';
      showNotification('高亮加载', '正在加载页面高亮...');
      setTimeout(() => {
        updateStatusText();
      }, 2000);
    });
  });
  
  deleteButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'deletePageHighlights'});
      
      // 显示删除提示
      statusText.textContent = '页面高亮数据已删除';
      showNotification('高亮删除', '页面高亮数据已成功删除');
      setTimeout(() => {
        updateStatusText();
      }, 2000);
    });
  });
  
  exportButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'exportHighlights'});
      showNotification('高亮导出', '正在导出高亮数据...');
    });
  });
  
  importButton.addEventListener('click', function() {
    importFileInput.click();
  });
  
  importFileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          // 直接发送原始文本，让content.js解析
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'importHighlights', 
              data: e.target.result // 发送原始文本
            });
            
            // 显示导入提示
            statusText.textContent = '正在导入高亮数据...';
            showNotification('高亮导入', '正在导入高亮数据...');
          });
        } catch (error) {
          statusText.textContent = '导入失败：文件读取错误';
          showNotification('导入失败', '文件读取错误', 'error');
          setTimeout(() => {
            updateStatusText();
          }, 2000);
        }
      };
      reader.readAsText(file);
    }
    
    // 重置文件输入，以便可以再次选择同一文件
    event.target.value = '';
  });
  
  // 监听来自content.js的消息
  chrome.runtime.onMessage.addListener(function(message) {
    if (message.action === 'showStatus') {
      statusText.textContent = message.message;
      
      // 根据消息类型显示通知
      let notificationTitle = '高亮工具';
      if (message.message.includes('保存')) {
        notificationTitle = '保存成功';
      } else if (message.message.includes('加载')) {
        notificationTitle = '加载结果';
      } else if (message.message.includes('删除')) {
        notificationTitle = '删除结果';
      } else if (message.message.includes('导出')) {
        notificationTitle = '导出结果';
      } else if (message.message.includes('导入')) {
        notificationTitle = '导入结果';
      }
      
      showNotification(notificationTitle, message.message);
      
      // 2秒后恢复状态文本
      setTimeout(() => {
        updateStatusText();
      }, 2000);
    }
  });
  
  // 更新状态文本
  function updateStatusText(isEnabled) {
    if (isEnabled !== undefined) {
      statusText.textContent = isEnabled ? "插件已启用" : "插件已禁用";
    } else {
      chrome.storage.sync.get(['hilightEnabled'], function(result) {
        statusText.textContent = result.hilightEnabled !== false ? "插件已启用" : "插件已禁用";
      });
    }
  }
});