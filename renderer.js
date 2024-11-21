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

  const adjustHeight = () => {
    const container = document.querySelector('.container');
    const totalHeight = container.scrollHeight + 22;
    ipcRenderer.send('adjust-window-height', totalHeight);
  };

  const images = responseDiv.getElementsByTagName('img');
  if (images.length > 0) {
    let imagesLoaded = 0;
    for (let img of images) {
      img.addEventListener('load', () => {
        imagesLoaded++;
        if (imagesLoaded === images.length) {
          adjustHeight();
        }
      });
      img.addEventListener('error', () => {
        imagesLoaded++;
        if (imagesLoaded === images.length) {
          adjustHeight();
        }
      });
    }
  } else {
    adjustHeight();
  }
});

ipcRenderer.on('clear-response', () => {
  const responseDiv = document.getElementById('response');
  responseDiv.innerHTML = '';

  setTimeout(() => {
    const container = document.querySelector('.container');
    const totalHeight = container.scrollHeight + 20;
    ipcRenderer.send('adjust-window-height', totalHeight);
  }, 50);
});
