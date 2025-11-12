// 内容脚本
let highlightIcon = null;
let highlightPopup = null;
let isPluginEnabled = true;
let currentHighlightColor = '#ffff00';
let selectedText = '';
let selectedRange = null;
let iconPositionMode = 'follow'; // 'follow' 或 'dock'
let customColors = [];
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

// 高亮颜色选项
const defaultHighlightColors = [
  '#ffff00', // 黄色
  '#ffeb3b', // 亮黄
  '#ff9800', // 橙色
  '#f44336', // 红色
  '#4caf50', // 绿色
  '#2196f3', // 蓝色
  '#9c27b0'  // 紫色
];

// 获取所有可用颜色（默认颜色 + 自定义颜色）
function getAllHighlightColors() {
  return [...defaultHighlightColors, ...customColors];
}

// 初始化
function init() {
  // 获取插件状态，在回调中根据返回的设置更新UI
  getPluginState();
}

// 获取插件状态
function getPluginState() {
  chrome.runtime.sendMessage({ action: 'getHighlightState' }, (response) => {
    if (response) {
      isPluginEnabled = response.isEnabled;
      currentHighlightColor = response.highlightColor;
      iconPositionMode = response.iconPositionMode || 'follow';
      customColors = response.customColors || [];
      
      // 根据更新后的位置模式调整UI
      updateIconPositionMode();
    }
  });
}

// 根据位置模式更新UI
function updateIconPositionMode() {
  // 首先移除所有可能的图标和事件监听
  hideHighlightIcon();
  document.removeEventListener('mouseup', handleTextSelection);
  
  // 根据新的位置模式调整
  if (iconPositionMode === 'follow') {
    document.addEventListener('mouseup', handleTextSelection);
  } else {
    // 如果是固定停靠模式，创建并显示固定位置的图标
    createDockedHighlightIcon();
  }
}

// 处理文本选择
function handleTextSelection(event) {
  if (!isPluginEnabled) return;
  
  // 仅在跟随鼠标模式下处理
  if (iconPositionMode !== 'follow') return;
  
  // 获取选中的文本
  selectedText = window.getSelection().toString().trim();
  selectedRange = window.getSelection().rangeCount > 0 ? window.getSelection().getRangeAt(0) : null;
  
  // 如果有选中的文本，显示高亮图标
  if (selectedText && selectedRange) {
    showHighlightIcon(event.clientX, event.clientY);
  } else {
    hideHighlightIcon();
    hideHighlightPopup();
  }
}

// 创建固定停靠的高亮图标
function createDockedHighlightIcon() {
  if (!highlightIcon) {
    // 创建高亮图标
    highlightIcon = document.createElement('div');
    highlightIcon.id = 'highlight-icon';
    highlightIcon.classList.add('highlight-icon');
    highlightIcon.classList.add('docked');
    highlightIcon.innerHTML = '✏️';
    
    // 添加点击事件
    highlightIcon.addEventListener('click', () => {
      const selection = window.getSelection();
      if (!selection.isCollapsed && selection.toString().trim()) {
        selectedText = selection.toString().trim();
        selectedRange = selection.getRangeAt(0);
        
        // 获取图标位置来显示弹出框
        const rect = highlightIcon.getBoundingClientRect();
        showHighlightPopup(rect.left, rect.top - 100);
      }
    });
    
    // 添加拖动相关事件
    highlightIcon.addEventListener('mousedown', startDragging);
    
    document.body.appendChild(highlightIcon);
  }
  
  // 默认位置：最右侧中间
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const iconWidth = 40;
  const iconHeight = 40;
  
  // 从本地存储获取位置设置（如果有）
  chrome.storage.sync.get(['dockedIconPosition'], (result) => {
    if (result.dockedIconPosition) {
      highlightIcon.style.left = result.dockedIconPosition.x + 'px';
      highlightIcon.style.top = result.dockedIconPosition.y + 'px';
    } else {
      // 默认位置
      highlightIcon.style.left = (viewportWidth - iconWidth - 20) + 'px';
      highlightIcon.style.top = (viewportHeight / 2 - iconHeight / 2) + 'px';
    }
    highlightIcon.style.display = 'block';
  });
}

// 开始拖动
function startDragging(e) {
  if (iconPositionMode !== 'dock') return;
  
  isDragging = true;
  dragStartX = e.clientX - highlightIcon.offsetLeft;
  dragStartY = e.clientY - highlightIcon.offsetTop;
  
  document.addEventListener('mousemove', dragIcon);
  document.addEventListener('mouseup', stopDragging);
  
  // 阻止默认行为和事件冒泡
  e.preventDefault();
  e.stopPropagation();
}

// 拖动图标
function dragIcon(e) {
  if (!isDragging) return;
  
  const x = e.clientX - dragStartX;
  const y = e.clientY - dragStartY;
  
  // 确保图标不会被拖出视口
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const iconWidth = highlightIcon.offsetWidth;
  const iconHeight = highlightIcon.offsetHeight;
  
  const boundedX = Math.max(0, Math.min(x, viewportWidth - iconWidth));
  const boundedY = Math.max(0, Math.min(y, viewportHeight - iconHeight));
  
  highlightIcon.style.left = boundedX + 'px';
  highlightIcon.style.top = boundedY + 'px';
}

// 停止拖动
function stopDragging() {
  if (!isDragging) return;
  
  isDragging = false;
  document.removeEventListener('mousemove', dragIcon);
  document.removeEventListener('mouseup', stopDragging);
  
  // 保存位置到本地存储
  if (iconPositionMode === 'dock') {
    const position = {
      x: highlightIcon.offsetLeft,
      y: highlightIcon.offsetTop
    };
    chrome.storage.sync.set({ dockedIconPosition: position });
  }
}

// 显示高亮图标（跟随鼠标模式）
function showHighlightIcon(x, y) {
  if (iconPositionMode !== 'follow') return;
  
  if (!highlightIcon) {
    // 创建高亮图标
    highlightIcon = document.createElement('div');
    highlightIcon.id = 'highlight-icon';
    highlightIcon.classList.add('highlight-icon');
    highlightIcon.innerHTML = '✏️';
    
    // 添加点击事件
    highlightIcon.addEventListener('click', () => {
      showHighlightPopup(x, y);
    });
    
    document.body.appendChild(highlightIcon);
  }
  
  // 设置图标位置
  highlightIcon.style.left = x + 'px';
  highlightIcon.style.top = y + 'px';
  highlightIcon.style.display = 'block';
}

// 隐藏高亮图标（仅在跟随鼠标模式下）
function hideHighlightIcon() {
  if (iconPositionMode !== 'follow' || !highlightIcon) return;
  
  document.body.removeChild(highlightIcon);
  highlightIcon = null;
}

// 显示高亮弹出框
function showHighlightPopup(x, y) {
  // 移除已有的弹出框
  hideHighlightPopup();
  
  // 创建颜色选择弹出框
  highlightPopup = document.createElement('div');
  highlightPopup.id = 'highlight-popup';
  highlightPopup.classList.add('highlight-popup');
  highlightPopup.style.position = 'fixed';
  highlightPopup.style.left = x + 'px';
  highlightPopup.style.top = y + 'px';
  highlightPopup.style.zIndex = '10000';
  
  // 添加颜色选项（使用所有可用颜色，包括默认颜色和自定义颜色）
  const allColors = getAllHighlightColors();
  allColors.forEach(color => {
    const colorOption = document.createElement('div');
    colorOption.classList.add('highlight-color-option');
    colorOption.style.backgroundColor = color;
    colorOption.style.border = color === currentHighlightColor ? '2px solid #000' : '2px solid transparent';
    
    // 设置选中颜色
    colorOption.addEventListener('click', () => {
      currentHighlightColor = color;
      highlightSelectedText();
    });
    
    highlightPopup.appendChild(colorOption);
  });
  
  // 添加清除高亮选项
  const clearOption = document.createElement('div');
  clearOption.classList.add('highlight-clear-option');
  clearOption.textContent = '清除';
  
  clearOption.addEventListener('mouseenter', () => {
    clearOption.style.backgroundColor = '#f0f0f0';
  });
  
  clearOption.addEventListener('mouseleave', () => {
    clearOption.style.backgroundColor = 'transparent';
  });
  
  clearOption.addEventListener('click', () => {
    clearHighlights();
  });
  
  highlightPopup.appendChild(clearOption);
  
  document.body.appendChild(highlightPopup);
  
  // 添加全局点击事件以关闭弹出框
  setTimeout(() => {
    document.addEventListener('click', hideHighlightPopupOnClickOutside);
  }, 0);
}

// 隐藏高亮图标（仅在跟随鼠标模式下）
function hideHighlightIcon() {
  if (iconPositionMode !== 'follow' || !highlightIcon) return;
  
  document.body.removeChild(highlightIcon);
  highlightIcon = null;
}

// 隐藏高亮弹出框
function hideHighlightPopup() {
  if (highlightPopup) {
    document.body.removeChild(highlightPopup);
    highlightPopup = null;
    
    // 移除全局点击事件
    document.removeEventListener('click', hideHighlightPopupOnClickOutside);
  }
}

// 点击外部关闭弹出框
function hideHighlightPopupOnClickOutside(event) {
  if (highlightPopup && !highlightPopup.contains(event.target) && 
      highlightIcon && !highlightIcon.contains(event.target)) {
    hideHighlightPopup();
  }
}

// 清除高亮
function clearHighlights() {
  const highlightedElements = document.querySelectorAll('span.highlight-text');
  highlightedElements.forEach(element => {
    element.outerHTML = element.innerHTML;
  });
  
  hideHighlightPopup();
}

// 获取最高的z-index值
function getMaxZIndex() {
  let maxZIndex = 10; // 默认最低z-index
  const elements = document.querySelectorAll('span.highlight-text');
  
  elements.forEach(element => {
    const zIndex = parseInt(window.getComputedStyle(element).getPropertyValue('z-index'));
    if (!isNaN(zIndex) && zIndex > maxZIndex) {
      maxZIndex = zIndex;
    }
  });
  
  return maxZIndex;
}

// 分解Range为多个文本段
function decomposeRange(range) {
  const segments = [];
  
  // 获取范围内的所有节点
  const startNode = range.startContainer;
  const endNode = range.endContainer;
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;
  
  // 如果开始和结束是同一个文本节点
  if (startNode === endNode && startNode.nodeType === Node.TEXT_NODE) {
    segments.push({
      node: startNode,
      startOffset: startOffset,
      endOffset: endOffset
    });
    return segments;
  }
  
  // 处理开始节点
  if (startNode.nodeType === Node.TEXT_NODE) {
    segments.push({
      node: startNode,
      startOffset: startOffset,
      endOffset: startNode.length
    });
  }
  
  // 使用TreeWalker遍历范围内的所有节点
  const treeWalker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // 只接受在范围内的文本节点
        if (range.intersectsNode(node)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_REJECT;
      }
    }
  );
  
  let currentNode = treeWalker.currentNode;
  
  // 跳过开始节点（已经处理）
  if (currentNode === startNode) {
    currentNode = treeWalker.nextNode();
  }
  
  // 处理中间的所有文本节点
  while (currentNode && currentNode !== endNode) {
    segments.push({
      node: currentNode,
      startOffset: 0,
      endOffset: currentNode.length
    });
    currentNode = treeWalker.nextNode();
  }
  
  // 处理结束节点
  if (endNode && endNode.nodeType === Node.TEXT_NODE && endNode !== startNode) {
    segments.push({
      node: endNode,
      startOffset: 0,
      endOffset: endOffset
    });
  }
  
  return segments;
}

// 高亮单个文本段
function highlightTextSegment(segment, zIndex) {
  const { node, startOffset, endOffset } = segment;
  
  // 如果文本段为空，则跳过
  if (startOffset === endOffset) return null;
  
  // 创建高亮元素
  const highlightElement = document.createElement('span');
  highlightElement.classList.add('highlight-text');
  highlightElement.style.backgroundColor = currentHighlightColor;
  highlightElement.style.padding = '1px 2px';
  highlightElement.style.borderRadius = '2px';
  highlightElement.style.cursor = 'pointer';
  highlightElement.style.position = 'relative'; // 确保z-index生效
  highlightElement.style.zIndex = zIndex; // 设置更高的z-index
  
  // 添加点击事件以取消高亮
  highlightElement.addEventListener('click', function() {
    this.outerHTML = this.innerHTML;
  });
  
  // 创建范围并高亮文本
  const range = document.createRange();
  range.setStart(node, startOffset);
  range.setEnd(node, endOffset);
  
  try {
    // 用高亮元素包裹选中的文本
    range.surroundContents(highlightElement);
    return highlightElement;
  } catch (e) {
    console.error('高亮文本段失败:', e);
    return null;
  }
}

// 高亮选中的文本
function highlightSelectedText() {
  if (!selectedText || !selectedRange) return;
  
  // 获取当前最大的z-index值，确保新的高亮元素显示在上层
  const maxZIndex = getMaxZIndex() + 1;
  
  // 检查选中的文本范围内是否已经有高亮元素
  const existingHighlights = getHighlightsInRange(selectedRange);
  
  // 如果有重叠的高亮元素，先移除它们
  if (existingHighlights.length > 0) {
    removeHighlights(existingHighlights);
  }
  
  // 尝试使用原有的高亮方法
  try {
    // 创建一个新的span元素来包裹选中的文本
    const highlightElement = document.createElement('span');
    highlightElement.classList.add('highlight-text');
    highlightElement.style.backgroundColor = currentHighlightColor;
    highlightElement.style.padding = '1px 2px';
    highlightElement.style.borderRadius = '2px';
    highlightElement.style.cursor = 'pointer';
    highlightElement.style.position = 'relative'; // 确保z-index生效
    highlightElement.style.zIndex = maxZIndex; // 设置更高的z-index
    
    // 添加点击事件以取消高亮
    highlightElement.addEventListener('click', function() {
      this.outerHTML = this.innerHTML;
    });
    
    // 复制选中范围
    const newRange = selectedRange.cloneRange();
    
    // 尝试用高亮元素包裹选中的文本
    newRange.surroundContents(highlightElement);
  } catch (e) {
    // 如果选择的内容跨越多个元素，使用逐行高亮方法
    const segments = decomposeRange(selectedRange);
    const highlightElements = [];
    
    // 对每个文本段进行高亮
    segments.forEach(segment => {
      const highlightElement = highlightTextSegment(segment, maxZIndex);
      if (highlightElement) {
        highlightElements.push(highlightElement);
      }
    });
  }
  
  // 保存高亮颜色设置
  chrome.storage.sync.set({ highlightColor: currentHighlightColor });
  
  // 隐藏高亮弹出框
  hideHighlightPopup();
  
  // 仅在跟随鼠标模式下隐藏图标
  if (iconPositionMode === 'follow') {
    hideHighlightIcon();
  }
  
  // 清除选择
  window.getSelection().removeAllRanges();
  selectedText = '';
  selectedRange = null;
}

// 获取指定范围内的所有高亮元素
function getHighlightsInRange(range) {
  const highlights = [];
  
  // 获取范围内的所有元素
  const startNode = range.startContainer;
  const endNode = range.endContainer;
  
  // 如果开始和结束是同一个节点
  if (startNode === endNode && startNode.nodeType === Node.TEXT_NODE) {
    // 获取父元素中的所有高亮元素
    const parentHighlights = Array.from(startNode.parentNode.querySelectorAll('span.highlight-text'));
    return parentHighlights.filter(highlight => {
      // 检查高亮元素是否在范围内
      const highlightRange = document.createRange();
      highlightRange.selectNodeContents(highlight);
      return range.intersectsNode(highlight);
    });
  }
  
  // 创建一个临时元素来包含范围内的所有节点
  const tempContainer = document.createElement('div');
  const fragment = range.cloneContents();
  tempContainer.appendChild(fragment);
  
  // 查找临时容器中的所有高亮元素
  const tempHighlights = Array.from(tempContainer.querySelectorAll('span.highlight-text'));
  
  // 在原始文档中查找对应的高亮元素
  tempHighlights.forEach(tempHighlight => {
    // 获取高亮元素的文本内容
    const highlightText = tempHighlight.textContent;
    
    // 在原始文档中查找具有相同文本内容的高亮元素
    const allHighlights = document.querySelectorAll('span.highlight-text');
    for (const highlight of allHighlights) {
      if (highlight.textContent === highlightText && range.intersectsNode(highlight)) {
        highlights.push(highlight);
        break; // 找到匹配的高亮元素后跳出循环
      }
    }
  });
  
  return highlights;
}

// 移除指定的高亮元素
function removeHighlights(highlights) {
  highlights.forEach(highlight => {
    // 保留高亮元素内的文本内容，但移除高亮元素本身
    const parent = highlight.parentNode;
    while (highlight.firstChild) {
      parent.insertBefore(highlight.firstChild, highlight);
    }
    parent.removeChild(highlight);
  });
}

// 监听来自后台的消息
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateState') {
    isPluginEnabled = message.isEnabled;
    currentHighlightColor = message.highlightColor;
    
    // 更新图标位置模式
    if (message.iconPositionMode !== undefined) {
      const oldMode = iconPositionMode;
      iconPositionMode = message.iconPositionMode;
      
      // 如果位置模式发生变化，更新UI
      if (oldMode !== iconPositionMode) {
        updateIconPositionMode();
      }
    }
    
    // 更新自定义颜色
    if (message.customColors !== undefined) {
      customColors = message.customColors;
    }
  } else if (message.action === 'clearAllHighlights') {
    // 清除所有高亮
    clearHighlights();
  } else if (message.action === 'savePageHighlights') {
    // 保存当前页面的高亮数据
    savePageHighlights();
  } else if (message.action === 'loadPageHighlights') {
    // 加载当前页面的高亮数据
    loadPageHighlights();
  } else if (message.action === 'deletePageHighlights') {
    // 删除当前页面的高亮数据
    deletePageHighlights();
  } else if (message.action === 'exportHighlights') {
    // 导出高亮数据
    exportHighlights();
  } else if (message.action === 'importHighlights') {
    // 导入高亮数据
    importHighlights(message.data);
  }
});

// 当DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 获取当前页面的规范化URL哈希
function getPageHash() {
  // 创建一个规范化的URL，移除查询参数和片段标识符
  const url = new URL(window.location.href);
  const normalizedUrl = url.origin + url.pathname;
  
  // 简单哈希函数
  let hash = 0;
  for (let i = 0; i < normalizedUrl.length; i++) {
    const char = normalizedUrl.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  return hash.toString();
}

// 获取当前页面的所有高亮数据
function getPageHighlights() {
  const highlights = [];
  const highlightedElements = document.querySelectorAll('span.highlight-text');
  
  highlightedElements.forEach(element => {
    // 获取高亮元素的文本内容
    const text = element.textContent;
    
    // 获取高亮颜色
    const backgroundColor = element.style.backgroundColor;
    
    // 获取元素在页面中的位置信息
    const rect = element.getBoundingClientRect();
    const position = {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    };
    
    // 获取元素的XPath路径
    const xpath = getXPathForElement(element);
    
    highlights.push({
      text,
      color: backgroundColor,
      position,
      xpath
    });
  });
  
  return highlights;
}

// 获取元素的XPath路径
function getXPathForElement(element) {
  if (element.id !== '') {
    return `id("${element.id}")`;
  }
  
  if (element === document.body) {
    return element.tagName;
  }
  
  let ix = 0;
  const siblings = element.parentNode.childNodes;
  
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    if (sibling === element) {
      return `${getXPathForElement(element.parentNode)}/${element.tagName}[${ix + 1}]`;
    }
    
    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
      ix++;
    }
  }
}

// 保存当前页面的高亮数据
function savePageHighlights() {
  const pageHash = getPageHash();
  const highlights = getPageHighlights();
  
  if (highlights.length === 0) {
    chrome.runtime.sendMessage({ 
      action: 'showStatus', 
      message: '当前页面没有高亮数据可保存' 
    });
    return;
  }
  
  // 获取现有数据
  chrome.storage.local.get(['pageHighlights'], (result) => {
    const pageHighlights = result.pageHighlights || {};
    
    // 更新当前页面的高亮数据
    pageHighlights[pageHash] = {
      url: window.location.href,
      title: document.title,
      highlights: highlights,
      lastUpdated: new Date().toISOString()
    };
    
    // 保存数据
    chrome.storage.local.set({ pageHighlights }, () => {
      const message = `已保存 ${highlights.length} 个高亮数据`;
      chrome.runtime.sendMessage({ 
        action: 'showStatus', 
        message: message 
      });
      
      // 同时显示桌面通知
      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'images/icon48.svg',
          title: '保存成功',
          message: message,
          priority: 0
        });
      }
    });
  });
}

// 加载当前页面的高亮数据
function loadPageHighlights() {
  const pageHash = getPageHash();
  
  // 获取保存的数据
  chrome.storage.local.get(['pageHighlights'], (result) => {
    const pageHighlights = result.pageHighlights || {};
    const pageData = pageHighlights[pageHash];
    
    if (!pageData || !pageData.highlights || pageData.highlights.length === 0) {
      chrome.runtime.sendMessage({ 
        action: 'showStatus', 
        message: '当前页面没有保存的高亮数据' 
      });
      return;
    }
    
    // 清除当前页面的所有高亮
    clearHighlights();
    
    // 恢复高亮
    let restoredCount = 0;
    pageData.highlights.forEach(highlightData => {
      try {
        // 尝试通过XPath找到元素
        const element = getElementByXPath(highlightData.xpath);
        
        if (element) {
          // 如果元素已存在，更新其样式
          element.style.backgroundColor = highlightData.color;
          element.classList.add('highlight-text');
          element.style.padding = '1px 2px';
          element.style.borderRadius = '2px';
          element.style.cursor = 'pointer';
          element.style.position = 'relative';
          element.style.zIndex = '10';
          
          // 添加点击事件以取消高亮
          element.addEventListener('click', function() {
            this.outerHTML = this.innerHTML;
          });
          
          restoredCount++;
        } else {
          // 如果找不到元素，尝试通过文本内容匹配
          const textNodes = findTextNodes(document.body, highlightData.text);
          
          if (textNodes.length > 0) {
            const textNode = textNodes[0];
            const range = document.createRange();
            range.selectNodeContents(textNode);
            
            // 创建高亮元素
            const highlightElement = document.createElement('span');
            highlightElement.classList.add('highlight-text');
            highlightElement.style.backgroundColor = highlightData.color;
            highlightElement.style.padding = '1px 2px';
            highlightElement.style.borderRadius = '2px';
            highlightElement.style.cursor = 'pointer';
            highlightElement.style.position = 'relative';
            highlightElement.style.zIndex = '10';
            
            // 添加点击事件以取消高亮
            highlightElement.addEventListener('click', function() {
              this.outerHTML = this.innerHTML;
            });
            
            // 用高亮元素包裹选中的文本
            range.surroundContents(highlightElement);
            restoredCount++;
          }
        }
      } catch (e) {
        console.error('恢复高亮失败:', e);
      }
    });
    
    const message = `已恢复 ${restoredCount} 个高亮`;
    chrome.runtime.sendMessage({ 
      action: 'showStatus', 
      message: message 
    });
    
    // 同时显示桌面通知
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'images/icon48.svg',
        title: '加载成功',
        message: message,
        priority: 0
      });
    }
  });
}

// 通过XPath获取元素
function getElementByXPath(xpath) {
  return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

// 查找包含特定文本的文本节点
function findTextNodes(root, searchText) {
  const textNodes = [];
  const treeWalker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while (node = treeWalker.nextNode()) {
    if (node.nodeValue.includes(searchText)) {
      textNodes.push(node);
    }
  }
  
  return textNodes;
}

// 删除当前页面的高亮数据
function deletePageHighlights() {
  const pageHash = getPageHash();
  
  // 获取保存的数据
  chrome.storage.local.get(['pageHighlights'], (result) => {
    const pageHighlights = result.pageHighlights || {};
    
    if (!pageHighlights[pageHash]) {
      chrome.runtime.sendMessage({ 
        action: 'showStatus', 
        message: '当前页面没有保存的高亮数据' 
      });
      return;
    }
    
    // 删除当前页面的高亮数据
    delete pageHighlights[pageHash];
    
    // 保存更新后的数据
    chrome.storage.local.set({ pageHighlights }, () => {
      // 清除当前页面的所有高亮
      clearHighlights();
      
      const message = '已删除当前页面的高亮数据';
      chrome.runtime.sendMessage({ 
        action: 'showStatus', 
        message: message 
      });
      
      // 同时显示桌面通知
      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'images/icon48.svg',
          title: '删除成功',
          message: message,
          priority: 0
        });
      }
    });
  });
}

// 导出高亮数据
function exportHighlights() {
  // 获取所有保存的高亮数据
  chrome.storage.local.get(['pageHighlights'], (result) => {
    const pageHighlights = result.pageHighlights || {};
    
    if (Object.keys(pageHighlights).length === 0) {
      chrome.runtime.sendMessage({ 
        action: 'showStatus', 
        message: '没有可导出的高亮数据' 
      });
      return;
    }
    
    // 创建导出数据
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      pageHighlights: pageHighlights
    };
    
    // 转换为JSON字符串
    const dataStr = JSON.stringify(exportData, null, 2);
    
    // 创建Blob对象
    const blob = new Blob([dataStr], { type: 'application/json' });
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `highlights_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    const message = '高亮数据已导出';
    chrome.runtime.sendMessage({ 
      action: 'showStatus', 
      message: message 
    });
    
    // 同时显示桌面通知
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'images/icon48.svg',
        title: '导出成功',
        message: message,
        priority: 0
      });
    }
  });
}

// 导入高亮数据
function importHighlights(data) {
  try {
    // 解析导入的数据
    const importData = JSON.parse(data);
    
    if (!importData.pageHighlights) {
      chrome.runtime.sendMessage({ 
        action: 'showStatus', 
        message: '导入的数据格式不正确' 
      });
      return;
    }
    
    // 获取现有数据
    chrome.storage.local.get(['pageHighlights'], (result) => {
      const pageHighlights = result.pageHighlights || {};
      
      // 合并数据
      let importedCount = 0;
      Object.keys(importData.pageHighlights).forEach(pageHash => {
        if (!pageHighlights[pageHash]) {
          pageHighlights[pageHash] = importData.pageHighlights[pageHash];
          importedCount++;
        }
      });
      
      // 保存合并后的数据
      chrome.storage.local.set({ pageHighlights }, () => {
        const message = `成功导入 ${importedCount} 个页面的高亮数据`;
        chrome.runtime.sendMessage({ 
          action: 'showStatus', 
          message: message 
        });
        
        // 同时显示桌面通知
        if (chrome.notifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'images/icon48.svg',
            title: '导入成功',
            message: message,
            priority: 0
          });
        }
      });
    });
  } catch (e) {
    chrome.runtime.sendMessage({ 
      action: 'showStatus', 
      message: '导入数据失败，请检查文件格式' 
    });
  }
}