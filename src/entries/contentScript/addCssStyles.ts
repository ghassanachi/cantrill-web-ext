import browser from "webextension-polyfill";

export default async function addCssStyles(
    cssPaths: string[],
) {
    cssPaths.forEach((cssPath: string) => {
        const styleEl = document.createElement("link");
        styleEl.setAttribute("rel", "stylesheet");
        styleEl.setAttribute("href", browser.runtime.getURL(cssPath));
        document.head.appendChild(styleEl);
    });
}
