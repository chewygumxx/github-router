// vim:set expandtab shiftwidth=4 filetype=javascript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/github-router.git
// ::: :/src/index.js
//
//

/**
 * Cloudflare Worker transport for GitHub web redirects and raw-file proxying.
 * Uses standard Workers Web APIs; authentication, storage, and cache bindings
 * are not required. URL parsing and configuration live in sibling modules.
 * @module github-router/worker
 */

import { config } from "./config.js";
import { githubURL, parsePath } from "./url.js";

/**
 * Creates a plain UTF-8 text response for routing or upstream errors.
 * The HTTP runtime suppresses bodies for incoming HEAD requests; direct unit
 * calls to this helper's enclosing handler are not that HTTP boundary.
 * @param {string} message Human-readable response body.
 * @param {number} [status=400] HTTP error status supplied by the handler.
 * @returns {Response} Text response with the requested status.
 */
function error(message, status = 400) {
    return new Response(message, {
        status,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
        },
    });
}

/**
 * Streams a public file from raw.githubusercontent.com without buffering it.
 * Forwards only the GET/HEAD method, follows upstream redirects, and uses the
 * parsed ref/path without forwarding client query parameters or headers.
 * Preserves upstream status/metadata, strips Set-Cookie, and adds CORS/nosniff.
 * HTTP errors pass through; rejected upstream operations are handled by fetch().
 * @param {Request} request Incoming request already restricted to GET or HEAD.
 * @param {import("./url.js").ParsedPath} parsed Validated resource selector.
 * @returns {Promise<Response>} 400 for a missing/directory path, otherwise the
 * upstream response with adjusted headers and no body for HEAD.
 * @throws {Error} Rejects on upstream fetch or response-construction failure.
 */
async function fetchRaw(request, parsed) {
    const { repo, ref, path, directory } = parsed;

    if (!path || directory) {
        return error("Raw requests require a file path.");
    }

    const upstreamURL = [
        "https://raw.githubusercontent.com",
        config.owner,
        repo,
        encodeURIComponent(ref),
        path,
    ].join("/");

    const upstream = await fetch(upstreamURL, {
        method: request.method,
        redirect: "follow",
    });

    const headers = new Headers(upstream.headers);

    headers.delete("set-cookie");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("X-Content-Type-Options", "nosniff");

    return new Response(request.method === "HEAD" ? null : upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
    });
}

/**
 * Worker module entry point. The optional platform env/context arguments are
 * unused; operation selection is based solely on method and request hostname.
 */
export default {
    /**
     * Routes a request to a GitHub redirect, raw proxy, or explanatory error.
     * Checks methods before hostnames, converts selector exceptions to 400,
     * and converts raw-fetch rejections to 502. workers.dev uses web behavior.
     * Web repository redirects preserve queries; the profile redirect does not.
     * Raw HTTP errors retain the upstream status rather than becoming 502.
     * @param {Request} request Incoming Worker request with an absolute URL.
     * @returns {Promise<Response>} 302 for web resources, an upstream raw
     * response, or 400/404/405/502 for the documented routing failure cases.
     */
    async fetch(request) {
        if (!["GET", "HEAD"].includes(request.method)) {
            return new Response("Method Not Allowed", {
                status: 405,
                headers: {
                    Allow: "GET, HEAD",
                },
            });
        }

        const url = new URL(request.url);

        // A workers.dev deployment is also treated
        // as the normal GitHub web interface.
        const raw = url.hostname === config.hosts.raw;

        if (
            url.hostname !== config.hosts.web &&
            url.hostname !== config.hosts.raw &&
            !url.hostname.endsWith(".workers.dev")
        ) {
            return error("Unknown hostname", 404);
        }

        let parsed;

        try {
            parsed = parsePath(url.pathname);
        } catch {
            return error("Invalid repository URL");
        }

        if (!parsed) {
            return raw
                ? error("Repository and file path required")
                : Response.redirect(`https://github.com/${config.owner}`, 302);
        }

        if (raw) {
            try {
                return await fetchRaw(request, parsed);
            } catch {
                return error("GitHub upstream unavailable", 502);
            }
        }

        const destination = githubURL(parsed) + url.search;

        return Response.redirect(destination, 302);
    },
};
