let isSessionActive = false;
let sessionEndTime = 0;

// 初始化存储
chrome.runtime.onInstalled.addListener(async () => {
  console.log('扩展安装/更新，初始化存储...');
  try {
    await chrome.storage.sync.set({
      isSessionActive: false,
      sessionEndTime: 0,
      blockedSites: []
    });
    console.log('存储初始化成功');
  } catch (error) {
    console.error('存储初始化失败:', error);
  }
});

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
          // 先获取当前的 blockedSites
          const { blockedSites } = await chrome.storage.sync.get('blockedSites');
          console.log('当前阻止列表:', blockedSites);
          
          // 设置 session 状态
          await chrome.storage.sync.set({ 
            isSessionActive: true,
            sessionEndTime: sessionEndTime
          });
          
          // 确保有阻止列表时才启用规则
          if (blockedSites && blockedSites.length > 0) {
            console.log('正在启用阻止规则...');
            await updateRules(true);
          } else {
            console.log('阻止列表为空，跳过规则更新');
          }
          
          updateBadge(true);
          
          // 通知所有标签页 session 已开始
          sessionChannel.postMessage({ action: 'sessionStarted', timeLeft: message.duration * 60 });
          
          // 获取所有标签页并通知它们
          try {
            const tabs = await chrome.tabs.query({});
            console.log('找到标签页数量:', tabs.length);
            
            for (const tab of tabs) {
              try {
                await chrome.tabs.sendMessage(tab.id, { 
                  action: 'sessionStarted',
                  timeLeft: message.duration * 60
                });
                console.log('已通知标签页:', tab.id);
              } catch (error) {
                console.error('通知标签页失败:', tab.id, error);
              }
            }
          } catch (error) {
            console.error('获取标签页失败:', error);
          }
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
          
          // 获取所有标签页并通知它们
          try {
            const tabs = await chrome.tabs.query({});
            console.log('找到标签页数量:', tabs.length);
            
            for (const tab of tabs) {
              try {
                await chrome.tabs.sendMessage(tab.id, { 
                  action: 'sessionPaused'
                });
                console.log('已通知标签页:', tab.id);
              } catch (error) {
                console.error('通知标签页失败:', tab.id, error);
              }
            }
          } catch (error) {
            console.error('获取标签页失败:', error);
          }
        } catch (error) {
          console.error('暂停session时出错:', error);
        }
      })();
      
      return false; // 不保持消息通道开放
    }
    else if (message.action === 'endSession') {
      isSessionActive = false;
      sessionEndTime = 0;
      
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
          
          // 通知所有标签页session已结束
          sessionChannel.postMessage({ action: 'sessionEnded' });
          
          // 获取所有标签页并通知它们
          try {
            const tabs = await chrome.tabs.query({});
            console.log('找到标签页数量:', tabs.length);
            
            for (const tab of tabs) {
              try {
                await chrome.tabs.sendMessage(tab.id, { 
                  action: 'sessionEnded'
                });
                console.log('已通知标签页:', tab.id);
              } catch (error) {
                console.error('通知标签页失败:', tab.id, error);
              }
            }
          } catch (error) {
            console.error('获取标签页失败:', error);
          }
        } catch (error) {
          console.error('结束session时出错:', error);
        }
      })();
      
      return false; // 不保持消息通道开放
    }
    else if (message.action === 'getSessionStatus') {
      // 保持消息通道开放以进行异步响应
      (async () => {
        try {
          const data = await chrome.storage.sync.get(['isSessionActive', 'sessionEndTime']);
          console.log('获取到的session状态:', data);
          
          const timeLeft = data.isSessionActive && data.sessionEndTime > 0
            ? Math.max(0, Math.floor((data.sessionEndTime - Date.now()) / 1000))
            : 0;
            
          sendResponse({
            isSessionActive: data.isSessionActive || false,
            timeLeft: timeLeft
          });
        } catch (error) {
          console.error('获取session状态失败:', error);
          sendResponse({
            isSessionActive: false,
            timeLeft: 0
          });
        }
      })();
      
      return true; // 保持消息通道开放
    }
  } catch (error) {
    console.error('处理消息时出错:', error);
    sendResponse({ error: error.message });
    return false;
  }
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  console.log('标签页更新:', { tabId, changeInfo, tab });
  
  try {
    const data = await chrome.storage.sync.get(['isSessionActive', 'sessionEndTime', 'blockedSites']);
    console.log('当前session状态:', data);
    
    if (data.isSessionActive && data.sessionEndTime > 0) {
      const timeLeft = Math.max(0, Math.floor((data.sessionEndTime - Date.now()) / 1000));
      
      if (data.blockedSites && data.blockedSites.length > 0 && tab.url) {
        console.log('检查URL:', tab.url);
        console.log('阻止列表:', data.blockedSites);
        
        const isBlocked = data.blockedSites.some(site => {
          const cleanSite = site.replace(/^(https?:\/\/)?(www\.)?/, '');
          const cleanUrl = tab.url.replace(/^(https?:\/\/)?(www\.)?/, '');
          return cleanUrl.includes(cleanSite);
        });
        
        console.log('URL是否被阻止:', isBlocked);
        
        if (isBlocked) {
          console.log('检测到被阻止的网站:', tab.url);
          await updateRules(true); // 确保规则更新
          await chrome.tabs.sendMessage(tabId, {
            action: 'sessionStarted',
            timeLeft: timeLeft,
            isBlocked: true
          });
          console.log('已通知被阻止的标签页:', tabId);
        }
      }
      
      await chrome.tabs.sendMessage(tabId, {
        action: 'sessionStarted',
        timeLeft: timeLeft
      });
      console.log('已通知新标签页:', tabId);
    }
  } catch (error) {
    console.error('处理标签页更新时出错:', error);
  }
});

// 定期检查session状态
setInterval(async () => {
  try {
    const data = await chrome.storage.sync.get(['isSessionActive', 'sessionEndTime']);
    console.log('检查session状态:', data);
    
    if (data.isSessionActive && data.sessionEndTime > 0) {
      const timeLeft = Math.max(0, Math.floor((data.sessionEndTime - Date.now()) / 1000));
      
      if (timeLeft === 0) {
        // session结束
        await chrome.storage.sync.set({ 
          isSessionActive: false,
          sessionEndTime: 0 
        });
        updateRules(false);
        updateBadge(false);
        
        // 通知所有标签页session已结束
        sessionChannel.postMessage({ action: 'sessionEnded' });
        
        // 获取所有标签页并通知它们
        try {
          const tabs = await chrome.tabs.query({});
          console.log('找到标签页数量:', tabs.length);
          
          for (const tab of tabs) {
            try {
              await chrome.tabs.sendMessage(tab.id, { 
                action: 'sessionEnded'
              });
              console.log('已通知标签页:', tab.id);
            } catch (error) {
              console.error('通知标签页失败:', tab.id, error);
            }
          }
        } catch (error) {
          console.error('获取标签页失败:', error);
        }
      } else {
        // 更新剩余时间
        updateBadge(true);
      }
    }
  } catch (error) {
    console.error('检查session状态时出错:', error);
  }
}, 1000);

// 更新阻止规则
async function updateRules(enable) {
  try {
    console.log('开始更新规则, enable:', enable);
    
    const { blockedSites } = await chrome.storage.sync.get('blockedSites');
    console.log('当前阻止列表:', blockedSites);
    
    if (!blockedSites || blockedSites.length === 0) {
      console.log('阻止列表为空，跳过规则更新');
      return;
    }
    
    // 移除现有规则
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIds = rules.map(rule => rule.id);
    
    if (ruleIds.length > 0) {
      console.log('移除现有规则:', ruleIds);
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      });
      console.log('现有规则已移除');
    }

    if (enable) {
      const newRules = blockedSites.map((site, index) => {
        const cleanSite = site.replace(/^(https?:\/\/)?(www\.)?/, '');
        return {
          id: index + 1,
          priority: 1,
          action: { type: "block" },
          condition: {
            urlFilter: site === '*' ? '*' : `*://*.${cleanSite}/*`,
            resourceTypes: ["main_frame"]
          }
        };
      });

      console.log('准备添加的新规则:', newRules);
      
      if (newRules.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          addRules: newRules
        });
        console.log('新规则添加成功');
        
        const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
        console.log('当前生效的规则:', currentRules);
      }
    }
  } catch (error) {
    console.error('更新规则时出错:', error);
  }
}

// 更新扩展图标徽章
function updateBadge(isActive) {
  try {
    if (isActive) {
      chrome.action.setBadgeText({ text: "ON" });
      chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  } catch (error) {
    console.error('更新徽章时出错:', error);
  }
} 