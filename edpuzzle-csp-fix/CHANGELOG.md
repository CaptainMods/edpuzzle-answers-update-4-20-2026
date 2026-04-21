# Changelog

## v2.0.0 — Current
**Architecture overhaul: proxy-everything model**

- Removed all hardcoded file path fetching (`open.js`, `popup.html`, etc.)
- Now only fetches `script.js` upfront; all subsequent external requests are dynamically proxied through `GM_xmlhttpRequest`
- Eliminates breakage from upstream repo restructuring (e.g. files moving to `/app/` subdir or being renamed)
- Added proper error handling and forwarding for GM proxy failures

## v1.5.0
- Updated fetch paths to `/app/` subdirectory after repo restructure
- Added dual cache keys for both root and `/app/` paths
- Discovered `open.js` and `popup.html` no longer exist in the repo

## v1.4.0
- Added CDN → GitHub raw fallback for each resource
- Added response validation: detects jsDelivr's silent 200+HTML 404 pages
- Added `@connect raw.githubusercontent.com`

## v1.3.0
- Switched from exact-URL cache matching to **path-based matching**
- Fixes "Could not connect to mirrors" error caused by `script.js` hardcoding mirror hostnames (`edpuzzle.hgci.org`, `edpuzzle.librecheats.net`) that weren't in our cache keys

## v1.2.0
- Added `mirrors.json` interception returning `["https://edpuzzle.com"]`
- Fixes "Could not connect to any of the mirrors" dialog — proxy servers are all offline

## v1.1.0
- Switched all resource fetches from `edpuzzle.hs.vc` to `cdn.jsdelivr.net`
- Added dual cache keys (jsDelivr + legacy host) so `script.js` requests to either host are served from cache
- Fixes broken popup caused by `edpuzzle.hs.vc` being offline

## v1.0.0
- Initial release: basic blob-injection CSP bypass around the original launcher pattern
