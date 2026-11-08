// vim:set expandtab shiftwidth=4 filetype=javascript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/github-router.git
// ::: :/src/url.js
//
//

/**
 * Synchronous selector parsing and GitHub web URL construction.
 * No HTTP responses or upstream existence checks are performed here.
 * @module github-router/url
 */

import { config } from "./config.js";

/**
 * Resource selector with a decoded repository/ref and an encoded file path.
 * @typedef {object} ParsedPath
 * @property {string} repo Validated repository name, excluding owner.
 * @property {string} ref Decoded explicit ref, or HEAD when omitted.
 * @property {boolean} explicitRef Whether the selector contained an @ separator.
 * @property {string} path Remaining encoded path, without the selector prefix.
 * May be empty and retains any trailing slash.
 * @property {boolean} directory Whether the original pathname ended in /.
 */

/**
 * Parses /repo[@ref][/path] from a URL pathname, decoding only the selector.
 * Split before decoding so an encoded slash inside a ref stays in the selector.
 * File path segments remain encoded and are not checked for upstream existence.
 * Validation is deliberately narrower than complete Git reference validation.
 * @param {string} pathname URL.pathname, including its leading slash.
 * @returns {ParsedPath | null} Parsed resource, or null for an empty selector.
 * @throws {URIError} If the selector has malformed percent encoding.
 * @throws {Error} If repository syntax or the reference is rejected.
 * @example
 * parsePath("/github-router@feature%2Frouter/src/");
 * // { repo: "github-router", ref: "feature/router", explicitRef: true,
 * //   path: "src/", directory: true }
 */
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

/**
 * Constructs a GitHub web destination for a parsed selector.
 * Repository roots use the homepage unless a ref was explicit, in which case
 * they use tree/ref. Nonempty paths use tree for directories and blob for files.
 * Only the ref is encoded here; the parsed path keeps its existing encoding.
 * The caller may append a query string. GitHub performs resource resolution.
 * @param {ParsedPath} parsed Resource returned by parsePath().
 * @returns {string} Absolute HTTPS URL under the configured GitHub owner.
 * @example
 * githubURL({ repo: "github-router", ref: "main", explicitRef: true,
 *     path: "README.md", directory: false });
 * // "https://github.com/chewygumxx/github-router/blob/main/README.md"
 */
export function githubURL(parsed) {
    const { repo, ref, explicitRef, path, directory } = parsed;

    const base = `https://github.com/${config.owner}/${repo}`;

    if (!path) {
        return explicitRef ? `${base}/tree/${encodeURIComponent(ref)}` : base;
    }

    const kind = directory ? "tree" : "blob";

    return `${base}/${kind}/${encodeURIComponent(ref)}/${path}`;
}
