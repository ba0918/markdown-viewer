# Offscreen Document Test

This is a test file for offscreen document experiment.

## Test Cases

1. **Windows Local File** - `file:///C:/path/to/file.md`
2. **WSL2 File** - `file://wsl.localhost/Ubuntu/path/to/file.md`
3. **Localhost HTTP** - `http://localhost:8000/file.md`

## Expected Behavior

- Offscreen document should be created on extension install
- Background script should log offscreen creation
- Console should show "[Experiment] Offscreen document created successfully"

## Test Steps

1. Build the extension: `deno task build`
2. Load extension in Chrome: `chrome://extensions/`
3. Click "Reload" button for the extension
4. Open Developer Tools → Service Worker → Console
5. Check for offscreen creation logs

---

**Last Updated:** 2026-02-08 10:18:23
