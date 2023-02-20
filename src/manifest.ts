import pkg from "../package.json";

const manifest: Partial<chrome.runtime.ManifestV3> = {
    content_scripts: [
        {
            js: ["src/entries/contentScript/primary/main.ts"],
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
    options_ui: {
        page: "src/entries/options/index.html",
        open_in_tab: true,
    },
    permissions: [
        "alarms", "storage"
    ],
    action: {
        default_icon: {
            16: "icons/16.png",
            19: "icons/19.png",
            32: "icons/32.png",
            38: "icons/38.png",
        },
        default_popup: "src/entries/popup/index.html",
        default_title: "Manage Cantrill Courses",
    },
    web_accessible_resources: [{
        resources: ["images/*", "assets/*"],
        matches: ["*://learn.cantrill.io/*"],
    }],
    background: {
        service_worker: "src/entries/background/serviceWorker.ts",
    },
    host_permissions: ["*://*/*"],
};

export function getManifest(): chrome.runtime.ManifestV3 {
    return {
        manifest_version: 3,
        author: pkg.author,
        description: pkg.description,
        name: pkg.displayName ?? pkg.name,
        version: pkg.version,
        ...manifest,
    };
}