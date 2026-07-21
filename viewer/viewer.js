const ZOOM_LEVELS = [0.75, 0.9, 1, 1.1, 1.25, 1.5];

const state = {
  sourceUrl: new URLSearchParams(window.location.search).get("src"),
  zoomIndex: 2,
  fullWidth: false
};

const elements = {
  title: document.querySelector("#documentTitle"),
  status: document.querySelector("#status"),
  viewport: document.querySelector(".viewport"),
  page: document.querySelector("#page"),
  zoomOut: document.querySelector("#zoomOut"),
  zoomIn: document.querySelector("#zoomIn"),
  zoomValue: document.querySelector("#zoomValue"),
  fullWidthToggle: document.querySelector("#fullWidthToggle"),
  themeToggle: document.querySelector("#themeToggle"),
  printButton: document.querySelector("#printButton"),
  rawLink: document.querySelector("#rawLink")
};

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function resolveResourceUrl(value) {
  const trimmed = value.trim().replace(/&amp;/g, "&");

  if (trimmed.startsWith("#")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed, state.sourceUrl);
    return ["http:", "https:", "file:", "mailto:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function renderInline(markdown) {
  const tokens = [];
  const stash = (html) => {
    const key = `\u0000${tokens.length}\u0000`;
    tokens.push(html);
    return key;
  };

  let text = markdown;

  text = text.replace(/`([^`]+)`/g, (_, code) => {
    return stash(`<code>${escapeHtml(code)}</code>`);
  });

  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, url) => {
    const resolvedUrl = resolveResourceUrl(url);
    return resolvedUrl ? stash(`<img src="${escapeHtml(resolvedUrl)}" alt="${escapeHtml(alt)}">`) : alt;
  });

  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, url) => {
    const resolvedUrl = resolveResourceUrl(url);
    const renderedLabel = renderInline(label);
    return resolvedUrl ? stash(`<a href="${escapeHtml(resolvedUrl)}" rel="noreferrer">${renderedLabel}</a>`) : label;
  });

  let html = escapeHtml(text);

  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/_([^_]+)_/g, "<em>$1</em>");
  html = html.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)] || "");

  return html;
}

function isTable(lines, index) {
  return (
    index + 1 < lines.length &&
    lines[index].includes("|") &&
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])
  );
}

function parseTable(lines, start) {
  const tableLines = [];
  let index = start;

  while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
    tableLines.push(lines[index]);
    index += 1;
  }

  const splitRow = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  const headers = splitRow(tableLines[0]);
  const rows = tableLines.slice(2).map(splitRow);
  const head = headers.map((cell) => `<th>${renderInline(cell)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
    .join("");

  return {
    html: `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`,
    nextIndex: index
  };
}

function parseList(lines, start, ordered) {
  const tag = ordered ? "ol" : "ul";
  const pattern = ordered ? /^\s*\d+\.\s+(.+)$/ : /^\s*[-*+]\s+(.+)$/;
  const items = [];
  let index = start;

  while (index < lines.length) {
    const match = lines[index].match(pattern);
    if (!match) {
      break;
    }

    items.push(`<li>${renderInline(match[1])}</li>`);
    index += 1;
  }

  return {
    html: `<${tag}>${items.join("")}</${tag}>`,
    nextIndex: index
  };
}

function parseParagraph(lines, start) {
  const parts = [];
  let index = start;

  while (index < lines.length && lines[index].trim()) {
    if (/^(#{1,6})\s+/.test(lines[index]) || /^```/.test(lines[index]) || /^---+$/.test(lines[index])) {
      break;
    }

    if (/^\s*[-*+]\s+/.test(lines[index]) || /^\s*\d+\.\s+/.test(lines[index]) || /^>\s?/.test(lines[index])) {
      break;
    }

    if (isTable(lines, index)) {
      break;
    }

    parts.push(lines[index].trim());
    index += 1;
  }

  return {
    html: `<p>${renderInline(parts.join(" "))}</p>`,
    nextIndex: index
  };
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const html = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```\s*(.*)$/);
    if (fence) {
      const language = fence[1].trim();
      const code = [];
      index += 1;

      while (index < lines.length && !/^```/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }

      index += index < lines.length ? 1 : 0;
      const languageClass = language ? ` class="language-${escapeHtml(language)}"` : "";
      html.push(`<pre><code${languageClass}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const body = renderInline(heading[2].replace(/\s+#+\s*$/, ""));
      const id = slugify(body);
      html.push(`<h${level} id="${id}">${body}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      html.push("<hr>");
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quotes = [];

      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quotes.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }

      html.push(`<blockquote>${renderMarkdown(quotes.join("\n"))}</blockquote>`);
      continue;
    }

    if (isTable(lines, index)) {
      const table = parseTable(lines, index);
      html.push(table.html);
      index = table.nextIndex;
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const list = parseList(lines, index, false);
      html.push(list.html);
      index = list.nextIndex;
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const list = parseList(lines, index, true);
      html.push(list.html);
      index = list.nextIndex;
      continue;
    }

    const paragraph = parseParagraph(lines, index);
    html.push(paragraph.html);
    index = paragraph.nextIndex;
  }

  return html.join("\n");
}

function getFileName(sourceUrl) {
  try {
    const url = new URL(sourceUrl);
    const path = decodeURIComponent(url.pathname);
    return path.split("/").filter(Boolean).pop() || "Markdown document";
  } catch {
    return "Markdown document";
  }
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.hidden = false;
  elements.page.hidden = true;
  elements.status.style.color = isError ? "#b42318" : "";
}

function setZoom(index) {
  state.zoomIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, index));
  const zoom = ZOOM_LEVELS[state.zoomIndex];
  elements.page.style.setProperty("--zoom", zoom);
  elements.zoomValue.textContent = `${Math.round(zoom * 100)}%`;
  elements.zoomOut.disabled = state.zoomIndex === 0;
  elements.zoomIn.disabled = state.zoomIndex === ZOOM_LEVELS.length - 1;
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("notepeeker-theme", theme);
}

function setFullWidth(enabled) {
  state.fullWidth = enabled;
  elements.viewport.classList.toggle("fullWidth", enabled);
  elements.fullWidthToggle.setAttribute("aria-pressed", String(enabled));
  elements.fullWidthToggle.title = enabled ? "Use reading width" : "Use full page width";
  elements.fullWidthToggle.setAttribute(
    "aria-label",
    enabled ? "Use reading width" : "Use full page width"
  );
  localStorage.setItem("notepeeker-full-width", String(enabled));
}

async function loadDocument() {
  if (!state.sourceUrl) {
    setStatus("No Markdown file was provided.", true);
    return;
  }

  elements.title.textContent = getFileName(state.sourceUrl);
  elements.rawLink.href = state.sourceUrl;

  try {
    const response = await fetch(state.sourceUrl, { credentials: "omit" });

    if (!response.ok) {
      throw new Error(`The file returned ${response.status}.`);
    }

    const markdown = await response.text();
    elements.page.innerHTML = renderMarkdown(markdown);
    elements.status.hidden = true;
    elements.page.hidden = false;
    document.title = `${getFileName(state.sourceUrl)} - NotePeeker`;
  } catch (error) {
    setStatus(`Unable to open this Markdown file. ${error.message}`, true);
  }
}

elements.zoomOut.addEventListener("click", () => setZoom(state.zoomIndex - 1));
elements.zoomIn.addEventListener("click", () => setZoom(state.zoomIndex + 1));
elements.fullWidthToggle.addEventListener("click", () => setFullWidth(!state.fullWidth));
elements.printButton.addEventListener("click", () => window.print());
elements.rawLink.addEventListener("click", (event) => {
  event.preventDefault();

  if (state.sourceUrl && typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: "openRawMarkdown", url: state.sourceUrl });
  }
});
elements.themeToggle.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  setTheme(current === "dark" ? "light" : "dark");
});

const storedTheme = localStorage.getItem("notepeeker-theme");
const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
const storedFullWidth = localStorage.getItem("notepeeker-full-width") === "true";
setTheme(storedTheme || preferredTheme);
setFullWidth(storedFullWidth);
setZoom(state.zoomIndex);
loadDocument();
