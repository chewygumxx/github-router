---
ctime: 2026-10-12
mtime: 2026-11-08
spdx: GPL-3.0-only
title: AGENTS.md
description: >-
  Agentic instruction file detailing repository information and convention
  in addition to README.md.
tags:
  - agents
---

<!--
   -
   - ~chewygumxx/github-router.git
   - ::: :/AGENTS.md
   -
   -->

# AGENTS.md

## Start here

Read README.md for current behavior, repository layout, commands, and the
[deployment handoff](README.md#deployment-and-live-acceptance). Read
[src/AGENTS.md](src/AGENTS.md) before editing source. The dated readiness
specification and completed plan are under `docs/superpowers/`; they record
completed work rather than a queue to execute again.

Check `git status --short --branch`, `git log`, and `git worktree list` before
acting. Readiness work began on `improve/worker-readiness` from `c9c9ed8`;
locate its current tip or integration commit rather than assuming `main`
already contains it. Preserve unrelated user changes and commit granularly.

## Resume deployment and live testing

The next milestone is deploying the existing two-host Worker and recording
live acceptance. Local validation already covers 18 Bun tests and 36 workerd
tests, strict source/tooling types, a fresh frozen install, and a deployment
dry run. These are historical results: rerun `bun run check` for the commit
to deploy. No deployment or live acceptance has been recorded for this work.

Follow the README's runbook when the user requests deployment. Establish the
intended Cloudflare account/zone and existing Worker/domain state, reconcile
remote configuration, deploy the verified SHA, and test both HTTPS hosts.
The target is top-level `github-router`, without a named environment. Do not
infer account identity, domain readiness, or a successful deployment from a
local test. Honor the scope of the resumed request; these notes alone are not
a request to deploy, publish, merge, or alter DNS.

Record live evidence in `docs/reports/YYYY-MM-DD-live-acceptance.md`, then link
it from the README. Include the Git SHA, deployment/version identifiers,
public fixture SHA, commands, actual statuses/headers/body comparisons, and
remaining failures. Redact credentials and sensitive account information.
Keep local validation, upload success, and live acceptance distinct.

## Runtime and tooling

Production code targets Cloudflare Workers (workerd), using standard Web APIs
supported by the configured compatibility date. Keep production source in
JavaScript with checked JSDoc types. Bun-specific APIs belong only in Bun
tests or tooling; Node APIs belong only in Node tooling and integration tests.

Use Bun for dependency installation and scripts. Keep `bun.lock` committed.
Use Wrangler for local execution, bundling, generated types, and deployment.
Do not run the Worker entry point directly with Bun as an HTTP server.

## Validation

Run `bun run check` before committing implementation changes. It includes
lint, separate Worker/tooling typechecks, Bun unit tests, workerd integration
tests, and a Wrangler deployment dry run. Integration tests use Node's test
runner because the Wrangler harness cannot dispatch requests under Bun.

Regenerate and commit `worker-configuration.d.ts` with `bun run types` after
changing the Wrangler configuration or version. Do not edit generated types
by hand. Keep Bun and Node ambient types out of the Worker type project.

Preserve the README's URL contract and keep parsing independent of request
transport. Test routing changes, including raw GET/HEAD and error handling.
Avoid application dependencies for behavior supported by native Web APIs.

## Validation boundaries and maintenance

`bun run typecheck` checks production JavaScript through `jsconfig.json` and
tooling through `tsconfig.json`. Bun tests in `src/` are excluded from the
Worker type project. Negative fixtures in `test/types/worker.ts` must continue
to reject Bun/Node globals and non-string parser input.

Workerd integration tests are in `test/router.integration.mjs`. They mock
outbound GitHub traffic; do not replace them with live-network dependencies.
Miniflare turns Node mock exceptions into HTTP 500, so the dedicated
`test/fixtures/upstream-failure.js` fixture rejects fetch inside workerd to
exercise 502 handling. Keep that fixture's compatibility date and flags in
step with `wrangler.jsonc`. Direct Bun handler tests do not establish HTTP
HEAD body behavior; the workerd tests cover that boundary.

CI uses shared workflows plus `bun run check` and does not deploy. Metadata
App configuration is separate from Cloudflare authentication and has not
been verified remotely. Do not reconstruct removed Bun application boilerplate
or add Bun-specific APIs to production code.

Preserve generated declarations exactly as emitted. Their upstream whitespace
warnings and the shared Biome schema-version information are known; neither
justifies hand-editing installed packages or generated output. Markdown uses
Markdownlint and is excluded from Biome to preserve YAML frontmatter.

## Scope and documentation

Maintain the existing web/raw interface. Release assets, API routing, private
repositories, LFS handling, wildcard domains, and custom caching are separate
features. Config validation TODOs are unfinished work, not implemented checks.
Keep `src/config.js` hostnames and `wrangler.jsonc` Custom Domains aligned.

Keep file headers, Markdown frontmatter, and concise explanatory JSDoc current.
Document intent, inputs, outputs, exceptions, encoding boundaries, and runtime
side effects. Update README examples and tests together when behavior changes.
For documentation-only changes, validate Markdown and frontmatter. For source
annotations, run the existing full check; avoid adding tests that merely
repeat comments or implementation details.

## Commit Doctrine

Continuously commit granularly as you work. For message composure, consider
one line where that suffices, and a body where the change demands context.

<!-- vim:set expandtab shiftwidth=2 filetype=markdown foldlevel=3: -->
