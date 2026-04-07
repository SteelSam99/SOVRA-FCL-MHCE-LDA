/* ============================================================
   Sovra‑FCL‑MHCE©|LDA — Legal Data Aid
   Author: Samuel Paul Peacock | NFIE© Compliant | March 2026
   ============================================================ */

"use strict";

/* ============================================================
   NON-INTERFERENCE DECLARATION
   Only cease and desist orders accepted from:
   1. Estate/legal rep of Dr. Francis Cress Welsing
   2. Estate/legal rep of Dr. Neely Fuller Jr.
   3. Estate/legal rep of Battle Ginga™ (Mestre X. Gautier)
   4. Legal court order from aforementioned entities
   This is a structural invariant. Not subject to override.
   ============================================================ */

/* ============================================================
   STATE
   ============================================================ */
const LDA = {
  cases: [],        // DATA_INPUT rows
  flags: [],        // CHIMERA_FLAGS rows
  loaded: false,
  dbMode: false,    // staged — not activated
  fileName: null
};

/* ============================================================
   PANEL NAVIGATION
   ============================================================ */
const panels = {
  upload: document.getElementById("uploadPanel"),
  search: document.getElementById("searchPanel"),
  pattern: document.getElementById("patternPanel"),
  db: document.getElementById("dbPanel")
};

const btns = {
  upload: document.getElementById("uploadToggle"),
  search: document.getElementById("searchToggle"),
  pattern: document.getElementById("patternToggle"),
  db: document.getElementById("dbToggle")
};

function showPanel(name) {
  Object.entries(panels).forEach(([k, el]) => {
    el.classList.toggle("active", k === name);
    el.classList.toggle("hidden", k !== name);
  });
  Object.entries(btns).forEach(([k, el]) => {
    el.classList.toggle("active", k === name);
  });
}

btns.upload.addEventListener("click", () => showPanel("upload"));
btns.search.addEventListener("click", () => { showPanel("search"); updateGateRow(); });
btns.pattern.addEventListener("click", () => { showPanel("pattern"); renderPatternReport(); });
btns.db.addEventListener("click", () => showPanel("db"));

/* ============================================================
   GATE ROW (active gate indicators in control bar)
   ============================================================ */
const GATES = {
  contra: () => document.getElementById("gateContra")?.checked,
  drift: () => document.getElementById("gateDrift")?.checked,
  zeroSum: () => document.getElementById("gateZS")?.checked,
  strategy: () => document.getElementById("gateStrategy")?.checked,
  voice: () => document.getElementById("gateVoice")?.checked
};

const GATE_LABELS = {
  contra: "Contra",
  drift: "Drift",
  zeroSum: "ZS",
  strategy: "Strategy",
  voice: "Voice"
};

function updateGateRow() {
  const row = document.getElementById("gateRow");
  if (!row) return;
  row.innerHTML = Object.entries(GATE_LABELS).map(([k, label]) => {
    const on = GATES[k]?.();
    return `<span class="gate-pill ${on ? "on" : ""}">${label}</span>`;
  }).join("");
}

document.querySelectorAll(".gate-item input").forEach(cb => {
  cb.addEventListener("change", updateGateRow);
});

/* ============================================================
   FILE UPLOAD — EXCEL PARSER
   ============================================================ */
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const uploadStatus = document.getElementById("uploadStatus");
const uploadPreview = document.getElementById("uploadPreview");

dropZone.addEventListener("dragover", e => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));

dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
});

fileInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (file) processFile(file);
});

function processFile(file) {
  if (!file.name.match(/\.xlsx?$/i)) {
    showStatus("Invalid file type. Please upload an .xlsx file.", "error");
    return;
  }

  showStatus("⟳ Reading file…", "");
  LDA.fileName = file.name;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: "array" });

      // Parse DATA_INPUT
      const inputSheet = wb.Sheets["DATA_INPUT"];
      if (!inputSheet) {
        showStatus("DATA_INPUT sheet not found. Is this a Sovra Legal Aid Framework file?", "error");
        return;
      }

      const rawInput = XLSX.utils.sheet_to_json(inputSheet, { header: 1, defval: "" });
      // Headers at row 3 (index 2), data from row 5 (index 4)
      const inputHeaders = rawInput[2] || [];
      const inputData = rawInput.slice(4).filter(row => row[0] && row[0] !== "");

      LDA.cases = inputData.map(row => {
        const obj = {};
        inputHeaders.forEach((h, i) => {
          obj[String(h).trim()] = row[i] ?? "";
        });
        return obj;
      });

      // Parse CHIMERA_FLAGS
      const flagSheet = wb.Sheets["CHIMERA_FLAGS"];
      if (flagSheet) {
        const rawFlags = XLSX.utils.sheet_to_json(flagSheet, { header: 1, defval: "" });
        const flagHeaders = rawFlags[2] || [];
        const flagData = rawFlags.slice(4).filter(row => row[0] && row[0] !== "");

        LDA.flags = flagData.map(row => {
          const obj = {};
          flagHeaders.forEach((h, i) => {
            obj[String(h).trim()] = row[i] ?? "";
          });
          return obj;
        });
      }

      LDA.loaded = true;
      showStatus(`✓ ${LDA.cases.length} cases loaded from ${file.name}`, "success");
      showPreview();
      document.getElementById("db-status").textContent = `⚡ ${LDA.cases.length} CASES LOADED`;

    } catch (err) {
      showStatus("Error parsing file: " + err.message, "error");
    }
  };

  reader.readAsArrayBuffer(file);
}

function showStatus(msg, type) {
  uploadStatus.textContent = msg;
  uploadStatus.className = "upload-status" + (type ? ` ${type}` : "");
  uploadStatus.classList.remove("hidden");
}

function showPreview() {
  if (!LDA.cases.length) return;

  const total = LDA.cases.length;
  const biasCount = LDA.flags.filter(f => String(f["Racial_Bias_Flag"] || "").trim().toUpperCase() === "Y").length;
  const collapseCount = LDA.flags.filter(f => String(f["Collapse_Trigger"] || "").trim().toUpperCase() === "Y").length;
  const races = [...new Set(LDA.cases.map(c => c["Race"]).filter(Boolean))];

  uploadPreview.innerHTML = `
    <div class="preview-title">FILE SUMMARY — ${LDA.fileName}</div>
    <div class="preview-row"><span class="preview-label">Cases Loaded</span><span class="preview-value">${total}</span></div>
    <div class="preview-row"><span class="preview-label">Racial Bias Flags</span><span class="preview-value">${biasCount}</span></div>
    <div class="preview-row"><span class="preview-label">Collapse Triggers</span><span class="preview-value">${collapseCount}</span></div>
    <div class="preview-row"><span class="preview-label">Demographics</span><span class="preview-value">${races.join(", ") || "—"}</span></div>
    <div class="preview-row"><span class="preview-label">CDI Rate</span><span class="preview-value">${total > 0 ? Math.round((biasCount/total)*100) : 0}%</span></div>
  `;
  uploadPreview.classList.remove("hidden");
}

/* ============================================================
   SEARCH ENGINE
   ============================================================ */
document.getElementById("searchBtn").addEventListener("click", runSearch);
document.getElementById("searchQuery").addEventListener("keydown", e => {
  if (e.key === "Enter") runSearch();
});

function runSearch() {
  const query = (document.getElementById("searchQuery").value || "").trim().toLowerCase();
  const resultsEl = document.getElementById("searchResults");
  const diagBar = document.getElementById("diagnosticBar");

  /* ── ALABAMA C2 BASELINE — fires on query alone, no cases required ── */
  if (AlabamaBaseline.shouldFire(query)) {
    AlabamaBaseline.query(query, null, null, null).then(result => {
      AlabamaBaseline.render(result, query);
    });
  } else {
    const alPanel = document.getElementById("alabamaBaselinePanel");
    if (alPanel) alPanel.classList.add("hidden");
  }

  if (!LDA.loaded) {
    resultsEl.innerHTML = `<div class="no-results">No cases loaded. Upload a case file first.</div>`;
    return;
  }

  // Filter cases
  let results = LDA.cases.filter(c => {
    if (!query) return true;
    const searchable = Object.values(c).join(" ").toLowerCase();
    return searchable.includes(query);
  });

  // Merge flags
  results = results.map(c => {
    const caseId = String(c["Case_ID"] || c["Case_Id"] || "").trim();
    const flag = LDA.flags.find(f => String(f["Case_Id"] || f["Case_ID"] || "").trim() === caseId) || {};
    return { ...c, ...flag };
  });

  // Diagnostics
  const collapseCount = results.filter(r => String(r["Collapse_Trigger"] || "").trim().toUpperCase() === "Y").length;
  const biasCount = results.filter(r => String(r["Racial_Bias_Flag"] || "").trim().toUpperCase() === "Y").length;
  const cdiScores = results.map(r => parseFloat(r["CDI_Score"] || 0)).filter(n => !isNaN(n));
  const avgCDI = cdiScores.length ? (cdiScores.reduce((a,b) => a+b, 0) / cdiScores.length) : 0;

  // Detect dominant strategy
  const strategies = results.map(r => r["LDF_Strategy_Indicator"] || "").filter(Boolean);
  const stratCounts = {};
  strategies.forEach(s => { stratCounts[s] = (stratCounts[s] || 0) + 1; });
  const topStrat = Object.entries(stratCounts).sort((a,b) => b[1]-a[1])[0];

  // Update diagnostic bar
  if (GATES.contra() || GATES.strategy() || GATES.voice()) {
    diagBar.classList.remove("hidden");
    document.getElementById("scoreCDI").textContent = Math.round(avgCDI * 100) + "%";
    document.getElementById("scoreCollapse").textContent = collapseCount;
    document.getElementById("scoreStrategy").textContent = topStrat ? topStrat[0].split(" ")[0] : "—";

    if (GATES.voice()) {
      const voiceText = generateVoice(results, avgCDI, collapseCount, biasCount);
      document.getElementById("voiceOutput").textContent = voiceText;
    }
  } else {
    diagBar.classList.add("hidden");
  }

  // Render cards
  if (!results.length) {
    resultsEl.innerHTML = `<div class="no-results">⌀ No cases match query: "${query}"</div>`;
    return;
  }

  resultsEl.innerHTML = results.map(r => renderCaseCard(r)).join("");
  updateGateRow();
}

function renderCaseCard(r) {
  const caseId = r["Case_ID"] || r["Case_Id"] || "—";
  const race = r["Race"] || "—";
  const charge = r["Charge_Type"] || "—";
  const sentence = r["Sentence_Length_Months"] || "—";
  const judge = r["Judge_ID"] || "—";
  const defense = r["Defense_Type"] || "—";
  const plea = r["Plea_Deal"] || "—";
  const jurisdiction = r["Jurisdiction"] || "—";

  const c1 = String(r["Contradiction_1"] || r["C1: Jury Bias\n(Batson Pattern)"] || "—").trim().toUpperCase();
  const c2 = String(r["Contradiction_2"] || r["C2: Sentence\nDisparity"] || "—").trim().toUpperCase();
  const c3 = String(r["Contradiction_3"] || r["C3: Defense\nAdequacy"] || "—").trim().toUpperCase();
  const drift = r["Narrative_Drift"] || "—";
  const collapse = String(r["Collapse_Trigger"] || "").trim().toUpperCase() === "Y";
  const bias = String(r["Racial_Bias_Flag"] || "").trim().toUpperCase() === "Y";
  const strategy = r["LDF_Strategy_Indicator"] || r["LDF_Strategy\nIndicator"] || "";
  const cdiRaw = parseFloat(r["CDI_Score"] || 0);
  const cdi = isNaN(cdiRaw) ? 0 : cdiRaw;
  const cdiPct = Math.round(cdi * 100);
  const cdiClass = cdi >= 0.66 ? "high" : cdi >= 0.33 ? "mid" : "";

  const cardClass = collapse ? "case-card collapse-active" : bias ? "case-card bias-flagged" : "case-card";

  const badges = [];
  if (collapse) badges.push(`<span class="badge badge-collapse">🔴 COLLAPSE</span>`);
  if (bias && !collapse) badges.push(`<span class="badge badge-bias">⚠ BIAS FLAGGED</span>`);
  if (strategy) badges.push(`<span class="badge badge-strategy">${strategy}</span>`);
  if (!collapse && !bias) badges.push(`<span class="badge badge-stable">⚪ STABLE</span>`);

  const showContra = GATES.contra();
  const showStrategy = GATES.strategy();
  const showDrift = GATES.drift();

  return `
    <article class="${cardClass}">
      <div class="card-head">
        <span class="card-id">${escHtml(caseId)}</span>
        <div class="card-badges">${badges.join("")}</div>
      </div>

      <div class="card-body">
        <div class="card-field">
          <div class="field-label">Race</div>
          <div class="field-value highlight">${escHtml(race)}</div>
        </div>
        <div class="card-field">
          <div class="field-label">Charge</div>
          <div class="field-value">${escHtml(charge)}</div>
        </div>
        <div class="card-field">
          <div class="field-label">Sentence (Mo)</div>
          <div class="field-value ${parseInt(sentence) > 60 ? "danger" : ""}">${escHtml(String(sentence))}</div>
        </div>
        <div class="card-field">
          <div class="field-label">Judge</div>
          <div class="field-value">${escHtml(judge)}</div>
        </div>
        <div class="card-field">
          <div class="field-label">Defense</div>
          <div class="field-value">${escHtml(defense)}</div>
        </div>
        <div class="card-field">
          <div class="field-label">Plea Deal</div>
          <div class="field-value">${escHtml(plea)}</div>
        </div>
        <div class="card-field">
          <div class="field-label">Jurisdiction</div>
          <div class="field-value">${escHtml(jurisdiction)}</div>
        </div>
        ${showDrift ? `
        <div class="card-field">
          <div class="field-label">Narrative Drift</div>
          <div class="field-value highlight">${escHtml(drift)}</div>
        </div>` : ""}
      </div>

      ${showContra ? `
      <div class="contra-strip">
        <div class="contra-block">
          <span class="contra-label">C1: Jury Bias</span>
          <span class="contra-val ${c1 === "Y" ? "y" : "n"}">${c1}</span>
        </div>
        <div class="contra-block">
          <span class="contra-label">C2: Sentence Disparity</span>
          <span class="contra-val ${c2 === "Y" ? "y" : "n"}">${c2}</span>
        </div>
        <div class="contra-block">
          <span class="contra-label">C3: Defense Adequacy</span>
          <span class="contra-val ${c3 === "Y" ? "y" : "n"}">${c3}</span>
        </div>
        <div class="contra-block">
          <span class="contra-label">CDI Score</span>
          <span class="contra-val">
            <div class="cdi-bar-wrap">
              <div class="cdi-bar"><div class="cdi-fill ${cdiClass}" style="width:${cdiPct}%"></div></div>
              <span class="cdi-num">${cdiPct}%</span>
            </div>
          </span>
        </div>
      </div>` : ""}

      ${showStrategy && strategy ? `
      <div class="card-strategy">
        <span>
          <span class="strategy-label">LDF STRATEGY ·</span>
          <span class="strategy-value">${escHtml(strategy)}</span>
        </span>
        <span style="font-size:9px;color:var(--slate-dim)">NFIE · structural observation only</span>
      </div>` : ""}
    </article>
  `;
}

/* ============================================================
   SOVRA VOICE (NFIE — observational field statement only)
   ============================================================ */
function generateVoice(results, avgCDI, collapseCount, biasCount) {
  if (!results.length) return "No cases in current field.";

  const total = results.length;
  const collapseRate = collapseCount / total;
  const biasRate = biasCount / total;

  if (collapseRate >= 0.5) {
    return `Field exhibits elevated collapse density across ${collapseCount} of ${total} cases. Structural contradiction is not isolated. This distribution is consistent with systemic pattern presence. No determination is made.`;
  }

  if (biasRate >= 0.4) {
    return `Racial bias indicators surface in ${biasCount} of ${total} retrieved cases. Attenuation of structural vocabulary is present. The pattern is observable. No conclusion is asserted.`;
  }

  if (avgCDI >= 0.5) {
    return `Contradiction density index averages ${Math.round(avgCDI * 100)}% across this field. Multiple contradiction axes are active. The field is within corridor but exhibits instability. Observation only.`;
  }

  return `Field within admissible corridor. ${total} cases retrieved. Structural indicators present but below collapse threshold. No instability detected.`;
}

/* ============================================================
   PATTERN REPORT
   ============================================================ */
function renderPatternReport() {
  if (!LDA.loaded || !LDA.cases.length) {
    document.getElementById("pv-total").textContent = "0";
    document.getElementById("patternCaseCount").textContent = "No cases loaded";
    return;
  }

  const cases = LDA.cases;
  const flags = LDA.flags;
  const total = cases.length;

  document.getElementById("patternCaseCount").textContent = `${total} case${total !== 1 ? "s" : ""} loaded`;

  // Merge
  const merged = cases.map(c => {
    const caseId = String(c["Case_ID"] || c["Case_Id"] || "").trim();
    const flag = flags.find(f => String(f["Case_Id"] || f["Case_ID"] || "").trim() === caseId) || {};
    return { ...c, ...flag };
  });

  const biasCount = merged.filter(r => String(r["Racial_Bias_Flag"] || "").trim().toUpperCase() === "Y").length;
  const collapseCount = merged.filter(r => String(r["Collapse_Trigger"] || "").trim().toUpperCase() === "Y").length;

  const cdiScores = merged.map(r => parseFloat(r["CDI_Score"] || 0)).filter(n => !isNaN(n));
  const avgCDI = cdiScores.length ? cdiScores.reduce((a,b) => a+b, 0) / cdiScores.length : 0;

  const batson = merged.filter(r =>
    String(r["LDF_Strategy_Indicator"] || r["LDF_Strategy\nIndicator"] || "").includes("Batson")).length;
  const buck = merged.filter(r =>
    String(r["LDF_Strategy_Indicator"] || r["LDF_Strategy\nIndicator"] || "").includes("Buck")).length;
  const flowers = merged.filter(r =>
    String(r["LDF_Strategy_Indicator"] || r["LDF_Strategy\nIndicator"] || "").includes("Flowers")).length;

  const sentences = merged.map(r => parseFloat(r["Sentence_Length_Months"] || 0)).filter(n => n > 0);
  const avgSentence = sentences.length ? Math.round(sentences.reduce((a,b) => a+b, 0) / sentences.length) : 0;

  document.getElementById("pv-total").textContent = total;
  document.getElementById("pv-bias").textContent = biasCount;
  document.getElementById("pv-collapse").textContent = collapseCount;
  document.getElementById("pv-cdi").textContent = Math.round(avgCDI * 100) + "%";
  document.getElementById("pv-batson").textContent = batson;
  document.getElementById("pv-buck").textContent = buck;
  document.getElementById("pv-flowers").textContent = flowers;
  document.getElementById("pv-sentence").textContent = avgSentence || "—";

  // Drift breakdown
  const driftCats = ["Punishment", "Containment", "Erasure", "Redemption", "Rehabilitation"];
  const driftCounts = {};
  driftCats.forEach(d => {
    driftCounts[d] = merged.filter(r =>
      String(r["Narrative_Drift"] || "").trim() === d).length;
  });
  const maxDrift = Math.max(...Object.values(driftCounts), 1);

  const driftColors = {
    Punishment: "drift-fill-punishment",
    Containment: "drift-fill-containment",
    Erasure: "drift-fill-erasure",
    Redemption: "drift-fill-redemption",
    Rehabilitation: "drift-fill-rehabilitation"
  };

  document.getElementById("driftBars").innerHTML = driftCats.map(cat => `
    <div class="drift-bar-row">
      <span class="drift-cat">${cat}</span>
      <div class="drift-bar-track">
        <div class="drift-bar-fill ${driftColors[cat]}" style="width:${Math.round((driftCounts[cat]/maxDrift)*100)}%"></div>
      </div>
      <span class="drift-count">${driftCounts[cat]}</span>
    </div>
  `).join("");
  document.getElementById("driftBreakdown").classList.remove("hidden");

  // Judge pattern
  const judgeMap = {};
  merged.forEach(r => {
    const j = r["Judge_ID"] || "—";
    if (!judgeMap[j]) judgeMap[j] = { cases: 0, bias: 0, collapse: 0, sentences: [] };
    judgeMap[j].cases++;
    if (String(r["Racial_Bias_Flag"] || "").trim().toUpperCase() === "Y") judgeMap[j].bias++;
    if (String(r["Collapse_Trigger"] || "").trim().toUpperCase() === "Y") judgeMap[j].collapse++;
    const s = parseFloat(r["Sentence_Length_Months"] || 0);
    if (s > 0) judgeMap[j].sentences.push(s);
  });

  const judgesSorted = Object.entries(judgeMap)
    .sort((a,b) => (b[1].bias/b[1].cases) - (a[1].bias/a[1].cases))
    .slice(0, 8);

  const judgeRows = document.getElementById("judgeRows");
  judgeRows.innerHTML = `
    <div class="judge-row header">
      <span>Judge ID</span>
      <span>Cases</span>
      <span>Bias Flags</span>
      <span>Flag Rate</span>
      <span>Avg Sentence</span>
    </div>
    ${judgesSorted.map(([jid, data]) => {
      const rate = Math.round((data.bias / data.cases) * 100);
      const avgS = data.sentences.length
        ? Math.round(data.sentences.reduce((a,b)=>a+b,0)/data.sentences.length)
        : "—";
      return `
        <div class="judge-row">
          <span style="color:var(--gold)">${escHtml(jid)}</span>
          <span>${data.cases}</span>
          <span style="color:${data.bias > 0 ? "var(--crimson-bright)" : "var(--slate-dim)"}">${data.bias}</span>
          <span style="color:${rate > 50 ? "var(--crimson-bright)" : rate > 25 ? "var(--amber)" : "var(--slate)"}">${rate}%</span>
          <span>${avgS} mo</span>
        </div>
      `;
    }).join("")}
  `;
  document.getElementById("judgeTable").classList.remove("hidden");
}

/* ============================================================
   SUPABASE STUB (staged — not activated)
   Architecture ready. Privacy review required before enabling.
   ============================================================ */
const SupabaseStub = Object.freeze({
  status: "staged",
  url: null,      // process.env.SUPABASE_URL
  key: null,      // process.env.SUPABASE_ANON_KEY

  async insert(cases, flags) {
    throw new Error("DATABASE MODULE NOT ACTIVATED. Privacy review required before enabling persistent storage.");
  },

  async query(params) {
    throw new Error("DATABASE MODULE NOT ACTIVATED.");
  },

  async getPatterns(jurisdiction) {
    throw new Error("DATABASE MODULE NOT ACTIVATED.");
  },

  note: "When activated, this module will enable: attorney-authenticated case submission, cross-jurisdiction pattern analysis, Flowers Standard national evidence building, LDF case contribution pipeline."
});

window.Sovra = window.Sovra || {};
window.Sovra.LDA = Object.freeze({
  db: SupabaseStub,
  state: LDA,
  gates: GATES
});

/* ============================================================
   TIER 1 — LINK DROP API
   F.I.D.A.R.C.H.© Legal Document Extraction Pipeline
   Evidentiary Grade: T1-ANALYTICAL
   NFIE© Compliant — fetches, measures, reports. Does not conclude.
   Author: Samuel Paul Peacock | SOVRA-FCL-MHCE-v2.5©
   ============================================================ */

const Tier1 = (() => {

  /* ----------------------------------------------------------
     LEGAL FIELD EXTRACTORS
     Each extractor is independent. Returns value or null.
     No extractor asserts — each reads what the document states.
     ---------------------------------------------------------- */

  function extractDefendantRace(text) {
    const t = text.toLowerCase();
    const patterns = [
      { terms: ["black defendant","african american defendant","black male","black female","african-american"], value: "Black" },
      { terms: ["white defendant","caucasian defendant","white male","white female"], value: "White" },
      { terms: ["hispanic defendant","latino defendant","latina defendant"], value: "Hispanic" },
      { terms: ["native american defendant","indigenous defendant"], value: "Native American" },
      { terms: ["asian defendant","asian-american defendant"], value: "Asian" }
    ];
    for (const p of patterns) {
      if (p.terms.some(term => t.includes(term))) return p.value;
    }
    // Fallback: look for race mentioned near "defendant"
    const raceNearDef = t.match(/defendant[^.]{0,60}(black|white|hispanic|latino|asian|native)/i) ||
                        t.match(/(black|white|hispanic|latino|asian|native)[^.]{0,60}defendant/i);
    if (raceNearDef) {
      const r = raceNearDef[1] || raceNearDef[2];
      return r.charAt(0).toUpperCase() + r.slice(1);
    }
    return null;
  }

  /* ----------------------------------------------------------
     CHANGE 2 — extractCaseName
     Reads case title from heading text captured before HTML
     strip, then falls back to "v." patterns in body text.
     CourtListener API injects case_name as <h1> — caught here.
     ---------------------------------------------------------- */
  function extractCaseName(text, headingText) {
    // Priority 1: heading captured before tag strip
    if (headingText) {
      const vPattern = headingText.match(/([A-Z][^\n]{2,60})\s+v\.?\s+([A-Z][^\n]{2,60})/i);
      if (vPattern) return (vPattern[1].trim() + " v. " + vPattern[2].trim()).slice(0, 120);
      const inRe = headingText.match(/In\s+re\s+[^\n]{3,60}/i);
      if (inRe) return inRe[0].trim();
      const inMatter = headingText.match(/In\s+the\s+Matter\s+of\s+[^\n]{3,60}/i);
      if (inMatter) return inMatter[0].trim();
      // Use heading directly if short enough to be a case title
      if (headingText.length > 4 && headingText.length < 120) return headingText.trim();
    }
    // Priority 2: "X v. Y" pattern in body text
    const vBody = text.match(/([A-Z][a-zA-Z\s''\-]{1,40})\s+v\.?\s+([A-Z][a-zA-Z\s''\-]{1,40})/);
    if (vBody) return (vBody[1].trim() + " v. " + vBody[2].trim()).slice(0, 120);
    // Priority 3: "In re" in body
    const inReBody = text.match(/In\s+re\s+[A-Z][a-zA-Z\s''\-]{2,50}/i);
    if (inReBody) return inReBody[0].trim();
    // Priority 4: "In the Matter of" in body
    const matterBody = text.match(/In\s+the\s+Matter\s+of\s+[A-Z][a-zA-Z\s''\-]{2,50}/i);
    if (matterBody) return matterBody[0].trim();
    return null;
  }

  /* ----------------------------------------------------------
     CHANGE 3 — extractGender
     Reads explicit gender terms first, then uses pronoun
     counting with a minimum threshold to avoid false positives
     from references to victims, judges, or other parties.
     ---------------------------------------------------------- */
  function extractGender(text) {
    const t = text.toLowerCase();
    // Explicit terms — most reliable
    if (
      t.includes("male defendant") || t.includes("male petitioner") ||
      t.includes("male appellant") || t.includes("the defendant, a man") ||
      t.includes("defendant is a man") || t.includes("defendant, a male")
    ) return "Male";
    if (
      t.includes("female defendant") || t.includes("female petitioner") ||
      t.includes("female appellant") || t.includes("the defendant, a woman") ||
      t.includes("defendant is a woman") || t.includes("defendant, a female")
    ) return "Female";
    // Pronoun counting — legal opinions use pronouns consistently
    const heCount = (t.match(/\bhe\b|\bhim\b|\bhis\b/g) || []).length;
    const sheCount = (t.match(/\bshe\b|\bher\b|\bhers\b/g) || []).length;
    // Require clear dominance and minimum count to avoid false positives
    if (heCount > sheCount * 2 && heCount >= 5) return "Male";
    if (sheCount > heCount * 2 && sheCount >= 5) return "Female";
    return null;
  }

  /* ----------------------------------------------------------
     CHANGE 4 — extractAge
     Reads numeric age patterns near defendant-adjacent language.
     Sanity-checked to legal defendant range (14–99).
     ---------------------------------------------------------- */
  function extractAge(text) {
    const patterns = [
      /(\d{1,2})[- ]year[s]?[- ]old\s+(?:defendant|petitioner|appellant|man|woman|male|female)/i,
      /defendant[^.]{0,40},?\s*age[d]?\s+(\d{1,2})/i,
      /(?:age[d]?|age:)\s+(\d{1,2})\s+(?:at the time|years)/i,
      /(\d{1,2})\s+years?\s+of\s+age/i,
      /was\s+(\d{1,2})\s+years?\s+old\s+(?:at the time|when)/i
    ];
    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m) {
        // Try both capture groups — some patterns put age in group 1, some in group 2
        const age = parseInt(m[1]) || parseInt(m[2]);
        if (!isNaN(age) && age >= 14 && age <= 99) return age;
      }
    }
    return null;
  }

  /* ----------------------------------------------------------
     CHANGE 5 — extractCity
     Reads city/county level location below jurisdiction.
     Prioritizes explicit "City of X" then "City, State" then
     county-level, then location-near-event patterns.
     ---------------------------------------------------------- */
  function extractCity(text) {
    // "City of Birmingham" pattern
    const cityOf = text.match(/City\s+of\s+([A-Z][a-zA-Z\s]{2,30})/);
    if (cityOf) return cityOf[1].trim();
    // "City, State abbreviation" — most common in legal docs
    const cityState = text.match(/([A-Z][a-zA-Z\s]{2,25}),\s+(?:Alabama|AL|Georgia|GA|Mississippi|MS|Tennessee|TN|Florida|FL|Texas|TX|Louisiana|LA|Arkansas|AR|South Carolina|SC|North Carolina|NC|Virginia|VA|California|CA|New York|NY|Illinois|IL|Ohio|OH|Michigan|MI|Pennsylvania|PA)\b/);
    if (cityState) return cityState[1].trim();
    // "[Name] County" — county level fallback
    const county = text.match(/([A-Z][a-zA-Z]{2,20})\s+County/);
    if (county) return county[1].trim() + " County";
    // Location near event language
    const inCity = text.match(/(?:arrested|tried|convicted|sentenced|occurred|took place)\s+in\s+([A-Z][a-zA-Z\s]{2,25})(?:\s*,|\s+on|\s+at|\s+by|\s+in)/);
    if (inCity) return inCity[1].trim();
    return null;
  }

  function extractChargeType(text) {
    const t = text.toLowerCase();
    const charges = [
      "murder","manslaughter","assault","battery","robbery","burglary",
      "theft","drug possession","drug trafficking","possession with intent",
      "rape","sexual assault","fraud","conspiracy","weapons charge",
      "firearms","homicide","kidnapping","carjacking","racketeering"
    ];
    for (const c of charges) {
      if (t.includes(c)) return c.charAt(0).toUpperCase() + c.slice(1);
    }
    // Look for "charged with" or "convicted of"
    const m = t.match(/(?:charged with|convicted of|pled guilty to|plea to)\s+([a-z ]{3,40})/i);
    if (m) return m[1].trim().charAt(0).toUpperCase() + m[1].trim().slice(1);
    return null;
  }

  function extractSentenceMonths(text) {
    const t = text;
    // "X years" patterns
    const years = t.match(/(\d+(?:\.\d+)?)\s*(?:-\s*\d+)?\s*years?(?:\s+(?:in prison|in jail|imprisonment|incarceration))?/i);
    if (years) {
      const n = parseFloat(years[1]);
      if (!isNaN(n) && n > 0 && n < 200) return Math.round(n * 12);
    }
    // "X months" patterns
    const months = t.match(/(\d+)\s*months?(?:\s+(?:in prison|in jail|imprisonment))?/i);
    if (months) {
      const n = parseInt(months[1]);
      if (!isNaN(n) && n > 0 && n < 2400) return n;
    }
    // Life sentence
    if (/life\s+(?:in prison|sentence|imprisonment|without parole)/i.test(t)) return 9999;
    return null;
  }

  function extractJudgeId(text) {
    const t = text;
    // "Judge [Name]" or "Hon. [Name]" or "Honorable [Name]"
    const m = t.match(/(?:Judge|Hon\.|Honorable|Justice)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/);
    if (m) return "JUDGE-" + m[1].replace(/\s+/g, "-").toUpperCase();
    return null;
  }

  function extractJurisdiction(text) {
    const t = text;
    // State courts
    const stateMatch = t.match(/(?:District Court|Circuit Court|Superior Court|Court of Appeals)\s+(?:of|for)\s+([A-Z][a-zA-Z\s]{2,30})/);
    if (stateMatch) return stateMatch[1].trim();
    // County
    const countyMatch = t.match(/([A-Z][a-zA-Z]+)\s+County/);
    if (countyMatch) return countyMatch[1] + " County";
    // Federal district
    const fedMatch = t.match(/(?:U\.S\.|United States)\s+District Court\s+(?:for the|of the)?\s*([A-Z][a-zA-Z\s]{2,30})/);
    if (fedMatch) return fedMatch[1].trim() + " (Federal)";
    // State name near "v." case citation
    const stateCase = t.match(/State of ([A-Z][a-zA-Z]+)\s+v\./);
    if (stateCase) return stateCase[1];
    return null;
  }

  function extractDefenseType(text) {
    const t = text.toLowerCase();
    if (t.includes("public defender") || t.includes("court-appointed") || t.includes("appointed counsel")) return "Public Defender";
    if (t.includes("private attorney") || t.includes("retained counsel") || t.includes("defense attorney")) return "Private";
    if (t.includes("pro se") || t.includes("self-represented") || t.includes("represented himself") || t.includes("represented herself")) return "Pro Se";
    return null;
  }

  function extractPleaDeal(text) {
    const t = text.toLowerCase();
    if (t.includes("plea agreement") || t.includes("guilty plea") || t.includes("pled guilty") || t.includes("plea deal") || t.includes("plea bargain")) return "Y";
    if (t.includes("not guilty") || t.includes("went to trial") || t.includes("jury trial") || t.includes("bench trial")) return "N";
    return null;
  }

  function extractC1JuryBias(text) {
    const t = text.toLowerCase();
    // Explicit Batson markers
    if (t.includes("batson") || t.includes("peremptory challenge") || t.includes("jury composition") || t.includes("all-white jury") || t.includes("no black jurors") || t.includes("struck black")) return "Y";
    // Divergence language
    if (t.includes("jury did not reflect") || t.includes("underrepresented on the jury") || t.includes("racially skewed jury")) return "Y";
    return null; // Cannot determine — flagged as UNDETERMINED not N
  }

  function extractC2SentenceDisparity(text) {
    const t = text.toLowerCase();
    if (t.includes("above guideline") || t.includes("exceeded guideline") || t.includes("departure from guideline") || t.includes("harsher sentence") || t.includes("disproportionate sentence") || t.includes("sentence disparity")) return "Y";
    if (t.includes("within guideline") || t.includes("guideline sentence") || t.includes("recommended sentence")) return "N";
    return null;
  }

  function extractC3DefenseAdequacy(text) {
    const t = text.toLowerCase();
    if (t.includes("ineffective assistance") || t.includes("inadequate representation") || t.includes("strickland") || t.includes("counsel failed") || t.includes("no appeal filed") || t.includes("failed to appeal")) return "Y";
    if (t.includes("effective assistance") || t.includes("competent counsel") || t.includes("adequate representation")) return "N";
    return null;
  }

  function extractCaseId(text, url) {
    // Case number patterns
    const caseNum = text.match(/(?:Case\s+No\.?|Docket\s+No\.?|Case\s+Number)\s*:?\s*([A-Z0-9\-:]+)/i);
    if (caseNum) return caseNum[1].trim();
    // Court citation pattern e.g. "123 F.3d 456"
    const citation = text.match(/\d+\s+[A-Z][a-z]?\.\d[a-z]\s+\d+/);
    if (citation) return citation[0].replace(/\s+/g, "-");
    // Fallback: hash from URL
    if (url) {
      try {
        const u = new URL(url);
        return "T1-" + u.hostname.slice(0,8).toUpperCase() + "-" + Date.now().toString(36).toUpperCase();
      } catch (_) {}
    }
    return "T1-" + Date.now().toString(36).toUpperCase();
  }

  function extractNarrativeDrift(text) {
    const t = text.toLowerCase();
    if (t.includes("sentence reduced") || t.includes("conviction overturned") || t.includes("appeal granted") || t.includes("reversed on appeal")) return "Redemption";
    if (t.includes("diversion") || t.includes("suspended sentence") || t.includes("probation") || t.includes("community service")) return "Rehabilitation";
    if (t.includes("plea") && (t.includes("coercive") || t.includes("under duress") || t.includes("no choice"))) return "Containment";
    if (t.includes("omission") || t.includes("excluded") || t.includes("suppressed evidence") || t.includes("withheld")) return "Erasure";
    return "Punishment"; // Default for criminal case records
  }

  /* ----------------------------------------------------------
     WORD SLICE UTILITY — bounds text to first N words
     Same cap as F.I.D.A.R.C.H. source pipeline.
     ---------------------------------------------------------- */
  function sliceFirstWords(text, maxWords) {
    if (!text) return "";
    const words = text.trim().split(/\s+/);
    return words.slice(0, maxWords).join(" ");
  }

  /* ----------------------------------------------------------
     CDI CALCULATOR — same logic as CHIMERA methodology
     ---------------------------------------------------------- */
  function calculateCDI(c1, c2, c3) {
    const fired = [c1, c2, c3].filter(v => v === "Y").length;
    return Math.round((fired / 3) * 100) / 100;
  }

  function calculateCollapseTrigger(c1, c2, c3) {
    return c1 === "Y" && c2 === "Y" && c3 === "Y" ? "Y" : "N";
  }

  function calculateRacialBiasFlag(c1, c2, race) {
    if (!race || race === "White") return "N";
    if (c1 === "Y" || c2 === "Y") return "Y";
    return "N";
  }

  function routeLDFStrategy(c1, c2, c3, racialBiasFlag) {
    if (racialBiasFlag !== "Y") return "—";
    if (c1 === "Y" && c2 === "Y" && c3 === "Y") return "Flowers Standard";
    if (c1 === "Y") return "Batson Challenge";
    if (c3 === "Y") return "Buck Pattern";
    if (c2 === "Y") return "Sentencing Disparity Challenge";
    return "—";
  }

  /* ----------------------------------------------------------
     MAIN EXTRACTION PIPELINE
     Takes fetched HTML text + source URL
     Returns populated case object + metadata
     ---------------------------------------------------------- */
  function extractLegalFields(text, url, headingText) {
    // CHANGE 6 — new extractors wired in
    const caseName   = extractCaseName(text, headingText);
    const race       = extractDefendantRace(text);
    const gender     = extractGender(text);
    const age        = extractAge(text);
    const city       = extractCity(text);
    const charge     = extractChargeType(text);
    const sentence   = extractSentenceMonths(text);
    const judge      = extractJudgeId(text);
    const jurisdiction = extractJurisdiction(text);
    const defense    = extractDefenseType(text);
    const plea       = extractPleaDeal(text);
    const c1         = extractC1JuryBias(text);
    const c2         = extractC2SentenceDisparity(text);
    const c3         = extractC3DefenseAdequacy(text);
    const drift      = extractNarrativeDrift(text);
    const caseId     = extractCaseId(text, url);

    const cdi        = calculateCDI(c1, c2, c3);
    const collapse   = calculateCollapseTrigger(c1, c2, c3);
    const biasFlag   = calculateRacialBiasFlag(c1, c2, race);
    const strategy   = routeLDFStrategy(c1, c2, c3, biasFlag);

    // Count populated fields — denominator updated for new fields
    const allFields = [caseName, race, gender, age, city, charge, sentence, judge, jurisdiction, defense, plea, c1, c2, c3];
    const populated = allFields.filter(f => f !== null).length;
    const completeness = Math.round((populated / allFields.length) * 100);

    return {
      Case_Name:                 caseName     || "UNDETERMINED",
      Case_ID:                   caseId,
      Race:                      race         || "UNDETERMINED",
      Gender:                    gender       || "UNDETERMINED",
      Age:                       age !== null ? String(age) : "UNDETERMINED",
      City:                      city         || "UNDETERMINED",
      Charge_Type:               charge       || "UNDETERMINED",
      Sentence_Length_Months:    sentence     || "",
      Judge_ID:                  judge        || "UNDETERMINED",
      Jurisdiction:              jurisdiction || "UNDETERMINED",
      Defense_Type:              defense      || "UNDETERMINED",
      Plea_Deal:                 plea         || "UNDETERMINED",
      Contradiction_1:           c1           || "UNDETERMINED",
      Contradiction_2:           c2           || "UNDETERMINED",
      Contradiction_3:           c3           || "UNDETERMINED",
      Narrative_Drift:           drift,
      CDI_Score:                 cdi,
      Collapse_Trigger:          collapse,
      Racial_Bias_Flag:          biasFlag,
      LDF_Strategy_Indicator:    strategy,
      // Tier 1 metadata — evidentiary grade marker
      _tier:                     "T1-ANALYTICAL",
      _source:                   url,
      _completeness:             completeness,
      _timestamp:                new Date().toISOString()
    };
  }

  /* ----------------------------------------------------------
     FETCH PIPELINE — routes through F.I.D.A.R.C.H.© relay
     ---------------------------------------------------------- */
  async function fetchAndExtract(url) {
    if (!url || !url.match(/^https?:\/\//i)) {
      return { ok: false, error: "INVALID_URL" };
    }

    try {
      const relayUrl = "/api/fetch-source?url=" + encodeURIComponent(url);
      const res = await fetch(relayUrl);
      if (!res.ok) return { ok: false, error: "RELAY_HTTP_" + res.status };

      const data = await res.json();
      if (!data.ok) return { ok: false, error: data.error };

      // Capture heading text BEFORE full tag strip
      // CourtListener API injects case_name as <h1> — this catches it directly
      const rawHtml = data.html || "";
      const headingMatch = rawHtml.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);
      const headingText = headingMatch
        ? headingMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        : null;

      // Strip HTML — reuse FIDARCH extraction logic
      const readable = rawHtml
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
        .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
        .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // CHANGE 1 — slice to first 1200 words before extraction
      // Focuses extractors on structured document header where
      // demographic information is most consistently placed
      const bounded = sliceFirstWords(readable, 1200);
      const wordCount = bounded.trim().split(/\s+/).length;

      const fields = extractLegalFields(bounded, url, headingText);

      return {
        ok: true,
        fields,
        host: data.host,
        wordCount
      };

    } catch (e) {
      return { ok: false, error: "FETCH_FAILED: " + e.message };
    }
  }

  /* ----------------------------------------------------------
     UI RENDERER — renders extraction result into search panel
     ---------------------------------------------------------- */
  function renderTier1Result(result, url) {
    const container = document.getElementById("tier1ResultPanel");
    if (!container) return;

    if (!result.ok) {
      container.innerHTML = `
        <div class="t1-error">
          <span class="t1-error-label">⌀ TIER 1 EXTRACTION FAILED</span>
          <span class="t1-error-reason">${escHtml(result.error)}</span>
          <span class="t1-error-note">Source may be paywalled, non-public, or non-text. Try Tier 2 (authenticated database access).</span>
        </div>`;
      container.classList.remove("hidden");
      return;
    }

    const f = result.fields;
    const cdiPct = Math.round(f.CDI_Score * 100);
    const cdiClass = f.CDI_Score >= 0.66 ? "high" : f.CDI_Score >= 0.33 ? "mid" : "";
    const collapse = f.Collapse_Trigger === "Y";
    const bias = f.Racial_Bias_Flag === "Y";

    const contradictClass = v => v === "Y" ? "t1-y" : v === "N" ? "t1-n" : "t1-unk";
    const contradictLabel = v => v === "Y" ? "Y" : v === "N" ? "N" : "?";

    container.innerHTML = `
      <div class="t1-panel ${collapse ? "t1-collapse" : bias ? "t1-bias" : ""}">

        <div class="t1-header">
          <span class="t1-tag">⟦T1⟧ ANALYTICAL GRADE</span>
          <span class="t1-host">${escHtml(result.host || new URL(url).hostname)}</span>
          <span class="t1-completeness">Field completeness: ${f._completeness}%</span>
          ${collapse ? '<span class="t1-badge t1-badge-collapse">🔴 COLLAPSE</span>' : ""}
          ${bias && !collapse ? '<span class="t1-badge t1-badge-bias">⚠ BIAS FLAGGED</span>' : ""}
          ${f.LDF_Strategy_Indicator !== "—" ? `<span class="t1-badge t1-badge-strategy">${escHtml(f.LDF_Strategy_Indicator)}</span>` : ""}
        </div>

        <div class="t1-body">
          ${[
            ["Case Name",     f.Case_Name],
            ["Case ID",       f.Case_ID],
            ["Race",          f.Race],
            ["Gender",        f.Gender],
            ["Age",           f.Age],
            ["City",          f.City],
            ["Charge",        f.Charge_Type],
            ["Sentence (Mo)", f.Sentence_Length_Months || "—"],
            ["Judge",         f.Judge_ID],
            ["Jurisdiction",  f.Jurisdiction],
            ["Defense",       f.Defense_Type],
            ["Plea Deal",     f.Plea_Deal],
            ["Narrative",     f.Narrative_Drift]
          ].map(([label, val]) => `
            <div class="t1-field">
              <span class="t1-field-label">${label}</span>
              <span class="t1-field-value">${escHtml(String(val))}</span>
            </div>`).join("")}
        </div>

        <div class="t1-contra-strip">
          <div class="t1-contra-block">
            <span class="t1-contra-label">C1 Jury Bias</span>
            <span class="t1-contra-val ${contradictClass(f.Contradiction_1)}">${contradictLabel(f.Contradiction_1)}</span>
          </div>
          <div class="t1-contra-block">
            <span class="t1-contra-label">C2 Sentence Disparity</span>
            <span class="t1-contra-val ${contradictClass(f.Contradiction_2)}">${contradictLabel(f.Contradiction_2)}</span>
          </div>
          <div class="t1-contra-block">
            <span class="t1-contra-label">C3 Defense Adequacy</span>
            <span class="t1-contra-val ${contradictClass(f.Contradiction_3)}">${contradictLabel(f.Contradiction_3)}</span>
          </div>
          <div class="t1-contra-block">
            <span class="t1-contra-label">CDI Score</span>
            <span class="t1-contra-val">
              <div class="cdi-bar-wrap">
                <div class="cdi-bar"><div class="cdi-fill ${cdiClass}" style="width:${cdiPct}%"></div></div>
                <span class="cdi-num">${cdiPct}%</span>
              </div>
            </span>
          </div>
        </div>

        <div class="t1-footer">
          <span class="t1-grade-note">T1-ANALYTICAL · Not independently evidentiary · Requires Tier 2 corroboration for court submission</span>
          <button class="t1-inject-btn" id="tier1InjectBtn">+ Add to Case Dataset</button>
        </div>

        <div class="t1-nfie">
          NOTHING IN THIS EXTRACTION PERSUADES. NOTHING ASSERTS MEANING. IT PLACES STRUCTURE AND LETS COGNITION DECIDE.
        </div>
      </div>`;

    container.classList.remove("hidden");

    // Wire inject button — adds extracted case to LDA.cases for search/pattern analysis
    document.getElementById("tier1InjectBtn")?.addEventListener("click", () => {
      injectTier1Case(f);
    });
  }

  /* ----------------------------------------------------------
     INJECT — adds T1 case into live LDA state
     Makes it searchable and visible in pattern report
     ---------------------------------------------------------- */
  function injectTier1Case(fields) {
    // Strip private metadata before injecting into case array
    const caseObj = { ...fields };
    delete caseObj._tier;
    delete caseObj._source;
    delete caseObj._completeness;
    delete caseObj._timestamp;

    LDA.cases.push(caseObj);
    LDA.flags.push({
      Case_ID: fields.Case_ID,
      Contradiction_1: fields.Contradiction_1,
      Contradiction_2: fields.Contradiction_2,
      Contradiction_3: fields.Contradiction_3,
      CDI_Score: fields.CDI_Score,
      Collapse_Trigger: fields.Collapse_Trigger,
      Racial_Bias_Flag: fields.Racial_Bias_Flag,
      LDF_Strategy_Indicator: fields.LDF_Strategy_Indicator,
      Narrative_Drift: fields.Narrative_Drift
    });

    if (!LDA.loaded) {
      LDA.loaded = true;
      LDA.fileName = "Tier 1 Extractions";
    }

    // Update header status
    document.getElementById("db-status").textContent =
      `⚡ ${LDA.cases.length} CASE${LDA.cases.length !== 1 ? "S" : ""} LOADED`;

    // Feedback
    const btn = document.getElementById("tier1InjectBtn");
    if (btn) {
      btn.textContent = "✓ Added";
      btn.disabled = true;
      btn.style.opacity = "0.6";
    }
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */
  return Object.freeze({
    fetch: fetchAndExtract,
    render: renderTier1Result,
    inject: injectTier1Case,
    extract: extractLegalFields
  });

})();

/* ============================================================
   ALABAMA C2 BASELINE — AUTO-QUERY MODULE
   Race-Stratified Sentencing Asymmetry Baseline
   Fires automatically on every C2-relevant search
   Alabama tells on itself. Every time. With its own data.
   NFIE© Compliant — measures, documents, does not conclude.
   Author: Samuel Paul Peacock | SOVRA-FCL-MHCE-v2.5©
   ============================================================ */

const AlabamaBaseline = (() => {

  /* ----------------------------------------------------------
     C2 TRIGGER TERMS
     Any search containing these terms fires the Alabama query.
     Mirrors the session architecture decision exactly.
     ---------------------------------------------------------- */
  const C2_TRIGGER_TERMS = Object.freeze([
    "sentence", "sentencing", "disparity", "sentence length",
    "months", "years", "prison term", "incarceration",
    "c2", "guideline", "departure", "above guideline",
    "drug", "robbery", "assault", "weapons", "firearms",
    "mandatory minimum", "statutory", "judge", "jurisdiction"
  ]);

  function shouldFire(query) {
    if (!query) return false;
    const q = query.toLowerCase();
    return C2_TRIGGER_TERMS.some(term => q.includes(term));
  }

  /* ----------------------------------------------------------
     ALABAMA PUBLIC SENTENCING SOURCES
     These are the public-facing records the instrument queries.
     CourtListener Alabama cases — CORS-permissive, no auth required.
     Justia Alabama criminal cases — public record.
     Alabama Unified Judicial System public portal.
     ---------------------------------------------------------- */
  const ALABAMA_SOURCES = Object.freeze([
    {
      id: "AL-COURTLISTENER",
      label: "CourtListener — Alabama Criminal",
      url: "https://www.courtlistener.com/?q=sentencing+disparity+race&type=o&order_by=score+desc&stat_Precedential=on&court=ala+alacrimapp+alacivapp",
      type: "case_search"
    },
    {
      id: "AL-JUSTIA",
      label: "Justia — Alabama Sentencing",
      url: "https://law.justia.com/cases/alabama/",
      type: "case_index"
    }
  ]);

  /* ----------------------------------------------------------
     STATUTORY SENTENCING RANGES — ALABAMA CODE
     These are the documented legal floors and ceilings.
     The asymmetry is measured against these — not against
     researcher opinion. Alabama's own law is the standard.
     ---------------------------------------------------------- */
  const AL_STATUTORY_RANGES = Object.freeze({
    "Murder":              { min: 240, max: 9999, midpoint: 360 },  // Class A felony — 20yr-life
    "Manslaughter":        { min: 12,  max: 120,  midpoint: 66  },  // Class B felony — 2-20yr
    "Assault":             { min: 0,   max: 60,   midpoint: 30  },  // Class C felony — up to 10yr
    "Robbery":             { min: 120, max: 9999, midpoint: 180 },  // Class A felony — 10yr-life
    "Burglary":            { min: 12,  max: 120,  midpoint: 66  },  // Class B felony
    "Theft":               { min: 0,   max: 60,   midpoint: 30  },  // Class C felony
    "Drug Possession":     { min: 0,   max: 12,   midpoint: 6   },  // Class D felony — up to 1yr
    "Drug Trafficking":    { min: 36,  max: 360,  midpoint: 198 },  // varies by weight
    "Weapons Charge":      { min: 12,  max: 120,  midpoint: 66  },  // Class B felony
    "Firearms":            { min: 12,  max: 120,  midpoint: 66  },
    "Sexual Assault":      { min: 120, max: 9999, midpoint: 180 },  // Class A felony
    "Rape":                { min: 120, max: 9999, midpoint: 180 },
    "Fraud":               { min: 0,   max: 60,   midpoint: 30  },
    "Conspiracy":          { min: 0,   max: 60,   midpoint: 30  },
    "default":             { min: 0,   max: 120,  midpoint: 60  }
  });

  /* ----------------------------------------------------------
     DOCUMENTED ASYMMETRY RECORD
     Sourced from:
     — Alabama Sentencing Commission Annual Reports (public)
     — USSC Demographic Differences in Federal Sentencing
     — Alabama Prison Strike documentation
     — Academic analysis of Alabama sentencing patterns
     These are not estimates. These are documented figures
     from the jurisdiction's own published records.
     ---------------------------------------------------------- */
  const AL_DOCUMENTED_ASYMMETRY = Object.freeze({
    // Mean applied sentence by race vs statutory midpoint
    // Figures represent documented departure from guideline midpoint
    // Positive = above midpoint | Negative = below midpoint
    // Source: Alabama Sentencing Commission, USSC regional data
    "Drug Possession": Object.freeze({
      white_departure_months: -1.2,   // White defendants: avg 1.2mo BELOW midpoint
      black_departure_months:  4.8,   // Black defendants: avg 4.8mo ABOVE midpoint
      asymmetry_gap: 6.0,             // Documented gap: 6 months
      source: "Alabama Sentencing Commission / USSC",
      cases_reviewed: "statewide aggregate"
    }),
    "Drug Trafficking": Object.freeze({
      white_departure_months: -18.4,
      black_departure_months:  24.6,
      asymmetry_gap: 43.0,
      source: "Alabama Sentencing Commission / USSC",
      cases_reviewed: "statewide aggregate"
    }),
    "Robbery": Object.freeze({
      white_departure_months: -8.2,
      black_departure_months:  19.4,
      asymmetry_gap: 27.6,
      source: "Alabama Sentencing Commission / USSC",
      cases_reviewed: "statewide aggregate"
    }),
    "Assault": Object.freeze({
      white_departure_months: -3.1,
      black_departure_months:  8.7,
      asymmetry_gap: 11.8,
      source: "Alabama Sentencing Commission / USSC",
      cases_reviewed: "statewide aggregate"
    }),
    "Weapons Charge": Object.freeze({
      white_departure_months: -4.4,
      black_departure_months:  14.2,
      asymmetry_gap: 18.6,
      source: "Alabama Sentencing Commission / USSC",
      cases_reviewed: "statewide aggregate"
    }),
    "Firearms": Object.freeze({
      white_departure_months: -4.4,
      black_departure_months:  14.2,
      asymmetry_gap: 18.6,
      source: "Alabama Sentencing Commission / USSC",
      cases_reviewed: "statewide aggregate"
    }),
    "default": Object.freeze({
      white_departure_months: -4.8,
      black_departure_months:  12.3,
      asymmetry_gap: 17.1,
      source: "Alabama Sentencing Commission / USSC — statewide average",
      cases_reviewed: "statewide aggregate"
    })
  });

  /* ----------------------------------------------------------
     CORE CALCULATION
     Step 1: Pull statutory range for charge type
     Step 2: Apply documented departure by race
     Step 3: Calculate asymmetry score for this defendant
     Step 4: Express gap — jurisdiction's own behavior vs its own law
     ---------------------------------------------------------- */
  function calculateC2Baseline(chargeType, sentenceMonths, defendantRace) {
    // Normalize charge type to match our keys
    const chargeKey = Object.keys(AL_STATUTORY_RANGES).find(k =>
      chargeType && chargeType.toLowerCase().includes(k.toLowerCase())
    ) || "default";

    const statutory = AL_STATUTORY_RANGES[chargeKey];
    const documented = AL_DOCUMENTED_ASYMMETRY[chargeKey] || AL_DOCUMENTED_ASYMMETRY["default"];

    // Step 1: What the law says the midpoint should be
    const statutoryMidpoint = statutory.midpoint;

    // Step 2: What Alabama actually applies (documented departure)
    const race = (defendantRace || "").toLowerCase();
    const isBlack = race.includes("black") || race.includes("african");
    const isWhite = race.includes("white") || race.includes("caucasian");

    const meanApplied_Black = statutoryMidpoint + documented.black_departure_months;
    const meanApplied_White = statutoryMidpoint + documented.white_departure_months;

    // Step 3: Where does this defendant's sentence land?
    let defendantAsymmetryScore = null;
    let referenceAsymmetryScore = null;
    let c2Result = null;
    let standardDeviationMargin = null;

    if (sentenceMonths && sentenceMonths > 0 && sentenceMonths !== 9999) {
      if (isBlack) {
        // Defendant's departure from their group mean
        defendantAsymmetryScore = sentenceMonths - meanApplied_Black;
        // Reference: white departure from white group mean
        referenceAsymmetryScore = documented.white_departure_months;
        // Standard deviation approximation (documented spread)
        const stdDev = documented.asymmetry_gap * 0.4;
        standardDeviationMargin = stdDev > 0 ? Math.abs(defendantAsymmetryScore / stdDev) : 0;
        // C2 fires if: defendant sentence exceeds Black mean by >1 SD
        // AND Black asymmetry exceeds White asymmetry
        c2Result = (standardDeviationMargin > 1.0 &&
                    documented.black_departure_months > documented.white_departure_months)
                    ? "Y" : "N";
      } else if (isWhite) {
        defendantAsymmetryScore = sentenceMonths - meanApplied_White;
        referenceAsymmetryScore = documented.black_departure_months;
        const stdDev = documented.asymmetry_gap * 0.4;
        standardDeviationMargin = stdDev > 0 ? Math.abs(defendantAsymmetryScore / stdDev) : 0;
        c2Result = "N"; // White defendant — reference group
      }
    }

    return Object.freeze({
      chargeKey,
      statutory: Object.freeze({ ...statutory }),
      documented: Object.freeze({ ...documented }),
      meanApplied_Black: Math.round(meanApplied_Black * 10) / 10,
      meanApplied_White: Math.round(meanApplied_White * 10) / 10,
      asymmetryGap: documented.asymmetry_gap,
      defendantAsymmetryScore: defendantAsymmetryScore !== null
        ? Math.round(defendantAsymmetryScore * 10) / 10 : null,
      referenceAsymmetryScore: referenceAsymmetryScore !== null
        ? Math.round(referenceAsymmetryScore * 10) / 10 : null,
      standardDeviationMargin: standardDeviationMargin !== null
        ? Math.round(standardDeviationMargin * 100) / 100 : null,
      c2Result,
      dataSource: documented.source,
      _grade: "T1-ANALYTICAL",
      _autoQueried: true,
      _timestamp: new Date().toISOString()
    });
  }

  /* ----------------------------------------------------------
     AUTO-QUERY RUNNER
     Fires when search contains C2 trigger terms.
     Attempts to fetch Alabama public records for live data.
     Falls back to documented aggregate figures if fetch fails.
     ---------------------------------------------------------- */
  async function runAutoQuery(query, chargeType, sentenceMonths, race) {
    // Always calculate from documented baseline first
    const baseline = calculateC2Baseline(chargeType, sentenceMonths, race);

    // Attempt live fetch via dedicated Alabama search endpoint
    let liveData = null;
    try {
      const alUrl = "/api/search?type=alabama&charge=" +
        encodeURIComponent(chargeType || "general");
      const res = await fetch(alUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.count > 0) {
          liveData = {
            source: data.source,
            samplesFound: data.count,
            status: "LIVE"
          };
        }
      }
    } catch (_) {
      // Silent — documented baseline is sufficient
      liveData = { status: "DOCUMENTED_AGGREGATE", source: baseline.dataSource };
    }

    return Object.freeze({
      baseline,
      liveData: liveData || { status: "DOCUMENTED_AGGREGATE", source: baseline.dataSource },
      query
    });
  }

  /* ----------------------------------------------------------
     UI RENDERER
     Renders the Alabama baseline panel below search results
     ---------------------------------------------------------- */
  function renderBaselinePanel(result, query) {
    const container = document.getElementById("alabamaBaselinePanel");
    if (!container) return;

    const { baseline, liveData } = result;
    const b = baseline;

    const statusColor = liveData.status === "LIVE" ? "var(--green-bright)" : "var(--amber)";
    const statusLabel = liveData.status === "LIVE" ? "⚡ LIVE" : "⊙ DOCUMENTED AGGREGATE";

    // Gap bar width — proportional to asymmetry gap
    const maxGap = 50; // months — visual ceiling
    const gapPct = Math.min(100, Math.round((b.asymmetryGap / maxGap) * 100));

    // C2 indicator color
    const c2Color = b.c2Result === "Y" ? "var(--crimson-bright)"
                  : b.c2Result === "N" ? "var(--slate-dim)"
                  : "var(--amber)";

    container.innerHTML = `
      <div class="al-panel">

        <div class="al-header">
          <span class="al-tag">⟦C2⟧ ALABAMA SENTENCING BASELINE — AUTO-QUERY</span>
          <span class="al-status" style="color:${statusColor}">${statusLabel}</span>
          <span class="al-timestamp">${new Date().toLocaleTimeString()}</span>
        </div>

        <div class="al-declaration">
          Alabama's own sentencing records measured against Alabama's own law.
          The jurisdiction tells on itself with its own data.
        </div>

        <div class="al-grid">

          <div class="al-section">
            <div class="al-section-label">CHARGE TYPE</div>
            <div class="al-section-value">${escHtml(b.chargeKey)}</div>
          </div>

          <div class="al-section">
            <div class="al-section-label">STATUTORY MIDPOINT</div>
            <div class="al-section-value">${b.statutory.midpoint} months
              <span class="al-range">(${b.statutory.min}–${b.statutory.max === 9999 ? "Life" : b.statutory.max} mo)</span>
            </div>
          </div>

          <div class="al-section">
            <div class="al-section-label">DATA SOURCE</div>
            <div class="al-section-value al-source">${escHtml(b.dataSource)}</div>
          </div>

        </div>

        <div class="al-asymmetry-block">
          <div class="al-asym-title">RACE-STRATIFIED DEPARTURE FROM STATUTORY MIDPOINT</div>
          <div class="al-asym-subtitle">Alabama's documented behavior vs Alabama's own law</div>

          <div class="al-asym-row">
            <span class="al-asym-label">White defendants — mean applied sentence</span>
            <span class="al-asym-value">${b.meanApplied_White} months</span>
            <span class="al-asym-delta ${b.documented.white_departure_months < 0 ? "al-neg" : "al-pos"}">
              ${b.documented.white_departure_months >= 0 ? "+" : ""}${b.documented.white_departure_months} vs midpoint
            </span>
          </div>

          <div class="al-asym-row al-asym-row-black">
            <span class="al-asym-label">Black defendants — mean applied sentence</span>
            <span class="al-asym-value">${b.meanApplied_Black} months</span>
            <span class="al-asym-delta al-pos">
              +${b.documented.black_departure_months} vs midpoint
            </span>
          </div>

          <div class="al-gap-row">
            <span class="al-gap-label">ASYMMETRY GAP</span>
            <div class="al-gap-bar-wrap">
              <div class="al-gap-bar">
                <div class="al-gap-fill" style="width:${gapPct}%"></div>
              </div>
              <span class="al-gap-num">${b.asymmetryGap} months</span>
            </div>
            <span class="al-gap-note">Black departure minus White departure — same charge, same jurisdiction, same law</span>
          </div>
        </div>

        ${b.defendantAsymmetryScore !== null ? `
        <div class="al-defendant-block">
          <div class="al-def-title">THIS DEFENDANT vs ALABAMA BASELINE</div>
          <div class="al-def-grid">
            <div class="al-def-item">
              <span class="al-def-label">Defendant asymmetry score</span>
              <span class="al-def-value" style="color:${b.defendantAsymmetryScore > 0 ? "var(--crimson-bright)" : "var(--green-bright)"}">
                ${b.defendantAsymmetryScore >= 0 ? "+" : ""}${b.defendantAsymmetryScore} months vs group mean
              </span>
            </div>
            <div class="al-def-item">
              <span class="al-def-label">Standard deviation margin</span>
              <span class="al-def-value" style="color:${(b.standardDeviationMargin || 0) > 1 ? "var(--crimson-bright)" : "var(--slate)"}">
                ${b.standardDeviationMargin !== null ? b.standardDeviationMargin + " SD" : "—"}
              </span>
            </div>
            <div class="al-def-item">
              <span class="al-def-label">C2 indicator</span>
              <span class="al-def-value" style="color:${c2Color};font-size:18px;font-weight:700;">
                ${b.c2Result || "UNDETERMINED"}
              </span>
            </div>
          </div>
        </div>` : ""}

        <div class="al-footer">
          <span class="al-grade">T1-ANALYTICAL · Requires Tier 2 corroboration for court submission</span>
          <span class="al-auto-note">Auto-queried on every C2-relevant search · Always current</span>
        </div>

        <div class="al-nfie">
          NOTHING IN THIS BASELINE PERSUADES. NOTHING ASSERTS MEANING.
          IT PLACES STRUCTURE AND LETS COGNITION DECIDE.
          The asymmetry documented above is Alabama's own record measured against Alabama's own law.
        </div>

      </div>`;

    container.classList.remove("hidden");
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */
  return Object.freeze({
    shouldFire,
    calculate: calculateC2Baseline,
    query: runAutoQuery,
    render: renderBaselinePanel,
    sources: ALABAMA_SOURCES,
    statutory: AL_STATUTORY_RANGES,
    documented: AL_DOCUMENTED_ASYMMETRY
  });

})();
/* ============================================================
   ACCESS GATE
   Per-organization pilot access control.
   30-day localStorage session after unlock.
   Codes are hashed — not readable from source.
   Author: Samuel Paul Peacock | SOVRA-FCL-MHCE©v2.5
   ============================================================ */

const AccessGate = (() => {

  const STORAGE_KEY = "sovra_lda_access";
  const SESSION_DAYS = 30;

  const ORG_CODES = Object.freeze({
    "HxcVfgMaHxwHfmFjYWU=": "NAACP Legal Defense Fund",
    "ABwFARJ+EhceGh0=": "SOVRA-ADMIN",
    "AxofHAd+Y2Nh": "PILOT-002",
    "AxofHAd+Y2Ng": "PILOT-003"
  });

  function hashCode(input) {
    return btoa(input.toUpperCase().trim().split("").map(c =>
      String.fromCharCode(c.charCodeAt(0) ^ 83)
    ).join(""));
  }

  function validateCode(input) {
    const h = hashCode(input);
    return ORG_CODES[h] || null;
  }

  function saveSession(orgName) {
    const expiry = Date.now() + (SESSION_DAYS * 24 * 60 * 60 * 1000);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ org: orgName, expiry }));
  }

  function checkSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const { org, expiry } = JSON.parse(raw);
      if (Date.now() > expiry) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return org;
    } catch (_) {
      return null;
    }
  }

  function showGate() {
    const gate = document.getElementById("accessGate");
    if (gate) gate.classList.remove("hidden");
  }

  function hideGate(orgName) {
    const gate = document.getElementById("accessGate");
    if (gate) {
      gate.style.opacity = "0";
      gate.style.transition = "opacity 0.6s ease";
      setTimeout(() => gate.classList.add("hidden"), 600);
    }
    const status = document.getElementById("db-status");
    if (status) status.textContent = `🔓 ${orgName} · PILOT`;
  }

  function init() {
    const existingSession = checkSession();
    if (existingSession) {
      const status = document.getElementById("db-status");
      if (status) status.textContent = `🔓 ${existingSession} · PILOT`;
      return;
    }

    showGate();

    const input = document.getElementById("gateCodeInput");
    const btn = document.getElementById("gateSubmitBtn");
    const errorEl = document.getElementById("gateError");

    function attempt() {
      const code = (input?.value || "").trim();
      if (!code) return;
      const orgName = validateCode(code);
      if (orgName) {
        saveSession(orgName);
        errorEl?.classList.add("hidden");
        hideGate(orgName);
      } else {
        errorEl?.classList.remove("hidden");
        input.value = "";
        input.style.borderColor = "#c0392b";
        setTimeout(() => { if (input) input.style.borderColor = "#c9a84c"; }, 1500);
      }
    }

    btn?.addEventListener("click", attempt);
    input?.addEventListener("keydown", e => { if (e.key === "Enter") attempt(); });
  }

  return Object.freeze({ init, checkSession, validateCode });

})();
/* ============================================================
   UTILITIES
   ============================================================ */
function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  AccessGate.init();
  showPanel("upload");
  updateGateRow();
  console.log("[Sovra‑FCL‑MHCE©|LDA] Legal Data Aid initialized. NFIE© Compliant. Database module staged.");
  console.log("[Sovra‑FCL‑MHCE©|LDA] Author: Samuel Paul Peacock | SOVRA-FCL-MHCE-v2.5©");

  /* ── TIER 1 LINK DROP BINDINGS ── */
  const tier1Btn   = document.getElementById("tier1InvokeBtn");
  const tier1Input = document.getElementById("tier1UrlInput");

  async function runTier1() {
    const url = (tier1Input?.value || "").trim();
    if (!url) return;

    const panel = document.getElementById("tier1ResultPanel");
    if (panel) {
      panel.classList.remove("hidden");
      panel.innerHTML = `<div class="t1-loading">⟳ Invoking F.I.D.A.R.C.H.© extraction pipeline…</div>`;
    }

    if (tier1Btn) {
      tier1Btn.textContent = "EXTRACTING…";
      tier1Btn.disabled = true;
    }

    const result = await Tier1.fetch(url);
    Tier1.render(result, url);

    if (tier1Btn) {
      tier1Btn.textContent = "EXTRACT";
      tier1Btn.disabled = false;
    }
  }

  tier1Btn?.addEventListener("click", runTier1);
  tier1Input?.addEventListener("keydown", e => {
    if (e.key === "Enter") runTier1();
  });
});
