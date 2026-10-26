# NJITxRMP

Rate My Professors ratings beside instructor names in NJIT Course Schedule and Plan Ahead.

## Install

**Chrome / Helium:** Extract `NJITxRMP-chrome.zip`, open `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and choose the extracted folder. If building locally, choose `dist/chrome`.

**Firefox:** [Install NJITxRMP from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/njitxrmp/).

## Use

Open or refresh NJIT Course Schedule or Plan Ahead. Click an **RMP rating** beneath an instructor to expand the details. Click again or press **Escape** to collapse.

- **Wrong professor?** lets you paste the correct NJIT RMP profile URL.
- **Refresh** updates the ratings.
- **Options → Reset saved match** restores automatic matching.

After an update, reload the extension and refresh your NJIT tabs.

## Build

With Node.js 22 or newer:

```sh
npm ci
npm run check
npm run package
```

Browser folders are in `dist`; ZIPs are in `releases`. Development builds are unversioned; the first GitHub release is reserved as **v1.0.0**.

Based on [RMPExtension](https://github.com/Vineetsridhar/RMPExtension). Apache-2.0; see LICENSE and NOTICE. [Privacy](PRIVACY.md).

