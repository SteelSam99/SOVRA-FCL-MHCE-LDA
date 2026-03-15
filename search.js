
// ============================================================
// Sovra‑FCL‑MHCE©|LDA — Legal Case Search Endpoint
// Vercel Serverless Function: /api/search.js
// NFIE© Compliant | DS4-KES-109©
// Author: Samuel Paul Peacock | SOVRA-FCL-MHCE-v2.5©
// ============================================================
//
// This endpoint serves two purposes:
//
// 1. ALABAMA BASELINE QUERY — when ?type=alabama is passed,
//    fetches Alabama public sentencing records via CourtListener
//    for C2 race-stratified asymmetry calculation.
//
// 2. LEGAL SOURCE QUERY — when ?type=legal&q=... is passed,
//    searches CourtListener and Justia for public case records
//    matching the query, for Tier 1 field population.
//
// The SerpAPI / Google search pipeline from the Terminal is
// NOT used here. The LDA queries legal databases only.
// Data source integrity is architectural, not advisory.
// ============================================================

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const query = String(req.query.q || "").trim();
  const type  = String(req.query.type || "legal").toLowerCase();
  const charge = String(req.query.charge || "").trim();

  if (!query && type !== "alabama") {
    return res.status(400).json({ ok: false, error: "MISSING_QUERY" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  /* ----------------------------------------------------------
     ALABAMA BASELINE QUERY
     Fetches Alabama criminal sentencing cases from CourtListener.
     Used by AlabamaBaseline module for live C2 calculation.
     Returns: array of case snippets with sentence data.
  ---------------------------------------------------------- */
  if (type === "alabama") {
    try {
      const chargeParam = charge
        ? encodeURIComponent(charge + " sentencing Alabama race")
        : encodeURIComponent("sentencing disparity race Alabama criminal");

      const alUrl =
        `https://www.courtlistener.com/api/rest/v3/search/?` +
        `q=${chargeParam}` +
        `&type=o` +
        `&court=ala+alacrimapp` +
        `&order_by=score+desc` +
        `&format=json`;

      const response = await fetch(alUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Sovra-FCL-LDA/1.0 (NFIE-Compliant Legal Research Tool)",
          "Accept": "application/json"
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return res.status(200).json({
          ok: false,
          error: "COURTLISTENER_HTTP_" + response.status,
          type: "alabama",
          fallback: "documented_aggregate"
        });
      }

      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];

      // Extract sentence-relevant fields only
      // No full text returned — snippet level for baseline calculation
      const cases = results.slice(0, 20).map(r => ({
        case_name: r.caseName || r.case_name || "",
        court: r.court || "Alabama",
        date_filed: r.dateFiled || r.date_filed || "",
        snippet: r.snippet || "",
        citation: r.citation || "",
        absolute_url: r.absolute_url
          ? "https://www.courtlistener.com" + r.absolute_url
          : null
      }));

      return res.status(200).json({
        ok: true,
        type: "alabama",
        charge: charge || "general",
        count: cases.length,
        cases,
        source: "CourtListener — Alabama Criminal",
        grade: "T1-ANALYTICAL-LEGAL",
        nfie: "Nothing in this data persuades. Nothing asserts meaning. It places structure and lets cognition decide."
      });

    } catch (e) {
      clearTimeout(timeout);
      if (e.name === "AbortError") {
        return res.status(200).json({
          ok: false, error: "TIMEOUT", type: "alabama",
          fallback: "documented_aggregate"
        });
      }
      return res.status(200).json({
        ok: false, error: "FETCH_FAILED: " + e.message,
        type: "alabama", fallback: "documented_aggregate"
      });
    }
  }

  /* ----------------------------------------------------------
     LEGAL SOURCE QUERY
     Searches CourtListener for cases matching the query.
     Used by Tier 1 to find public case records for extraction.
     Returns: array of case links + snippets for PTF pipeline.
  ---------------------------------------------------------- */
  if (type === "legal") {
    try {
      const searchUrl =
        `https://www.courtlistener.com/api/rest/v3/search/?` +
        `q=${encodeURIComponent(query)}` +
        `&type=o` +
        `&order_by=score+desc` +
        `&format=json`;

      const response = await fetch(searchUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Sovra‑FCL‑MHCE©|LDA/1.0 (NFIE©-Compliant Legal Research Tool)",
          "Accept": "application/json"
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return res.status(200).json({
          ok: false,
          error: "COURTLISTENER_HTTP_" + response.status,
          type: "legal"
        });
      }

      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];

      const cases = results.slice(0, 10).map(r => ({
        title: r.caseName || r.case_name || "",
        link: r.absolute_url
          ? "https://www.courtlistener.com" + r.absolute_url
          : null,
        snippet: r.snippet || "",
        court: r.court || "",
        date: r.dateFiled || r.date_filed || "",
        citation: r.citation || ""
      })).filter(r => r.link);

      return res.status(200).json({
        ok: true,
        type: "legal",
        query,
        count: cases.length,
        organic_results: cases,
        source: "CourtListener",
        grade: "T1-ANALYTICAL-LEGAL",
        nfie: "Nothing in this data persuades. Nothing asserts meaning. It places structure and lets cognition decide."
      });

    } catch (e) {
      clearTimeout(timeout);
      if (e.name === "AbortError") {
        return res.status(200).json({ ok: false, error: "TIMEOUT", type: "legal" });
      }
      return res.status(200).json({
        ok: false, error: "FETCH_FAILED: " + e.message, type: "legal"
      });
    }
  }

  // Unknown type
  return res.status(400).json({ ok: false, error: "UNKNOWN_TYPE: " + type });
}
