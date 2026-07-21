const MARKDOWN_EXTENSION = ".md";
// GitHub already renders Markdown on these pages. Keep the native experience there.
const EXCLUDED_HOSTNAMES = new Set([
  "github.com",
  "www.github.com",
  "gist.github.com"
]);
const rawNavigationByTab = new Map();

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isExcludedUrl(value) {
  const url = parseUrl(value);
  return Boolean(url && EXCLUDED_HOSTNAMES.has(url.hostname.toLowerCase()));
}

function isMarkdownUrl(value) {
  const url = parseUrl(value);

  if (!url) {
    return false;
  }

  if (!["http:", "https:", "file:"].includes(url.protocol)) {
    return false;
  }

  let pathname = url.pathname;

  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    return false;
  }

  return pathname.toLowerCase().endsWith(MARKDOWN_EXTENSION);
}

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0 || !isMarkdownUrl(details.url)) {
    return;
  }

  if (isExcludedUrl(details.url)) {
    rawNavigationByTab.delete(details.tabId);
    return;
  }

  if (rawNavigationByTab.get(details.tabId) === details.url) {
    rawNavigationByTab.delete(details.tabId);
    return;
  }

  const viewerUrl = chrome.runtime.getURL(
    `viewer/viewer.html?src=${encodeURIComponent(details.url)}`
  );

  if (details.url === viewerUrl) {
    return;
  }

  chrome.tabs.update(details.tabId, { url: viewerUrl });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "openRawMarkdown" || !sender.tab?.id || !isMarkdownUrl(message.url)) {
    return;
  }

  if (isExcludedUrl(message.url)) {
    chrome.tabs.update(sender.tab.id, { url: message.url });
    return;
  }

  rawNavigationByTab.set(sender.tab.id, message.url);
  chrome.tabs.update(sender.tab.id, { url: message.url });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  rawNavigationByTab.delete(tabId);
});
