// SPDX-License-Identifier: GPL-3.0-only

import { afterEach, expect, mock, spyOn, test } from "bun:test";
import worker from "./index.js";

const request = (path, options) =>
    worker.fetch(new Request(`https://gh.cgxx.dev${path}`, options));

afterEach(() => mock.restore());

test("redirects the web root to the configured owner", async () => {
    const response = await request("/");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
        "https://github.com/chewygumxx",
    );
});

test.each([
    ["/github-router", "github-router"],
    ["/github-router@main", "github-router/tree/main"],
    [
        "/github-router/README.md?plain=1",
        "github-router/blob/HEAD/README.md?plain=1",
    ],
    ["/github-router@main/src/", "github-router/tree/main/src/"],
    [
        "/github-router@feature%2Frouter/src/index.js",
        "github-router/blob/feature%2Frouter/src/index.js",
    ],
])("redirects %s to the expected GitHub URL", async (path, destination) => {
    const response = await request(path);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
        `https://github.com/chewygumxx/${destination}`,
    );
});

test.each(["/%ZZ", "/repo@", "/repo%40bad%3Fref"])(
    "rejects malformed selector %s",
    async (path) => {
        expect((await request(path)).status).toBe(400);
    },
);

test("rejects unsupported methods", async () => {
    const response = await request("/github-router", { method: "POST" });
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
});

test("rejects unknown hostnames", async () => {
    expect(
        (await worker.fetch(new Request("https://example.com/"))).status,
    ).toBe(404);
});

test("accepts the workers.dev hostname", async () => {
    const response = await worker.fetch(
        new Request("https://github-router.example.workers.dev/"),
    );
    expect(response.headers.get("location")).toBe(
        "https://github.com/chewygumxx",
    );
});

test.each(["/", "/github-router", "/github-router/src/"])(
    "rejects raw requests without a file at %s",
    async (path) => {
        const response = await worker.fetch(
            new Request(`https://raw.gh.cgxx.dev${path}`),
        );
        expect(response.status).toBe(400);
    },
);

test.each(["GET", "HEAD"])("proxies raw files using %s", async (method) => {
    const upstream = spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("file contents", {
            headers: { "set-cookie": "private=value" },
        }),
    );
    const response = await worker.fetch(
        new Request("https://raw.gh.cgxx.dev/github-router@main/README.md", {
            method,
        }),
    );
    expect(upstream).toHaveBeenCalledWith(
        "https://raw.githubusercontent.com/chewygumxx/github-router/main/README.md",
        { method, redirect: "follow" },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toBe(
        method === "HEAD" ? "" : "file contents",
    );
});

test("reports raw upstream failures", async () => {
    spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    const response = await worker.fetch(
        new Request("https://raw.gh.cgxx.dev/github-router/README.md"),
    );
    expect(response.status).toBe(502);
});
