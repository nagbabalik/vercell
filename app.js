// ==================== CONFIGURATION ====================
let CHANNELS_CONFIG = [];
let currentView = 'all';
let selectedCategory = null;
let isLoading = false;
let player = null;
let currentChannel = null;
let searchScrollTimeout = null;
let isPlaying = false;
let controlsTimeout;
let hideControlsTimer;
let currentQuality = 'auto';

// ==================== PLAYER CONFIGURATION ====================
const PLAYER_CONFIG = {
    CONTROLS_HIDE_DELAY: 5000 // 5 seconds in milliseconds
};

// ==================== FAVORITES MANAGER ====================
const FavoritesManager = {
    list: JSON.parse(localStorage.getItem('IPTV_favs')) || [],
    
    toggle(name) {
        const index = this.list.indexOf(name);
        if (index > -1) {
            this.list.splice(index, 1);
        } else {
            this.list.push(name);
        }
        this.save();
        return this.list;
    },
    
    save() {
        localStorage.setItem('IPTV_favs', JSON.stringify(this.list));
    },
    
    isFavorite(name) {
        return this.list.includes(name);
    }
};

// ==================== PAGINATION MANAGER ====================
const PaginationManager = {
    shown: 10,
    increment: 20,
    
    getVisible(config) {
        return config.slice(0, this.shown);
    },
    
    loadMore() {
        this.shown += this.increment;
    },
    
    reset() {
        this.shown = 10;
    },
    
    hasMore(config) {
        return this.shown < config.length;
    }
};

// ==================== DATE FOR NEW BADGE ====================
const _nowForBadge = new Date();

// ==================== RENDER CHANNEL HTML ====================
function renderChannelHTML(ch) {
    const isFav = FavoritesManager.isFavorite(ch.name);
    
    let newTag = '';
    if (ch.dateAdded) {
        const addedDate = new Date(ch.dateAdded);
        const diffInDays = (_nowForBadge - addedDate) / (1000 * 60 * 60 * 24);
        if (diffInDays >= 0 && diffInDays <= 7) {
            newTag = `<span class="new-badge">NEW</span>`;
        }
    }

    const statusClass = ch.status === 'online' ? 'status-live' : 'status-offline';
    const statusText = ch.status === 'online' ? 'LIVE' : 'OFFLINE';

    return `
        <div class="channel-item" data-name="${ch.name}">
            <div class="channel-card">
                <div class="flex items-center flex-grow" onclick="handleChannelClick('${ch.name}')">
                    <div class="logo-box">
                        <img src="${ch.logo || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 40 40\'%3E%3Crect width=\'40\' height=\'40\' fill=\'%23333\'/%3E%3Ctext x=\'8\' y=\'25\' fill=\'%23fff\' font-family=\'Inter\' font-size=\'12\'%3ETV%3C/text%3E%3C/svg%3E'}" 
                             loading="lazy" 
                             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 40 40\'%3E%3Crect width=\'40\' height=\'40\' fill=\'%23333\'/%3E%3Ctext x=\'8\' y=\'25\' fill=\'%23fff\' font-family=\'Inter\' font-size=\'12\'%3ETV%3C/text%3E%3C/svg%3E'">
                    </div>
                    <span class="ml-4 font-medium flex items-center">
                        ${ch.name}${newTag}
                        <span class="ml-2 ${statusClass}" style="font-size: 8px; font-weight: 700;">${statusText}</span>
                    </span>
                </div>
                <button onclick="toggleFavorite('${ch.name}')" class="star-btn ml-2 p-2 ${isFav ? '' : 'opacity-40'}">
                    ${isFav ? '★' : '☆'}
                </button>
            </div>
        </div>
    `;
}

// ==================== COMPILE CHANNELS ====================
function compileChannels() {
    const listContainer = document.getElementById('channelList');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    
    if (!listContainer) return;

    let sourceData = CHANNELS_CONFIG;

    if (currentView === 'fav') {
        sourceData = CHANNELS_CONFIG.filter(ch => FavoritesManager.isFavorite(ch.name));
        
        if (sourceData.length === 0) {
            listContainer.innerHTML = `
                <div class="p-12 text-center flex flex-col items-center justify-center">
                    <p class="text-white/40 text-sm font-medium">No favorites yet</p>
                    <p class="text-white/20 text-[11px] mt-1">Click the <b>☆</b> to add channels to favorites</p>
                </div>
            `;
            if (loadMoreContainer) loadMoreContainer.style.display = 'none';
            updateBackToTopVisibility();
            return;
        }
    } else if (currentView === 'category' && selectedCategory) {
        sourceData = CHANNELS_CONFIG.filter(ch => 
            ch.category && 
            ch.category.toString().trim().toLowerCase() === selectedCategory.toString().trim().toLowerCase()
        );
    }

    const visibleChannels = PaginationManager.getVisible(sourceData);
    
    const fragment = document.createDocumentFragment();
    visibleChannels.forEach(ch => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = renderChannelHTML(ch);
        fragment.appendChild(tempDiv.firstElementChild);
    });

    listContainer.innerHTML = '';
    listContainer.appendChild(fragment);

    if (loadMoreContainer) {
        loadMoreContainer.style.display = PaginationManager.hasMore(sourceData) ? 'flex' : 'none';
    }
    
    updateBackToTopVisibility();
}

// ==================== FILTER CHANNELS ====================
function filterChannels() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const listContainer = document.getElementById('channelList');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    
    if (query === '') {
        compileChannels();
        return;
    }

    const filteredData = CHANNELS_CONFIG.filter(ch => 
        ch.name.toLowerCase().includes(query) || 
        (ch.category && ch.category.toLowerCase().includes(query))
    );

    const fragment = document.createDocumentFragment();
    filteredData.forEach(ch => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = renderChannelHTML(ch);
        fragment.appendChild(tempDiv.firstElementChild);
    });

    listContainer.innerHTML = '';
    listContainer.appendChild(fragment);

    if (loadMoreContainer) loadMoreContainer.style.display = 'none';
    
    if (filteredData.length === 0) {
        listContainer.innerHTML = `<div class="p-10 text-center opacity-30 text-xs">No channels found for "${query}"</div>`;
    }

    updateBackToTopVisibility();
}

// ==================== TOGGLE FAVORITE ====================
function toggleFavorite(name) {
    FavoritesManager.toggle(name);
    if (currentView === 'fav') {
        compileChannels();
    } else {
        document.querySelectorAll('.channel-item').forEach(item => {
            if (item.getAttribute('data-name') === name) {
                const star = item.querySelector('.star-btn');
                const isFav = FavoritesManager.isFavorite(name);
                star.classList.toggle('opacity-40', !isFav);
                star.innerHTML = isFav ? '★' : '☆';
            }
        });
    }
}

// ==================== HANDLE CHANNEL CLICK ====================
async function handleChannelClick(channelName) {
    const channel = CHANNELS_CONFIG.find(ch => ch.name === channelName);
    
    if (!channel) {
        showToast('Channel not found', 2000);
        return;
    }

    if (channel.status !== 'online' || !channel.stream) {
        showToast('This channel is currently offline', 2000);
        return;
    }

    // Close search if open
    smartCloseSearch();

    // Show player
    document.getElementById('playerContainer').classList.add('active');
    document.getElementById('placeholder').style.display = 'none';
    document.getElementById('loadingOverlay').classList.remove('hidden');
    document.getElementById('streamStatus').textContent = 'Loading Channel...';
    document.getElementById('streamStatusText').textContent = 'Loading Channel...';
    
    // Update player info
    document.getElementById('metaLogoContainer').innerHTML = `
        <img src="${channel.logo || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Crect width=\'32\' height=\'32\' fill=\'%23333\'/%3E%3C/svg%3E'}" 
             class="w-8 h-8 object-contain rounded-full bg-white/5 p-1">
    `;
    document.getElementById('displayChannelName').textContent = channel.name;
    
    // Hide live indicator initially
    document.getElementById('liveIndicator').classList.remove('status-live');
    document.getElementById('liveIndicator').classList.add('status-offline');
    document.getElementById('statusLabel').textContent = 'OFFLINE';
    
    currentChannel = channel;

    try {
        // Initialize player if needed
        if (!player) {
            await initPlayer();
        }

        // Configure DRM if present
        if (channel.stream.drm) {
            player.configure({
                drm: {
                    clearKeys: channel.stream.drm
                }
            });
        }

        // Load the stream
        await player.load(channel.stream.url);
        
        // Auto-play
        const video = document.getElementById('video');
        await video.play();
        isPlaying = true;
        updatePlayPauseIcon(true);
        
        // Show custom controls - make sure they're visible initially
        const controls = document.getElementById('customControls');
        controls.classList.remove('hidden');
        controls.classList.add('visible'); // Use 'visible' class for opacity/transform
        
        // Initialize controls after a small delay
        setTimeout(() => {
            initCustomControls();
        }, 100);
        
        // Get available qualities for this stream
        if (player) {
            setTimeout(() => {
                try {
                    const tracks = player.getVariantTracks();
                    if (tracks.length > 0) {
                        const qualities = [...new Set(tracks.map(t => t.height))];
                        qualities.sort((a, b) => b - a);
                        
                        const menu = document.querySelector('.quality-menu-content');
                        menu.innerHTML = '<button onclick="setQuality(\'auto\', event)" class="quality-option active">Auto</button>';
                        
                        qualities.forEach(height => {
                            const btn = document.createElement('button');
                            btn.className = 'quality-option';
                            btn.setAttribute('onclick', `setQuality('${height}p', event)`);
                            btn.textContent = `${height}p`;
                            menu.appendChild(btn);
                        });
                    }
                } catch (e) {
                    console.log('No quality tracks available');
                }
            }, 1000);
        }
        
    } catch (error) {
        console.error('Playback error:', error);
        document.getElementById('streamStatus').textContent = 'Failed to load stream';
        document.getElementById('streamStatusText').textContent = 'Failed to load stream';
        showToast('Failed to load channel', 3000);
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
}

// ==================== INITIALIZE SHAKA PLAYER ====================
async function initPlayer() {
    return new Promise((resolve) => {
        shaka.polyfill.installAll();
        
        const video = document.getElementById('video');
        player = new shaka.Player(video);
        
        // Configure player for production
        player.configure({
            streaming: {
                bufferingGoal: 30,
                rebufferingGoal: 15,
                bufferBehind: 30,
                ignoreTextStreamFailures: true,
                alwaysStreamText: false,
                startAtSegmentBoundary: true,
                smallGapLimit: 0.5,
                jumpLargeGaps: true
            },
            manifest: {
                dash: {
                    ignoreMinBufferTime: true,
                    defaultPresentationDelay: 5
                }
            },
            abr: {
                enabled: true,
                defaultBandwidthEstimate: 1000000,
                restrictions: {
                    minHeight: 360,
                    maxHeight: 1080
                }
            }
        });

        // Error handling
        player.addEventListener('error', (event) => {
            console.error('Player error:', event.detail);
            document.getElementById('streamStatus').textContent = 'Playback error';
            document.getElementById('streamStatusText').textContent = 'Playback error';
            showToast('Playback error', 3000);
        });

        // Add request filter for custom headers
        player.getNetworkingEngine().registerRequestFilter((type, request) => {
            if (currentChannel && currentChannel.stream && currentChannel.stream.headers) {
                Object.keys(currentChannel.stream.headers).forEach(key => {
                    request.headers[key] = currentChannel.stream.headers[key];
                });
            }
        });

        resolve(player);
    });
}

// ==================== CLOSE PLAYER ====================
function closePlayer() {
    if (player) {
        player.unload();
    }
    document.getElementById('playerContainer').classList.remove('active');
    document.getElementById('placeholder').style.display = 'flex';
    document.getElementById('loadingOverlay').classList.add('hidden');
    
    const controls = document.getElementById('customControls');
    controls.classList.add('hidden');
    controls.classList.remove('visible');
    
    currentChannel = null;
    isPlaying = false;
    updatePlayPauseIcon(false);
    
    // Clear any pending timers
    clearTimeout(hideControlsTimer);
}

// ==================== SET VIEW ====================
function setView(view) {
    currentView = view;
    selectedCategory = null;
    
    document.getElementById('btnAll').classList.toggle('bg-white/10', view === 'all');
    document.getElementById('btnAll').classList.toggle('text-white/40', view !== 'all');
    document.getElementById('btnFav').classList.toggle('bg-white/10', view === 'fav');
    document.getElementById('btnFav').classList.toggle('text-white/40', view !== 'fav');
    document.getElementById('btnCat').classList.remove('bg-white/10');
    document.getElementById('categoryMenu').classList.add('hidden');
    
    document.getElementById('viewTitle').innerHTML = view === 'all' ? 'Channels' : view === 'fav' ? 'Favorites' : selectedCategory || 'Channels';
    
    PaginationManager.reset();
    compileChannels();
    document.getElementById('searchInput').value = '';
}

// ==================== TOGGLE CATEGORY MENU ====================
function toggleCategoryMenu() {
    const menu = document.getElementById('categoryMenu');
    menu.classList.toggle('hidden');
}

// ==================== FILTER BY CATEGORY ====================
function filterByCategory(cat) {
    selectedCategory = cat;
    currentView = 'category';
    
    document.getElementById('btnAll').classList.remove('bg-white/10');
    document.getElementById('btnFav').classList.remove('bg-white/10');
    document.getElementById('btnCat').classList.add('bg-white/10');
    document.getElementById('categoryMenu').classList.add('hidden');
    document.getElementById('viewTitle').innerHTML = cat;
    
    PaginationManager.reset();
    compileChannels();
}

// ==================== LOAD MORE ====================
function loadMore() {
    const searchVal = document.getElementById('searchInput').value.trim();
    if (isLoading || searchVal.length > 0) return;
    
    isLoading = true;
    PaginationManager.loadMore();
    compileChannels();
    
    setTimeout(() => {
        isLoading = false;
    }, 500);
}

// ==================== SEARCH FUNCTIONS ====================
function toggleSearch() {
    const container = document.getElementById('searchBarContainer');
    const trigger = document.getElementById('searchTrigger');
    container.classList.add('active');
    trigger.classList.add('hidden');
    setTimeout(() => document.getElementById('searchInput').focus(), 50);
}

function closeSearch() {
    const container = document.getElementById('searchBarContainer');
    const trigger = document.getElementById('searchTrigger');
    container.classList.remove('active');
    trigger.classList.remove('hidden');
    document.getElementById('searchInput').value = '';
    document.getElementById('loadMoreContainer').style.display = 'flex';
    PaginationManager.reset();
    compileChannels();
}

function smartCloseSearch() {
    const container = document.getElementById('searchBarContainer');
    if (container.classList.contains('active')) {
        closeSearch();
    }
}

// ==================== SCROLL FUNCTIONS ====================
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateBackToTopVisibility() {
    const backToTopBtn = document.getElementById('backToTop');
    const scrolledDown = window.scrollY > 100;
    const canScrollMore = document.documentElement.scrollHeight > window.innerHeight + 50;
    if (backToTopBtn) {
        backToTopBtn.style.display = (scrolledDown && canScrollMore) ? 'flex' : 'none';
    }
}

function resetScrollPosition(shouldCloseSearch = true) {
    const catMenu = document.getElementById('categoryMenu');
    const fullSticky = document.getElementById('fullStickyHeader');
    const channelList = document.getElementById('channelList');
    if (shouldCloseSearch && typeof closeSearch === 'function') closeSearch();
    if (catMenu) catMenu.classList.add('hidden');
    if (fullSticky && channelList) {
        const headerHeight = fullSticky.offsetHeight;
        const listTop = channelList.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({ top: listTop - headerHeight, behavior: shouldCloseSearch ? 'smooth' : 'auto' });
    }
}

// ==================== SORT CHANNELS BY NEW ====================
function sortChannelsByNew(data) {
    const now = new Date();
    return [...data].sort((a, b) => {
        const dateA = a.dateAdded ? new Date(a.dateAdded) : new Date(0);
        const dateB = b.dateAdded ? new Date(b.dateAdded) : new Date(0);
        const diffA = (now - dateA) / (1000 * 60 * 60 * 24);
        const diffB = (now - dateB) / (1000 * 60 * 60 * 24);
        const isNewA = diffA >= 0 && diffA <= 7;
        const isNewB = diffB >= 0 && diffB <= 7;

        if (isNewA && isNewB) return dateB - dateA;
        if (isNewA && !isNewB) return -1;
        if (!isNewA && isNewB) return 1;
        return 0;
    });
}

// ==================== RENDER CATEGORIES ====================
function renderCategories() {
    const categories = [...new Set(CHANNELS_CONFIG.map(c => c.category).filter(Boolean))];
    const categoryList = document.getElementById('categoryList');
    if (categoryList) {
        categoryList.innerHTML = categories.map(cat => `
            <button onclick="filterByCategory('${cat}')" class="px-4 py-3 text-left text-[11px] uppercase tracking-widest font-bold hover:bg-white/10 border-b border-white/5 last:border-0 text-white/70">
                ${cat}
            </button>
        `).join('');
    }
}

// ==================== LOAD CHANNEL DATA ====================
async function loadChannelData() {
    try {
        // Try to load from channels.json
        const response = await fetch('updated_channels.json');
        if (!response.ok) throw new Error('Failed to load channels');
        
        const data = await response.json();
        CHANNELS_CONFIG = sortChannelsByNew(data.channels || data);
        
        if (CHANNELS_CONFIG.length === 0) {
            throw new Error('No channels found');
        }
        
        renderCategories();
        compileChannels();
        showToast(`Loaded ${CHANNELS_CONFIG.length} channels`, 2000);
        
    } catch (error) {
        console.error('Error loading channels:', error);
        
        // Show error message in channel list
        const listContainer = document.getElementById('channelList');
        if (listContainer) {
            listContainer.innerHTML = `
                <div class="p-12 text-center flex flex-col items-center justify-center">
                    <p class="text-white/40 text-sm font-medium">Failed to load channels</p>
                    <p class="text-white/20 text-[11px] mt-1">Please check your connection and try again</p>
                    <button onclick="location.reload()" class="mt-4 px-6 py-2 bg-white/10 rounded-full text-xs font-medium">Retry</button>
                </div>
            `;
        }
    }
}

// ==================== CUSTOM VIDEO CONTROLS ====================
function initCustomControls() {
    const video = document.getElementById('video');
    const controls = document.getElementById('customControls');
    const container = document.getElementById('videoContainer');
    
    if (!video || !controls || !container) return;
    
    // Remove existing listeners to avoid duplicates
    video.removeEventListener('click', toggleControls);
    container.removeEventListener('mousemove', showControlsTemporarily);
    container.removeEventListener('touchstart', showControlsTemporarily);
    container.removeEventListener('mouseleave', handleMouseLeave);
    
    // Add listeners to the container for better mouse detection
    container.addEventListener('mousemove', showControlsTemporarily);
    container.addEventListener('touchstart', showControlsTemporarily);
    container.addEventListener('mouseleave', handleMouseLeave);
    video.addEventListener('click', toggleControls);
    
    // Make controls visible initially
    controls.classList.add('visible');
    
    // Start the hide timer
    resetControlsTimer();
    
    console.log('Custom controls initialized'); // Debug log
}

function handleMouseLeave() {
    // When mouse leaves the container, start the timer to hide controls
    if (isPlaying) {
        resetControlsTimer();
    }
}

function showControlsTemporarily() {
    const controls = document.getElementById('customControls');
    if (!controls) return;
    
    controls.classList.add('visible');
    resetControlsTimer();
    
    console.log('Controls shown'); // Debug log
}

function resetControlsTimer() {
    // Clear existing timer
    clearTimeout(hideControlsTimer);
    
    // Only set new timer if video is playing
    if (isPlaying) {
        hideControlsTimer = setTimeout(() => {
            const controls = document.getElementById('customControls');
            if (controls) {
                controls.classList.remove('visible');
                console.log('Controls hidden after timeout'); // Debug log
            }
        }, PLAYER_CONFIG.CONTROLS_HIDE_DELAY);
    }
}

function toggleControls() {
    const controls = document.getElementById('customControls');
    if (!controls) return;
    
    controls.classList.toggle('visible');
    
    if (controls.classList.contains('visible')) {
        resetControlsTimer();
    } else {
        clearTimeout(hideControlsTimer);
    }
}

function togglePlayPause() {
    const video = document.getElementById('video');
    if (video.paused) {
        video.play();
        isPlaying = true;
        showToast('Playing');
    } else {
        video.pause();
        isPlaying = false;
        showToast('Paused');
    }
    updatePlayPauseIcon(!video.paused);
    showControlsTemporarily();
}

function updatePlayPauseIcon(isPlaying) {
    const playIcon = document.getElementById('playIcon');
    const pauseIcons = document.querySelectorAll('#pauseIcon, #pauseIcon2');
    
    if (playIcon && pauseIcons.length) {
        if (isPlaying) {
            playIcon.style.display = 'none';
            pauseIcons.forEach(icon => icon.style.display = 'block');
        } else {
            playIcon.style.display = 'block';
            pauseIcons.forEach(icon => icon.style.display = 'none');
        }
    }
}

function updateTimeDisplay() {
    const video = document.getElementById('video');
    const timeDisplay = document.getElementById('timeDisplay');
    
    if (video && timeDisplay) {
        const current = formatTime(video.currentTime);
        const duration = formatTime(video.duration);
        timeDisplay.textContent = `${current} / ${duration}`;
    }
}

function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ==================== FULLSCREEN WITH AUTO LANDSCAPE ====================
function toggleFullscreen() {
    const container = document.getElementById('videoContainer');
    
    if (!document.fullscreenElement) {
        // Lock to landscape if supported
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(e => {
                console.log('Orientation lock not supported:', e);
            });
        }
        
        // Enter fullscreen
        if (container.requestFullscreen) {
            container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
        } else if (container.msRequestFullscreen) {
            container.msRequestFullscreen();
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        
        // Unlock orientation
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
    }
}

// Listen for fullscreen change events
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);

function handleFullscreenChange() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    if (fullscreenBtn) {
        if (document.fullscreenElement) {
            fullscreenBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
            </svg>`;
            // Try to lock to landscape again (for some browsers)
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
        } else {
            fullscreenBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>`;
            // Unlock orientation
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        }
    }
}

// ==================== QUALITY SETTINGS ====================
function toggleQualityMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('qualityMenu');
    menu.classList.toggle('hidden');
}

function setQuality(quality, event) {
    event.stopPropagation();
    
    document.getElementById('currentQuality').textContent = quality === 'auto' ? 'Auto' : quality;
    
    document.querySelectorAll('.quality-option').forEach(opt => {
        opt.classList.remove('active');
    });
    event.target.classList.add('active');
    
    document.getElementById('qualityMenu').classList.add('hidden');
    
    if (player && quality !== 'auto') {
        try {
            const height = parseInt(quality.replace('p', ''));
            const tracks = player.getVariantTracks();
            const track = tracks.find(t => t.height === height);
            if (track) {
                player.selectVariantTrack(track, true);
                showToast(`Quality: ${quality}`);
            }
        } catch (e) {
            console.log('Quality selection not available');
        }
    } else if (player) {
        player.configure({ abr: { enabled: true } });
        showToast('Quality: Auto');
    }
}

// ==================== PROGRESS BAR ====================
function updateProgress() {
    const video = document.getElementById('video');
    if (!video) return;
    
    const progressPlayed = document.getElementById('progressPlayed');
    const progressHandle = document.getElementById('progressHandle');
    
    if (video.duration && isFinite(video.duration)) {
        const playedPercent = (video.currentTime / video.duration) * 100;
        if (progressPlayed) progressPlayed.style.width = `${playedPercent}%`;
        if (progressHandle) progressHandle.style.left = `${playedPercent}%`;
        
        updateTimeDisplay();
    }
    
    // Update buffer
    if (video.buffered && video.buffered.length > 0 && video.duration) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const bufferedPercent = (bufferedEnd / video.duration) * 100;
        const progressBuffer = document.getElementById('progressBuffer');
        if (progressBuffer) progressBuffer.style.width = `${bufferedPercent}%`;
    }
}

function seekVideo(event) {
    const video = document.getElementById('video');
    const rect = event.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    video.currentTime = percent * video.duration;
    showControlsTemporarily();
}

// ==================== TOAST NOTIFICATION ====================
function showToast(message, duration = 2000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.add('show');
    
    clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', (e) => {
    const playerContainer = document.getElementById('playerContainer');
    if (!playerContainer || !playerContainer.classList.contains('active')) return;
    
    const video = document.getElementById('video');
    if (!video) return;
    
    // Don't trigger shortcuts when typing in search
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    switch(e.key.toLowerCase()) {
        case ' ':
        case 'k':
            e.preventDefault();
            togglePlayPause();
            break;
        case 'f':
            e.preventDefault();
            toggleFullscreen();
            break;
        case 'm':
            e.preventDefault();
            video.muted = !video.muted;
            showToast(video.muted ? 'Muted' : 'Unmuted');
            break;
        case 'arrowright':
            e.preventDefault();
            video.currentTime += 10;
            showToast(`+10s`);
            showControlsTemporarily();
            break;
        case 'arrowleft':
            e.preventDefault();
            video.currentTime -= 10;
            showToast(`-10s`);
            showControlsTemporarily();
            break;
        case 'arrowup':
            e.preventDefault();
            video.volume = Math.min(video.volume + 0.1, 1);
            showToast(`Volume: ${Math.round(video.volume * 100)}%`);
            break;
        case 'arrowdown':
            e.preventDefault();
            video.volume = Math.max(video.volume - 0.1, 0);
            showToast(`Volume: ${Math.round(video.volume * 100)}%`);
            break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
            e.preventDefault();
            const percent = parseInt(e.key) / 10;
            video.currentTime = percent * video.duration;
            showToast(`${parseInt(e.key) * 10}%`);
            showControlsTemporarily();
            break;
    }
});

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Load channel data
    loadChannelData();

    // Setup search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchScrollTimeout);
            filterChannels();
            if (this.value.trim().length > 0) {
                searchScrollTimeout = setTimeout(() => resetScrollPosition(false), 100);
            }
        });
        
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                smartCloseSearch();
                setTimeout(() => resetScrollPosition(false), 150);
            }
        });
    }

    // Close category menu when clicking outside
    document.addEventListener('click', function(event) {
        const menu = document.getElementById('categoryMenu');
        const btnCat = document.getElementById('btnCat');
        if (menu && !menu.classList.contains('hidden')) {
            if (!menu.contains(event.target) && !btnCat.contains(event.target)) {
                menu.classList.add('hidden');
            }
        }
    });

    // Close quality menu when clicking outside
    document.addEventListener('click', (event) => {
        const menu = document.getElementById('qualityMenu');
        const btn = document.getElementById('qualityBtn');
        if (menu && !menu.classList.contains('hidden') && 
            !menu.contains(event.target) && !btn.contains(event.target)) {
            menu.classList.add('hidden');
        }
    });

    // Setup intersection observer for infinite scroll
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && currentView !== 'fav') {
            loadMore();
        }
    }, { threshold: 0.1, rootMargin: '100px' });
    
    const scrollAnchor = document.getElementById('scrollAnchor');
    if (scrollAnchor) {
        observer.observe(scrollAnchor);
    }

    // Scroll listener for back to top
    window.addEventListener('scroll', updateBackToTopVisibility);
    
    // Handle video events
    const video = document.getElementById('video');
    if (video) {
        video.addEventListener('timeupdate', updateProgress);
        video.addEventListener('loadedmetadata', updateProgress);
        video.addEventListener('progress', updateProgress);
        
        const progressSection = document.getElementById('progressSection');
        if (progressSection) {
            progressSection.addEventListener('click', seekVideo);
        }
        
        video.addEventListener('playing', () => {
            isPlaying = true;
            updatePlayPauseIcon(true);
            document.getElementById('loadingOverlay').classList.add('hidden');
            document.getElementById('streamStatus').textContent = 'Now Watching';
            document.getElementById('streamStatusText').textContent = 'Now Watching';
            document.getElementById('statusLabel').textContent = 'LIVE';
            const liveIndicator = document.getElementById('liveIndicator');
            liveIndicator.classList.remove('status-offline');
            liveIndicator.classList.add('status-live');
            
            // Make sure controls are visible when playback starts
            showControlsTemporarily();
        });
        
        video.addEventListener('pause', () => {
            isPlaying = false;
            updatePlayPauseIcon(false);
            
            // Keep controls visible when paused
            const controls = document.getElementById('customControls');
            controls.classList.add('visible');
            clearTimeout(hideControlsTimer);
        });
        
        video.addEventListener('waiting', () => {
            document.getElementById('loadingOverlay').classList.remove('hidden');
            document.getElementById('streamStatus').textContent = 'Buffering...';
            document.getElementById('streamStatusText').textContent = 'Buffering...';
        });
        
        video.addEventListener('canplay', () => {
            document.getElementById('loadingOverlay').classList.add('hidden');
        });
        
        video.addEventListener('error', () => {
            document.getElementById('loadingOverlay').classList.add('hidden');
            document.getElementById('streamStatus').textContent = 'Playback Error';
            document.getElementById('streamStatusText').textContent = 'Playback Error';
        });
    }
});

// ==================== EXPOSE FUNCTIONS GLOBALLY ====================
window.toggleSearch = toggleSearch;
window.closeSearch = closeSearch;
window.setView = setView;
window.toggleCategoryMenu = toggleCategoryMenu;
window.filterByCategory = filterByCategory;
window.loadMore = loadMore;
window.scrollToTop = scrollToTop;
window.togglePlayPause = togglePlayPause;
window.toggleFullscreen = toggleFullscreen;
window.toggleQualityMenu = toggleQualityMenu;
window.setQuality = setQuality;
window.closePlayer = closePlayer;
window.toggleFavorite = toggleFavorite;
window.handleChannelClick = handleChannelClick;