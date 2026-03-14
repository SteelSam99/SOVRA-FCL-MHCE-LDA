/* ============================================================
   Sovra‑FCL‑MHCE©|LDA — F.I.D.A.R.C.H.© Server-Side Fetch Relay
   Vercel Serverless Function: /api/fetch-source.js

   Purpose:
     - Bypass browser CORS restrictions via server-to-server fetch
     - Feed Tier 1 legal document extraction pipeline
     - Feed Alabama C2 baseline auto-query
     - NFIE© compliant — no content modification, no suppression

   Constraints:
     - Public URLs only (http/https)
     - Hard byte cap: 1.2MB
     - Timeout: 8 seconds
     - Text content only
     - No authentication, no cookies forwarded

   Legal data sources this relay serves:
     - CourtListener (public case law)
     - Justia (public case summaries)
     - Google Scholar Legal (public)
     - PACER public records
     - Alabama Public Sentencing Records
     - Legal news and public case journalism

   Author: Samuel Paul Peacock | SOVRA-FCL-MHCE-v2.5©
   NFIE© Compliant | DS4-KES-109©
   ============================================================ */

export default async function handler(req, res) {

  // CORS headers — allows LDA client to call this relay
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const { url } = req.query;

  // Validate URL
  if (!url) {
    return res.status(400).json({ ok: false, error: "MISSING_URL" });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (_) {
    return res.status(400).json({ ok: false, error: "INVALID_URL" });
  }

  // Public URLs only — no localhost, no private ranges
  const hostname = parsedUrl.hostname;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.16.") ||
    (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:")
  ) {
    return res.status(403).json({ ok: false, error: "NON_PUBLIC_URL" });
  }

  // Legal source allowlist — restricts relay to court-recognized
  // and public legal data sources only. NFIE architectural constraint.
  // Add sources as Tier 1 coverage expands.
  const LEGAL_SOURCES = new Set([
    "www.courtlistener.com",
    "courtlistener.com",
    "law.justia.com",
    "justia.com",
    "scholar.google.com",
    "pacer.gov",
    "ecf.pacer.gov",
    "www.pacer.gov",
    "law.cornell.edu",
    "www.law.cornell.edu",
    "alacourt.gov",
    "www.alacourt.gov",
    "alabamasentencingcommission.com",
    "www.alabamasentencingcommission.com",
    "apps.alacourt.gov",
    "publicportal.alappeals.gov",
    "caselaw.findlaw.com",
    "www.oyez.org",
    "oyez.org",
    "supremecourt.gov",
    "www.supremecourt.gov",
    "congress.gov",
    "www.congress.gov",
    "legislature.alabama.gov"
  ]);

  // For Alabama auto-query — allow CourtListener search URLs
  const isAllowedSource = LEGAL_SOURCES.has(hostname) ||
    hostname.endsWith(".gov") ||
    hostname.endsWith(".edu") ||
    hostname.endsWith("courtlistener.com") ||
    hostname.endsWith("justia.com");

  if (!isAllowedSource) {
    // For Tier 1 link drop — attorneys may paste news articles
    // Allow general public URLs but flag them as non-authoritative
    // This is permissive by design for T1-ANALYTICAL grade
    // Evidentiary grade requires Tier 2 authenticated sources
    const isNews = hostname.endsWith(".com") || hostname.endsWith(".org") ||
                   hostname.endsWith(".net") || hostname.endsWith(".io");
    if (!isNews) {
      return res.status(403).json({ ok: false, error: "SOURCE_NOT_PERMITTED" });
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Sovra-FCL-LDA/1.0 (F.I.D.A.R.C.H. LegalTextFetcher; NFIE-Compliant; +https://steelsam99.github.io/SOVRA-FCL-MHCE-LDA/)",
        "Accept": "text/html,text/plain,application/xhtml+xml",
        // No cookies, no auth headers — read-only public access only
      },
      redirect: "follow"
    });

    if (!response.ok) {
      return res.status(200).json({
        ok: false,
        error: "HTTP_" + response.status,
        host: hostname
      });
    }

    // Text content only
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") &&
        !contentType.includes("text/plain") &&
        !contentType.includes("application/xhtml")) {
      return res.status(200).json({
        ok: false,
        error: "NON_TEXT_CONTENT",
        host: hostname,
        contentType
      });
    }

    // Stream with byte cap
    const reader = response.body.getReader();
    let received = 0;
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > 1_200_000) {
        return res.status(200).json({ ok: false, error: "CONTENT_TOO_LARGE", host: hostname });
      }
      chunks.push(value);
    }

    const html = new TextDecoder("utf-8").decode(
      new Uint8Array(chunks.flatMap(c => Array.from(c)))
    );

    // Paywall / login detection
    const lower = html.toLowerCase();
    if (
      lower.includes("sign in to continue") ||
      lower.includes("paywall") ||
      lower.includes("metered") ||
      lower.includes("login required") ||
      lower.includes("subscribers only") ||
      lower.includes("create a free account") ||
      lower.includes("register to continue")
    ) {
      return res.status(200).json({
        ok: false,
        error: "PAYWALL_OR_LOGIN_DETECTED",
        host: hostname
      });
    }

    // Return raw HTML — extraction pipeline runs client-side
    // This relay fetches only. It does not analyze, modify, or interpret.
    return res.status(200).json({
      ok: true,
      html,
      host: hostname,
      contentType,
      isLegalSource: LEGAL_SOURCES.has(hostname) || hostname.endsWith(".gov"),
      grade: (LEGAL_SOURCES.has(hostname) || hostname.endsWith(".gov"))
        ? "T1-ANALYTICAL-LEGAL"
        : "T1-ANALYTICAL-GENERAL"
    });

  } catch (e) {
    if (e.name === "AbortError") {
      return res.status(200).json({ ok: false, error: "TIMEOUT", host: hostname });
    }
    return res.status(200).json({ ok: false, error: "FETCH_FAILED", host: hostname });
  } finally {
    clearTimeout(timer);
  }
}
