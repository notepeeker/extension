# Security Policy

## Supported Versions

The current source version is the supported version.

## Reporting a Vulnerability

Please do not open a public issue for suspected security vulnerabilities.

Report the issue privately to the project maintainer. Include:

- A short description of the vulnerability
- Steps to reproduce
- A proof of concept when possible
- Browser and operating system details

The project maintainer should acknowledge the report, investigate it, and publish a fix or mitigation before public disclosure.

## Security Notes

NotePeeker renders Markdown inside an extension page. The renderer escapes document text and only allows `http`, `https`, `file`, `mailto`, and same-document hash links for rendered links and images.
