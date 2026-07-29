const MARKDOWN_EXTENSION = ".md";
const EPUB_EXTENSION = ".epub";
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
const settingsReady = new Promise((resolve) => {
  chrome.storage.local.get(DEFAULT_SETTINGS, (stored) => {
    Object.assign(settings, stored || {});
    resolve();
  });
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

function hasFileExtension(value, extension) {
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

  return pathname.toLowerCase().endsWith(extension);
}

function isMarkdownUrl(value) {
  return hasFileExtension(value, MARKDOWN_EXTENSION);
}

function isEpubUrl(value) {
  return hasFileExtension(value, EPUB_EXTENSION);
}

function isSupportedDocumentUrl(value) {
  return isMarkdownUrl(value) || isEpubUrl(value);
}

function getExtensionDocument(value) {
  const url = parseUrl(value);

  if (!url || !["chrome-extension:", "moz-extension:"].includes(url.protocol)) {
    return null;
  }

  if (!["/viewer/viewer.html", "/source/source.html", "/epub/epub.html"].includes(url.pathname)) {
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

function getEpubUrl(sourceUrl) {
  return chrome.runtime.getURL(
    `epub/epub.html?src=${encodeURIComponent(sourceUrl)}`
  );
}

function getDestinationUrl(sourceUrl) {
  const url = parseUrl(sourceUrl);

  if (!url || !isSupportedDocumentUrl(sourceUrl) || isExcludedUrl(sourceUrl)) {
    return sourceUrl;
  }

  if (isMarkdownUrl(sourceUrl) && settings.showSource) {
    return getSourceUrl(sourceUrl);
  }

  if (settings.offlineOnly && url.protocol !== "file:") {
    return sourceUrl;
  }

  if (isEpubUrl(sourceUrl)) {
    return getEpubUrl(sourceUrl);
  }

  return getViewerUrl(sourceUrl);
}

function getTab(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      // Reading lastError prevents Chrome from reporting a closed tab as an uncaught error.
      void chrome.runtime.lastError;
      resolve(tab || null);
    });
  });
}

function updateTab(tabId, updateProperties) {
  return new Promise((resolve) => {
    chrome.tabs.update(tabId, updateProperties, (tab) => {
      void chrome.runtime.lastError;
      resolve(tab || null);
    });
  });
}

function reloadTab(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.reload(tabId, {}, () => {
      void chrome.runtime.lastError;
      resolve();
    });
  });
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs?.[0] || null));
  });
}

async function applySettingsToTab(tabId) {
  const tab = await getTab(tabId);

  if (!tab?.url) {
    return;
  }

  const extensionDocument = getExtensionDocument(tab.url);

  if (extensionDocument?.sourceUrl) {
    const destinationUrl = getDestinationUrl(extensionDocument.sourceUrl);

    if (destinationUrl !== tab.url) {
      await updateTab(tabId, { url: destinationUrl });
    }
    return;
  }

  if (isSupportedDocumentUrl(tab.url)) {
    await reloadTab(tabId);
  }
}

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0 || !isSupportedDocumentUrl(details.url)) {
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

  await updateTab(details.tabId, { url: destinationUrl });
});

async function openRawMarkdown(message, sender) {
  let tabId = sender.tab?.id;

  if (!Number.isInteger(tabId)) {
    tabId = (await getActiveTab())?.id;
  }

  if (!Number.isInteger(tabId)) {
    return;
  }

  if (isExcludedUrl(message.url)) {
    await updateTab(tabId, { url: message.url });
    return;
  }

  rawNavigationByTab.set(tabId, message.url);
  await updateTab(tabId, { url: message.url });
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
