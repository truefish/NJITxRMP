# NJITxRMP

Rate My Professors ratings beside instructor names in NJIT Course Schedule and Plan Ahead.

## Install

[Download the latest release](https://github.com/truefish/NJITxRMP/releases/latest).

### Firefox

[Install NJITxRMP from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/njitxrmp/).

For temporary installation from the ZIP:
1. Download **NJITxRMP-firefox.zip** from [GitHub Releases](https://github.com/truefish/NJITxRMP/releases). 
2. Extract the ZIP to a folder you'll keep
3. Open `about:debugging#/runtime/this-firefox`.
4. Select **Load Temporary Add-on**.
5. Open the folder you extracted the contents of the zip file to, and select `manifest.json`.

This lasts until Firefox exits.

### Chrome

[Install NJITxRMP from the Chrome Web Store](https://chromewebstore.google.com/detail/njitxrmp/iobppldfaemjlfgmkamaoekppgcnplpe).

For temporary installation from the ZIP:
1. Download **NJITxRMP-chrome.zip** from [GitHub Releases](https://github.com/truefish/NJITxRMP/releases).
2. Extract the ZIP to a folder you will keep.
3. Open `chrome://extensions` and enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder containing `manifest.json`.
5. Open or refresh your NJIT page.

## Use

Open [NJIT Course Schedule](https://generalssb-prod.ec.njit.edu/BannerExtensibility/customPage/page/stuRegCrseSched) or [Plan Ahead](https://reg-prod.ec.njit.edu/StudentRegistrationSsb/ssb/plan/plan). Click an **RMP rating** beneath an instructor to expand the details. Click again or press **Escape** to collapse.

- **Wrong professor?** lets you paste the correct NJIT RMP profile URL.
- **Refresh** updates the ratings.
- **Options → Reset saved match** restores automatic matching.

## Update

**Firefox:** Updates come through Firefox Add-ons.

**Chrome:** Replace the files in your existing extension folder with the latest Chrome package, click **Reload** on `chrome://extensions`, then refresh your NJIT tabs.

## Build

With Node.js 22 or newer:

```sh
npm ci
npm run check
npm run package
```

To load a local build, select `dist/chrome` in Chrome. For temporary Firefox testing, open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select `dist/firefox/manifest.json`.

Packages are created separately in `releases`:

- **NJITxRMP-chrome.zip** — Chrome extension only.
- **NJITxRMP-firefox.zip** — Firefox extension only; permanent installation requires Mozilla signing.
- **NJITxRMP-source.zip** — source code for development and Mozilla review, not an installable extension.

Based on [RMPExtension](https://github.com/Vineetsridhar/RMPExtension). Apache-2.0; see LICENSE and NOTICE. [Privacy](PRIVACY.md).
