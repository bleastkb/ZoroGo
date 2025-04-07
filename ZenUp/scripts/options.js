// Preset website list
const PRESET_SITES = {
    'Social Media': [
        { name: 'Facebook', url: 'facebook.com' },
        { name: 'Twitter', url: 'twitter.com' },
        { name: 'Instagram', url: 'instagram.com' },
        { name: 'LinkedIn', url: 'linkedin.com' }
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
        { name: 'Youku', url: 'youku.com' }
    ],
    'Games': [
        { name: 'Steam', url: 'steamcommunity.com' },
        { name: 'Epic Games', url: 'epicgames.com' },
        { name: 'Battle.net', url: 'battle.net' }
    ]
};

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
        blockedSites.forEach(site => {
            const li = document.createElement('li');
            li.className = 'url-item';
            li.innerHTML = `
                <span>${site}</span>
                <button class="delete-btn" data-url="${site}">Delete</button>
            `;
            urlList.appendChild(li);
        });

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

        // Simple URL validation
        if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(url)) {
            showStatus('Please enter a valid URL format', true);
            return;
        }

        if (blockedSites.includes(url)) {
            showStatus('This URL is already in the block list', true);
            return;
        }

        blockedSites.push(url);
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

    // Initialize
    updateUrlList();
    initPresetGrid();
});