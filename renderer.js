const { ipcRenderer } = require('electron');
const marked = require('marked');
const markedKatex = require('marked-katex-extension');
const createDOMPurify = require('dompurify');
const DOMPurify = createDOMPurify(window);

const options = {
  throwOnError: false,
};
marked.use(markedKatex(options));

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
  const html = marked.parse(chunk);
  const sanitized = DOMPurify.sanitize(html, {
    ADD_TAGS: ['span', 'math', 'mrow', 'mi', 'mo', 'mn', 'msqrt', 'mfrac', 'msup', 'msub'],
    ADD_ATTR: ['class', 'style', 'aria-hidden', 'focusable', 'role', 'tabindex', 'viewBox', 'xmlns', 'd'],
  });

  responseDiv.innerHTML = sanitized;

  function isImagesOnly(element) {
    const nodes = element.childNodes;
    for (let node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent.trim().length > 0) {
          return false;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        if (tagName === 'img' || tagName === 'br') {
          continue;
        } else {
          if (!isImagesOnly(node)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  const imagesOnly = isImagesOnly(responseDiv);

  if (imagesOnly) {
    responseDiv.classList.add('images-only');
  } else {
    responseDiv.classList.remove('images-only');
  }

  if (responseDiv.innerHTML.trim().length === 0) {
    responseDiv.classList.add('empty');
  } else {
    responseDiv.classList.remove('empty');
  }

  const adjustHeight = () => {
    const inputAreaHeight = document.querySelector('.input-area').offsetHeight;
    const gapHeight = document.querySelector('.gap').offsetHeight;
    const responseAreaHeight = document.querySelector('.response-area').scrollHeight;

    const totalHeight = inputAreaHeight + gapHeight + responseAreaHeight + 22;

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
  responseDiv.classList.remove('images-only');
  responseDiv.classList.add('empty');

  setTimeout(() => {
    const container = document.querySelector('.container');
    const totalHeight = container.scrollHeight + 20;
    ipcRenderer.send('adjust-window-height', totalHeight);
  }, 50);
});
