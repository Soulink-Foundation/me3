# me3

Private extraction scaffold for the installable ME3 Core personal/business AI assistant.

This repository is intentionally small at first. It is not a raw split of `me3-app`; it is the curated first slice that will become a bootable Cloudflare install template.

## First Slice

- Cloudflare Worker shell with health, admin bootstrap, assistant chat placeholder, and public profile/me.json endpoints.
- Vue web shell for local admin/bootstrap and setup-required states.
- Minimal D1 schema for install metadata, owner profile, and assistant messages.
- Example install config with no ME3 Cloud production domains, IDs, routes, or secrets.

## Boundaries

ME3 Core owns the installable assistant runtime, owner profile, me.json output, setup-required integration states, and optional owner-supplied providers.

ME3 Cloud hosted-only config is excluded: production `me3.app` routes, production Cloudflare IDs/tokens, hosted subscription billing, support ops, and managed customer infrastructure.

Plugin-owned config is excluded from the boot slice until plugin packages are installed.

## Local Shape

```bash
pnpm install
pnpm setup:dev-vars
pnpm --filter @me3-core/worker db:migrate:local
pnpm verify:local-boot
pnpm build
pnpm --filter @me3-core/worker dev
pnpm --filter @me3/web dev
```

`pnpm setup:dev-vars` creates `apps/worker/.dev.vars` with generated local-only bootstrap values. Never commit real secrets.

`pnpm verify:local-boot` is the extraction acceptance gate for the first slice. It applies the local D1 migration, starts the Worker and web shell, checks `/health`, `/api/config`, `/api/admin/bootstrap`, `/api/assistant/chat`, `/.well-known/me.json`, and verifies that the web shell responds.

## Web UI

The Core OSS web app is copied from `me3-app` rather than redesigned from scratch. Calendar, email, sites, and settings use the existing ME3 Vue/Vite UI as the base. `/assistant` is intentionally a placeholder for now, with the existing side navigation entry pointing at it.

## Install Config

`apps/worker/wrangler.core.example.toml` is the first install-template config. It includes only Core bindings and local defaults:

- `DB` D1 binding for Core tables
- `ME3_USER_AGENT` Durable Object binding
- optional `AI` Workers AI binding
- public origin/model vars for local boot

It intentionally excludes production `me3.app` routes, production Cloudflare account/zone IDs, plugin queues, hosted subscription billing config, and real provider secrets.

`apps/worker/.dev.vars.example` lists secret names only. The first required generated local values are:

- `JWT_SECRET`
- `TOKEN_ENCRYPTION_KEY`
- `ADMIN_BOOTSTRAP_CODE`

Owner-supplied providers such as OpenAI, Anthropic, Postmark, Stripe, OAuth, and search remain blank until an install owner configures them.
