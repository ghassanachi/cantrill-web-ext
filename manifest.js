const pkg = require("./package.json");

/** @satisfies {import("chome").runtime.ManifestV3} */
const sharedManifest = {
    content_scripts: [
        {
            js: ["content_script.js"],
            matches: ["*://learn.cantrill.io/*"],
            run_at: "document_end",
        },
    ],
    icons: {
        16: "icons/16.png",
        19: "icons/19.png",
        32: "icons/32.png",
        38: "icons/38.png",
        48: "icons/48.png",
        64: "icons/64.png",
        96: "icons/96.png",
        128: "icons/128.png",
        256: "icons/256.png",
        512: "icons/512.png",
    },
    permissions: [
        "storage"
    ],
    action: {
        default_icon: {
            16: "icons/16.png",
            19: "icons/19.png",
            32: "icons/32.png",
            38: "icons/38.png",
        },
        default_popup: "popup.html",
        default_title: "Manage Cantrill Courses",
    },
    web_accessible_resources: [{
        resources: ["images/*", "css/*"],
        matches: ["*://learn.cantrill.io/*"],
    }],
    host_permissions: [
        "https://cantrill-json.ghassanachi.com/courses.json"
    ],
};

/**
* @param {("chrome" | "firefox" | "safari")} browser 
* @return import("chrome").runtime.ManifestV3
*/
function getManifest(browser) {
    const manifest = {
        manifest_version: 3,
        author: pkg.author,
        description: pkg.description,
        name: pkg.displayName ?? pkg.name,
        version: pkg.version,
        ...sharedManifest,
    };
    if (browser === "firefox") {
        return {
            ...manifest,
            browser_specific_settings: {
                gecko: {
                    id: "{943a4777-3bc6-4c05-8030-d686a4f063b3}",
                }
            }
        }
    }
    return manifest
}

module.exports = getManifest;
