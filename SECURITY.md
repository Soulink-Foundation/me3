# Security

## Supported Versions

ME3 Core is pre-1.0. Security fixes target the `main` branch.

## Reporting Vulnerabilities

Please use GitHub private vulnerability reporting when the repository is public. If that is unavailable, open a minimal issue that does not include exploit details, secrets, tokens, customer data, or private infrastructure identifiers.

We will triage reports as quickly as practical and coordinate a fix before public disclosure when the issue is confirmed.

## Secret Handling

Never commit real secrets or production infrastructure values. This includes `.dev.vars`, Cloudflare account IDs, API keys, OAuth client secrets, webhook signing secrets, token encryption keys, JWT secrets, and production ME3 Cloud routes.

Use `pnpm setup:dev-vars` for local generated values and keep public examples limited to placeholder names.
