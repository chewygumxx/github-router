// vim:set expandtab shiftwidth=4 filetype=javascript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/github-router.git
// ::: :/src/index.js
//
//

import { config } from "./config.js";
import { githubURL, parsePath } from "./url.js";

/** @param {string} message */
function error(message, status = 400) {
    return new Response(message, {
        status,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
        },
    });
}

/**
 * @param {Request} request
 * @param {import("./url.js").ParsedPath} parsed
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

export default {
    /** @param {Request} request */
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
