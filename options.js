// 设置页面脚本

// 全局变量
let currentHighlightColor = '#ffff00';
let customColors = [];
let iconPositionMode = 'follow'; // 'follow' 或 'dock'

// 默认高亮颜色选项
const defaultHighlightColors = [
  { name: '黄色', value: '#ffff00' },
  { name: '亮黄', value: '#ffeb3b' },
  { name: '橙色', value: '#ff9800' },
  { name: '红色', value: '#f44336' },
  { name: '绿色', value: '#4caf50' },
  { name: '蓝色', value: '#2196f3' },
  { name: '紫色', value: '#9c27b0' }
];

// 初始化
function init() {
  // 加载保存的设置
  loadSettings();
  
  // 渲染颜色选项
  renderColorOptions();
  
  // 渲染自定义颜色
  renderCustomColors();
  
  // 渲染位置选项
  renderPositionOptions();
  
  // 添加事件监听器
  document.getElementById('global-enable-switch').addEventListener('change', handleGlobalSwitchChange);
  document.getElementById('position-follow').addEventListener('click', () => handlePositionChange('follow'));
  document.getElementById('position-dock').addEventListener('click', () => handlePositionChange('dock'));
  document.getElementById('add-color-btn').addEventListener('click', handleAddCustomColor);
  document.getElementById('custom-color-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddCustomColor();
  });
}

// 加载保存的设置
function loadSettings() {
  chrome.storage.sync.get(['isEnabled', 'highlightColor', 'iconPositionMode', 'customColors'], (result) => {
    // 设置全局开关状态
    const isEnabled = result.isEnabled !== undefined ? result.isEnabled : true;
    document.getElementById('global-enable-switch').checked = isEnabled;
    
    // 设置当前选中的颜色
    currentHighlightColor = result.highlightColor || '#ffff00';
    updateSelectedColor();
    
    // 设置图标位置模式
    iconPositionMode = result.iconPositionMode || 'follow';
    
    // 设置自定义颜色
    customColors = result.customColors || [];
  });
}

// 渲染颜色选项
function renderColorOptions() {
  const colorOptionsContainer = document.getElementById('color-options');
  
  // 清空容器
  colorOptionsContainer.innerHTML = '';
  
  // 添加默认颜色选项
  defaultHighlightColors.forEach(color => {
    const colorOption = document.createElement('div');
    colorOption.className = 'color-option';
    colorOption.style.backgroundColor = color.value;
    colorOption.setAttribute('data-color', color.value);
    colorOption.setAttribute('title', color.name);
    
    // 添加点击事件
    colorOption.addEventListener('click', () => {
      currentHighlightColor = color.value;
      updateSelectedColor();
      saveHighlightColor();
      showStatusMessage('默认高亮颜色已更新');
    });
    
    colorOptionsContainer.appendChild(colorOption);
  });
}

// 渲染自定义颜色
function renderCustomColors() {
  const customColorsContainer = document.getElementById('custom-colors');
  
  // 清空容器
  customColorsContainer.innerHTML = '';
  
  // 如果没有自定义颜色，显示提示信息
  if (customColors.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.style.color = '#999';
    emptyMessage.style.fontSize = '14px';
    emptyMessage.textContent = '暂无自定义颜色，在上方输入HEX颜色值添加';
    customColorsContainer.appendChild(emptyMessage);
    return;
  }
  
  // 添加自定义颜色选项
  customColors.forEach((color, index) => {
    const customColorItem = document.createElement('div');
    customColorItem.className = 'custom-color-item';
    
    const colorOption = document.createElement('div');
    colorOption.className = 'color-option';
    colorOption.style.backgroundColor = color;
    colorOption.setAttribute('data-color', color);
    colorOption.setAttribute('title', color);
    
    // 添加点击事件
    colorOption.addEventListener('click', () => {
      currentHighlightColor = color;
      updateSelectedColor();
      saveHighlightColor();
      showStatusMessage('默认高亮颜色已更新');
    });
    
    // 添加删除按钮
    const removeBtn = document.createElement('button');
    removeBtn.className = 'custom-color-remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止事件冒泡
      removeCustomColor(index);
    });
    
    customColorItem.appendChild(colorOption);
    customColorItem.appendChild(removeBtn);
    customColorsContainer.appendChild(customColorItem);
  });
}

// 渲染位置选项
function renderPositionOptions() {
  // 移除所有选中状态
  document.querySelectorAll('.position-option').forEach(option => {
    option.classList.remove('selected');
  });
  
  // 添加当前选中状态
  const selectedOption = document.getElementById(`position-${iconPositionMode}`);
  if (selectedOption) {
    selectedOption.classList.add('selected');
  }
}

// 更新选中的颜色
function updateSelectedColor() {
  // 移除所有选中状态
  document.querySelectorAll('.color-option').forEach(option => {
    option.classList.remove('selected');
  });
  
  // 添加当前选中状态
  const selectedOption = document.querySelector(`.color-option[data-color="${currentHighlightColor}"]`);
  if (selectedOption) {
    selectedOption.classList.add('selected');
  }
}

// 处理全局开关变化
function handleGlobalSwitchChange(event) {
  const isEnabled = event.target.checked;
  
  // 保存状态
  chrome.storage.sync.set({ isEnabled }, () => {
    // 发送消息到所有标签页更新状态
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: 'updateState', isEnabled });
      });
    });
    
    // 显示状态消息
    showStatusMessage(isEnabled ? 'Hilight已启用' : 'Hilight已禁用');
  });
}

// 处理位置变更
function handlePositionChange(mode) {
  iconPositionMode = mode;
  renderPositionOptions();
  
  // 保存位置设置
  chrome.storage.sync.set({ iconPositionMode }, () => {
    // 发送消息到所有标签页更新位置设置
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'updateState', 
          iconPositionMode 
        });
      });
    });
    
    // 显示状态消息
    showStatusMessage(`图标位置已设置为${mode === 'follow' ? '跟随鼠标' : '固定停靠'}`);
  });
}

// 处理添加自定义颜色
function handleAddCustomColor() {
  const colorInput = document.getElementById('custom-color-input');
  let colorValue = colorInput.value.trim();
  
  // 验证颜色格式
  if (!colorValue.match(/^#[0-9A-Fa-f]{6}$/)) {
    // 如果没有#前缀，尝试添加
    if (colorValue.match(/^[0-9A-Fa-f]{6}$/)) {
      colorValue = '#' + colorValue;
    } else {
      showStatusMessage('请输入有效的HEX颜色值，如 #ff0000');
      return;
    }
  }
  
  // 转换为大写以保持一致性
  colorValue = colorValue.toUpperCase();
  
  // 检查颜色是否已存在
  const defaultColorExists = defaultHighlightColors.some(color => color.value.toUpperCase() === colorValue);
  const customColorExists = customColors.some(color => color.toUpperCase() === colorValue);
  
  if (defaultColorExists || customColorExists) {
    showStatusMessage('该颜色已存在');
    return;
  }
  
  // 添加自定义颜色
  customColors.push(colorValue);
  
  // 保存自定义颜色
  chrome.storage.sync.set({ customColors }, () => {
    // 重新渲染自定义颜色
    renderCustomColors();
    
    // 清空输入框
    colorInput.value = '';
    
    // 发送消息到所有标签页更新自定义颜色
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'updateState', 
          customColors 
        });
      });
    });
    
    // 显示状态消息
    showStatusMessage('自定义颜色添加成功');
  });
}

// 移除自定义颜色
function removeCustomColor(index) {
  // 如果要移除的颜色是当前选中的颜色，切换到默认颜色
  if (customColors[index] === currentHighlightColor) {
    currentHighlightColor = '#ffff00';
    updateSelectedColor();
    saveHighlightColor();
  }
  
  // 从数组中移除自定义颜色
  customColors.splice(index, 1);
  
  // 保存自定义颜色
  chrome.storage.sync.set({ customColors }, () => {
    // 重新渲染自定义颜色
    renderCustomColors();
    
    // 发送消息到所有标签页更新自定义颜色
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'updateState', 
          customColors 
        });
      });
    });
    
    // 显示状态消息
    showStatusMessage('自定义颜色已移除');
  });
}

// 保存高亮颜色
function saveHighlightColor() {
  chrome.storage.sync.set({ highlightColor: currentHighlightColor }, () => {
    // 发送消息到所有标签页更新颜色
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'updateState', 
          highlightColor: currentHighlightColor 
        });
      });
    });
  });
}

// 显示状态消息
function showStatusMessage(message) {
  const statusMessage = document.getElementById('status-message');
  statusMessage.textContent = message;
  statusMessage.classList.add('show');
  
  // 3秒后隐藏消息
  setTimeout(() => {
    statusMessage.classList.remove('show');
  }, 3000);
}

// 当DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}