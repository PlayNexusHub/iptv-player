PlayNexus IPTV Player Release Notes
==================================

Overview
--------
Product: IPTV Player (Electron)
Release: v1.1.0
Date: 2025-11-15

Highlights
----------
1. 100x UX upgrade featuring playlist intelligence (country-aware naming, live stats, advanced filters, favorites list, and retry/copy tooling).
2. Secure distribution pipeline with javascript-obfuscator, reproducible release packaging, and templated configuration/environment files.
3. Compliance-ready documentation set (README, README_PlayNexus, CHANGELOG, version.json, config_template.json, .env.example, SETUP_INSTRUCTIONS).

Operational Notes
-----------------
- Follow SETUP_INSTRUCTIONS.txt before packaging or deploying.
- Run `npm run release:prepare` to generate the obfuscated renderer bundle and populate the release/PlayNexus_IPTV_vX.Y.Z directory.
- Always bump version.json + CHANGELOG.txt prior to release tagging and GitHub publishing under PlayNexusHub.
- Keep secrets outside the repo; reference `.env.example` and `config_template.json`.

Support
-------
Contact: support@playnexushub.com
Tickets: https://github.com/PlayNexusHub/iptv-player/issues

