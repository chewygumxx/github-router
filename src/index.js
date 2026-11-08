
const OWNER = "chewygumxx";

const HOSTS = {
    web: "gh.cgxx.dev",
    raw: "raw.gh.cgxx.dev",
};

const REPO_PATTERN = /^[a-zA-Z0-9_.-]+$/;

function error(message, status = 400) {
    return new Response(message, {
        status,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
        },
    });
}

function parsePath(pathname) {
    const [selector, ...segments] = pathname
        .slice(1)
        .split("/");

    if (!selector) {
        return null;
    }

    const decoded = decodeURIComponent(selector);
    const separator = decoded.indexOf("@");

    const repo = separator < 0
        ? decoded
        : decoded.slice(0, separator);

    const ref = separator < 0
        ? "HEAD"
        : decoded.slice(separator + 1);

    if (
        !REPO_PATTERN.test(repo) ||
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

function githubURL(parsed) {
    const {
        repo,
        ref,
        explicitRef,
        path,
        directory,
    } = parsed;

    const base = `https://github.com/${OWNER}/${repo}`;

    if (!path) {
        return explicitRef
            ? `${base}/tree/${encodeURIComponent(ref)}`
            : base;
    }

    const kind = directory ? "tree" : "blob";

    return `${base}/${kind}/${encodeURIComponent(ref)}/${path}`;
}

async function fetchRaw(request, parsed) {
    const { repo, ref, path, directory } = parsed;

    if (!path || directory) {
        return error(
            "Raw requests require a file path.",
        );
    }

    const upstreamURL = [
        "https://raw.githubusercontent.com",
        OWNER,
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

    return new Response(
        request.method === "HEAD" ? null : upstream.body,
        {
            status: upstream.status,
            statusText: upstream.statusText,
            headers,
        },
    );
}

export default {
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
        const raw = url.hostname === HOSTS.raw;

        if (
            url.hostname !== HOSTS.web &&
            url.hostname !== HOSTS.raw &&
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
                : Response.redirect(
                    `https://github.com/${OWNER}`,
                    302,
                );
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

