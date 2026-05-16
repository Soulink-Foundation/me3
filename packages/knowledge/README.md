# ME3 Knowledge

Shared, typed product and capability knowledge for ME3 Core and hosted ME3 app
surfaces.

Think of this package as ME3's capability map, not as a single agent skill. Agent
runtimes should inject only the compact `buildMe3CapabilityContext` output, while
apps can render the fuller snapshot in help surfaces, onboarding, setup panels,
and empty states.

The first slice is intentionally static and versioned with code. Plugin manifests
and user-specific install state can be merged at runtime through
`getMe3KnowledgeSnapshot` or `buildMe3CapabilityContext`.

## LLM Docs Artifact

`pnpm generate:llms` writes `apps/web/public/llms.txt` from this package so Core
installs can expose a compact, public-safe capability map at `/llms.txt`.

Keep this artifact generated from typed knowledge rather than hand-edited. The
future `llms-full.txt` docs bundle should stay separate until the Core docs
corpus is large enough to justify one-shot ingestion.
