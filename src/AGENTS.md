---
ctime: 2026-11-08
mtime: 2026-11-08
spdx: GPL-3.0-only
title: Source agent guidance
description: >-
  Module contracts, runtime boundaries, and documentation rules for the router.
tags:
  - agents
  - javascript
  - cloudflare-worker
---

<!--
   -
   - ~chewygumxx/github-router.git
   - ::: :/src/AGENTS.md
   -
   -->

# Source agent guidance

These instructions supplement [the root guidance](../AGENTS.md). The
[README](../README.md) owns the public URL contract and deployment runbook.

## Module responsibilities

- `config.js` defines the owner and operation subdomains, deriving hostnames
  once at module load. It does not contact GitHub or validate configuration.
  Nullish subdomains are omitted; an empty string means the base domain.
- `url.js` exports `parsePath()` and `githubURL()`. Parsing is synchronous and
  independent of HTTP responses. URL construction uses the configured owner,
  makes no network calls, and does not check resource existence.
- `index.js` is the Worker entry point. It handles method/hostname checks,
  converts parser errors to 400, redirects web requests, and streams raw
  responses. Keep response concerns here rather than inside the parser.
- `index.test.js` runs in Bun and imports the real handler. Its fetch mocks
  are test infrastructure, never production runtime dependencies.

## Preserve these boundaries

Read a URL pathname, split the first component, and decode only the selector
before splitting repository and ref at the first `@`. Keep the remaining
encoded path unchanged. An omitted ref becomes `HEAD`; an explicit empty ref
is invalid. Encode the ref when constructing upstream URLs, including `/`
inside a branch name. Do not decode the whole pathname or double-encode file
paths. A trailing slash selects `tree` for nonempty web paths; otherwise use
`blob`. Repository roots follow the README's separate redirect rules.

Existing validation checks repository syntax and a limited set of forbidden
ref characters. It is not a complete Git reference validator. Do not claim
unrestricted branch-name support or silently expand normalization rules.

Accept GET/HEAD only. Configured web/raw hostnames and `*.workers.dev` are the
handler's accepted hosts. workers.dev uses web behavior. Wrangler can rewrite
the local origin from its routes; use the documented raw development command
rather than adding localhost exceptions to production validation.

Raw fetching forwards the method and follows redirects, but does not forward
incoming cookies, authorization, range, or conditional-request headers. It
does not forward the query string. Preserve upstream status and response
metadata, strip Set-Cookie, and add the current CORS/nosniff headers. Return
502 for fetch/response-construction failures; preserve upstream HTTP errors.
No GitHub credentials or custom edge cache are used.

For HEAD, the raw success helper explicitly removes the body. Error helpers
return ordinary Responses; the HTTP runtime suppresses HEAD bodies, which
workerd integration tests verify. Direct handler calls in Bun may retain an
error body. Do not mistake that test-layer difference for a deployed defect.

## JSDoc and types

Use standard Web API types from `../worker-configuration.d.ts` and checked
JSDoc, with no Bun or Node production imports. Describe each module's purpose,
configuration constants, shared object shapes, function parameters and return
values, thrown errors/rejections, and significant encoding or network effects.
Use examples where selector/ref/path behavior could be misunderstood. Keep
test callback names as their behavior descriptions; annotate reusable test
helpers without adding boilerplate to every assertion.

Keep `ParsedPath` owned by `url.js` and reference it with JSDoc import types
from the handler. Keep operation/configuration types owned by `config.js`.
Change generated declarations only by running `bun run types` from the root.

## Verification

Run `bun run check` from the repository root for source changes. It covers
strict production types, separate tooling types, fast Bun tests, workerd
integration tests, lint, and a dry-run bundle. Add behavior tests before
behavior changes; annotation-only edits should preserve executable code.

The integration harness and failure fixture live under `../test/`. Update
its copied compatibility settings when changing the production runtime date
or flags. Live deployment acceptance remains a separate step described in
the README; mocked upstream responses do not prove deployed DNS/TLS or
GitHub's interpretation of ambiguous encoded references.

<!-- vim:set expandtab shiftwidth=2 filetype=markdown foldlevel=3: -->
