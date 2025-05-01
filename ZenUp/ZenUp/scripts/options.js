// Preset website list
const PRESET_SITES = {
    'Social Media': [
        { name: 'Facebook', url: 'facebook.com' },
        { name: 'Twitter', url: 'twitter.com' }, // 保留原名称，实际为 x.com
        { name: 'Instagram', url: 'instagram.com' },
        { name: 'LinkedIn', url: 'linkedin.com' },
        { name: 'Reddit', url: 'reddit.com' },
        { name: 'Snapchat', url: 'snapchat.com' },
        { name: 'Pinterest', url: 'pinterest.com' },
        { name: 'Discord', url: 'discord.com' },
        { name: 'Threads', url: 'threads.net' },
        { name: 'Tumblr', url: 'tumblr.com' }
    ],
    'Short Videos': [
        { name: 'TikTok', url: 'tiktok.com' },
        { name: 'YouTube Shorts', url: 'youtube.com/shorts' },
        { name: 'Kuaishou', url: 'kuaishou.com' },
        { name: 'Douyin', url: 'douyin.com' }
    ],
    'Video Platforms': [
        { name: 'YouTube', url: 'youtube.com' },
        { name: 'Netflix', url: 'netflix.com' },
        { name: 'Bilibili', url: 'bilibili.com' },
        { name: 'Youku', url: 'youku.com' },
        { name: 'Twitch', url: 'twitch.tv' },
        { name: 'Dailymotion', url: 'dailymotion.com' },
        { name: 'Vimeo', url: 'vimeo.com' },
        { name: 'Rumble', url: 'rumble.com' },
        { name: 'Kick', url: 'kick.com' }
    ],
    'Games': [
        { name: 'Steam', url: 'steamcommunity.com' },
        { name: 'Epic Games', url: 'epicgames.com' },
        { name: 'Battle.net', url: 'battle.net' },
        { name: 'Roblox', url: 'roblox.com' },
        { name: 'GameFAQs', url: 'gamefaqs.com' },
        { name: 'GameStop', url: 'gamestop.com' },
        { name: 'Cool Math Games', url: 'coolmath-games.com' }
    ],
    'News': [
        { name: 'The New York Times', url: 'nytimes.com' },
        { name: 'BBC News', url: 'bbc.com' },
        { name: 'CNN', url: 'cnn.com' },
        { name: 'The Guardian', url: 'theguardian.com' },
        { name: 'Fox News', url: 'foxnews.com' },
        { name: 'Daily Mail', url: 'dailymail.co.uk' },
        { name: 'Associated Press', url: 'apnews.com' },
        { name: 'Reuters', url: 'reuters.com' },
        { name: 'Politico', url: 'politico.com' },
        { name: 'The Hill', url: 'thehill.com' },
        { name: 'CBS News', url: 'cbsnews.com' },
        { name: 'Forbes', url: 'forbes.com' },
        { name: 'NBC News', url: 'nbcnews.com' },
        { name: 'The Washington Post', url: 'washingtonpost.com' },
        { name: 'USA Today', url: 'usatoday.com' }
    ],
    'Dating': [
        { name: 'Tinder', url: 'tinder.com' },
        { name: 'Bumble', url: 'bumble.com' },
        { name: 'Badoo', url: 'badoo.com' }
    ],
    'Entertainment & Others': [
        { name: 'Amazon', url: 'amazon.com' }, // 购物网站，浏览商品可能耗时
        { name: 'eBay', url: 'ebay.com' }, // 在线拍卖和购物
        { name: 'Etsy', url: 'etsy.com' }, // 手工艺品和个性化商品购物
        { name: 'BuzzFeed', url: 'buzzfeed.com' }, // 娱乐新闻、测验和病毒式内容
        { name: 'TMZ', url: 'tmz.com' }, // 名人八卦和娱乐新闻
        { name: '9GAG', url: '9gag.com' }, // 迷因和娱乐内容
        { name: 'IMDb', url: 'imdb.com' }, // 电影和电视剧信息，容易引发浏览
        { name: 'Spotify', url: 'spotify.com' }, // 音乐流媒体，浏览歌单可能耗时
        { name: 'Goodreads', url: 'goodreads.com' }, // 书籍推荐和阅读社区
        { name: 'Zillow', url: 'zillow.com' } // 房地产浏览，可能引发非工作相关兴趣
    ]
};

// 主域名提取函数
function extractRootDomain(url) {
    try {
        // 先用URL对象解析
        let hostname = url;
        if (url.startsWith('http')) {
            hostname = new URL(url).hostname;
        } else if (url.includes('/')) {
            hostname = url.split('/')[0];
        }
        // 去掉www.
        hostname = hostname.replace(/^www\./, '');
        // 提取主域名
        const parts = hostname.split('.');
        if (parts.length >= 2) {
            return parts.slice(-2).join('.');
        }
        return hostname;
    } catch (e) {
        return url;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const newUrlInput = document.getElementById('newUrl');
    const addUrlButton = document.getElementById('addUrl');
    const urlList = document.getElementById('urlList');
    const presetGrid = document.getElementById('presetGrid');
    const statusDiv = document.getElementById('status');

    // Load blocked sites from storage
    let blockedSites = [];
    try {
        const result = await chrome.storage.sync.get('blockedSites');
        blockedSites = result.blockedSites || [];
    } catch (error) {
        console.error('Error loading blocked sites:', error);
    }

    // Show status message
    function showStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${isError ? 'error' : 'success'}`;
        setTimeout(() => {
            statusDiv.className = 'status';
        }, 3000);
    }

    // Update block list display
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

        // Update preset website status
        document.querySelectorAll('.preset-item').forEach(item => {
            const url = item.dataset.url;
            if (blockedSites.includes(url)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // Add new URL
    async function addUrl(url) {
        if (!url) {
            showStatus('Please enter a valid URL', true);
            return;
        }

        // 自动提取主域名
        url = extractRootDomain(url);

        // Simple URL validation
        if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(url)) {
            showStatus('Please enter a valid URL format', true);
            return;
        }

        if (blockedSites.includes(url)) {
            showStatus('This URL is already in the block list', true);
            return;
        }

        blockedSites.unshift(url); // 新网址加到最前面
        try {
            await chrome.storage.sync.set({ blockedSites });
            showStatus('URL added successfully');
            updateUrlList();
            // Notify background.js to update rules
            chrome.runtime.sendMessage({ 
                action: 'updateRules',
                blockedSites: blockedSites
            });
        } catch (error) {
            console.error('Error saving blocked sites:', error);
            showStatus('Failed to save, please try again', true);
        }
    }

    // Remove URL
    async function removeUrl(url) {
        blockedSites = blockedSites.filter(site => site !== url);
        try {
            await chrome.storage.sync.set({ blockedSites });
            showStatus('URL removed successfully');
            updateUrlList();
            // Notify background.js to update rules
            chrome.runtime.sendMessage({ 
                action: 'updateRules',
                blockedSites: blockedSites
            });
        } catch (error) {
            console.error('Error removing blocked site:', error);
            showStatus('Failed to remove, please try again', true);
        }
    }

    // Initialize preset website grid
    function initPresetGrid() {
        Object.entries(PRESET_SITES).forEach(([category, sites]) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'preset-category';
            categoryDiv.innerHTML = `<h3>${category}</h3>`;
            
            sites.forEach(site => {
                const item = document.createElement('div');
                item.className = 'preset-item';
                item.dataset.url = site.url;
                item.textContent = site.name;
                item.addEventListener('click', () => {
                    if (blockedSites.includes(site.url)) {
                        removeUrl(site.url);
                    } else {
                        addUrl(site.url);
                    }
                });
                categoryDiv.appendChild(item);
            });
            
            presetGrid.appendChild(categoryDiv);
        });
    }

    // Event listeners
    addUrlButton.addEventListener('click', () => {
        const url = newUrlInput.value.trim();
        addUrl(url);
        newUrlInput.value = '';
    });

    newUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const url = newUrlInput.value.trim();
            addUrl(url);
            newUrlInput.value = '';
        }
    });

    urlList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const url = e.target.dataset.url;
            removeUrl(url);
        }
    });

    // Add all preset distraction websites to block list
    const addAllDistractionsBtn = document.getElementById('addAllDistractions');
    if (addAllDistractionsBtn) {
        addAllDistractionsBtn.addEventListener('click', async () => {
            // 获取所有预设网站的url
            const allPresetUrls = Object.values(PRESET_SITES).flat().map(site => site.url);
            // 合并并去重
            const newBlockList = Array.from(new Set([...blockedSites, ...allPresetUrls]));
            blockedSites = newBlockList;
            try {
                await chrome.storage.sync.set({ blockedSites });
                showStatus('All distraction websites added!');
                updateUrlList();
                // Notify background.js to update rules
                chrome.runtime.sendMessage({ 
                    action: 'updateRules',
                    blockedSites: blockedSites
                });
            } catch (error) {
                console.error('Error adding all distractions:', error);
                showStatus('Failed to add all distractions', true);
            }
        });
    }

    document.getElementById('exportBlockList').addEventListener('click', () => {
        const content = blockedSites.join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'blocklist.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    document.getElementById('importBlockList').addEventListener('click', () => {
        document.getElementById('importBlockListFile').click();
    });

    document.getElementById('importBlockListFile').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        // 处理每一行，去除空行和重复
        const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
        // 自动提取主域名并去重
        const newSites = Array.from(new Set(lines.map(extractRootDomain)));
        // 合并并去重
        blockedSites = Array.from(new Set([...newSites, ...blockedSites]));
        await chrome.storage.sync.set({ blockedSites });
        showStatus('Block list imported!');
        updateUrlList();
        chrome.runtime.sendMessage({ 
            action: 'updateRules',
            blockedSites: blockedSites
        });
        e.target.value = ''; // 允许重复导入同一文件
    });

    // Initialize
    updateUrlList();
    initPresetGrid();
});

const newRules = blockedSites.map((site, index) => {
    if (site === '*') {
        return {
            id: index + 1,
            priority: 1,
            action: { type: 'block' },
            condition: {
                urlFilter: '*',
                resourceTypes: ['main_frame']
            }
        };
    } else {
        // 只保留主域名部分
        const cleanSite = site.replace(/^(https?:\/\/)?(www\.)?/, '');
        return {
            id: index + 1,
            priority: 1,
            action: { type: 'block' },
            condition: {
                urlFilter: `||${cleanSite}`,
                resourceTypes: ['main_frame']
            }
        };
    }
});