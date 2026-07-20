// Shared between background.js (loaded via importScripts) and content.js
// (loaded as a classic content script) — plain `const`, no import/export,
// so the same file works unmodified in both non-module contexts.

const VERIGATE_API_BASE = "http://localhost:8001/api/v1";
const VERIGATE_APP_URL = "http://localhost:5173";

// Hostnames (and their subdomains) treated as "shadow AI" — governed AI
// tools go through VeriGate itself, so a direct visit here means data may
// be leaving the org outside the audit/detection pipeline entirely.
const VERIGATE_AI_DOMAINS = [
  "chatgpt.com",
  "chat.openai.com",
  "gemini.google.com",
  "bard.google.com",
  "claude.ai",
  "perplexity.ai",
  "copilot.microsoft.com",
  "poe.com",
  "character.ai",
  "huggingface.co",
];

function verigateMatchesAiDomain(hostname) {
  const host = hostname.replace(/^www\./, "");
  return VERIGATE_AI_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}
