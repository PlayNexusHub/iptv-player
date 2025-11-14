const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getPlaylists: () => ipcRenderer.invoke('get-playlists'),
  readPlaylist: (filePath) => ipcRenderer.invoke('read-playlist', filePath),
  selectPlaylistFile: () => ipcRenderer.invoke('select-playlist-file')
});
