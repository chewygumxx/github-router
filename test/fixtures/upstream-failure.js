// SPDX-License-Identifier: GPL-3.0-only

import worker from "../../src/index.js";

// The Node-side outbound mock is converted to HTTP 500 by Miniflare when it
// throws. Reject inside workerd instead to exercise the handler's catch path.
globalThis.fetch = async () => {
    throw new TypeError("GitHub fixture unavailable");
};

export default worker;
