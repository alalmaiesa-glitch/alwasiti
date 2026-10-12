# الواسطي | alWasiti

استوديو التصميم العربي الحديث — مجاني ومدعوم بإعلانات خارج المحرر.

## V1.4 Production Hardening
**NOT APPROVED.** Branch `hardening/v1.4` is a release candidate. No production promotion or merge until all release gates score at least 9/10.

### Source layout
- `app/index.html`, `app/styles.css`, `app/app.js` — editable application source.
- `app/fontkit-browser.js` — vendored Fontkit bundle, integrity-checked, with third-party notices in `app/LICENSES`.
- `app/RELEASE-SHA256.json` — SHA-256 manifest for release assets.
- `tests/acceptance.py` — 50 Playwright Chromium browser tests.
- `tests/smoke.mjs` — structural/integrity checks.
- `dist/` — generated and excluded from Git.

Run `npm test` for structural tests. CI runs browser acceptance on the hardening branch.

Production: https://alwasiti.vercel.app/ (intentionally unchanged)
