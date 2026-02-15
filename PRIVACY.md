# Privacy Policy

**Effective Date:** February 15, 2026 **Last Updated:** February 15, 2026

## Overview

Markdown Viewer - Simple & Secure is a Chrome extension that renders local
Markdown files in your browser. This privacy policy explains our data handling
practices.

## Data Collection

**We do not collect, store, or transmit any user data.**

### What We Access

- **Local Markdown Files** - Only files you explicitly open in Chrome
- **Remote Markdown Files** - Only from domains you explicitly authorize in
  Settings
- **Browser Storage** - Your theme, settings, and authorized domains (stored
  locally on your device only)

### What We Do NOT Access

- ❌ Your browsing history
- ❌ Personal information
- ❌ Files you haven't opened
- ❌ Websites you haven't authorized
- ❌ Location data

## Permissions Explained

This extension requests the following permissions:

### Required Permissions

#### `storage`

**Purpose:** Save your theme preference, Hot Reload settings, and authorized
domains **Data Location:** Stored locally on your device via
`chrome.storage.sync` **Data Shared:** None. Settings may sync across your
Chrome browsers if you're signed in to Chrome, but we never access or transmit
this data.

#### `activeTab`

**Purpose:** Render Markdown content in the current tab **Scope:** Only
activates when you open a `.md` or `.markdown` file **Data Accessed:** The
Markdown file content you opened

#### `scripting`

**Purpose:** Dynamically register content scripts for custom domains **Scope:**
Only used when you add custom domains in Settings **Data Accessed:** None beyond
what's needed to register scripts

#### `file:///*`

**Purpose:** Access local Markdown files **Scope:** Only files you explicitly
open in Chrome **Data Accessed:** File content for rendering only

### Optional Permissions

#### `https://*/*` (Optional Host Permissions)

**Purpose:** Access remote Markdown files from custom domains **How it works:**

- Disabled by default
- Only activates when you explicitly add a domain in Settings (Options page)
- You choose which domains to trust
- You can remove domains anytime **Privacy Guarantee:** We only access domains
  you explicitly authorize. No data is collected or transmitted.

## Network Requests

### Default Behavior (No Remote Domains)

This extension **does not make any network requests by default**. All processing
happens locally on your device.

### When You Add Custom Domains (Optional)

If you choose to add custom domains in Settings:

- The extension will fetch Markdown files **only** from domains you explicitly
  authorize
- No data is sent to any server
- No tracking or analytics
- You control which domains to trust and can remove them anytime

## No Analytics or Tracking

We do not use:

- Analytics services (Google Analytics, etc.)
- Crash reporting
- Telemetry
- Advertising networks
- Third-party tracking

## Open Source

This extension is fully open source. You can audit the code at:
https://github.com/ba0918/markdown-viewer

## Changes to This Policy

We will update this policy if our data practices change. The "Last Updated" date
will reflect any changes.

## Contact

For questions about this privacy policy:

- GitHub Issues: https://github.com/ba0918/markdown-viewer/issues
- Repository: https://github.com/ba0918/markdown-viewer

## Summary

- ✅ Zero data collection
- ✅ Zero tracking
- ✅ No network requests by default (remote domains require explicit opt-in)
- ✅ All processing is local
- ✅ Open source and auditable

Your privacy is our priority.
