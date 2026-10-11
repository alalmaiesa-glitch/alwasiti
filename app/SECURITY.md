# Security notes — alWasiti V1.4 Production Hardening

- Frontend static; no accounts, server secrets, upload APIs, or advertising JavaScript in this candidate.
- All user project data remains browser-side in localStorage, including recovery drafts; export important works as JSON. Deleting browser data deletes local works.
- Input is type-checked, clamped, allow-listed, and HTML/SVG escaped. The SVG output must contain no JavaScript, external images, event handlers, or `<foreignObject>`.
- CSP configured in `vercel.json`: scripts restricted to self, object/frame blocked, explicit trusted font providers only; no unsafe-eval. **Not yet externally verified through a deployed release.**
- Trusted Google Fonts and fontkit-browser.js bundle only. Do not add third-party font uploads to this version without isolation, file signature validation, strict size limits, and security review.
- Fontkit 2.0.4 has publicly reported issues involving malicious font files; allowlisted fonts reduce risk but do not eliminate all supply-chain and denial-of-service concerns.
- External fonts from raw.githubusercontent.com are fetched with a 12s timeout; cache errors are cleared to allow retry. Actual production availability is unverified.
- No raw TTF/OTF font binaries are shipped inside this release; third party font requests may disclose IP to the host providers.
- Before production: verify CSP response headers live, rotate/avoid credentials, ensure source repo CI + rollback, test fonts network, E2E Firefox/WebKit/mobile, and security scan upstream dependencies.
