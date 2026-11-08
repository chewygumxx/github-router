// SPDX-License-Identifier: GPL-3.0-only

import worker from "../../src/index.js";
import { githubURL, parsePath } from "../../src/url.js";

// These assertions are compiled, never executed. An unused expect-error
// detects ambient runtime leakage or a weakened parser input type.
// @ts-expect-error Bun APIs are unavailable in the Worker runtime.
globalThis.Bun.file("README.md");
// @ts-expect-error Node globals are unavailable without nodejs_compat.
globalThis.process.cwd();
// @ts-expect-error A URL pathname must be a string.
parsePath(123);

const parsed = parsePath("/github-router@main/README.md");
if (parsed) {
    const destination: string = githubURL(parsed);
    worker.fetch(new Request(destination));
}
