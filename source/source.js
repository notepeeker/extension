const sourceUrl = new URLSearchParams(window.location.search).get("src");
const sourceElement = document.querySelector("#source");

function getFileName(value) {
  try {
    const url = new URL(value);
    const path = decodeURIComponent(url.pathname);
    return path.split("/").filter(Boolean).pop() || "Markdown source";
  } catch {
    return "Markdown source";
  }
}

async function loadSource() {
  if (!sourceUrl) {
    sourceElement.textContent = "No Markdown file was provided.";
    return;
  }

  try {
    const response = await fetch(sourceUrl, { credentials: "omit" });

    if (!response.ok) {
      throw new Error(`The file returned ${response.status}.`);
    }

    sourceElement.textContent = await response.text();
    document.title = `${getFileName(sourceUrl)} - NotePeeker source`;
  } catch (error) {
    sourceElement.textContent = `Unable to open this Markdown file. ${error.message}`;
    document.title = "Unable to open Markdown - NotePeeker";
  }
}

loadSource();
