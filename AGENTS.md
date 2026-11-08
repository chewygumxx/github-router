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

## Commit Doctrine

Continuously commit granularly as you work. For message composure, consider
one line where that suffices, and a body where the change demands context.

<!-- vim:set expandtab shiftwidth=2 filetype=markdown foldlevel=3: -->
