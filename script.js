/* ============================================================
   SOVRA-FCL-LDA — Legal Data Aid
   Author: Samuel Paul Peacock | NFIE Compliant | March 2026
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
   F.I.D.A.R.C.H. Legal Document Extraction Pipeline
   Evidentiary Grade: T1-ANALYTICAL
   NFIE Compliant — fetches, measures, reports. Does not conclude.
   Author: Samuel Paul Peacock | SOVRA-FCL-MHCE-v2.5
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
  function extractLegalFields(text, url) {
    const race       = extractDefendantRace(text);
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

    // Count populated fields for completeness score
    const fields = [race, charge, sentence, judge, jurisdiction, defense, plea, c1, c2, c3];
    const populated = fields.filter(f => f !== null).length;
    const completeness = Math.round((populated / fields.length) * 100);

    return {
      Case_ID:                   caseId,
      Race:                      race         || "UNDETERMINED",
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
     FETCH PIPELINE — routes through FIDARCH relay
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

      // Strip HTML — reuse FIDARCH extraction logic
      const readable = data.html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
        .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
        .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const fields = extractLegalFields(readable, url);

      return {
        ok: true,
        fields,
        host: data.host,
        wordCount: readable.split(/\s+/).length
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
            ["Case ID",       f.Case_ID],
            ["Race",          f.Race],
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
  showPanel("upload");
  updateGateRow();
  console.log("[SOVRA-FCL-LDA] Legal Data Aid initialized. NFIE Compliant. Database module staged.");
  console.log("[SOVRA-FCL-LDA] Author: Samuel Paul Peacock | SOVRA-FCL-MHCE-v2.5");

  /* ── TIER 1 LINK DROP BINDINGS ── */
  const tier1Btn   = document.getElementById("tier1InvokeBtn");
  const tier1Input = document.getElementById("tier1UrlInput");

  async function runTier1() {
    const url = (tier1Input?.value || "").trim();
    if (!url) return;

    const panel = document.getElementById("tier1ResultPanel");
    if (panel) {
      panel.classList.remove("hidden");
      panel.innerHTML = `<div class="t1-loading">⟳ Invoking F.I.D.A.R.C.H. extraction pipeline…</div>`;
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
