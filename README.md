# edpuzzle-answers-fix-Update-4/20/2026

A Tampermonkey/Violentmonkey userscript that makes [ading2210/edpuzzle-answers](https://github.com/ading2210/edpuzzle-answers) work without requiring a separate CSP-disabling browser extension.

---

## Why this exists

Edpuzzle enforces a strict [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) that blocks the browser from connecting to external mirror servers. The official bookmarklet now asks you to install a CSP-disabler extension just to use it.

This userscript solves that at the root level:

- It fetches `script.js` via `GM_xmlhttpRequest`, which runs in the privileged userscript context and is **not** subject to the page's CSP.
- It then patches `window.fetch` and `window.XMLHttpRequest` in the page so that **every external request** (mirrors, asset files, etc.) is transparently rerouted through a GM bridge — again bypassing CSP — while all `edpuzzle.com` requests flow normally and carry your session cookies.
- `mirrors.json` is intercepted to return `["https://edpuzzle.com"]`, so API calls go directly to the site you're already logged into — no dead proxy servers needed.

The result: no CSP extension required, works with any future repo restructuring, zero hardcoded filenames.

---

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Edge/Brave/Opera) or [Violentmonkey](https://violentmonkey.github.io/) (Firefox/Chrome).
2. Click the link below to install the script directly:

   **[➕ Install edpuzzle-answers-csp-fix.user.js](https://raw.githubusercontent.com/YOUR_USERNAME/edpuzzle-csp-fix/main/edpuzzle-answers-fixed.user.js)**

   *(Replace `YOUR_USERNAME` with your GitHub username after forking/uploading.)*

3. Navigate to any Edpuzzle assignment (`edpuzzle.com/assignments/.../watch`).
4. Click the **⚡ EDPUZZLE ANSWERS** button in the bottom-right corner.
5. Allow popups from `edpuzzle.com` if your browser prompts you.

---

## How it works

```
[Button click]
      │
      ▼
GM_xmlhttpRequest fetches script.js from jsDelivr
      │  (bypasses CSP — runs in userscript context)
      ▼
Patch code injected via Blob URL
      │  (bypasses CSP inline-script restriction)
      ▼
window.fetch + XMLHttpRequest patched in page context
      │
      ├─ request to edpuzzle.com  ──► pass through normally (auth cookies intact)
      │
      ├─ request for mirrors.json ──► return ["https://edpuzzle.com"] from memory
      │
      └─ any other external host  ──► GM bridge ──► GM_xmlhttpRequest ──► real network
                                       (bypasses CSP)
```

### Key files

| File | Purpose |
|------|---------|
| `edpuzzle-answers-fixed.user.js` | The userscript — install this |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Button shows ❌ Failed | Open DevTools console, look for `[edpuzzle-fix]` lines to see which step failed |
| Popup opens but is blank | Make sure popups are allowed for `edpuzzle.com` in your browser settings |
| "Could not connect to mirrors" dialog | You're running the original bookmarklet, not this script — install this userscript instead |
| Nothing happens on click | Make sure Tampermonkey/Violentmonkey is enabled and the script shows as active |

---

## Compatibility

| Browser | Extension | Status |
|---------|-----------|--------|
| Chrome / Edge / Brave | Tampermonkey | ✅ Tested |
| Firefox | Violentmonkey | ✅ Should work |
| Safari | Userscripts | ⚠️ Untested |

---

## How it differs from the original

| | Original bookmarklet | This userscript |
|--|----------------------|-----------------|
| Requires CSP extension | ✅ Yes | ❌ No |
| Requires popups allowed | ✅ Yes | ✅ Yes |
| Works if mirrors are down | ❌ No | ✅ Yes (uses edpuzzle.com directly) |
| Breaks on repo restructure | ❌ Yes (hardcoded paths) | ✅ No (proxies everything dynamically) |

---

## Credits

- [ading2210/edpuzzle-answers](https://github.com/ading2210/edpuzzle-answers) — the original script this wraps. All answer-fetching logic is theirs.
- This repo only provides the CSP bypass layer.

---

## License

MIT — see [LICENSE](LICENSE)
