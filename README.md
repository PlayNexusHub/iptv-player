# IPTV Player - Windows 10 Electron App

A modern, beautiful Electron application for playing IPTV streams from the iptv-org repository.

## Features

- 📺 Browse and play IPTV streams from 300+ playlists
- 🔍 Search channels by name
- 🎬 Modern video player with full controls
- 🎨 Beautiful, dark-themed UI
- 📁 Load custom M3U playlists
- ⚡ Fast and responsive

## Installation

1. Install dependencies:
```bash
npm install
```

2. Run the app:
```bash
npm start
```

## Building for Windows

To create a Windows installer:

```bash
npm run build:win
```

The installer will be created in the `dist` folder.

## Usage

1. **Select a Playlist**: Click on any playlist from the left sidebar (organized by country/region)
2. **Browse Channels**: Channels from the selected playlist will appear in the channels list
3. **Search**: Use the search box to filter channels by name
4. **Play**: Click on any channel to start playing
5. **Custom Playlists**: Click "Load Custom Playlist" to load your own M3U file

## Requirements

- Node.js 16+ 
- Windows 10 or later
- Internet connection for streaming

## License

MIT

