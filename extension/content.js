(function main() {
  const domain = location.hostname.replace(/^www\./, "");
  if (!verigateMatchesAiDomain(domain)) return;

  chrome.runtime.sendMessage(
    { type: "VERIGATE_SHADOW_AI_DETECTED", domain, url: location.href },
    () => void chrome.runtime.lastError // no receiver yet on a fresh install — safe to ignore
  );

  blockPage();

  function blockPage() {
    const render = () => {
      if (document.getElementById("verigate-block-overlay")) return;
      document.documentElement.appendChild(buildOverlay());
      if (document.documentElement) document.documentElement.style.overflow = "hidden";
    };

    render();

    // SPAs (ChatGPT, Gemini, etc.) re-render their own tree after our
    // document_start injection runs — watch for our overlay getting
    // knocked out and put it straight back rather than losing the block.
    new MutationObserver(render).observe(document.documentElement, { childList: true });
  }

  function buildOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "verigate-block-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483647",
      background: "#111318",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "32px",
      font: "15px/1.6 -apple-system, Segoe UI, Roboto, sans-serif",
    });

    const heading = document.createElement("h1");
    heading.textContent = "🚫 Blocked by VeriGate policy";
    Object.assign(heading.style, { fontSize: "22px", margin: "0 0 12px" });

    const body = document.createElement("p");
    body.textContent =
      `${domain} is not a governed AI tool. Company policy requires AI usage to go through VeriGate ` +
      "so prompts can be checked for sensitive data before they reach the model. This visit has been reported.";
    Object.assign(body.style, { maxWidth: "480px", margin: "0 0 24px", color: "#c9ccd3" });

    const link = document.createElement("a");
    link.href = VERIGATE_APP_URL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open VeriGate →";
    Object.assign(link.style, {
      background: "#7a1f1f",
      color: "#fff",
      padding: "10px 20px",
      borderRadius: "6px",
      textDecoration: "none",
      fontWeight: "600",
    });

    overlay.append(heading, body, link);
    return overlay;
  }
})();
