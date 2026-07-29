function isEpubLink(value) {
  try {
    const url = new URL(value, window.location.href);

    return url.protocol === 'file:' && decodeURIComponent(url.pathname).toLowerCase().endsWith('.epub');
  } catch {
    return false;
  }
}

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const link = event.target.closest?.('a[href]');

  if (!link || !isEpubLink(link.href)) {
    return;
  }

  event.preventDefault();
  chrome.runtime.sendMessage({
    type: 'openEpub',
    url: link.href
  }, () => {
    void chrome.runtime.lastError;
  });
}, true);
