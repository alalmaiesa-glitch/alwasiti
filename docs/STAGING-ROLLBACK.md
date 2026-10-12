# Staging rollback playbook — alWasiti

1. Verify the target **alwasiti-hardening** project and its staging environment. **Do not select the main alwasiti project.**
2. Record the current staging deployment ID, linked Git commit, URL and health status.
3. Identify the last known-good `READY` deployment for the **same staging project**, inspect its build and tests.
4. Use Vercel's staging alias/promotion or project rollback mechanism under operator approval; never force-push Git or alter production domains to simulate a rollback.
5. Check staging HTML, JS, CSS, font URLs, security headers, and vector export afterwards, then restore the tested candidate staging alias.
6. Document exact deployment IDs, UTC timestamps, original and restored commit, errors, and approval.

**State:** rollback **not yet rehearsed**. This document is a procedure, not proof of a passed drill.
