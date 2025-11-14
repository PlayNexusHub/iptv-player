# IPTV Player - Windows 10 Electron App

A modern, beautiful Electron application for playing IPTV streams from the iptv-org repository.

![IPTV Player](https://img.shields.io/badge/IPTV-Player-blue?style=for-the-badge)
![Electron](https://img.shields.io/badge/Electron-39.1.2-47848F?style=for-the-badge&logo=electron)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

## ✨ Features

- 📺 Browse and play IPTV streams from 300+ playlists
- 🔍 Search channels by name
- 🎬 Modern video player with full controls
- 🎨 Beautiful, polished dark-themed UI
- 📁 Load custom M3U playlists
- ⚡ Fast and responsive
- 🎯 Picture-in-Picture support
- ⌨️ Keyboard shortcuts

## 🚀 Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/iptv-player.git
cd iptv-player
```

2. Install dependencies:
```bash
npm install
```

3. Run the app:
```bash
npm start
```

## 📦 Building for Windows

To create a Windows installer:

```bash
npm run build:win
```

The installer will be created in the `dist` folder.

## 🎮 Usage

1. **Select a Playlist**: Click on any playlist from the left sidebar (organized by country/region)
2. **Browse Channels**: Channels from the selected playlist will appear in the channels list
3. **Search**: Use the search box to filter channels by name
4. **Play**: Click on any channel to start playing
5. **Custom Playlists**: Click "Load Custom Playlist" to load your own M3U file

## ⌨️ Keyboard Shortcuts

- `Space` - Play/Pause
- `↑/↓` - Volume up/down
- `←/→` - Seek backward/forward
- `M` - Mute/Unmute
- `F` - Fullscreen

## 🛠️ Requirements

- Node.js 16+ 
- Windows 10 or later
- Internet connection for streaming

## 📝 Notes

- Many IPTV streams are unreliable and may be temporarily unavailable
- Some streams may require authentication or be geo-blocked
- If a channel doesn't work, try selecting a different one

## 🎨 UI Features

- Modern dark theme with gradient accents
- Smooth animations and transitions
- Polished interface with depth and shadows
- Responsive design
- Custom scrollbars
- Beautiful loading states

## 📄 License

MIT

## 🙏 Credits

- IPTV playlists from [iptv-org/iptv](https://github.com/iptv-org/iptv)
- Video player powered by [Video.js](https://videojs.com/)
