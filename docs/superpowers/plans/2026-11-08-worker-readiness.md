# Worker Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> to implement this plan task-by-task. Track each task below.

**Goal:** Complete documentation, Worker types, runtime tests, and ignores.

**Architecture:** Preserve the router. Check production JavaScript against
Wrangler-generated types separately from Bun tooling. Exercise the production
bundle with Wrangler's Node-driven workerd integration harness.

**Tech Stack:** JavaScript/JSDoc, Bun, TypeScript, Node test, Wrangler/workerd.

**Spec:** [Worker readiness design](../specs/2026-11-08-worker-readiness-design.md)

## Global Constraints

- Keep JavaScript production source and the existing public URL format.
- Keep Bun for package installation, scripts, and fast unit tests.
- No production deployment, DNS changes, new operations, or cache changes.
- Commit each independently verified task.

## Review Focus

- Incoming HEAD responses must have no body, including rejected requests.
- Generated types must not expose Bun or Node globals to production source.
- Raw upstream failures and 404s must remain distinguishable.
- Encoded slash refs must preserve their selector boundary in constructed URLs.
- Development examples must select web and raw modes without changing hosts.

## Task 1: Explicit local-state exclusions

**Files:** .gitignore.
**Interfaces:** Local generated files ignored; example files remain addable.

- [ ] Check repository-only ignore decisions without global Git excludes.
- [ ] Add .wrangler/, .dev.vars*, .env*, and example exceptions.
- [ ] Verify state/secrets ignored and example files not ignored.
- [ ] Commit the exclusions.

## Task 2: Public documentation and agent guidance

**Files:** README.md, AGENTS.md, this plan and its design.
**Interfaces:** Existing URL contract and documented development commands.

- [ ] Document URL examples, methods, references, trailing slashes, public
      resources, query behavior, configuration, and deferred operations.
- [ ] Document Bun setup, Node prerequisite, normal/raw local modes, types,
      checks, and deployment commands without deploying.
- [ ] Add runtime and tooling guidance to AGENTS.md.
- [ ] Validate Markdown and frontmatter; check examples against current tests.
- [ ] Commit documentation and implementation records.

## Task 3: Production JavaScript type boundary

**Files:** jsconfig.json, tsconfig.json, src/*.js, package.json, bun.lock,
worker-configuration.d.ts, .biome.json, test/types/worker.ts.
**Interfaces:** bun run typecheck checks Worker and tooling projects;
bun run types regenerates declarations, types:check validates freshness.

- [ ] Add a Worker type fixture with expected errors for Bun, process, and
      invalid parsePath input; show the current configuration fails it.
- [ ] Generate declarations with Wrangler, isolate source from Bun tests,
      enable strict checkJs, and add JSDoc types to production functions.
- [ ] Exclude generated declarations from Biome and pin the Wrangler floor
      needed by the harness; preserve locked versions when possible.
- [ ] Verify the type fixture, both type projects, generated freshness,
      existing unit tests, lint, and dry-run bundle.
- [ ] Commit the type boundary and generated declarations.

## Task 4: Workerd integration coverage

**Files:** test/router.integration.mjs, package.json, .config/mise/mise.toml,
README.md if commands require adjustment.
**Interfaces:** test:unit uses Bun; test:integration uses Node; test and check
run both. No network access is required for GitHub fixtures.

- [ ] Add harness tests for documented redirects, encoded refs, errors,
      raw GET/HEAD, upstream 404/network errors, metadata, and web HEAD.
- [ ] Run the suite against the existing implementation; investigate any
      mismatch with the existing contract before changing production code.
- [ ] Temporarily mutate raw routing and verify integration tests fail;
      restore production source and verify green.
- [ ] Wire scripts and Node toolchain; verify full check and frozen install.
- [ ] Commit tests and toolchain changes.
- [ ] Obtain one independent whole-branch review; address concrete blockers.
- [ ] Verify the final tree is clean and report commits and evidence limits.
