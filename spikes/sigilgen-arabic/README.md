# Sigilgen Arabic feasibility spike — NOT FOR PRODUCTION

Sigilgen is a free MIT-licensed deterministic SVG geometry engine with five logo modes.
Its normaliser accepts A–Z ONLY: it does NOT natively support Arabic lettering.

This isolated experiment uses its abstract (text-free) geometry mode, and forms real Arabic words as vector paths via Fontkit and the Amiri/Noto Kufi Arabic OFL font files already in alWasiti.
No third-party API or paid generator is used. The fixed Latin name VECTOR is used internally only to satisfy upstream validation; it NEVER appears in emitted SVG.

The name in Arabic is hashed into a deterministic seed; ten Arabic-named brands have sector-intent keywords mapped explicitly to English. This is NOT full Arabic natural-language understanding.

On CI, generate 6 concepts for 10 fictional Arabic brands. Verify all 60 geometries differ, text uses Arabic OpenType shaping, logo is SVG paths (not raster tracing or SVG text), all 60 SVG files render, and one rerun is byte-identical.
The workflow uploads 60 SVGs, a 6-by-10 raster review contact sheet, and JSON results.

Quality gate: geometry uniqueness cannot substitute for visual review or commercial trademark checks. Required before alWasiti merge: native Arabic wordmark/monogram, user-editable symbol and font, real size/print tests, license/security audits and visual review at 9/10 per axis.
Do not merge spike/sigilgen-arabic into content/v1.4-templates, hardening/v1.4 or main before passing those gates.

Upstream source pinned: https://github.com/xianshi3/sigilgen/tree/769499362cbc17e335443346337ebd85f38a29d9
MIT License and copyright notice are preserved in LICENSE-SIGILGEN-MIT.txt.