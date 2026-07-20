# NotePeeker Extension

> Instantly transform Markdown files into beautiful, readable documents directly in your browser.

## 📖 Overview

**NotePeeker Extension** is a browser extension that automatically detects when a Markdown (`.md`) file is opened and renders it as a polished HTML page instead of showing raw Markdown syntax.

Whether you're viewing project documentation, personal notes, or Markdown files hosted online, NotePeeker provides a clean, distraction-free reading experience with no additional setup.

The long-term vision of **NotePeeker** is to become a universal document viewer that enhances the way users read text-based documents on the web.

---

## ✨ Features

### Current (MVP)

- 🔍 Automatically detects Markdown (`.md`) files
- 📄 Renders Markdown into HTML
- 🎨 GitHub-style Markdown rendering
- 🌙 Light & Dark themes
- 💻 Syntax highlighting for code blocks
- 📑 Automatic Table of Contents
- 📋 Copy button for code blocks
- 🔗 Proper rendering of links and images
- 📱 Responsive design

---

## 🚀 Planned Features

### Reading Experience

- Reading progress indicator
- Focus mode
- Full-screen reading mode
- Search inside document
- Better typography
- Custom themes

### Markdown Enhancements

- Mermaid diagrams
- KaTeX / MathJax
- Emoji support
- Footnotes
- Task lists
- Admonitions
- Collapsible sections

### Productivity

- Bookmarks
- Recently opened documents
- Reading history
- Export as PDF
- Print-friendly view
- Keyboard shortcuts

### Customization

- Font selection
- Font size
- Line spacing
- Theme customization
- Custom CSS

---

# 🌍 Long-Term Vision

Markdown is only the beginning.

The goal is for **NotePeeker** to become a universal document viewer that automatically enhances many common document formats directly in the browser.

Future supported formats may include:

- 📄 Markdown (.md)
- 📕 PDF (.pdf)
- 📘 Microsoft Word (.docx)
- 📙 OpenDocument (.odt)
- 📑 Rich Text (.rtf)
- 📋 Plain Text (.txt)
- 📓 Jupyter Notebooks (.ipynb)
- 📚 EPUB Books (.epub)

Instead of downloading a document just to read it comfortably, NotePeeker aims to make documents beautiful and easy to read instantly.

---

# ⚙️ How It Works

```
User opens document
        │
        ▼
Extension detects supported file
        │
        ▼
Fetches document
        │
        ▼
Parses content
        │
        ▼
Applies formatting
        │
        ▼
Displays beautiful reading experience
```

---

# 📂 Supported URLs

### Remote Files

```
https://example.com/README.md
https://raw.githubusercontent.com/.../README.md
```

### Local Files

```
file:///Users/me/notes.md
file:///C:/Documents/readme.md
```

> Local file support requires enabling **Allow access to file URLs** in the browser extension settings.

---

# 🛠️ Tech Stack

- Manifest V3
- JavaScript / TypeScript
- HTML
- CSS
- markdown-it
- highlight.js
- GitHub Markdown CSS

---

# 📁 Project Structure

```
extension/
│
├── manifest.json
├── background.js
├── content.js
├── viewer.html
├── viewer.js
├── styles/
├── assets/
├── icons/
└── README.md
```

---

# 🎯 Goals

- Zero configuration
- Fast rendering
- Beautiful reading experience
- Minimal permissions
- Works with local and remote files
- Open source
- Lightweight

---

# 🗺️ Roadmap

## Version 1.0

- Markdown rendering
- Dark mode
- Code highlighting
- Table of Contents
- Responsive layout

---

## Future Enhancements:

- Search
- Copy code
- Reading progress
- Keyboard shortcuts
- Custom themes
- PDF support
- Better caching
- Offline viewing
- Export options
- DOCX support
- EPUB support
- Rich Text support
- Universal document viewer

---

# 🤝 Contributing

Contributions, ideas, and feature requests are always welcome.

If you'd like to help improve NotePeeker, feel free to open an issue or submit a pull request.

---

# 📜 License

MIT License
