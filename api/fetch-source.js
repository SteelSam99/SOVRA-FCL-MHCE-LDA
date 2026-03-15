/* ============================================================
   Sovra‑FCL‑MHCE©|LDA — F.I.D.A.R.C.H.© Server-Side Fetch Relay
   Vercel Serverless Function: /api/fetch-source.js
   Version: 1.1 — CourtListener API routing added
   Author: Samuel Paul Peacock | SOVRA-FCL-MHCE-v2.5©
   NFIE© Compliant | DS4-KES-109
   ============================================================ */

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const { url } = req.query;
  if (!url) return res.status(400).json({ ok: false, error: "MISSING_URL" });

  let parsedUrl;
  try { parsedUrl = new URL(url); } catch (_) {
    return res.status(400).json({ ok: false, error: "INVALID_URL" });
  }

  const hostname = parsedUrl.hostname;

  if (
    hostname === "localhost" || hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") || hostname.startsWith("10.") ||
    hostname.startsWith("172.16.") ||
    (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:")
  ) {
    return res.status(403).json({ ok: false, error: "NON_PUBLIC_URL" });
  }

  /* ----------------------------------------------------------
     COURTLISTENER API ROUTING
     Routes opinion URLs through CourtListener REST API v3
     which is designed for programmatic access — no bot blocking.
  ---------------------------------------------------------- */
  if (hostname === "www.courtlistener.com" || hostname === "courtlistener.com") {
    const opinionMatch = parsedUrl.pathname.match(/\/opinion\/(\d+)\//);

    if (opinionMatch) {
      const opinionId = opinionMatch[1];
      const apiUrl = `https://www.courtlistener.com/api/rest/v3/opinions/${opinionId}/?format=json`;

      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const response = await fetch(apiUrl, {
          signal: ctrl.signal,
          headers: {
            "User-Agent": "Sovra-FCL-LDA/1.0 (NFIE-Compliant Legal Research Tool)",
            "Accept": "application/json"
          }
        });
        clearTimeout(t);

        if (!response.ok) {
          return res.status(200).json({ ok: false, error: "CL_API_HTTP_" + response.status, host: hostname });
        }

        const data = await response.json();
        const text = [data.plain_text, data.html_with_citations, data.html, data.xml_harvard]
          .find(t => t && t.length > 0) || "";
        const readable = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

        const html = `<html><body>
          <h1>${data.case_name || ""}</h1>
          <p>Date: ${data.cluster?.date_filed || ""}</p>
          <div>${readable}</div>
        </body></html>`;

        return res.status(200).json({
          ok: true, html, host: hostname,
          contentType: "text/html",
          isLegalSource: true,
          grade: "T1-ANALYTICAL-LEGAL",
          source: "CourtListener API v3"
        });

      } catch (e) {
        if (e.name === "AbortError") return res.status(200).json({ ok: false, error: "TIMEOUT", host: hostname });
        return res.status(200).json({ ok: false, error: "FETCH_FAILED: " + e.message, host: hostname });
      }
    }
  }

  /* ----------------------------------------------------------
     GENERAL PUBLIC URL FETCH
     Buffered (not streaming) for Vercel serverless compatibility.
  ---------------------------------------------------------- */
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Sovra-FCL-LDA/1.0 (NFIE-Compliant Legal Research Tool)",
        "Accept": "text/html,text/plain,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9"
      },
      redirect: "follow"
    });

    clearTimeout(t);

    if (!response.ok) {
      return res.status(200).json({ ok: false, error: "HTTP_" + response.status, host: hostname });
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain") && !contentType.includes("application/xhtml")) {
      return res.status(200).json({ ok: false, error: "NON_TEXT_CONTENT", host: hostname });
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > 1_200_000) {
      return res.status(200).json({ ok: false, error: "CONTENT_TOO_LARGE", host: hostname });
    }

    const html = new TextDecoder("utf-8").decode(buffer);
    const lower = html.toLowerCase();

    if (
      lower.includes("sign in to continue") || lower.includes("paywall") ||
      lower.includes("login required") || lower.includes("subscribers only") ||
      lower.includes("create a free account") || lower.includes("register to continue")
    ) {
      return res.status(200).json({ ok: false, error: "PAYWALL_OR_LOGIN_DETECTED", host: hostname });
    }

    const isLegalSource = hostname.endsWith(".gov") || hostname.endsWith(".edu") ||
      hostname.endsWith("courtlistener.com") || hostname.endsWith("justia.com");

    return res.status(200).json({
      ok: true, html, host: hostname, contentType, isLegalSource,
      grade: isLegalSource ? "T1-ANALYTICAL-LEGAL" : "T1-ANALYTICAL-GENERAL"
    });

  } catch (e) {
    clearTimeout(t);
    if (e.name === "AbortError") return res.status(200).json({ ok: false, error: "TIMEOUT", host: hostname });
    return res.status(200).json({ ok: false, error: "FETCH_FAILED: " + e.message, host: hostname });
  }
}
