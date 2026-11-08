// vim:set expandtab shiftwidth=4 filetype=javascript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/github-router.git
// ::: :/src/config.js
//
//

/**
 * Static owner/domain configuration shared by URL construction and transport.
 * Hostnames are derived once at module evaluation, with no network access or
 * runtime environment bindings. Keep Wrangler's Custom Domains in sync.
 * @module github-router/config
 */

/** @typedef {"web" | "raw"} Operation Supported hostname-based operations. */

/**
 * Hostnames enabled for supported operations; an absent key disables its host.
 * @typedef {Partial<Record<Operation, string>>} OperationHosts
 */

/**
 * @typedef {object} RouterConfig
 * @property {string} owner GitHub user/organisation used for every resource.
 * @property {OperationHosts} hosts Enabled operation hostnames, without schemes.
 */

/**
 * Public GitHub user or organisation. Existence is not checked at startup.
 * @type {string}
 */
const OWNER = "chewygumxx";

/**
 * Base hostname used by empty subdomains and as the suffix for named ones.
 * This value is trusted configuration, not a parsed URL or validated DNS name.
 * @type {string}
 */
const DOMAIN = "gh.cgxx.dev";

/**
 * Operation-to-subdomain mapping. An empty string selects DOMAIN; null or
 * undefined omits the operation. Nonempty strings are prefixed to DOMAIN.
 * Duplicate values and hostname syntax are not currently validated.
 * Release and API operations are deferred and are not part of Operation.
 * @type {Partial<Record<Operation, string | null | undefined>>}
 */
const SUBDOMAIN = {
    web: "",
    raw: "raw",

    // TODO: [LOW] These are a future development
    //release: "dl",
    //api: "api",
};

/**
 * Derives the shared configuration from the module's static constants.
 * Does not validate GitHub account existence, subdomain syntax, or uniqueness.
 * @returns {RouterConfig} Owner and enabled operation hostnames.
 */
function buildConfig() {
    // TODO: Validate OWNER is a GitHub user or organisation that resolves
    // TODO: Validate SUBDOMAIN keys and values
    const hosts = Object.fromEntries(
        Object.entries(SUBDOMAIN)
            .filter(([, subdomain]) => subdomain != null)
            .map(([scope, subdomain]) => [
                scope,
                subdomain ? `${subdomain}.${DOMAIN}` : DOMAIN,
            ]),
    );

    return { owner: OWNER, hosts };
}

/**
 * Configuration snapshot used by the Worker and GitHub URL builder.
 * Treat it as read-only; edit constants and redeploy to change configuration.
 * @type {RouterConfig}
 */
export const config = buildConfig();
