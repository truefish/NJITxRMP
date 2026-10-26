# Privacy

NJITxRMP reads visible instructor names on the two supported NJIT pages and sends normalized instructor names as search terms to `www.ratemyprofessors.com`. A manually selected profile is requested from that same site. RMP receives ordinary network information such as your IP address and browser headers; its privacy policy applies to those requests. Fetches omit cookies and referrers. Opening an RMP link uses a regular browser tab and its normal session.

The extension does not intentionally read or transmit student identities, schedules, registration selections, authentication tokens or NJIT cookies. There is no analytics, telemetry, developer server or cloud synchronization. Requests happen automatically when instructor cells appear, unless a fresh cached result is available.

Professor matches, rating summaries, timestamps, manual profile overrides and rate-limit cooldowns are stored in the browser's local extension storage. Records remain locally until overwritten, reset or removed by uninstalling/clearing extension storage; cached records older than 24 hours are refreshed on access, rather than automatically deleted. Storage is subject to the browser's quota. Older builds may have stored an appearance preference; the current light-only interface ignores it.

Permissions: `storage` saves these local records; access to RMP enables background cross-origin requests; the two NJIT URL matches permit reading instructor names and inserting controls. There are no broad browsing, cookies or registration-write permissions. Firefox declares website-content and search-term transmission because instructor names from the NJIT page are sent to RMP.

Only install if you are comfortable with this automatic instructor-name lookup. Disable the extension to stop lookups. Source code is available for inspection. No third-party credentials are required.
