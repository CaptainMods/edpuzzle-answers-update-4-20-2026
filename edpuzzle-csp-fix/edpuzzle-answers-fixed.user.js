// ==UserScript==
// @name        edpuzzle-answers FIXED v2.0
// @namespace   edpuzzle-answers-fixed
// @match       https://edpuzzle.com/*
// @description Routes ALL external fetch/XHR through GM to bypass CSP; no hardcoded file paths
// @grant       GM_xmlhttpRequest
// @connect     cdn.jsdelivr.net
// @connect     edpuzzle.hgci.org
// @connect     edpuzzle.librecheats.net
// @connect     edpuzzle.hs.vc
// @connect     raw.githubusercontent.com
// @connect     *
// @license     MIT
// @run-at      document-end
// @version     2.0.0
// @author      ading2210 (fixed)
// ==/UserScript==

const CDN_SCRIPT = "https://cdn.jsdelivr.net/gh/ading2210/edpuzzle-answers@latest/script.js";

// ─── GM fetch helper ─────────────────────────────────────────────────────────

function gmFetch(url, method = "GET", headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method,
      url,
      data:    body,
      headers: headers,
      onload:  r => resolve({ status: r.status, text: r.responseText, headers: r.responseHeaders }),
      onerror: () => reject(new Error("GM network error: " + url)),
    });
  });
}

// ─── Blob injection ───────────────────────────────────────────────────────────

function injectBlob(code) {
  return new Promise((resolve, reject) => {
    const blob    = new Blob([code], { type: "application/javascript" });
    const blobUrl = URL.createObjectURL(blob);
    const s       = document.createElement("script");
    s.src     = blobUrl;
    s.onload  = () => { URL.revokeObjectURL(blobUrl); resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ─── Is this URL an edpuzzle.com same-origin request? ───────────────────────
// If yes, let it go through normally (it carries auth cookies, CORS is fine).
// If no, it will be blocked by CSP — so we route it through GM instead.

function isEdpuzzle(url) {
  try {
    const host = new URL(url).hostname;
    return host === "edpuzzle.com" || host.endsWith(".edpuzzle.com");
  } catch(e) {
    return true; // relative URL — leave alone
  }
}

// ─── Launcher ─────────────────────────────────────────────────────────────────

async function launch_script() {
  console.log("[edpuzzle-fix] Fetching script.js...");
  const { status, text: scriptJs } = await gmFetch(CDN_SCRIPT);

  if (status !== 200 || !scriptJs || scriptJs.includes("Couldn't find")) {
    throw new Error(`Failed to fetch script.js (status ${status})`);
  }
  console.log("[edpuzzle-fix] script.js fetched OK.");

  // ── Patch code ──────────────────────────────────────────────────────────────
  // Strategy: intercept fetch() and XHR for every non-edpuzzle host and route
  // the request through the GM bridge (which has @connect * and bypasses CSP).
  // For mirrors.json specifically, return edpuzzle.com directly so the script
  // calls the API it's already authenticated with.
  const patchCode = `
(function () {

  // ── GM bridge ──────────────────────────────────────────────────────────────
  window.__gmFetch__ = function (url, method, headers, body) {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2);
      window.addEventListener("__gmResponse__" + id, e => resolve(e.detail), { once: true });
      window.dispatchEvent(new CustomEvent("__gmRequest__", {
        detail: { id, url, method, headers, body }
      }));
    });
  };

  function isEdpuzzle(url) {
    try {
      const host = new URL(url).hostname;
      return host === "edpuzzle.com" || host.endsWith(".edpuzzle.com");
    } catch(e) { return true; }
  }

  function getPath(url) {
    try { return new URL(url).pathname; } catch(e) { return ""; }
  }

  // mirrors.json: always point at edpuzzle.com (already authenticated, no proxy needed)
  function isMirrorsJson(url) {
    return getPath(url).endsWith("mirrors.json");
  }

  const MIRRORS_RESPONSE = JSON.stringify(["https://edpuzzle.com"]);

  // ── Patch fetch ────────────────────────────────────────────────────────────
  const _fetch = window.fetch;
  window.fetch = async function (input, opts = {}) {
    const url = typeof input === "string" ? input : (input && input.url ? input.url : String(input));

    if (isMirrorsJson(url)) {
      console.log("[edpuzzle-fix] mirrors.json intercepted");
      return new Response(MIRRORS_RESPONSE, { status: 200, headers: {"Content-Type": "application/json"} });
    }

    if (!isEdpuzzle(url)) {
      console.log("[edpuzzle-fix] proxying via GM:", url);
      const method  = (opts && opts.method) || "GET";
      const headers = (opts && opts.headers) || {};
      const body    = (opts && opts.body)    || null;
      const result  = await window.__gmFetch__(url, method, headers, body);
      return new Response(result.text, { status: result.status });
    }

    return _fetch(input, opts);
  };

  // ── Patch XHR ──────────────────────────────────────────────────────────────
  const _XHR = window.XMLHttpRequest;
  class XMLHttpRequest extends _XHR {
    open(method, url, ...args) {
      this._iUrl    = url;
      this._iMethod = method;
      this._iHeaders = {};
      super.open(method, url, ...args);
    }
    setRequestHeader(name, value) {
      if (this._iHeaders) this._iHeaders[name] = value;
      super.setRequestHeader(name, value);
    }
    send(body) {
      const url = this._iUrl;

      if (isMirrorsJson(url)) {
        console.log("[edpuzzle-fix] XHR mirrors.json intercepted");
        const self = this;
        setTimeout(() => {
          Object.defineProperty(self, "readyState",   { configurable: true, value: 4 });
          Object.defineProperty(self, "status",       { configurable: true, value: 200 });
          Object.defineProperty(self, "responseText", { configurable: true, value: MIRRORS_RESPONSE });
          Object.defineProperty(self, "response",     { configurable: true, value: MIRRORS_RESPONSE });
          self.dispatchEvent(new Event("load"));
        }, 0);
        return;
      }

      if (url && !isEdpuzzle(url)) {
        console.log("[edpuzzle-fix] XHR proxying via GM:", url);
        const self = this;
        window.__gmFetch__(url, this._iMethod || "GET", this._iHeaders || {}, body).then(result => {
          Object.defineProperty(self, "readyState",   { configurable: true, value: 4 });
          Object.defineProperty(self, "status",       { configurable: true, value: result.status });
          Object.defineProperty(self, "responseText", { configurable: true, value: result.text });
          Object.defineProperty(self, "response",     { configurable: true, value: result.text });
          self.dispatchEvent(new Event("load"));
        }).catch(err => {
          console.error("[edpuzzle-fix] GM proxy error:", err);
          Object.defineProperty(self, "readyState", { configurable: true, value: 4 });
          Object.defineProperty(self, "status",     { configurable: true, value: 0 });
          self.dispatchEvent(new Event("error"));
        });
        return;
      }

      super.send(body);
    }
  }
  window.XMLHttpRequest = XMLHttpRequest;

  // ── Patch eval (CSP workaround) ────────────────────────────────────────────
  const _eval = window.eval;
  window.eval = function (code) {
    const blob    = new Blob([code], { type: "application/javascript" });
    const blobUrl = URL.createObjectURL(blob);
    const s       = document.createElement("script");
    s.src    = blobUrl;
    s.onload = () => URL.revokeObjectURL(blobUrl);
    document.head.appendChild(s);
    window.eval = _eval;
  };

  console.log("[edpuzzle-fix] All patches applied — all external requests will be proxied via GM.");
})();
`;

  // Listen for GM bridge requests from page context
  window.addEventListener("__gmRequest__", async e => {
    const { id, url, method, headers, body } = e.detail;
    try {
      const result = await gmFetch(url, method || "GET", headers || {}, body || null);
      window.dispatchEvent(new CustomEvent("__gmResponse__" + id, { detail: result }));
    } catch(err) {
      window.dispatchEvent(new CustomEvent("__gmResponse__" + id, {
        detail: { status: 0, text: "" }
      }));
    }
  });

  await injectBlob(patchCode);
  await injectBlob(scriptJs);
  console.log("[edpuzzle-fix] script.js injected — patches are live.");
}

// ─── Button ───────────────────────────────────────────────────────────────────

function addButton() {
  const btn = document.createElement("button");
  btn.textContent = "⚡ EDPUZZLE ANSWERS";
  btn.style.cssText = `
    position: fixed !important; bottom: 20px !important; right: 20px !important;
    z-index: 2147483647 !important; padding: 12px 24px !important;
    font-size: 16px !important; font-weight: bold !important;
    background: #e53935 !important; color: white !important;
    border: none !important; border-radius: 8px !important;
    cursor: pointer !important; box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
  `;
  btn.onclick = () => {
    btn.textContent = "⏳ Loading ...";
    btn.disabled = true;
    launch_script()
      .then(() => btn.remove())
      .catch(err => {
        console.error("[edpuzzle-fix] Launch failed:", err);
        btn.textContent = "❌ Failed - check console";
        btn.disabled = false;
      });
  };
  document.body.appendChild(btn);
}

if (document.body) addButton();
else document.addEventListener("DOMContentLoaded", addButton);
