const { ipcRenderer } = require('electron');

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    ipcRenderer.send('hide-window');
  }
});

const inputField = document.querySelector('input');
inputField.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const query = event.target.value.trim();
    if (query) {
      ipcRenderer.send('query', query);
      event.target.value = '';

      const responseDiv = document.getElementById('response');
      responseDiv.innerHTML = '';
    }
  }
});

ipcRenderer.on('response', (event, chunk) => {
  const responseDiv = document.getElementById('response');
  const sanitized = DOMPurify.sanitize(chunk);
  const html = marked.parse(sanitized);
  responseDiv.innerHTML = html;
});

// Add this listener to clear the response area
ipcRenderer.on('clear-response', () => {
  const responseDiv = document.getElementById('response');
  responseDiv.innerHTML = '';
});
