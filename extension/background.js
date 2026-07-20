importScripts("constants.js");

// Avoid hammering the backend (and spamming admin notifications) every time
// a tab reloads or a SPA re-renders — one report per domain per hour is
// plenty to establish that shadow usage is happening.
const REPORT_COOLDOWN_MS = 60 * 60 * 1000;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "VERIGATE_SHADOW_AI_DETECTED") return undefined;
  reportDetection(message.domain, message.url).then(sendResponse);
  return true; // keep the message channel open for the async response
});

async function reportDetection(domain, pageUrl) {
  const { verigateToken, lastReported = {} } = await chrome.storage.local.get([
    "verigateToken",
    "lastReported",
  ]);

  if (!verigateToken) {
    return { ok: false, reason: "not_logged_in" };
  }

  const last = lastReported[domain] ?? 0;
  if (Date.now() - last < REPORT_COOLDOWN_MS) {
    return { ok: true, reason: "cooldown" };
  }

  try {
    const response = await fetch(`${VERIGATE_API_BASE}/risk-alerts/shadow-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${verigateToken}`,
      },
      body: JSON.stringify({ domain, pageUrl }),
    });

    if (response.status === 401) {
      await chrome.storage.local.remove("verigateToken");
      return { ok: false, reason: "unauthorized" };
    }

    if (!response.ok) {
      return { ok: false, reason: `http_${response.status}` };
    }

    await chrome.storage.local.set({ lastReported: { ...lastReported, [domain]: Date.now() } });
    return { ok: true };
  } catch (_error) {
    return { ok: false, reason: "network_error" };
  }
}
