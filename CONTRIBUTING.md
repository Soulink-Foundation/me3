# Contributing

Thanks for helping improve ME3 Core.

## Scope

ME3 Core is the installable, owner-controlled assistant runtime. Keep hosted-only ME3 Cloud configuration, production routes, billing setup, customer operations, and real provider secrets out of this repository.

Plugin features should stay behind clear plugin boundaries until their packages are installed by an owner.

## Development

```bash
pnpm install
pnpm setup:dev-vars
pnpm --filter @me3-core/worker db:migrate:local
pnpm verify:local-boot
pnpm build
```

Use example domains, placeholder IDs, and generated local secrets in fixtures and docs. Do not commit `.dev.vars`, Cloudflare account IDs, API keys, webhook secrets, or production ME3 Cloud configuration.

## Pull Requests

- Keep changes focused and explain which Core boundary they affect.
- Include tests or verification notes for behavior changes.
- Run `pnpm build` after changing the web app.
- Document any new public asset, copied sample, or third-party provenance in `ASSET_PROVENANCE.md`.

By contributing, you agree that your contribution is licensed under the MIT License.
