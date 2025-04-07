// scripts/popup.js
let timer = null;
let timeLeft = 0;
let isPaused = false;
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
  
  // 检查DOM元素是否存在
  if (!timeInput || !timerDisplay || !startButton || !endButton) {
    console.error('无法找到必要的DOM元素');
    return;
  }
  
  // 设置默认值
  timeInput.value = '25';
  timeLeft = 25 * 60;
  updateTimerDisplay();
  
  // 检查当前session状态
  try {
    console.log('正在获取session状态...');
    chrome.runtime.sendMessage({ action: 'getSessionStatus' }, (response) => {
      console.log('收到session状态响应:', response);
      
      if (chrome.runtime.lastError) {
        console.error('获取session状态时出错:', chrome.runtime.lastError);
        return;
      }
      
      if (response && response.isSessionActive) {
        timeLeft = response.timeLeft || 0;
        isPaused = false;
        updateTimerDisplay();
        startButton.textContent = 'Pause Session';
        startButton.classList.add('pause');
        endButton.style.display = 'block';
        
        if (timeLeft > 0) {
          startTimer();
        }
      } else {
        // 重置为默认状态
        isPaused = true;
        timeLeft = parseInt(timeInput.value) * 60 || 25 * 60;
        updateTimerDisplay();
        startButton.textContent = 'Start Session';
        startButton.classList.remove('pause');
        endButton.style.display = 'none';
      }
    });
  } catch (error) {
    console.error('获取session状态异常:', error);
  }
  
  // 开始/暂停按钮点击事件
  startButton.addEventListener('click', () => {
    console.log('点击开始/暂停按钮, 当前状态:', { isPaused, timeLeft });
    
    if (isPaused) {
      // 开始新session
      const duration = parseInt(timeInput.value) || 25;
      timeLeft = duration * 60;
      isPaused = false;
      
      chrome.runtime.sendMessage({ 
        action: 'startSession',
        duration: duration
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('启动session时出错:', chrome.runtime.lastError);
          return;
        }
        
        console.log('session启动响应:', response);
        startTimer();
        startButton.textContent = 'Pause Session';
        startButton.classList.add('pause');
        endButton.style.display = 'block';
      });
    } else {
      // 暂停session
      clearInterval(timer);
      timer = null;
      isPaused = true;
      
      chrome.runtime.sendMessage({ action: 'pauseSession' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('暂停session时出错:', chrome.runtime.lastError);
          return;
        }
        
        console.log('session暂停响应:', response);
        startButton.textContent = 'Resume Session';
        startButton.classList.remove('pause');
      });
    }
  });
  
  // 结束按钮点击事件
  endButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to end the current session?')) {
      clearInterval(timer);
      timer = null;
      isPaused = true;
      
      chrome.runtime.sendMessage({ action: 'endSession' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('结束session时出错:', chrome.runtime.lastError);
          return;
        }
        
        console.log('session结束响应:', response);
        timeLeft = parseInt(timeInput.value) * 60 || 25 * 60;
        updateTimerDisplay();
        startButton.textContent = 'Start Session';
        startButton.classList.remove('pause');
        endButton.style.display = 'none';
      });
    }
  });
  
  // 监听时间输入
  timeInput.addEventListener('change', (e) => {
    if (isPaused) {
      const minutes = parseInt(e.target.value) || 25;
      timeLeft = minutes * 60;
      updateTimerDisplay();
    }
  });
  
  // 监听来自BroadcastChannel的消息
  sessionChannel.onmessage = (event) => {
    const message = event.data;
    console.log('收到BroadcastChannel消息:', message);
    
    if (message && message.action === 'sessionPaused') {
      clearInterval(timer);
      timer = null;
      isPaused = true;
      timeLeft = parseInt(timeInput.value) * 60 || 25 * 60;
      updateTimerDisplay();
      startButton.textContent = 'Resume Session';
      startButton.classList.remove('pause');
      endButton.style.display = 'none';
    } else if (message && message.action === 'sessionStarted') {
      timeLeft = message.timeLeft || 0;
      isPaused = false;
      updateTimerDisplay();
      startButton.textContent = 'Pause Session';
      startButton.classList.add('pause');
      endButton.style.display = 'block';
      
      if (timeLeft > 0) {
        startTimer();
      }
    }
  };
  
  // 监听设置链接点击
  const settingsLink = document.getElementById('settings');
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
      
      chrome.runtime.sendMessage({ action: 'endSession' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('结束session时出错:', chrome.runtime.lastError);
        }
      });
      
      const startButton = document.getElementById('startSession');
      const endButton = document.getElementById('endSession');
      
      if (startButton && endButton) {
        startButton.textContent = 'Start Session';
        startButton.classList.remove('pause');
        endButton.style.display = 'none';
        isPaused = true;
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
    console.error('未找到timer元素');
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
          console.error('开始session时出错:', error);
        }
      })();
      
      return false; // 不保持消息通道开放
    } 
    else if (message.action === 'pauseSession') {
      isSessionActive = false;
      
      // 立即返回响应
      sendResponse({ success: true });
      
      // 异步执行其他操作
      (async () => {
        try {
          await chrome.storage.sync.set({ 
            isSessionActive: false,
            sessionEndTime: 0 
          });
          updateRules(false);
          updateBadge(false);
          
          // 通知所有标签页session已暂停
          sessionChannel.postMessage({ action: 'sessionPaused' });
        } catch (error) {
          console.error('暂停session时出错:', error);
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