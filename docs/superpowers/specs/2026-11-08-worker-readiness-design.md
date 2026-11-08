# Worker readiness design

The complete follow-up was selected in the repository discussion on
2026-11-08. Make the existing two-host router easier to use and validate,
without expanding its public API.

## Approaches

A documentation and ignore-only cleanup is smaller but leaves production
source unchecked and runtime compatibility untested. The selected complete
follow-up adds Worker-specific JavaScript checking and workerd integration
tests. Converting to TypeScript or adding a framework is unnecessary.

## Contract and constraints

- Keep JavaScript production source and the existing public URL format.
- Keep Bun for package installation, scripts, and fast unit tests.
- Use Wrangler/workerd for production-compatible execution and bundling.
- Preserve both Custom Domains, GET/HEAD handling, redirects, raw proxying,
  default HEAD references, query forwarding for web redirects, and the
  trailing-slash directory convention.
- Encoded slashes in references are accepted by the router; unrestricted
  GitHub resolution of such branch names is not promised.
- No releases, API gateway, private repository access, cache policy changes,
  DNS changes, deployment, or publishing in this follow-up.

## Implementation decisions

Document normal and raw local development using Wrangler origin handling.
Expand AGENTS.md with runtime, tooling, and validation guidance. Explicitly
ignore Wrangler state and local variable files, retaining example files.

Generate and commit worker-configuration.d.ts using the installed Wrangler.
Check production JavaScript with strict checkJs and generated runtime types.
Keep Bun tooling types in the existing separate TypeScript configuration.
Add JSDoc annotations without changing routing behavior. Use negative type
fixtures to ensure Bun and Node globals do not leak into the Worker project.

Retain the fast Bun suite. Use Wrangler's createTestHarness with Node's
built-in test runner for workerd integration tests: the installed harness
explicitly cannot dispatch requests under Bun. Mock outbound GitHub requests
through the harness's Node fetch interception, failing on unexpected URLs.
Run both suites and both type projects from bun run check. Pin an adequate
Wrangler minimum and declare Node in the project toolchain.

## Evidence and limits

Validate documented URL examples in tests, real raw GET/HEAD responses,
error responses, response metadata, generated type freshness, ignored state,
and a fresh frozen installation. Test integration failure sensitivity with
a temporary production mutation, restoring it before commit. Local tests
cannot prove deployed DNS/TLS or GitHub branch-resolution semantics.
