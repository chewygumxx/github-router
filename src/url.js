// vim:set expandtab shiftwidth=4 filetype=javascript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/github-router.git
// ::: :/src/url.js
//
//

import { config } from "./config.js";

//
// URL handling logic
//

export function parsePath(pathname) {
    const [selector, ...segments] = pathname.slice(1).split("/");

    if (!selector) {
        return null;
    }

    const decoded = decodeURIComponent(selector);
    const separator = decoded.indexOf("@");

    const repo = separator < 0 ? decoded : decoded.slice(0, separator);

    const ref = separator < 0 ? "HEAD" : decoded.slice(separator + 1);

    const repo_pattern = /^[a-zA-Z0-9_.-]+$/;

    if (
        !repo_pattern.test(repo) ||
        repo === "." ||
        repo === ".." ||
        !ref ||
        /[?#@\\]/.test(ref)
    ) {
        throw new Error("Invalid repository or reference");
    }

    return {
        repo,
        ref,
        explicitRef: separator >= 0,
        path: segments.join("/"),
        directory: pathname.endsWith("/"),
    };
}

export function githubURL(parsed) {
    const { repo, ref, explicitRef, path, directory } = parsed;

    const base = `https://github.com/${config.owner}/${repo}`;

    if (!path) {
        return explicitRef ? `${base}/tree/${encodeURIComponent(ref)}` : base;
    }

    const kind = directory ? "tree" : "blob";

    return `${base}/${kind}/${encodeURIComponent(ref)}/${path}`;
}
