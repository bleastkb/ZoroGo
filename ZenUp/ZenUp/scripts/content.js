// 监听 background 发送的阻止消息
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('content.js 收到消息:', msg);
  if (msg && msg.isBlocked) {
    document.documentElement.innerHTML = '';
    document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-size:2.5rem;font-weight:bold;">What is your goal?</div>';
  }
}); 