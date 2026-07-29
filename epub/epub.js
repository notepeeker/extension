const state = {
  sourceUrl: new URLSearchParams(window.location.search).get("src"),
  zip: null,
  chapters: [],
  chapterIndex: 0,
  objectUrls: [],
  stylesheets: [],
  renderToken: 0,
  fullWidth: false,
  chapterRoot: null
};

const elements = {
  bookTitle: document.querySelector("#bookTitle"),
  status: document.querySelector("#status"),
  viewport: document.querySelector(".viewport"),
  page: document.querySelector("#page"),
  previousChapter: document.querySelector("#previousChapter"),
  nextChapter: document.querySelector("#nextChapter"),
  chapterValue: document.querySelector("#chapterValue"),
  fullWidthToggle: document.querySelector("#fullWidthToggle"),
  themeToggle: document.querySelector("#themeToggle"),
  printButton: document.querySelector("#printButton")
};

if (elements.page.attachShadow) {
  state.chapterRoot = elements.page.attachShadow({ mode: "open" });
}

function getChapterRoot() {
  return state.chapterRoot || elements.page;
}

function getFileName(value) {
  try {
    const url = new URL(value);
    const path = decodeURIComponent(url.pathname);
    return path.split("/").filter(Boolean).pop() || "EPUB book";
  } catch {
    return "EPUB book";
  }
}

function normalizePath(value) {
  const parts = value.replace(/\\/g, "/").split("/");
  const normalized = [];

  for (const part of parts) {
    if (!part || part === ".") {
      continue;
    }

    if (part === "..") {
      normalized.pop();
    } else {
      normalized.push(part);
    }
  }

  return normalized.join("/");
}

function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function resolvePath(basePath, href) {
  const path = decodePath((href || "").split(/[?#]/, 1)[0]);
  return normalizePath(`${basePath}/${path}`);
}

function getDirectory(path) {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

function getElements(document, name) {
  const namespaced = Array.from(document.getElementsByTagNameNS("*", name));
  return namespaced.length ? namespaced : Array.from(document.getElementsByTagName(name));
}

function getAttribute(element, name) {
  return element?.getAttribute(name) || "";
}

function parseXml(value) {
  const document = new DOMParser().parseFromString(value, "application/xml");

  if (document.querySelector("parsererror")) {
    throw new Error("The EPUB contains invalid XML.");
  }

  return document;
}

function getZipFile(path) {
  const file = state.zip?.file(path);

  if (!file) {
    throw new Error(`The EPUB is missing ${path}.`);
  }

  return file;
}

async function readZipText(path) {
  return getZipFile(path).async("string");
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.hidden = false;
  elements.page.hidden = true;
  elements.status.style.color = isError ? "#b42318" : "";
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

function updateChapterControls() {
  const total = state.chapters.length;
  const current = total ? state.chapterIndex + 1 : 0;
  elements.chapterValue.textContent = `${current} / ${total}`;
  elements.previousChapter.disabled = state.chapterIndex <= 0;
  elements.nextChapter.disabled = state.chapterIndex >= total - 1;
}

function mimeTypeForPath(path) {
  const extension = path.split(".").pop().toLowerCase();
  const types = {
    avif: "image/avif",
    gif: "image/gif",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
    webp: "image/webp",
    eot: "application/vnd.ms-fontobject",
    otf: "font/otf",
    ttf: "font/ttf",
    woff: "font/woff",
    woff2: "font/woff2"
  };
  return types[extension] || "application/octet-stream";
}

async function createAssetUrl(chapterDirectory, resourcePath) {
  const path = resolvePath(chapterDirectory, resourcePath);

  try {
    const blob = await getZipFile(path).async("blob");
    const typedBlob = new Blob([blob], { type: mimeTypeForPath(path) });
    const objectUrl = URL.createObjectURL(typedBlob);
    state.objectUrls.push(objectUrl);
    return objectUrl;
  } catch {
    return "";
  }
}

function isEmbeddedRasterImage(value) {
  return /^data:image\/(?:avif|gif|jpeg|jpg|png|webp);/i.test(value || "");
}

function sanitizeCss(value) {
  return String(value || "")
    .replace(/@import[^;{}]*;?/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/(?:javascript|vbscript)\s*:/gi, "")
    .replace(/(?:behavior|-moz-binding)\s*:[^;{}]+;?/gi, "")
    .replace(/(^|[,{]\s*)(html|body)(?=\s*(?:[,{.#:[>+~]|$))/gim, "$1:host");
}

function isLocalCssResource(value) {
  return value && !value.startsWith("#") && !/^[a-z][a-z\d+.-]*:/i.test(value) && !value.startsWith("//");
}

async function rewriteCssUrls(value, baseDirectory) {
  const pattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;
  const matches = Array.from(String(value || "").matchAll(pattern));
  let result = "";
  let offset = 0;

  for (const match of matches) {
    const resource = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    let replacement = "none";

    if (isEmbeddedRasterImage(resource)) {
      replacement = resource;
    } else if (isLocalCssResource(resource)) {
      const objectUrl = await createAssetUrl(baseDirectory, resource);
      if (objectUrl) {
        replacement = objectUrl;
      }
    }

    result += value.slice(offset, match.index) + `url(${replacement})`;
    offset = match.index + match[0].length;
  }

  return result + value.slice(offset);
}

const CHAPTER_BASE_STYLE = `
:host {
  display: block;
  color: var(--page-text);
  font-family: Georgia, "Times New Roman", serif;
  font-size: 17px;
  line-height: 1.65;
}

*, *::before, *::after {
  box-sizing: border-box;
}

img, svg, video, table {
  max-width: 100%;
}

img, svg {
  height: auto;
}

p, div, section, blockquote, pre, ul, ol, dl, figure, table {
  max-width: 100%;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--page-text);
  font-family: Arial, Helvetica, sans-serif;
  line-height: 1.2;
}

table {
  border-collapse: collapse;
}

td, th {
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--rule);
}

a {
  color: var(--accent);
}

:host > .chapterContent {
  max-width: 100%;
}

:host > .chapterContent > :first-child {
  margin-top: 0;
}

:host > .chapterContent > :last-child {
  margin-bottom: 0;
}

@media (max-width: 640px) {
  :host {
    font-size: 16px;
  }
}
`;

function getImageAttribute(element) {
  const tagName = (element.localName || element.tagName || "").toLowerCase();

  if (["img", "source"].includes(tagName) && element.hasAttribute("src")) {
    return "src";
  }

  if (tagName === "image") {
    if (element.hasAttribute("href")) {
      return "href";
    }

    if (element.hasAttribute("xlink:href")) {
      return "xlink:href";
    }
  }

  return "";
}

function isAllowedLink(value) {
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:", "mailto:", "#"].some((protocol) =>
      protocol === "#" ? value.startsWith("#") : url.protocol === protocol
    );
  } catch {
    return false;
  }
}

async function sanitizeChapter(document, chapterPath) {
  const chapterDirectory = getDirectory(chapterPath);
  const fragment = document.createDocumentFragment();
  const blockedTags = new Set(["AUDIO", "EMBED", "FORM", "IFRAME", "OBJECT", "SCRIPT", "STYLE", "VIDEO"]);

  async function cleanElement(element) {
    const tagName = (element.localName || element.tagName || "").toUpperCase();

    if (tagName === "STYLE") {
      const css = await rewriteCssUrls(sanitizeCss(element.textContent), chapterDirectory);
      element.textContent = css;
      return;
    }

    if (blockedTags.has(tagName) && tagName !== "STYLE") {
      element.remove();
      return;
    }

    for (const attribute of Array.from(element.attributes)) {
      const attributeName = attribute.name.toLowerCase();

      if (attributeName.startsWith("on") || ["srcdoc", "srcset"].includes(attributeName)) {
        element.removeAttribute(attribute.name);
      } else if (attributeName === "style") {
        const style = await rewriteCssUrls(sanitizeCss(attribute.value), chapterDirectory);
        element.setAttribute(attribute.name, style);
      }
    }

    const imageAttribute = getImageAttribute(element);

    if (imageAttribute) {
      const source = element.getAttribute(imageAttribute);

      if (isEmbeddedRasterImage(source)) {
        element.setAttribute(imageAttribute, source);
      } else {
        const objectUrl = await createAssetUrl(chapterDirectory, source);
        if (objectUrl) element.setAttribute(imageAttribute, objectUrl);
        else element.removeAttribute(imageAttribute);
      }

      if (imageAttribute === "src") {
        element.removeAttribute("srcset");
      }
    }

    if (element.hasAttribute("href") && tagName !== "image") {
      const href = element.getAttribute("href");
      if (!isAllowedLink(href)) {
        element.removeAttribute("href");
      } else if (element.tagName === "A" && !href.startsWith("#")) {
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noreferrer noopener");
      }
    }

    for (const child of Array.from(element.children)) {
      await cleanElement(child);
    }
  }

  for (const styleElement of Array.from(document.querySelectorAll("style"))) {
    await cleanElement(styleElement);
    if (!styleElement.closest("body")) {
      fragment.append(styleElement);
    }
  }

  for (const child of Array.from(document.body?.childNodes || document.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      await cleanElement(child);
    }

    if (child.parentNode) {
      fragment.append(child);
    }
  }

  return {
    fragment,
    bodyClassName: document.body?.getAttribute("class") || "",
    bodyId: document.body?.getAttribute("id") || ""
  };
}

async function loadBook() {
  if (!state.sourceUrl) {
    throw new Error("No EPUB file was provided.");
  }

  if (typeof JSZip === "undefined") {
    throw new Error("The EPUB reader library is missing.");
  }

  const response = await fetch(state.sourceUrl, { credentials: "omit" });

  if (!response.ok) {
    throw new Error(`The file returned ${response.status}.`);
  }

  state.zip = await JSZip.loadAsync(await response.arrayBuffer());
  const container = parseXml(await readZipText("META-INF/container.xml"));
  const rootFile = getElements(container, "rootfile")[0];
  const opfPath = decodePath(getAttribute(rootFile, "full-path"));

  if (!opfPath) {
    throw new Error("The EPUB does not declare an OPF package.");
  }

  const opf = parseXml(await readZipText(opfPath));
  const opfDirectory = getDirectory(opfPath);
  const manifest = new Map();

  for (const item of getElements(opf, "item")) {
    const id = getAttribute(item, "id");
    const href = getAttribute(item, "href");
    const mediaType = getAttribute(item, "media-type");

    if (id && href) {
      manifest.set(id, {
        href: resolvePath(opfDirectory, href),
        mediaType,
        title: ""
      });
    }
  }

  state.stylesheets = [];
  for (const item of manifest.values()) {
    if (item.mediaType !== "text/css") {
      continue;
    }

    try {
      state.stylesheets.push({
        path: item.href,
        text: await readZipText(item.href)
      });
    } catch {
      // A missing optional stylesheet should not prevent the book from opening.
    }
  }

  const spine = [];
  for (const itemRef of getElements(opf, "itemref")) {
    const item = manifest.get(getAttribute(itemRef, "idref"));

    if (item && ["application/xhtml+xml", "text/html"].includes(item.mediaType)) {
      spine.push(item);
    }
  }

  if (!spine.length) {
    throw new Error("The EPUB has no readable chapters.");
  }

  const titleElement = getElements(opf, "title")[0];
  const bookTitle = titleElement?.textContent.trim() || getFileName(state.sourceUrl);
  state.chapters = spine;
  elements.bookTitle.textContent = bookTitle;
  document.title = `${bookTitle} - NotePeeker`;
}

async function renderChapter() {
  const chapter = state.chapters[state.chapterIndex];
  const token = ++state.renderToken;

  if (!chapter) {
    return;
  }

  for (const objectUrl of state.objectUrls) {
    URL.revokeObjectURL(objectUrl);
  }
  state.objectUrls = [];
  getChapterRoot().replaceChildren();
  elements.status.textContent = "Loading chapter...";
  elements.status.hidden = false;
  elements.page.hidden = true;

  const chapterText = await readZipText(chapter.href);
  const chapterDocument = new DOMParser().parseFromString(chapterText, "text/html");
  const chapterContent = await sanitizeChapter(chapterDocument, chapter.href);

  if (token !== state.renderToken) {
    return;
  }

  const chapterStyle = document.createElement("style");
  const stylesheetText = [];

  for (const stylesheet of state.stylesheets) {
    const css = await rewriteCssUrls(
      sanitizeCss(stylesheet.text),
      getDirectory(stylesheet.path)
    );
    stylesheetText.push(css);
  }

  chapterStyle.textContent = `${CHAPTER_BASE_STYLE}\n${stylesheetText.join("\n")}`;
  const content = document.createElement("div");
  content.className = "chapterContent";
  content.setAttribute("class", `chapterContent ${chapterContent.bodyClassName}`.trim());

  if (chapterContent.bodyId) {
    content.id = chapterContent.bodyId;
  }

  content.append(chapterContent.fragment);
  getChapterRoot().replaceChildren(chapterStyle, content);
  elements.status.hidden = true;
  elements.page.hidden = false;
  elements.viewport.scrollTop = 0;
  updateChapterControls();
}

async function start() {
  try {
    await loadBook();
    updateChapterControls();
    await renderChapter();
  } catch (error) {
    setStatus(`Unable to open this EPUB. ${error.message}`, true);
  }
}

elements.previousChapter.addEventListener("click", () => {
  if (state.chapterIndex > 0) {
    state.chapterIndex -= 1;
    renderChapter().catch((error) => setStatus(error.message, true));
  }
});

elements.nextChapter.addEventListener("click", () => {
  if (state.chapterIndex < state.chapters.length - 1) {
    state.chapterIndex += 1;
    renderChapter().catch((error) => setStatus(error.message, true));
  }
});

elements.fullWidthToggle.addEventListener("click", () => setFullWidth(!state.fullWidth));
elements.themeToggle.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  setTheme(current === "dark" ? "light" : "dark");
});
elements.printButton.addEventListener("click", () => window.print());

const storedTheme = localStorage.getItem("notepeeker-theme");
const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
const storedFullWidth = localStorage.getItem("notepeeker-full-width") === "true";
setTheme(storedTheme || preferredTheme);
setFullWidth(storedFullWidth);
start();
