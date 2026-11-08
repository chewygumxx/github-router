// vim:set expandtab shiftwidth=4 filetype=javascript:
// SPDX-License-Identifier: GPL-3.0-only

// Exercises the production bundle in workerd. Only outbound GitHub traffic
// is replaced; the Worker handler and HTTP responses run in their real runtime.
import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, mock, test } from "node:test";
import { createTestHarness } from "wrangler";

const server = createTestHarness({
    workers: [{ configPath: "./wrangler.jsonc" }],
});

const failingUpstream = createTestHarness({
    workers: [
        {
            config: {
                name: "github-router-upstream-failure",
                main: "./test/fixtures/upstream-failure.js",
                compatibility_date: "2026-11-08",
            },
        },
    ],
});

before(async () => {
    await server.listen();
    await failingUpstream.listen();
});
beforeEach(() => {
    mock.method(globalThis, "fetch", async (input) => {
        throw new Error(`Unexpected outbound request: ${input}`);
    });
});
afterEach(() => mock.restoreAll());
after(async () => {
    await Promise.all([server.close(), failingUpstream.close()]);
});

const web = "https://gh.cgxx.dev";
const raw = "https://raw.gh.cgxx.dev";
const github = "https://github.com/chewygumxx";

for (const [path, destination] of [
    ["/", ""],
    ["/github-router", "/github-router"],
    ["/github-router@main", "/github-router/tree/main"],
    ["/github-router/README.md", "/github-router/blob/HEAD/README.md"],
    ["/github-router@main/README.md", "/github-router/blob/main/README.md"],
    ["/github-router@main/src/", "/github-router/tree/main/src/"],
    [
        "/github-router/README.md?plain=1",
        "/github-router/blob/HEAD/README.md?plain=1",
    ],
    ["/?ignored=1", ""],
    [
        "/github-router@feature%2Frouter/README.md",
        "/github-router/blob/feature%2Frouter/README.md",
    ],
]) {
    test(`web redirect: ${path}`, async () => {
        const response = await server.fetch(`${web}${path}`, {
            redirect: "manual",
        });
        assert.equal(response.status, 302);
        assert.equal(
            response.headers.get("location"),
            `${github}${destination}`,
        );
    });
}

test("HEAD web redirect has the same destination and no body", async () => {
    const response = await server.fetch(`${web}/github-router`, {
        method: "HEAD",
        redirect: "manual",
    });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), `${github}/github-router`);
    assert.equal(await response.text(), "");
});

test("workers.dev uses web routing", async () => {
    const response = await server.fetch(
        "https://github-router.example.workers.dev/",
        {
            redirect: "manual",
        },
    );
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), github);
});

for (const [origin, path, status] of [
    [web, "/%ZZ", 400],
    [web, "/github-router@", 400],
    [web, "/repo%40bad%3Fref", 400],
    [raw, "/", 400],
    [raw, "/github-router", 400],
    [raw, "/github-router/src/", 400],
    ["https://unknown.example", "/github-router", 404],
]) {
    for (const method of ["GET", "HEAD"]) {
        test(`${method} rejects ${origin}${path} with ${status}`, async () => {
            const response = await server.fetch(`${origin}${path}`, { method });
            assert.equal(response.status, status);
            if (method === "HEAD") assert.equal(await response.text(), "");
        });
    }
}

for (const origin of [web, raw]) {
    test(`unsupported method on ${origin}`, async () => {
        const response = await server.fetch(`${origin}/github-router`, {
            method: "POST",
        });
        assert.equal(response.status, 405);
        assert.equal(response.headers.get("allow"), "GET, HEAD");
    });
}

for (const [selector, upstreamRef] of [
    ["github-router", "HEAD"],
    ["github-router@main", "main"],
    ["github-router@feature%2Frouter", "feature%2Frouter"],
]) {
    for (const method of ["GET", "HEAD"]) {
        test(`raw ${method} uses ${upstreamRef} and preserves response metadata`, async () => {
            mock.method(globalThis, "fetch", async (input, init) => {
                const request = new Request(input, init);
                assert.equal(
                    request.url,
                    `https://raw.githubusercontent.com/chewygumxx/github-router/${upstreamRef}/README.md`,
                );
                assert.equal(request.method, method);
                return new Response(
                    method === "HEAD" ? null : "# Fixture README\n",
                    {
                        headers: {
                            "content-type": "text/plain; charset=utf-8",
                            "cache-control": "max-age=60",
                            etag: '"fixture"',
                            "set-cookie": "private=value",
                        },
                    },
                );
            });
            const response = await server.fetch(
                `${raw}/${selector}/README.md?ignored=1`,
                { method },
            );
            assert.equal(response.status, 200);
            assert.equal(
                await response.text(),
                method === "HEAD" ? "" : "# Fixture README\n",
            );
            assert.equal(
                response.headers.get("content-type"),
                "text/plain; charset=utf-8",
            );
            assert.equal(response.headers.get("cache-control"), "max-age=60");
            assert.equal(response.headers.get("etag"), '"fixture"');
            assert.equal(response.headers.get("set-cookie"), null);
            assert.equal(
                response.headers.get("access-control-allow-origin"),
                "*",
            );
            assert.equal(
                response.headers.get("x-content-type-options"),
                "nosniff",
            );
        });
    }
}

test("raw upstream 404 is preserved", async () => {
    mock.method(globalThis, "fetch", async (input, init) => {
        assert.equal(
            new Request(input, init).url,
            "https://raw.githubusercontent.com/chewygumxx/github-router/HEAD/missing.md",
        );
        return new Response("404: Not Found", { status: 404 });
    });
    const response = await server.fetch(`${raw}/github-router/missing.md`);
    assert.equal(response.status, 404);
    assert.equal(await response.text(), "404: Not Found");
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
});

for (const method of ["GET", "HEAD"]) {
    test(`raw ${method} network failures become 502`, async () => {
        const response = await failingUpstream.fetch(
            `${raw}/github-router/README.md`,
            { method },
        );
        assert.equal(response.status, 502);
        assert.equal(
            await response.text(),
            method === "HEAD" ? "" : "GitHub upstream unavailable",
        );
    });
}
