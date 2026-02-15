# Chrome Web Store Listing

## Short Description (132 characters max)

```
Simple, secure local Markdown viewer. XSS-protected, Hot Reload, zero-config. Just works.
```

**Character count:** 96/132

---

## Detailed Description

```
A no-nonsense Markdown viewer built for developers who value security and simplicity.

WHY THIS EXISTS

Browser extensions can be sold, hacked, or suddenly request scary permissions. This viewer was built to avoid extension malware risks with minimal permissions.

FEATURES

• Minimal Permissions - storage + activeTab only
• Hot Reload - Auto-detect file changes (1s~ configurable)
• 6 Clean Themes - Light, Dark, GitHub, Minimal, Solarized Light, Solarized Dark
• GFM Support - Syntax highlight, Mermaid diagrams, Math equations, Table of Contents
• Zero Config - Install and it just works

SECURITY & PRIVACY

What it does:
✓ Read local Markdown files
✓ Store settings locally

What it doesn't:
✗ Network requests
✗ Data collection or tracking
✗ Access to all websites

Permissions: storage, activeTab, file:/// only

No scary permissions like <all_urls> or webRequest.

100% open source and auditable:
https://github.com/ba0918/markdown-viewer

USAGE

1. Open .md file in Chrome
2. Done

Settings: Click toolbar icon to change theme or configure Hot Reload.

FAQ

Q: Does it work with WSL2 files?
A: Rendering works fine. Hot Reload doesn't work due to Chrome extension restrictions.

Q: Remote files (GitHub Raw)?
A: Not supported. Local only = minimal attack surface.

Built by a developer tired of trusting strangers with file system access.
```

---

## Category

**Productivity**

---

## Language

**English** (primary)

---

## Additional Languages

- Japanese (日本語)

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
0.1.3
```

---

## Version Description (What's New)

```
Initial release

Features:
- Secure Markdown rendering (DOMPurify XSS protection)
- Hot Reload with configurable interval (1s~)
- 6 themes (Light/Dark/GitHub/Minimal/SolarizedLight/SolarizedDark)
- GFM support (syntax highlight, Mermaid, Math, ToC)
- Minimal permissions (storage + activeTab only)
- Zero data collection
- 100% open source
```

---

## Tags/Keywords (for search optimization)

```
markdown, viewer, markdown viewer, local files, hot reload, GFM, security, privacy, open source, developer tools
```

---

## Screenshots Required

Chrome Web Store requires **at least 1 screenshot**, recommends **3-5
screenshots**.

### Recommended Screenshots:

1. **Basic Markdown rendering** - Show a rendered .md file with theme
2. **Theme comparison** - Light vs Dark theme side-by-side
3. **Hot Reload demo** - Show file change detection
4. **Settings panel** - Theme selector + Hot Reload settings
5. **Complex content** - Mermaid diagram + Code block + Math

Screenshot specs:

- Size: 1280x800 or 640x400
- Format: PNG or JPEG
- Max file size: 5MB each

---

## Promo Tile (Small - Optional but Recommended)

Size: 440x280 pixels Shows up in Chrome Web Store search results

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

1. **`storage`** - "Used to save user's theme preference and Hot Reload settings
   locally"
2. **`activeTab`** - "Used to render Markdown content in the currently opened
   tab"
3. **`file:///*`** - "Used to access local .md files that the user explicitly
   opens in Chrome"

### Single Purpose Description

"This extension renders local Markdown files with syntax highlighting, theme
support, and Hot Reload functionality."

### Privacy Practices

- **Does NOT collect user data**
- **Does NOT use remote code**
- **Does NOT make network requests**
- All processing is local
- Open source: https://github.com/ba0918/markdown-viewer

### Deceptive Installation Tactics

**None.** Extension clearly states its purpose and required permissions.

### Content Policies Compliance

- No malware, spyware, or adware
- No unauthorized data collection
- No misleading functionality
- No copyrighted content
- Fully open source (MIT License)
