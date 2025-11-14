let playlists = [];
let currentPlaylist = null;
let channels = [];
let player = null;
let currentChannel = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadPlaylists();
  setupEventListeners();
  initializePlayer();
});

// Setup event listeners
function setupEventListeners() {
  document.getElementById('refreshBtn').addEventListener('click', loadPlaylists);
  document.getElementById('loadCustomBtn').addEventListener('click', loadCustomPlaylist);
  document.getElementById('searchInput').addEventListener('input', filterChannels);
}

// Initialize video player
function initializePlayer() {
  // Check if player is already initialized
  if (player) {
    console.log('Player already initialized, skipping...');
    return;
  }
  
  // Make sure video element is visible for initialization
  const videoElement = document.getElementById('videoPlayer');
  if (!videoElement) {
    console.error('Video element not found');
    return;
  }
  
  // Check if videojs has already initialized this element
  if (videojs.getPlayer('videoPlayer')) {
    player = videojs.getPlayer('videoPlayer');
    console.log('Using existing player instance');
    return;
  }
  
  videoElement.style.display = 'block';
  
  player = videojs('videoPlayer', {
    controls: true,
    responsive: true,
    fluid: true,
    width: '100%',
    height: '100%',
    playbackRates: [0.5, 1, 1.25, 1.5, 2],
    html5: {
      vhs: {
        overrideNative: true
      },
      nativeVideoTracks: false,
      nativeAudioTracks: false,
      nativeTextTracks: false
    }
  });

  player.ready(() => {
    console.log('Video.js player ready');
    // Initially hide the player until a channel is selected
    player.el().style.display = 'none';
  });

  player.on('error', (error) => {
    console.error('Player error:', error);
    const errorMessage = player.error();
    let message = 'Failed to load stream. ';
    
    if (errorMessage) {
      switch(errorMessage.code) {
        case 1: // MEDIA_ERR_ABORTED
          message += 'The video playback was aborted.';
          break;
        case 2: // MEDIA_ERR_NETWORK
          message += 'A network error caused the video download to fail.';
          break;
        case 3: // MEDIA_ERR_DECODE
          message += 'The video playback was aborted due to a corruption problem or because the video used features your browser did not support.';
          break;
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          message += 'The video could not be loaded, either because the server or network failed or because the format is not supported. The stream may be down or require authentication.';
          break;
        default:
          message += 'The channel may be unavailable, down, or require authentication.';
      }
    } else {
      message += 'The channel may be unavailable, down, or require authentication.';
    }
    
    showError(message);
  });
}

// Load playlists
async function loadPlaylists() {
  const playlistList = document.getElementById('playlistList');
  playlistList.innerHTML = '<div class="loading">Loading playlists...</div>';

  try {
    playlists = await window.electronAPI.getPlaylists();
    
    if (playlists.length === 0) {
      playlistList.innerHTML = '<div class="empty-state">No playlists found</div>';
      return;
    }

    playlistList.innerHTML = '';
    playlists.forEach(playlist => {
      const item = document.createElement('div');
      item.className = 'playlist-item';
      item.textContent = playlist.name;
      item.addEventListener('click', () => loadPlaylist(playlist, item));
      playlistList.appendChild(item);
    });
  } catch (error) {
    console.error('Error loading playlists:', error);
    playlistList.innerHTML = '<div class="empty-state">Error loading playlists</div>';
  }
}

// Load custom playlist
async function loadCustomPlaylist() {
  try {
    const filePath = await window.electronAPI.selectPlaylistFile();
    if (filePath) {
      const playlist = {
        name: 'Custom Playlist',
        path: filePath,
        filename: filePath.split(/[/\\]/).pop()
      };
      await loadPlaylist(playlist);
    }
  } catch (error) {
    console.error('Error loading custom playlist:', error);
    showError('Failed to load custom playlist');
  }
}

// Load playlist and parse channels
async function loadPlaylist(playlist, element) {
  // Update active playlist
  document.querySelectorAll('.playlist-item').forEach(item => {
    item.classList.remove('active');
  });
  if (element) {
    element.classList.add('active');
  }

  const channelsList = document.getElementById('channelsList');
  channelsList.innerHTML = '<div class="loading">Loading channels...</div>';

  try {
    const content = await window.electronAPI.readPlaylist(playlist.path);
    channels = parseM3U(content);
    currentPlaylist = playlist;

    if (channels.length === 0) {
      channelsList.innerHTML = '<div class="empty-state">No channels found in this playlist</div>';
      return;
    }

    displayChannels(channels);
  } catch (error) {
    console.error('Error loading playlist:', error);
    channelsList.innerHTML = '<div class="empty-state">Error loading playlist</div>';
  }
}

// Parse M3U content
function parseM3U(content) {
  const channels = [];
  const lines = content.split('\n');
  let currentChannel = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      // Parse EXTINF line
      const match = line.match(/#EXTINF:(-?\d+)(?:\s+(.+))?,(.+)/);
      if (match) {
        currentChannel = {
          duration: match[1],
          attributes: parseAttributes(match[2] || ''),
          name: match[3].trim(),
          url: null
        };
      }
    } else if (line && !line.startsWith('#') && currentChannel) {
      // URL line
      currentChannel.url = line.trim();
      channels.push(currentChannel);
      currentChannel = null;
    }
  }

  return channels;
}

// Parse attributes from EXTINF line
function parseAttributes(attrString) {
  const attributes = {};
  if (!attrString) return attributes;

  // Parse tvg-id, group-title, etc.
  const matches = attrString.matchAll(/(\w+(?:-\w+)*)="([^"]+)"/g);
  for (const match of matches) {
    attributes[match[1]] = match[2];
  }

  // Parse quality/resolution from name or attributes
  const qualityMatch = attrString.match(/(\d+p)/i);
  if (qualityMatch) {
    attributes.quality = qualityMatch[1];
  }

  return attributes;
}

// Display channels
function displayChannels(channelsToShow) {
  const channelsList = document.getElementById('channelsList');
  channelsList.innerHTML = '';

  if (channelsToShow.length === 0) {
    channelsList.innerHTML = '<div class="empty-state">No channels match your search</div>';
    return;
  }

  channelsToShow.forEach((channel, index) => {
    const item = document.createElement('div');
    item.className = 'channel-item';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'channel-name';
    nameDiv.textContent = channel.name;
    
    const qualityDiv = document.createElement('div');
    qualityDiv.className = 'channel-quality';
    qualityDiv.textContent = channel.attributes.quality || '';

    item.appendChild(nameDiv);
    if (channel.attributes.quality) {
      item.appendChild(qualityDiv);
    }

    item.addEventListener('click', () => playChannel(channel, item));
    channelsList.appendChild(item);
  });
}

// Filter channels
function filterChannels() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const filtered = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchTerm) ||
    (channel.attributes['group-title'] && channel.attributes['group-title'].toLowerCase().includes(searchTerm))
  );
  displayChannels(filtered);
}

// Play channel
function playChannel(channel, element) {
  // Update active channel
  document.querySelectorAll('.channel-item').forEach(item => {
    item.classList.remove('active');
  });
  element.classList.add('active');

  currentChannel = channel;

  // Show player
  const placeholder = document.querySelector('.player-placeholder');
  const channelInfo = document.getElementById('channelInfo');
  
  if (placeholder) placeholder.style.display = 'none';
  if (channelInfo) channelInfo.style.display = 'block';
  
  // Show the video.js player element
  if (player && player.el()) {
    player.el().style.display = 'block';
    player.el().style.visibility = 'visible';
    player.el().style.opacity = '1';
  }

  // Update channel info
  document.getElementById('channelName').textContent = channel.name;
  document.getElementById('channelUrl').textContent = channel.url;

  // Load stream
  if (player) {
    // Pause and reset player before loading new source
    if (!player.paused()) {
      player.pause();
    }
    
    // Clear any existing source
    player.src('');
    
    // Small delay to ensure previous operations complete
    setTimeout(() => {
      // Ensure player dimensions are set
      player.dimensions('100%', '100%');
      player.fluid(true);
      player.responsive(true);
      
      player.src({
        src: channel.url,
        type: getStreamType(channel.url)
      });
      
      // Wait for source to load before playing
      player.one('loadedmetadata', () => {
        // Force player to resize
        player.dimensions('100%', '100%');
        player.trigger('resize');
        
        // Try to play
        const playPromise = player.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Play error:', error);
            // Ignore AbortError - it means a new source was loaded
            if (error.name === 'AbortError') {
              console.log('Play was interrupted by new load request - this is normal');
              return;
            }
            
            let message = 'Failed to play stream. ';
            if (error.name === 'NotSupportedError' || error.name === 'NotAllowedError') {
              message += 'The stream format is not supported or playback was blocked. Try another channel.';
            } else if (error.message && error.message.includes('403')) {
              message += 'Access forbidden. This stream may require authentication or be geo-blocked.';
            } else if (error.message && error.message.includes('404')) {
              message += 'Stream not found. This channel may be temporarily unavailable.';
            } else {
              message += 'The channel may be unavailable, down, or require authentication. Try another channel.';
            }
            showError(message);
          });
        }
      });
      
      // Fallback if loadedmetadata doesn't fire
      player.ready(() => {
        player.dimensions('100%', '100%');
        player.trigger('resize');
      });
    }, 100);
  }
}

// Determine stream type
function getStreamType(url) {
  if (url.includes('.m3u8')) {
    return 'application/x-mpegURL';
  } else if (url.includes('.mpd')) {
    return 'application/dash+xml';
  } else if (url.includes('.mp4') || url.includes('.m4v')) {
    return 'video/mp4';
  }
  return 'video/mp4'; // Default
}

// Show error message
function showError(message) {
  const placeholder = document.querySelector('.player-placeholder');
  placeholder.innerHTML = `
    <div class="placeholder-content">
      <div class="placeholder-icon">⚠️</div>
      <h2>Stream Error</h2>
      <p>${message}</p>
      <p style="margin-top: 20px; font-size: 14px; color: var(--text-muted);">
        💡 Tip: Many IPTV streams are unreliable. Try selecting a different channel from the list.
      </p>
    </div>
  `;
  placeholder.style.display = 'flex';
  document.getElementById('videoPlayer').style.display = 'none';
  document.getElementById('channelInfo').style.display = 'none';
}
