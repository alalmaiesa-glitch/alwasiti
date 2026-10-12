# V1.4 release gate — no stage skipping

A stage cannot be approved based on overall average. **Every gate must score >=9.0/10**, including evidence from the exact deployed commit.

| Gate | Evidence required |
| --- | --- |
| Functional correctness | 50 Chromium E2E cases and SVG/PNG exported artifacts opened independently |
| Cross-browser and RTL | Chromium, Firefox, WebKit; desktop and mobile; Arabic shaping tested |
| Accessibility | Automated focus/labels/contrast/keyboard plus supervised NVDA/VoiceOver/Orca review by a person using assistive technology |
| Security | Live host headers and CSP/CORS tests against the deployment, secrets scan and dependency review |
| Privacy and licensing | Accurate privacy notice, upstream license notices verified, ad policy/consent reviewed before any scripts |
| Operations | GitHub Actions green, deployed commit traceable, manual staging rollback drill documented and passed |

**Blockers:** A11y screen-reader review and third-party legal/advertising review cannot be declared complete by passing CI. Changes to font or script assets require updating `app/RELEASE-SHA256.json`.
Production `alwasiti.vercel.app` must remain unchanged until sign-off.
