# VeriGate Shadow AI Monitor (browser extension)

Blocks the page when an employee visits an AI tool directly (chatgpt.com,
gemini.google.com, claude.ai, etc.) instead of going through VeriGate, and
reports the attempt to VeriGate as a `SHADOW_AI_DETECTED` risk alert so admins
get visibility into usage that would otherwise bypass the whole prompt pipeline.

## How it works

- `content.js` runs on the AI tool domains listed in `constants.js` and covers
  the page with a full-viewport block overlay (a `MutationObserver` re-applies
  it if the site's own SPA re-render knocks it out), then messages the
  background worker.
- `background.js` reports the attempt to `POST /api/v1/risk-alerts/shadow-ai`
  using the JWT stored by the popup, at most once per domain per hour.
- `popup.html`/`popup.js` is a small login form that calls the existing
  `/api/v1/auth/login` endpoint and stores the returned token in
  `chrome.storage.local` — nothing is read from the VeriGate web app's session.

Backend additions this depends on (already added):
- `ShadowAiDetectionCreate` schema — `backend/app/schemas/risk_alert.py`
- `risk_alert_service.report_shadow_ai` — `backend/app/services/risk_alert_service.py`
- `POST /api/v1/risk-alerts/shadow-ai` — `backend/app/api/v1/endpoints/risk_alerts.py`

## Load it (Chrome / Edge)

1. Run the VeriGate backend locally (`uvicorn app.main:app --reload --port 8001`
   from `backend/`) — the extension points at `http://localhost:8001` by default
   (see `VERIGATE_API_BASE` in `constants.js` and `API_BASE` in `popup.js`).
2. Go to `chrome://extensions`, enable **Developer mode** (top right).
3. Click **Load unpacked**, select the `extension/` folder.
4. Click the extension icon in the toolbar, sign in with a VeriGate account.
5. Visit any listed AI tool site — the page should be replaced with the block
   screen, and an admin/governance account should see a new item in Risk
   Alert Center (and a "Shadow AI usage blocked" notification).

## Pointing at a deployed backend

Change `VERIGATE_API_BASE` in `constants.js` and `API_BASE` in `popup.js` to
the deployed API URL, and add that origin to `host_permissions` in
`manifest.json`.

## Adding more AI tool domains

Edit `VERIGATE_AI_DOMAINS` in `constants.js`, and add matching entries to
`host_permissions` and the `content_scripts.matches` array in `manifest.json`
(both the bare domain and the `*.domain` wildcard).

## Known limitations

- **This is a client-side block, not real DLP.** It stops casual use in the
  same browser profile, but an employee with DevTools access, a different
  browser/profile, incognito (if the extension isn't allowed there), or the
  ability to disable the extension can get around it. Real enforcement needs
  a managed/locked-down browser (Chrome Enterprise policy pinning the
  extension, disabling dev mode and other browsers) or network-level
  controls — this prototype demonstrates the detection/reporting pipeline,
  not tamper-proof enforcement.
- Reporting requires the employee to have signed into the extension popup at
  least once; there's no enterprise-managed auto-login yet.
- Detection is domain-based, not content-based — it can't tell whether an
  employee actually pasted sensitive data, only that they visited the site.
- No enterprise deployment/policy config (e.g. Chrome force-install via
  `ExtensionInstallForcelist`) is set up yet — this is a working prototype for
  local dev/demo, loaded unpacked.
