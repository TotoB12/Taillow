const { ipcRenderer } = require('electron');

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    ipcRenderer.send('hide-window');
  }
});
