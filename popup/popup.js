const DEFAULT_SETTINGS = {
  showSource: false,
  offlineOnly: false
};

const showSource = document.querySelector("#showSource");
const offlineOnly = document.querySelector("#offlineOnly");
const status = document.querySelector("#status");

function readSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULT_SETTINGS, (settings) => resolve(settings));
  });
}

function saveSettings() {
  const settings = {
    showSource: showSource.checked,
    offlineOnly: offlineOnly.checked
  };

  chrome.storage.local.set(settings, () => {
    status.textContent = "Settings saved";
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;

      if (tabId) {
        chrome.runtime.sendMessage({ type: "settingsChanged", settings, tabId });
      }
    });
  });
}

async function loadSettings() {
  const settings = await readSettings();
  showSource.checked = Boolean(settings.showSource);
  offlineOnly.checked = Boolean(settings.offlineOnly);
}

showSource.addEventListener("change", saveSettings);
offlineOnly.addEventListener("change", saveSettings);
loadSettings();
