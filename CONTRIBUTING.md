# Contributing to NotePeeker

Thanks for helping improve NotePeeker.

## Development Setup

1. Fork and clone the repository.
2. Load the repository as an unpacked extension in Chrome or Edge.
3. Make your changes.
4. Reload the extension and test with remote and local `.md` files when your change affects document loading.

## Pull Requests

Please keep pull requests focused and small.

Before opening a pull request:

- Confirm the extension loads without manifest errors.
- Test at least one remote `.md` URL.
- Test a local `file:///` `.md` URL when changing file handling.
- Update documentation when behavior or permissions change.

## Code Style

- Prefer plain JavaScript, HTML, and CSS.
- Keep the extension dependency-free for this stage.
- Avoid broad rewrites unless they directly support the change.
- Use clear names and small functions.

## Issues

When opening an issue, include:

- Browser name and version
- Operating system
- Example Markdown URL or a minimal Markdown sample
- Expected result
- Actual result
