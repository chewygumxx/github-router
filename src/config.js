// vim:set expandtab shiftwidth=4 filetype=javascript:
// SPDX-License-Identifier: GPL-3.0-only

//
//
// ~chewygumxx/github-router.git
// ::: :/src/config.js
//
//

// Name of public GitHub user or organisation
const OWNER = "chewygumxx";

// Base domain to build subdomains upon
const DOMAIN = "gh.cgxx.dev";

// Sub domains of the above domain
//
// permitted non-duplicate values:
// - Regular string
// - Empty string
//   - Scope dedicated to the base domain
// - Null or Undefined
//   - Disable scope
const SUBDOMAIN = {
    web: "",
    raw: "raw",

    // TODO: [LOW] These are a future development
    //release: "dl",
    //api: "api",
};

// Validates, builds and returns configuration object
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

export const config = buildConfig();
