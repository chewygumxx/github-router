---
ctime: 2026-11-08
mtime: 2026-11-08
spdx: GPL-3.0-only
title: github-router
description: >-
  Route standardised URLs to personal GitHub repositories and raw files.
tags:
  - github
  - router
  - cloudflare-worker
---

<!--
   -
   - ~chewygumxx/github-router.git
   - ::: :/README.md
   -
   -->

# github-router

A Cloudflare Worker that routes short URLs to public GitHub assets owned by
`chewygumxx`. `gh.cgxx.dev` redirects to GitHub's web interface;
`raw.gh.cgxx.dev` streams file contents under the requested hostname.

## URL contract

```text
https://[raw.]gh.cgxx.dev[/<repo>[@ref][/filepath]]
```

| URL | Result |
| --- | --- |
| `https://gh.cgxx.dev/` | Redirect to the owner's GitHub profile |
| `https://gh.cgxx.dev/github-router` | Redirect to the repository homepage |
| `https://gh.cgxx.dev/github-router@main` | Browse the repository at `main` |
| `https://gh.cgxx.dev/github-router/README.md` | Browse the file using `HEAD` |
| `https://gh.cgxx.dev/github-router@main/README.md` | Browse the file at `main` |
| `https://gh.cgxx.dev/github-router@main/src/` | Browse a directory at `main` |
| `https://raw.gh.cgxx.dev/github-router/README.md` | Serve the raw file using `HEAD` |
| `https://raw.gh.cgxx.dev/github-router@main/README.md` | Serve the raw file at `main` |

An omitted reference becomes `HEAD`, addressing the repository's default
branch. Explicit references may be branch names, tags, or commit SHAs.
Paths ending in `/` select GitHub's directory view; other nonempty paths
select its file view. The router does not query GitHub to identify objects.

A slash in a reference must be encoded within the first path component:
`/github-router@feature%2Frouter/README.md`. The router preserves that boundary
when constructing GitHub URLs. GitHub's resolution of overlapping branch and
file paths is not guaranteed by this project; simple references and commit
SHAs are the supported starting point.

Web redirects use HTTP 302 and preserve the query string for repository
URLs. The profile redirect does not forward a query string. Raw requests
require a file path, ignore the query string, and preserve upstream status,
content type, and cache headers. Raw responses remove `Set-Cookie` and add
`Access-Control-Allow-Origin: *` and `X-Content-Type-Options: nosniff`.

Both hosts accept `GET` and `HEAD`; other methods return 405 with
`Allow: GET, HEAD`. Malformed selectors and raw requests without a file return
400. Unrecognised hosts return 404; raw upstream fetch failures return 502.
Upstream HTTP errors, such as a missing file's 404, pass through unchanged.
A `*.workers.dev` deployment hostname uses web redirect behavior.

## Development

Use Bun 1.4 and Node.js 24 or later. Bun manages dependencies and scripts;
Node runs Wrangler and the integration-test driver. Production code runs in
Cloudflare's workerd runtime and uses standard Web APIs.

```sh
bun install --frozen-lockfile
bun run dev --local
```

With the configured routes, Wrangler infers the web origin for local
requests. In another terminal:

```sh
curl -I http://localhost:8787/
curl -I http://localhost:8787/github-router@main/README.md
```

For raw mode, stop the web development server and start:

```sh
bun run dev --local --local-upstream raw.gh.cgxx.dev
curl -fsS http://localhost:8787/github-router@main/README.md
```

The raw development command selects the hostname seen by the Worker. Setting
a `Host` header alone does not override Wrangler's inferred origin. Raw local
requests fetch public files from GitHub, so they require network access.

## Validation and types

```sh
bun run types             # Regenerate Worker runtime declarations
bun run types:check       # Check the generated declarations are current
bun run typecheck         # Check Worker source and tooling separately
bun run test:unit         # Fast request tests in Bun
bun run test:integration  # Production bundle tests in workerd, driven by Node
bun run test              # Both suites
bun run check             # Lint, types, both suites, and deployment dry run
```

Commit `bun.lock` and `worker-configuration.d.ts`. Run `bun run types` after
changing Wrangler's compatibility date, flags, bindings, or version. The
Worker's checked JavaScript uses generated Cloudflare types; Bun types are
reserved for tests and tooling. Generated declarations are excluded from
formatting and linting.

Integration tests use the installed Wrangler test harness and intercept
outbound GitHub requests with fixed responses. A separate test-only Worker
fixture rejects fetch inside workerd to test network-error handling, because
Miniflare converts Node mock exceptions into HTTP 500 responses. Tests do not
need GitHub or Cloudflare credentials or live GitHub access. They validate
runtime behavior,
not deployed DNS/TLS or all GitHub branch-resolution cases.

## Configuration and deployment

`src/config.js` defines the GitHub owner, base domain, and operation
subdomains. `wrangler.jsonc` defines the two Custom Domains. Keep these
hostnames aligned when changing configuration.

Authenticate with the intended Cloudflare account, then deploy explicitly:

```sh
bunx --no-install wrangler login
bun run check
bun run deploy
```

Cloudflare provisions DNS and certificates for the configured Custom Domains,
including the nested raw hostname. See the [Custom Domains documentation](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

This router accesses public repository files without a GitHub token. Private
repositories, release assets, LFS downloads, API routing, wildcard domains,
and custom edge-cache policies require separate support. Existing upstream
cache headers are retained; the Worker does not add its own cache policy.

<!-- vim:set expandtab shiftwidth=2 filetype=markdown foldlevel=3: -->
