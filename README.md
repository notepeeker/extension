# NotePeeker

NotePeeker is a lightweight browser extension for viewing Markdown and EPUB files directly in the browser. It turns raw documents into a clean document view with a compact toolbar and a centered page layout, similar in spirit to how browsers open PDFs.

## Current Scope

This first stage focuses on Markdown and basic EPUB files.

- Detects top-level `.md` and `.epub` page navigations
- Opens a dedicated extension viewer
- Fetches remote or local Markdown files
- Renders headings, paragraphs, links, images, lists, blockquotes, code blocks, inline code, tables, and horizontal rules
- Provides zoom controls, theme toggle, print, and open-raw controls
- Provides an optional full-page-width viewer control
- Provides a basic EPUB reader with chapter navigation and local images
- Provides popup settings for plain Markdown source and offline-only viewing
- Leaves GitHub's rendered Markdown pages unchanged
- Works without a build step or external runtime dependencies

## Install From Source

1. Clone or download this repository.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable Developer mode.
4. Choose Load unpacked.
5. Select the repository folder.

The root folder uses Chrome's Manifest V3 service worker format. The GitHub workflow also creates a Firefox-ready ZIP with `manifest.firefox.json`; use that ZIP for `about:debugging` or an AMO submission.

To view local `file:///` Markdown files, enable Allow access to file URLs for NotePeeker in the browser's extension details page.

## Download Latest Release

Every push to `main` publishes ready-to-load packages on GitHub. Download the [Chrome ZIP](https://github.com/notepeeker/extension/releases/latest/download/notepeeker-chrome.zip) or [Firefox ZIP](https://github.com/notepeeker/extension/releases/latest/download/notepeeker-firefox.zip), extract it, and choose the extracted folder with **Load unpacked** in Chrome or `about:debugging` in Firefox.

This distribution is not published to the Chrome Web Store or Mozilla Add-ons. The package is produced by [`.github/workflows/publish.yml`](.github/workflows/publish.yml).

## Usage

Open any direct Markdown URL:

```text
https://example.com/README.md
https://raw.githubusercontent.com/owner/repo/main/README.md
file:///C:/Users/me/Documents/notes.md
https://example.com/books/book.epub
```

NotePeeker redirects the tab to its viewer and renders the source file as a readable document.

GitHub repository pages such as `github.com/owner/repo/blob/main/README.md` are excluded because GitHub already provides a formatted Markdown view. Raw files served from `raw.githubusercontent.com` are still supported.

EPUB support covers standard EPUB packages with an OPF manifest, spine chapters, XHTML content, and packaged images. DRM-protected books, embedded scripts, and advanced EPUB layout features are not supported.

## Permissions

NotePeeker uses the following permissions:

- `webNavigation`: detects when a top-level `.md` or `.epub` file is opened.
- `storage`: saves the popup settings locally in the browser.
- `host_permissions`: allows the viewers to fetch Markdown and EPUB files from `http`, `https`, and `file` URLs.
- `web_accessible_resources`: allows the packaged viewer pages to open when a supported document URL is redirected.

The extension does not collect analytics, send document contents to a server, or require an account.

## Project Structure

```text
.
|-- background.js
|-- components/
|   |-- notepeeker_logo.png
|   `-- icons/
|       |-- notepeeker-16.png
|       |-- notepeeker-32.png
|       |-- notepeeker-48.png
|       `-- notepeeker-128.png
|-- .github/
|   `-- workflows/publish.yml
|-- manifest.json
|-- manifest.firefox.json
|-- popup/
|   |-- popup.css
|   |-- popup.html
|   `-- popup.js
|-- epub/
|   |-- epub.css
|   |-- epub.html
|   `-- epub.js
|-- source/
|   |-- source.css
|   |-- source.html
|   `-- source.js
|-- viewer/
|   |-- viewer.css
|   |-- viewer.html
|   `-- viewer.js
|-- vendor/
|   |-- jszip.min.js
|   `-- JSZIP_LICENSE.txt
|-- LICENSE
`-- README.md
```

## Development

There is no bundler in this stage. Edit the source files, then reload the extension from the browser extensions page.

The Markdown renderer is intentionally small and local. Keep changes dependency-free unless there is a clear reason to introduce a build process.

The excluded host list is kept in `background.js` so site-specific native viewers can be added without changing the Markdown renderer.

Click the NotePeeker toolbar icon to open settings:

- **Show Markdown source** displays the original Markdown as plain text.
- **Offline only** formats only local `file://` Markdown files and leaves remote Markdown pages unchanged.

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Security

Please report security concerns using the process in [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
