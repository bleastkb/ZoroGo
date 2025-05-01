// scripts/popup.js
let timer = null;
let timeLeft = 0;
let isSessionActive = false;
let sessionEndTime = 0;

// 创建BroadcastChannel实例
const sessionChannel = new BroadcastChannel('session_channel');

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('popup页面加载...');
  
  // 获取DOM元素
  const timeInput = document.getElementById('timeInput');
  const timerDisplay = document.getElementById('timer');
  const startButton = document.getElementById('startSession');
  const endButton = document.getElementById('endSession');
  const minutesLabel = timeInput ? timeInput.nextElementSibling : null;
  const blockAllSwitch = document.getElementById('blockAllSwitch');
  const switchContainer = blockAllSwitch ? blockAllSwitch.closest('.switch-container') : null;
  const settingsLink = document.getElementById('settings');
  
  // 检查DOM元素是否存在
  if (!timeInput || !timerDisplay || !startButton || !endButton) {
    console.error('Required DOM elements not found');
    return;
  }
  
  // 记住上次session时长
  chrome.storage.local.get('lastSessionDuration', (result) => {
    const last = result.lastSessionDuration;
    if (last && !isNaN(last)) {
      timeInput.value = last;
      timeLeft = last * 60;
      updateTimerDisplay();
    } else {
      timeInput.value = '25';
      timeLeft = 25 * 60;
      updateTimerDisplay();
    }
  });
  
  // 检查当前session状态
  try {
    console.log('正在获取session状态...');
    chrome.runtime.sendMessage({ action: 'getSessionStatus' }, (response) => {
      console.log('收到session状态响应:', response);
      
      if (chrome.runtime.lastError) {
        console.error('Error getting session status:', chrome.runtime.lastError);
        return;
      }
      
      if (response && response.isSessionActive) {
        timeLeft = response.timeLeft || 0;
        updateTimerDisplay();
        startButton.style.display = 'none';
        endButton.style.display = 'block';
        timeInput.style.display = 'none';
        if (minutesLabel) minutesLabel.style.display = 'none';
        if (switchContainer) switchContainer.style.display = 'none';
        if (settingsLink) settingsLink.style.display = 'none';
        
        if (timeLeft > 0) {
          startTimer();
        }
        if (blockAllSwitch) blockAllSwitch.disabled = true;
      } else {
        // 重置为默认状态
        timeLeft = parseInt(timeInput.value) * 60 || 25 * 60;
        updateTimerDisplay();
        startButton.style.display = 'block';
        endButton.style.display = 'none';
        timeInput.style.display = 'inline-block';
        if (minutesLabel) minutesLabel.style.display = 'inline-block';
        if (switchContainer) switchContainer.style.display = 'block';
        if (settingsLink) settingsLink.style.display = 'inline-block';
        if (blockAllSwitch) blockAllSwitch.disabled = false;
      }
    });
  } catch (error) {
    console.error('Error getting session status (exception):', error);
  }
  
  // 开始按钮点击事件
  startButton.addEventListener('click', async () => {
    console.log('Click start button, current state:', { isSessionActive, timeLeft });
    
    try {
      const duration = parseInt(timeInput.value) || 25;
      // 记住本次session时长
      await chrome.storage.local.set({ lastSessionDuration: duration });
      
      // 获取当前的阻止列表
      const { blockedSites } = await chrome.storage.sync.get('blockedSites');
      console.log('当前阻止列表:', blockedSites);
      
      if (!blockedSites || blockedSites.length === 0) {
        if (!confirm('No websites are set to be blocked. Continue anyway?')) {
          return;
        }
      }
      
      timeLeft = duration * 60;
      startButton.style.display = 'none';
      timeInput.style.display = 'none';
      if (minutesLabel) minutesLabel.style.display = 'none';
      if (switchContainer) switchContainer.style.display = 'none';
      if (settingsLink) settingsLink.style.display = 'none';
      if (blockAllSwitch) blockAllSwitch.disabled = true;
      
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ 
          action: 'startSession',
          duration: duration
        }, (resp) => {
          if (chrome.runtime.lastError) {
            console.error('Error starting session:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(resp);
          }
        });
      });
      
      if (!response) {
        throw new Error('Failed to start session');
      }
      
      console.log('session启动响应:', response);
      startTimer();
      endButton.style.display = 'block';
      incStat('started');
      if (blockAllSwitch) blockAllSwitch.disabled = true;
      
    } catch (error) {
      console.error('Error starting session:', error);
      // 恢复UI状态
      startButton.style.display = 'block';
      timeInput.style.display = 'inline-block';
      if (minutesLabel) minutesLabel.style.display = 'inline-block';
      if (switchContainer) switchContainer.style.display = 'block';
      if (settingsLink) settingsLink.style.display = 'inline-block';
      if (blockAllSwitch) blockAllSwitch.disabled = false;
    }
  });
  
  // 结束按钮点击事件
  endButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to end the current session?')) {
      clearInterval(timer);
      timer = null;
      chrome.runtime.sendMessage({ action: 'endSession' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error ending session:', chrome.runtime.lastError);
          return;
        }
        
        console.log('session结束响应:', response);
        timeLeft = parseInt(timeInput.value) * 60 || 25 * 60;
        updateTimerDisplay();
        startButton.style.display = 'block';
        endButton.style.display = 'none';
        timeInput.style.display = 'inline-block';
        if (minutesLabel) minutesLabel.style.display = 'inline-block';
        if (switchContainer) switchContainer.style.display = 'block';
        if (settingsLink) settingsLink.style.display = 'inline-block';
        if (blockAllSwitch) blockAllSwitch.disabled = false;
      });
    }
  });
  
  // 监听时间输入
  timeInput.addEventListener('change', (e) => {
    if (!isSessionActive) {
      const minutes = parseInt(e.target.value) || 25;
      timeLeft = minutes * 60;
      updateTimerDisplay();
    }
  });
  
  // 监听来自BroadcastChannel的消息
  sessionChannel.onmessage = (event) => {
    const message = event.data;
    console.log('收到BroadcastChannel消息:', message);
    
    if (message && message.action === 'sessionStarted') {
      timeLeft = message.timeLeft || 0;
      updateTimerDisplay();
      startButton.style.display = 'none';
      endButton.style.display = 'block';
      timeInput.style.display = 'none';
      if (minutesLabel) minutesLabel.style.display = 'none';
      if (switchContainer) switchContainer.style.display = 'none';
      if (settingsLink) settingsLink.style.display = 'none';
      
      if (timeLeft > 0) {
        startTimer();
      }
      if (blockAllSwitch) blockAllSwitch.disabled = true;
    } else if (message && message.action === 'sessionEnded') {
      clearInterval(timer);
      timer = null;
      timeLeft = parseInt(timeInput.value) * 60 || 25 * 60;
      updateTimerDisplay();
      startButton.style.display = 'block';
      endButton.style.display = 'none';
      timeInput.style.display = 'inline-block';
      if (minutesLabel) minutesLabel.style.display = 'inline-block';
      if (switchContainer) switchContainer.style.display = 'block';
      if (settingsLink) settingsLink.style.display = 'inline-block';
      if (blockAllSwitch) blockAllSwitch.disabled = false;
    }
  };
  
  // 监听设置链接点击
  if (settingsLink) {
    settingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }

  const blockEntertainmentSwitch = document.getElementById('blockEntertainmentSwitch');

  blockEntertainmentSwitch.addEventListener('change', (event) => {
    const isEnabled = event.target.checked;
    chrome.runtime.sendMessage({ action: 'toggleBlockEntertainment', enabled: isEnabled });
  });

  if (blockAllSwitch) {
    // 初始化开关状态
    chrome.storage.sync.get('blockedSites', (result) => {
      const blockedSites = result.blockedSites || [];
      blockAllSwitch.checked = blockedSites.includes('*');
    });

    blockAllSwitch.addEventListener('change', async (e) => {
      try {
        if (e.target.checked) {
          console.log('启用阻止所有网站');
          await chrome.storage.sync.set({ blockedSites: ['*'] });
          await chrome.runtime.sendMessage({ 
            action: 'updateRules',
            blockedSites: ['*']
          });
          console.log('已更新规则：阻止所有网站');
        } else {
          console.log('禁用阻止所有网站');
          await chrome.storage.sync.set({ blockedSites: [] });
          await chrome.runtime.sendMessage({ 
            action: 'updateRules',
            blockedSites: []
          });
          console.log('已更新规则：清空阻止列表');
        }
      } catch (error) {
        console.error('Error updating block rules:', error);
      }
    });
  }

  updateStatsUI(); // 页面加载时刷新统计
});

// 开始计时器
function startTimer() {
  console.log('启动计时器, 当前时间:', timeLeft);

  if (timer) {
    clearInterval(timer);
  }
  
  timer = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    
    if (timeLeft <= 0) {
      clearInterval(timer);
      timer = null;
      incStat('succeeded');
      showToast('Congrats! You made it!');
      
      chrome.runtime.sendMessage({ action: 'endSession' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error ending session:', chrome.runtime.lastError);
        }
      });
      
      const startButton = document.getElementById('startSession');
      const endButton = document.getElementById('endSession');
      const timeInput = document.getElementById('timeInput');
      const minutesLabel = timeInput ? timeInput.nextElementSibling : null;
      const blockAllSwitch = document.getElementById('blockAllSwitch');
      const switchContainer = blockAllSwitch ? blockAllSwitch.closest('.switch-container') : null;
      const settingsLink = document.getElementById('settings');
      
      if (startButton && endButton && timeInput) {
        startButton.style.display = 'block';
        endButton.style.display = 'none';
        timeInput.style.display = 'inline-block';
        if (minutesLabel) minutesLabel.style.display = 'inline-block';
        if (switchContainer) switchContainer.style.display = 'block';
        if (settingsLink) settingsLink.style.display = 'inline-block';
        if (blockAllSwitch) blockAllSwitch.disabled = false;
      }
    }
  }, 1000);
}

// 更新计时器显示
function updateTimerDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerElement = document.getElementById('timer');
  
  if (timerElement) {
    timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    console.error('Timer element not found');
  }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('接收到消息:', message);
  
  try {
    if (message.action === 'startSession') {
      isSessionActive = true;
      sessionEndTime = Date.now() + (message.duration * 60 * 1000);
      
      // 立即返回响应
      sendResponse({ success: true });
      
      // 异步执行其他操作
      (async () => {
        try {
          await chrome.storage.sync.set({ 
            isSessionActive: true,
            sessionEndTime: sessionEndTime 
          });
          updateRules(true);
          updateBadge(true);
          
          // 通知所有标签页session已开始
          sessionChannel.postMessage({ action: 'sessionStarted', timeLeft: message.duration * 60 });
        } catch (error) {
          console.error('Error starting session:', error);
        }
      })();
      
      return false; // 不保持消息通道开放
    } 
    else if (message.action === 'toggleBlockEntertainment') {
      const entertainmentSites = [
        'youtube.com',
        'netflix.com',
        'hulu.com',
        'twitch.tv',
        'facebook.com',
        'instagram.com',
        'twitter.com'
      ];

      if (message.enabled) {
        // 启用阻止
        chrome.storage.sync.set({ blockedSites: entertainmentSites }, () => {
          updateRules(true);
          console.log('已启用娱乐站点阻止');
        });
      } else {
        // 禁用阻止
        chrome.storage.sync.set({ blockedSites: [] }, () => {
          updateRules(false);
          console.log('已禁用娱乐站点阻止');
        });
      }
    }
    // 其他代码保持不变
  } catch (error) {
    console.error('处理消息时出错:', error);
    sendResponse({ error: error.message });
    return false;
  }
});

// 双重保险：动态规则 + 主动拦截
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  chrome.declarativeNetRequest.getMatchedRules({}, (result) => {
    if (result.rulesMatched.some(rule => details.url.includes(rule.ruleId))) {
      chrome.tabs.update(details.tabId, { url: 'blocked.html' });
    }
  });
});

// 统计相关函数
function getTodayKey() {
  const now = new Date();
  return now.toISOString().slice(0, 10); // yyyy-mm-dd
}

async function updateStatsUI() {
  const key = getTodayKey();
  const stats = (await chrome.storage.sync.get(key))[key] || { started: 0, succeeded: 0 };
  const startedEl = document.getElementById('statStarted');
  const succeededEl = document.getElementById('statSucceeded');
  if (startedEl) startedEl.textContent = stats.started;
  if (succeededEl) succeededEl.textContent = stats.succeeded;
}

async function incStat(field) {
  const key = getTodayKey();
  const stats = (await chrome.storage.sync.get(key))[key] || { started: 0, succeeded: 0 };
  stats[field] = (stats[field] || 0) + 1;
  await chrome.storage.sync.set({ [key]: stats });
  updateStatsUI();
}

function updateUrlList() {
    urlList.innerHTML = '';
    // 正序遍历，让最新添加的在最上面
    for (let i = 0; i < blockedSites.length; i++) {
        const site = blockedSites[i];
        const li = document.createElement('li');
        li.className = 'url-item';
        li.innerHTML = `
            <span>${site}</span>
            <button class="delete-btn" data-url="${site}">Delete</button>
        `;
        urlList.appendChild(li);
    }
    // ...
}

// Toast显示函数
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = 'block';
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.style.display = 'none'; }, 400);
  }, 2000);
}