# Chrome Web Store Listing

## Short Description (132 characters max)

```
Simple, secure Markdown viewer. XSS-protected, 6 themes, Hot Reload, remote URL support. Open source. Just works.
```

**Character count:** 114/132

---

## Detailed Description

```
A no-nonsense Markdown viewer built for developers who value security and simplicity.

WHY THIS EXISTS

Browser extensions can be sold, hacked, or suddenly request scary permissions. This viewer was built to avoid extension malware risks with minimal, justified permissions.

FEATURES

* 6 Clean Themes - Light, Dark, GitHub, Minimal, Solarized Light, Solarized Dark
* Hot Reload - Auto-detect file changes (1s~ configurable)
* GFM Support - Syntax highlight, Mermaid diagrams, Math equations (MathJax), Table of Contents
* Remote URL Support (Optional) - Add custom domains to render remote Markdown files
* View Raw Toggle - Switch between rendered and raw Markdown
* Frontmatter Support - YAML frontmatter parsing
* Zero Config - Install and it just works

SECURITY & PRIVACY

This extension is designed with security as the top priority.

What it does:
+ Read local Markdown files you open
+ Store your settings locally
+ Access remote URLs (only domains you explicitly authorize)

What it doesn't:
- Collect or track any data
- Access websites without your permission
- Make network requests without your consent
- Use remote code execution

All HTML rendering is sanitized with js-xss library to prevent XSS attacks.
Content Security Policy (CSP) is configured to block inline scripts.

Permissions:
- storage: Save your theme and settings
- activeTab: Render Markdown in the current tab
- scripting: Register content scripts for custom domains
- file:///: Access local .md files you open

Optional permissions:
- https://*/: Only requested when you add custom domains in Settings

No scary permissions like <all_urls> or webRequest.

100% open source and auditable:
https://github.com/ba0918/markdown-viewer

USAGE

1. Open .md file in Chrome
2. Done

Settings: Click toolbar icon to change theme, configure Hot Reload, or add remote domains.

FAQ

Q: Does it work with WSL2 files?
A: Rendering works fine. Hot Reload doesn't work due to Chrome extension restrictions.

Q: Remote Markdown files (GitHub Raw, Gist, etc.)?
A: Supported! Go to Settings > Remote URL and add your trusted domains. The extension only accesses domains you explicitly authorize.

Built by a developer tired of trusting strangers with file system access.
```

---

## Category

**Developer Tools**

---

## Language

**English** (primary)

---

## Additional Languages

- Japanese (planned)

---

## Privacy Policy URL

```
https://github.com/ba0918/markdown-viewer/blob/main/PRIVACY.md
```

---

## Support URL

```
https://github.com/ba0918/markdown-viewer/issues
```

---

## Homepage URL

```
https://github.com/ba0918/markdown-viewer
```

---

## Version (Initial Release)

```
0.1.4
```

---

## Version Description (What's New)

```
Initial release

Features:
- Secure Markdown rendering (XSS protection via js-xss + CSP)
- Hot Reload with configurable interval (1s~)
- 6 themes (Light/Dark/GitHub/Minimal/SolarizedLight/SolarizedDark)
- GFM support (syntax highlight, Mermaid diagrams, MathJax, Table of Contents)
- Remote URL support (opt-in, custom domains only)
- View Raw toggle (rendered / raw Markdown)
- Frontmatter (YAML) parsing
- Minimal permissions with full justification
- Zero data collection
- 100% open source
```

---

## Tags/Keywords (for search optimization)

```
markdown, viewer, markdown viewer, local files, hot reload, GFM, security, privacy, open source, developer tools, mermaid, mathjax, syntax highlight
```

---

## Screenshots Required

Chrome Web Store requires **at least 1 screenshot**, recommends **3-5
screenshots**.

### Screenshots (store-assets/screenshots/):

1. `01-github-theme-toc-table.png` - GitHub Theme + ToC + Table
2. `02-light-theme-mermaid.png` - Light Theme + Mermaid diagram + ToC
3. `03-dark-theme-code-highlight.png` - Dark Theme + Code block + Config
4. `04-solarized-dark-math.png` - Solarized Dark + Math equations + Checklist
5. `05-minimal-theme-math.png` - Minimal Theme + Math equations + Checklist

Screenshot specs:

- Size: 1280x800 or 640x400
- Format: PNG or JPEG
- Max file size: 5MB each

---

## Promo Tile (Small - Required)

Size: 440x280 pixels. Shows up in Chrome Web Store search results.

Suggested design:

- Background: Simple gradient (theme colors)
- Text: "Markdown Viewer"
- Subtitle: "Simple & Secure"
- Icon: Extension icon

---

## Promo Tile (Large - Optional)

Size: 920x680 pixels

---

## Notes for Submission

### Manifest Permissions Review

Be prepared to justify these permissions:

1. **`storage`** - "Used to save user's theme preference, Hot Reload settings,
   and authorized remote domains locally"
2. **`activeTab`** - "Used to render Markdown content in the currently opened
   tab"
3. **`scripting`** - "Used to dynamically register content scripts when users
   add custom remote domains in Settings"
4. **`file:///*`** - "Used to access local .md files that the user explicitly
   opens in Chrome"

### Optional Permissions

5. **`https://*/*`** (optional_host_permissions) - "Only requested when the user
   explicitly adds a custom domain in Settings. Never activated without user
   consent. Users can remove domains at any time."

### Single Purpose Description

"This extension renders Markdown files with syntax highlighting, theme support,
and Hot Reload functionality."

### Privacy Practices

- **Does NOT collect user data**
- **Does NOT use remote code**
- **Does NOT make unauthorized network requests**
- Network requests only to domains the user explicitly authorizes
- All processing is local by default
- Open source: https://github.com/ba0918/markdown-viewer

### Deceptive Installation Tactics

**None.** Extension clearly states its purpose and required permissions.

### Content Policies Compliance

- No malware, spyware, or adware
- No unauthorized data collection
- No misleading functionality
- No copyrighted content
- Fully open source (MIT License)
