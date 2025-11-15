const manualCountryOverrides = {
  XK: { name: 'Kosovo', flag: '🇽🇰' },
  UK: { name: 'United Kingdom', flag: '🇬🇧' },
  INTL: { name: 'International', flag: '🌐' },
  CUSTOM: { name: 'Custom Playlist', flag: '🗂️' }
};

const regionDisplayNames = typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;

const state = {
  playlists: [],
  filteredPlaylists: [],
  currentPlaylist: null,
  channels: [],
  filteredChannels: [],
  currentChannel: null,
  playlistSearchTerm: '',
  channelSearchTerm: '',
  filters: {
    quality: 'all',
    geoFreeOnly: false,
    favoritesOnly: false
  },
  sort: 'name-asc',
  favorites: loadFavorites()
};

let player = null;
let playlistSearchDebounce = null;
let channelSearchDebounce = null;

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  initializePlayer();
  await loadPlaylists();
});

function setupEventListeners() {
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', loadPlaylists);

  const loadCustomBtn = document.getElementById('loadCustomBtn');
  if (loadCustomBtn) loadCustomBtn.addEventListener('click', loadCustomPlaylist);

  const channelSearchInput = document.getElementById('searchInput');
  if (channelSearchInput) {
    channelSearchInput.addEventListener('input', (event) => {
      const value = event.target.value.toLowerCase();
      clearTimeout(channelSearchDebounce);
      channelSearchDebounce = setTimeout(() => {
        state.channelSearchTerm = value;
        applyChannelFilters();
      }, 120);
    });
  }

  const playlistSearchInput = document.getElementById('playlistSearchInput');
  if (playlistSearchInput) {
    playlistSearchInput.addEventListener('input', (event) => {
      const value = event.target.value.toLowerCase();
      clearTimeout(playlistSearchDebounce);
      playlistSearchDebounce = setTimeout(() => {
        state.playlistSearchTerm = value;
        filterPlaylists();
      }, 120);
    });
  }

  const channelFilters = document.getElementById('channelFilters');
  if (channelFilters) {
    channelFilters.addEventListener('click', (event) => {
      const button = event.target.closest('[data-channel-filter]');
      if (!button) return;

      const filterType = button.dataset.filterType;
      if (filterType === 'quality') {
        document.querySelectorAll('[data-filter-type="quality"]').forEach((chip) => {
          chip.classList.toggle('active', chip === button);
        });
        state.filters.quality = button.dataset.channelFilter;
      } else if (filterType === 'geo') {
        const isActive = button.classList.toggle('active');
        state.filters.geoFreeOnly = isActive;
      }
      applyChannelFilters();
    });
  }

  const favoritesToggle = document.getElementById('favoritesToggle');
  if (favoritesToggle) {
    favoritesToggle.addEventListener('click', () => {
      state.filters.favoritesOnly = !state.filters.favoritesOnly;
      favoritesToggle.setAttribute('aria-pressed', state.filters.favoritesOnly);
      favoritesToggle.textContent = state.filters.favoritesOnly ? '★ Favorites' : '☆ Favorites';
      applyChannelFilters();
    });
  }

  const sortSelect = document.getElementById('channelSortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (event) => {
      state.sort = event.target.value;
      applyChannelFilters();
    });
  }

  const copyChannelUrlBtn = document.getElementById('copyChannelUrlBtn');
  if (copyChannelUrlBtn) {
    copyChannelUrlBtn.addEventListener('click', copyCurrentChannelUrl);
  }

  const retryChannelBtn = document.getElementById('retryChannelBtn');
  if (retryChannelBtn) {
    retryChannelBtn.addEventListener('click', retryCurrentChannel);
  }
}

function initializePlayer() {
  if (player) return;

  const videoElement = document.getElementById('videoPlayer');
  if (!videoElement) {
    console.error('Video element not found');
    return;
  }

  if (videojs.getPlayer('videoPlayer')) {
    player = videojs.getPlayer('videoPlayer');
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
    player.el().style.display = 'none';
  });

  player.on('error', () => {
    const errorMessage = player.error();
    let message = 'Failed to load stream. ';

    if (errorMessage) {
      switch (errorMessage.code) {
        case 1:
          message += 'The video playback was aborted.';
          break;
        case 2:
          message += 'A network error caused the video download to fail.';
          break;
        case 3:
          message += 'Playback was aborted due to a decoding issue.';
          break;
        case 4:
          message += 'The stream format is not supported or the channel is down.';
          break;
        default:
          message += 'The channel may be unavailable or geo-blocked.';
      }
    } else {
      message += 'The channel may be unavailable or geo-blocked.';
    }

    showError(message);
  });
}

async function loadPlaylists() {
  const playlistList = document.getElementById('playlistList');
  playlistList.innerHTML = '<div class="loading">Loading playlists...</div>';

  try {
    const rawPlaylists = await window.electronAPI.getPlaylists();
    state.playlists = rawPlaylists.map(decoratePlaylist).sort((a, b) => a.displayName.localeCompare(b.displayName));
    state.filteredPlaylists = [...state.playlists];
    renderPlaylists();
    updatePlaylistStats();
  } catch (error) {
    console.error('Error loading playlists:', error);
    playlistList.innerHTML = '<div class="empty-state">Error loading playlists</div>';
  }
}

function decoratePlaylist(playlist) {
  const code = (playlist.code || playlist.name || '').toUpperCase();
  const metadata = getCountryMetadata(code);
  return {
    ...playlist,
    code,
    displayName: metadata.name,
    flag: metadata.flag,
    label: `${metadata.flag} ${metadata.name}`,
    channelCount: playlist.channelCount || null
  };
}

function getCountryMetadata(code = '') {
  const normalized = code.trim().toUpperCase() || 'INTL';
  if (manualCountryOverrides[normalized]) {
    return manualCountryOverrides[normalized];
  }

  let name = '';
  if (normalized.length === 2 && regionDisplayNames) {
    try {
      name = regionDisplayNames.of(normalized) || '';
    } catch (error) {
      console.warn('Unable to resolve country name for code:', normalized, error);
    }
  }

  if (!name) {
    name = normalized
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  return {
    name,
    flag: normalized.length === 2 ? getFlagEmoji(normalized) : '🌐'
  };
}

function getFlagEmoji(code) {
  if (!code || code.length !== 2) {
    return '🌐';
  }

  return code
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}

async function loadCustomPlaylist() {
  try {
    const filePath = await window.electronAPI.selectPlaylistFile();
    if (!filePath) return;

    const customPlaylist = decoratePlaylist({
      code: 'CUSTOM',
      name: 'Custom Playlist',
      path: filePath,
      filename: filePath.split(/[/\\]/).pop()
    });

    const existingIndex = state.playlists.findIndex((playlist) => playlist.code === 'CUSTOM');
    if (existingIndex >= 0) {
      state.playlists[existingIndex] = customPlaylist;
    } else {
      state.playlists = [customPlaylist, ...state.playlists];
    }
    state.filteredPlaylists = [...state.playlists];
    renderPlaylists();

    const element = document.querySelector('.playlist-item');
    await loadPlaylist(customPlaylist, element);
  } catch (error) {
    console.error('Error loading custom playlist:', error);
    showError('Failed to load custom playlist.');
  }
}

async function loadPlaylist(playlist, element) {
  document.querySelectorAll('.playlist-item').forEach((item) => item.classList.remove('active'));
  if (element) element.classList.add('active');

  const channelsList = document.getElementById('channelsList');
  channelsList.innerHTML = '<div class="loading">Loading channels...</div>';

  try {
    const content = await window.electronAPI.readPlaylist(playlist.path);
    const parsedChannels = parseM3U(content).map((channel, index) =>
      enhanceChannel(channel, playlist, index)
    );

    state.currentPlaylist = playlist;
    state.channels = parsedChannels;

    if (!parsedChannels.length) {
      state.filteredChannels = [];
      channelsList.innerHTML = '<div class="empty-state">No channels found in this playlist</div>';
      playlist.channelCount = 0;
      updatePlaylistStats();
      renderPlaylists();
      return;
    }

    resetChannelControls();
    applyChannelFilters();

    playlist.channelCount = parsedChannels.length;
    updatePlaylistStats();
    renderPlaylists();
  } catch (error) {
    console.error('Error loading playlist:', error);
    channelsList.innerHTML = '<div class="empty-state">Error loading playlist</div>';
    state.channels = [];
    state.filteredChannels = [];
    updatePlaylistStats();
  }
}

function parseM3U(content) {
  const parsedChannels = [];
  const lines = content.split('\n');
  let currentChannel = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('#EXTINF:')) {
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
      currentChannel.url = line;
      parsedChannels.push(currentChannel);
      currentChannel = null;
    }
  }

  return parsedChannels;
}

function parseAttributes(attributeString) {
  const attributes = {};
  if (!attributeString) return attributes;

  const matches = attributeString.matchAll(/(\w+(?:-\w+)*)="([^"]+)"/g);
  for (const match of matches) {
    attributes[match[1]] = match[2];
  }

  const qualityMatch = attributeString.match(/(\d{3,4}p)/i);
  if (qualityMatch) {
    attributes.quality = qualityMatch[1];
  }

  return attributes;
}

function enhanceChannel(channel, playlist, index) {
  const cleanName = cleanChannelName(channel.name);
  const quality = extractQuality(channel);
  const tags = deriveChannelTags(channel.name);
  const channelId = channel.attributes['tvg-id'] || `${playlist.code}-${index}-${channel.url}`;

  return {
    ...channel,
    id: channelId,
    displayName: cleanName || channel.name,
    originalName: channel.name,
    playlistCode: playlist.code,
    playlistLabel: playlist.label,
    group: channel.attributes['group-title'] || 'General',
    quality,
    qualityValue: qualityToValue(quality),
    tags,
    flags: {
      geoBlocked: /\[Geo-blocked\]/i.test(channel.name),
      limited: /\[Not 24\/7\]/i.test(channel.name)
    }
  };
}

function cleanChannelName(name) {
  return name.replace(/\s*\[(.*?)\]/g, '').trim();
}

function extractQuality(channel) {
  if (channel.attributes.quality) {
    return channel.attributes.quality.toUpperCase();
  }
  const match = channel.name.match(/(\d{3,4}p)/i);
  if (match) {
    return match[1].toUpperCase();
  }
  if (/4K|UHD/i.test(channel.name)) {
    return '2160P';
  }
  return 'SD';
}

function qualityToValue(quality) {
  if (/4K|UHD/i.test(quality || '')) return 2160;
  const numeric = parseInt((quality || '').replace(/\D/g, ''), 10);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }
  return 480;
}

function deriveChannelTags(name) {
  const tags = [];
  if (/\[Geo-blocked\]/i.test(name)) {
    tags.push({ label: 'Geo-blocked', className: 'badge-warning', key: 'geo' });
  }
  if (/\[Not 24\/7\]/i.test(name)) {
    tags.push({ label: 'Not 24/7', className: 'badge-muted', key: 'limited' });
  }
  if (/\[Offline\]/i.test(name)) {
    tags.push({ label: 'Offline', className: 'badge-warning', key: 'offline' });
  }
  return tags;
}

function displayChannels(list) {
  const channelsList = document.getElementById('channelsList');
  channelsList.innerHTML = '';

  if (!state.currentPlaylist) {
    channelsList.innerHTML = '<div class="empty-state">Select a playlist to view channels</div>';
    updatePlaylistStats();
    return;
  }

  if (!list.length) {
    channelsList.innerHTML = '<div class="empty-state">No channels match your filters</div>';
    updatePlaylistStats();
    return;
  }

  const fragment = document.createDocumentFragment();

  list.forEach((channel) => {
    const item = document.createElement('div');
    item.className = 'channel-item';
    item.dataset.channelId = channel.id;
    if (state.currentChannel && state.currentChannel.id === channel.id) {
      item.classList.add('active');
    }

    const content = document.createElement('div');
    content.className = 'channel-content';

    const titleRow = document.createElement('div');
    titleRow.className = 'channel-title-row';

    const titleGroup = document.createElement('div');
    titleGroup.style.flex = '1';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'channel-name';
    nameDiv.textContent = channel.displayName;

    const subtitle = document.createElement('div');
    subtitle.className = 'channel-subtitle';
    subtitle.textContent = `${channel.playlistLabel} · ${channel.group}`;

    titleGroup.appendChild(nameDiv);
    titleGroup.appendChild(subtitle);
    titleRow.appendChild(titleGroup);

    const qualityBadge = document.createElement('span');
    qualityBadge.className = 'channel-badge badge-quality';
    qualityBadge.textContent = channel.quality;
    titleRow.appendChild(qualityBadge);

    content.appendChild(titleRow);

    if (channel.tags.length) {
      const badges = document.createElement('div');
      badges.className = 'channel-badges';
      channel.tags.forEach((tag) => {
        const badge = document.createElement('span');
        badge.className = `channel-badge ${tag.className}`;
        badge.textContent = tag.label;
        badges.appendChild(badge);
      });
      content.appendChild(badges);
    }

    const favoriteBtn = document.createElement('button');
    favoriteBtn.className = `channel-favorite${isFavorite(channel.id) ? ' active' : ''}`;
    favoriteBtn.textContent = isFavorite(channel.id) ? '★' : '☆';
    favoriteBtn.title = 'Toggle favorite';
    favoriteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleFavorite(channel);
      favoriteBtn.classList.toggle('active', isFavorite(channel.id));
      favoriteBtn.textContent = isFavorite(channel.id) ? '★' : '☆';
    });

    item.appendChild(content);
    item.appendChild(favoriteBtn);

    item.addEventListener('click', () => playChannel(channel, item));
    fragment.appendChild(item);
  });

  channelsList.appendChild(fragment);
  updatePlaylistStats();
}

function toggleFavorite(channel) {
  if (!channel || !channel.id) return;

  if (isFavorite(channel.id)) {
    delete state.favorites[channel.id];
  } else {
    state.favorites[channel.id] = {
      name: channel.displayName,
      playlist: channel.playlistCode,
      url: channel.url
    };
  }

  persistFavorites();
  if (state.filters.favoritesOnly) {
    applyChannelFilters();
  }
}

function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem('iptvFavorites') || '{}');
  } catch (error) {
    console.warn('Unable to load favorites from storage', error);
    return {};
  }
}

function persistFavorites() {
  try {
    localStorage.setItem('iptvFavorites', JSON.stringify(state.favorites));
  } catch (error) {
    console.warn('Unable to persist favorites', error);
  }
}

function isFavorite(channelId) {
  return Boolean(state.favorites[channelId]);
}

function applyChannelFilters() {
  let filtered = [...state.channels];

  if (state.channelSearchTerm) {
    filtered = filtered.filter((channel) => {
      const haystack = `${channel.displayName} ${channel.group} ${channel.playlistLabel}`.toLowerCase();
      return haystack.includes(state.channelSearchTerm);
    });
  }

  switch (state.filters.quality) {
    case 'hd':
      filtered = filtered.filter((channel) => channel.qualityValue >= 720);
      break;
    case 'fullhd':
      filtered = filtered.filter((channel) => channel.qualityValue >= 1080);
      break;
    case 'uhd':
      filtered = filtered.filter((channel) => channel.qualityValue >= 2160);
      break;
    default:
      break;
  }

  if (state.filters.geoFreeOnly) {
    filtered = filtered.filter((channel) => !channel.flags.geoBlocked);
  }

  if (state.filters.favoritesOnly) {
    filtered = filtered.filter((channel) => isFavorite(channel.id));
  }

  filtered = sortChannels(filtered);
  state.filteredChannels = filtered;
  displayChannels(filtered);
}

function sortChannels(channels) {
  return [...channels].sort((a, b) => {
    switch (state.sort) {
      case 'name-desc':
        return b.displayName.localeCompare(a.displayName);
      case 'quality-desc':
        return b.qualityValue - a.qualityValue;
      case 'quality-asc':
        return a.qualityValue - b.qualityValue;
      case 'group-asc':
        return a.group.localeCompare(b.group);
      case 'name-asc':
      default:
        return a.displayName.localeCompare(b.displayName);
    }
  });
}

function resetChannelControls() {
  state.channelSearchTerm = '';
  const channelSearchInput = document.getElementById('searchInput');
  if (channelSearchInput) {
    channelSearchInput.value = '';
  }

  state.filters.quality = 'all';
  state.filters.geoFreeOnly = false;

  document.querySelectorAll('[data-filter-type="quality"]').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.channelFilter === 'all');
  });

  const geoChip = document.querySelector('[data-filter-type="geo"]');
  if (geoChip) {
    geoChip.classList.remove('active');
  }
}

function filterPlaylists() {
  if (!state.playlistSearchTerm) {
    state.filteredPlaylists = [...state.playlists];
  } else {
    state.filteredPlaylists = state.playlists.filter((playlist) => {
      const haystack = `${playlist.displayName} ${playlist.code}`.toLowerCase();
      return haystack.includes(state.playlistSearchTerm);
    });
  }

  renderPlaylists();
  updatePlaylistStats();
}

function renderPlaylists() {
  const playlistList = document.getElementById('playlistList');
  if (!playlistList) return;

  const previousScroll = playlistList.scrollTop;
  playlistList.innerHTML = '';

  if (!state.filteredPlaylists.length) {
    playlistList.innerHTML = '<div class="empty-state">No playlists match your search</div>';
    updatePlaylistStats();
    return;
  }

  const fragment = document.createDocumentFragment();
  state.filteredPlaylists.forEach((playlist) => {
    const item = document.createElement('div');
    item.className = 'playlist-item';
    if (state.currentPlaylist && playlist.code === state.currentPlaylist.code) {
      item.classList.add('active');
    }
    item.dataset.code = playlist.code;
    item.innerHTML = `
      <span class="playlist-flag">${playlist.flag}</span>
      <div class="playlist-text">
        <p class="playlist-name">${playlist.displayName}</p>
        <p class="playlist-subtitle">${playlist.code}</p>
      </div>
      <div class="playlist-badge">${playlist.channelCount ? `${playlist.channelCount} ch` : '—'}</div>
    `;
    item.addEventListener('click', () => loadPlaylist(playlist, item));
    fragment.appendChild(item);
  });

  playlistList.appendChild(fragment);
  playlistList.scrollTop = previousScroll;
}

function updatePlaylistStats() {
  const playlistStatsValue = document.getElementById('playlistStatsValue');
  if (playlistStatsValue) {
    playlistStatsValue.textContent = `${state.filteredPlaylists.length}`;
  }

  const channelStatsValue = document.getElementById('channelStatsValue');
  if (channelStatsValue) {
    channelStatsValue.textContent = `${state.filteredChannels.length}`;
  }
}

function playChannel(channel, element) {
  document.querySelectorAll('.channel-item').forEach((item) => item.classList.remove('active'));
  if (element) {
    element.classList.add('active');
  }

  state.currentChannel = channel;

  const placeholder = document.querySelector('.player-placeholder');
  const channelInfo = document.getElementById('channelInfo');

  if (placeholder) placeholder.style.display = 'none';
  if (channelInfo) channelInfo.style.display = 'block';

  updateChannelInfo(channel);

  if (player && player.el()) {
    player.el().style.display = 'block';
    player.el().style.visibility = 'visible';
    player.el().style.opacity = '1';
  }

  if (!player) return;

  if (!player.paused()) {
    player.pause();
  }

  player.src('');

  setTimeout(() => {
    player.dimensions('100%', '100%');
    player.fluid(true);
    player.responsive(true);

    player.src({
      src: channel.url,
      type: getStreamType(channel.url)
    });

    player.one('loadedmetadata', () => {
      player.dimensions('100%', '100%');
      player.trigger('resize');

      const playPromise = player.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          if (error.name === 'AbortError') {
            return;
          }
          let message = 'Failed to play stream. ';
          if (error.name === 'NotSupportedError' || error.name === 'NotAllowedError') {
            message += 'The stream format is not supported or playback was blocked.';
          } else if (error.message && error.message.includes('403')) {
            message += 'Access forbidden. This stream may be geo-blocked.';
          } else if (error.message && error.message.includes('404')) {
            message += 'Stream not found. This channel may be unavailable.';
          } else {
            message += 'Try another channel.';
          }
          showError(message);
        });
      }
    });

    player.ready(() => {
      player.dimensions('100%', '100%');
      player.trigger('resize');
    });
  }, 80);
}

function updateChannelInfo(channel) {
  const channelName = document.getElementById('channelName');
  const channelUrl = document.getElementById('channelUrl');
  const channelPlaylist = document.getElementById('channelPlaylist');
  const channelGroup = document.getElementById('channelGroup');
  const channelQuality = document.getElementById('channelQuality');
  const channelStatusTags = document.getElementById('channelStatusTags');

  if (channelName) channelName.textContent = channel.displayName;
  if (channelPlaylist) channelPlaylist.textContent = channel.playlistLabel;
  if (channelGroup) channelGroup.textContent = channel.group;
  if (channelQuality) channelQuality.textContent = channel.quality;
  if (channelUrl) channelUrl.textContent = channel.url || 'Unavailable';
  if (channelStatusTags) {
    channelStatusTags.innerHTML = '';
    if (channel.tags.length) {
      channel.tags.forEach((tag) => {
        const badge = document.createElement('span');
        badge.className = `channel-badge ${tag.className}`;
        badge.textContent = tag.label;
        channelStatusTags.appendChild(badge);
      });
    } else {
      const badge = document.createElement('span');
      badge.className = 'channel-badge badge-group';
      badge.textContent = 'Live';
      channelStatusTags.appendChild(badge);
    }
  }
}

function getStreamType(url) {
  if (url.includes('.m3u8')) {
    return 'application/x-mpegURL';
  }
  if (url.includes('.mpd')) {
    return 'application/dash+xml';
  }
  if (url.includes('.mp4') || url.includes('.m4v')) {
    return 'video/mp4';
  }
  return 'video/mp4';
}

function showError(message) {
  const placeholder = document.querySelector('.player-placeholder');
  if (!placeholder) return;

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

  const videoPlayer = document.getElementById('videoPlayer');
  const channelInfo = document.getElementById('channelInfo');
  if (videoPlayer) videoPlayer.style.display = 'none';
  if (channelInfo) channelInfo.style.display = 'none';
}

async function copyCurrentChannelUrl() {
  if (!state.currentChannel || !state.currentChannel.url) return;
  try {
    await navigator.clipboard.writeText(state.currentChannel.url);
  } catch (error) {
    console.warn('Clipboard unavailable', error);
  }
}

function retryCurrentChannel() {
  if (!state.currentChannel) return;
  const channelElement = document.querySelector(`[data-channel-id="${state.currentChannel.id}"]`);
  playChannel(state.currentChannel, channelElement);
}
