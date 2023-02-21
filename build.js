#!/usr/bin/env node
const { build } = require("esbuild");
const getManifest = require("./manifest.js");
const { promisify } = require('util');
const path = require("path");
const { copy, writeFile } = require("fs-extra");
const copyPromise = promisify(copy);
const writeFilePromise = promisify(writeFile);

const browser = process.argv.includes("firefox") ? "firefox" : "chrome";

/** @param error {string} */
function buildError(error) {
    console.error(error);
    process.exit(1);

}

/** @type {import("esbuild").Plugin} */
const manifestPlugin = {
    name: 'generate-manifest',
    setup(build) {
        const outDir = build.initialOptions.outdir
        build.onEnd(async () => {
            try {
                const manifest = getManifest(browser);
                await writeFilePromise(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
            } catch (e) {
                buildError(`Failed to generate manifest: ${e}`);
            }

        })
    },
}

/** @type {import("esbuild").Plugin} */
const staticPlugin = {
    name: 'static-files-manifest',
    setup(build) {
        const outDir = build.initialOptions.outdir
        const publicDir = "./public";
        build.onEnd(async () => {
            try {
                await copyPromise(publicDir, outDir);
            } catch (e) {
                buildError(`Failed to copy static files to ${outDir}: ${e}`);
            }
        });
    },
}

/** @type {import("esbuild").BuildOptions} */
const config = {
    outdir: "dist",
    logLevel: "info",
    entryPoints: [{
        in: 'src/content_script/main.ts',
        out: 'content_script'
    }, {
        in: 'src/popup/main.ts',
        out: 'popup',
    }],
    bundle: true,
    plugins: [manifestPlugin, staticPlugin]

};


if (process.argv.includes("--watch")) {
    require("esbuild").context(config)
        .then(ctx => ctx.watch({}))
        .catch((e) => buildError(`Build failed: ${e}`))
} else {
    require("esbuild").build(config).catch((e) => buildError(`Build failed: ${e}`));
}
