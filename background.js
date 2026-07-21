const MARKDOWN_EXTENSION = ".md";
const DEFAULT_SETTINGS = {
  showSource: false,
  offlineOnly: false
};
// GitHub already renders Markdown on these pages. Keep the native experience there.
const EXCLUDED_HOSTNAMES = new Set([
  "github.com",
  "www.github.com",
  "gist.github.com"
]);
const rawNavigationByTab = new Map();
const settings = { ...DEFAULT_SETTINGS };
const settingsReady = chrome.storage.local.get(DEFAULT_SETTINGS).then((stored) => {
  Object.assign(settings, stored);
});

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

function getExtensionDocument(value) {
  const url = parseUrl(value);

  if (!url || url.protocol !== "chrome-extension:") {
    return null;
  }

  if (!["/viewer/viewer.html", "/source/source.html"].includes(url.pathname)) {
    return null;
  }

  return {
    mode: url.pathname.startsWith("/source/") ? "source" : "viewer",
    sourceUrl: url.searchParams.get("src")
  };
}

function getViewerUrl(sourceUrl) {
  return chrome.runtime.getURL(
    `viewer/viewer.html?src=${encodeURIComponent(sourceUrl)}`
  );
}

function getSourceUrl(sourceUrl) {
  return chrome.runtime.getURL(
    `source/source.html?src=${encodeURIComponent(sourceUrl)}`
  );
}

function getDestinationUrl(sourceUrl) {
  const url = parseUrl(sourceUrl);

  if (!url || !isMarkdownUrl(sourceUrl) || isExcludedUrl(sourceUrl)) {
    return sourceUrl;
  }

  if (settings.showSource) {
    return getSourceUrl(sourceUrl);
  }

  if (settings.offlineOnly && url.protocol !== "file:") {
    return sourceUrl;
  }

  return getViewerUrl(sourceUrl);
}

async function applySettingsToTab(tabId) {
  const tab = await chrome.tabs.get(tabId);

  if (!tab?.url) {
    return;
  }

  const extensionDocument = getExtensionDocument(tab.url);

  if (extensionDocument?.sourceUrl) {
    const destinationUrl = getDestinationUrl(extensionDocument.sourceUrl);

    if (destinationUrl !== tab.url) {
      chrome.tabs.update(tabId, { url: destinationUrl });
    }
    return;
  }

  if (isMarkdownUrl(tab.url)) {
    chrome.tabs.reload(tabId);
  }
}

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
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

  await settingsReady;

  const destinationUrl = getDestinationUrl(details.url);

  if (destinationUrl === details.url) {
    return;
  }

  chrome.tabs.update(details.tabId, { url: destinationUrl });
});

async function openRawMarkdown(message, sender) {
  let tabId = sender.tab?.id;

  if (!Number.isInteger(tabId)) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = activeTab?.id;
  }

  if (!Number.isInteger(tabId)) {
    return;
  }

  if (isExcludedUrl(message.url)) {
    chrome.tabs.update(tabId, { url: message.url });
    return;
  }

  rawNavigationByTab.set(tabId, message.url);
  chrome.tabs.update(tabId, { url: message.url });
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === "settingsChanged" && Number.isInteger(message.tabId)) {
    Object.assign(settings, {
      showSource: Boolean(message.settings?.showSource),
      offlineOnly: Boolean(message.settings?.offlineOnly)
    });
    applySettingsToTab(message.tabId).catch(() => {});
    return;
  }

  if (message?.type !== "openRawMarkdown" || !isMarkdownUrl(message.url)) {
    return;
  }

  openRawMarkdown(message, sender).catch(() => {});
});

chrome.tabs.onRemoved.addListener((tabId) => {
  rawNavigationByTab.delete(tabId);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes.showSource) {
    settings.showSource = Boolean(changes.showSource.newValue);
  }

  if (changes.offlineOnly) {
    settings.offlineOnly = Boolean(changes.offlineOnly.newValue);
  }
});
