const { ipcRenderer } = require('electron');
const marked = require('marked');
const markedKatex = require('marked-katex-extension');
const createDOMPurify = require('dompurify');
const DOMPurify = createDOMPurify(window);

const options = {
  throwOnError: false,
};
marked.use(markedKatex(options));

// A small helper so we can recalc window height whenever we want
function adjustWindowHeight() {
  const inputAreaHeight = document.querySelector('.input-area').offsetHeight;
  const gapHeight = document.querySelector('.gap').offsetHeight;

  // We have both #response and #quick-math-response now
  const responseAreaHeight = document.getElementById('response').scrollHeight;
  const quickMathAreaHeight = document.getElementById('quick-math-response').scrollHeight;

  // Add some bottom padding
  const totalHeight = inputAreaHeight + gapHeight + responseAreaHeight + quickMathAreaHeight + 22;

  ipcRenderer.send('adjust-window-height', totalHeight);
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    ipcRenderer.send('hide-window');
  }
});

const inputField = document.querySelector('input');

// 1) 'Enter' logic for sending to AI
inputField.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const query = event.target.value.trim();
    if (query) {
      // Send to main.js
      ipcRenderer.send('query', query);
      event.target.value = '';

      // Clear any previous AI response
      const responseDiv = document.getElementById('response');
      responseDiv.innerHTML = '';

      // --- FIX: Clear the quick math area on Enter so you don't see both ---
      const quickMathDiv = document.getElementById('quick-math-response');
      quickMathDiv.innerHTML = '';
      quickMathDiv.classList.add('empty');
      // ---------------------------------------------------------------------

      // Optionally resize after clearing
      adjustWindowHeight();
    }
  }
});

// 2) Quick math preview on every keystroke
inputField.addEventListener('input', (event) => {
  const expression = event.target.value.trim();
  const quickMathDiv = document.getElementById('quick-math-response');

  if (!expression) {
    // If empty, clear quick math
    quickMathDiv.innerHTML = '';
    quickMathDiv.classList.add('empty');
    adjustWindowHeight();
    return;
  }

  try {
    const result = math.evaluate(expression);

    // If we do get a valid result, show it
    if (typeof result === 'number' || typeof result === 'boolean') {
      quickMathDiv.innerHTML = `<p>${result}</p>`;
      quickMathDiv.classList.remove('empty');
      quickMathDiv.classList.remove('images-only');
    } else {
      // If result is somehow empty
      quickMathDiv.innerHTML = '';
      quickMathDiv.classList.add('empty');
    }
  } catch (err) {
    // Any math parsing error => clear the quick math
    quickMathDiv.innerHTML = '';
    quickMathDiv.classList.add('empty');
  }

  // Recalc the window size
  adjustWindowHeight();
});

// --- AI response listener ---
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

  // Now that the response is set, adjust window size
  adjustWindowHeight();

  const images = responseDiv.getElementsByTagName('img');
  if (images.length > 0) {
    let imagesLoaded = 0;
    for (let img of images) {
      img.addEventListener('load', () => {
        imagesLoaded++;
        if (imagesLoaded === images.length) {
          adjustWindowHeight();
        }
      });
      img.addEventListener('error', () => {
        imagesLoaded++;
        if (imagesLoaded === images.length) {
          adjustWindowHeight();
        }
      });
    }
  } else {
    adjustWindowHeight();
  }
});

// Clear both response areas if the window is hidden
ipcRenderer.on('clear-response', () => {
  const responseDiv = document.getElementById('response');
  responseDiv.innerHTML = '';
  responseDiv.classList.remove('images-only');
  responseDiv.classList.add('empty');

  const quickMathDiv = document.getElementById('quick-math-response');
  quickMathDiv.innerHTML = '';
  quickMathDiv.classList.add('empty');

  setTimeout(() => {
    const container = document.querySelector('.container');
    const totalHeight = container.scrollHeight + 20;
    ipcRenderer.send('adjust-window-height', totalHeight);
  }, 50);
});
