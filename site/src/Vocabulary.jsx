// ERA VOCABULARY HEATMAP TAB

const ERA_HUE = { saucer: 60, abduction: 25, triangle: 295, orange: 50, disclosure: 175 };
const ERA_LABEL = {
  saucer: "Saucer", abduction: "Abduction", triangle: "Triangle",
  orange: "Orange-orb", disclosure: "Post-disclosure"
};

function VocabularyTab({ data, tt }) {
  const [selectedTerm, setSelectedTerm] = useState(data.vocab[0]);
  const [filter, setFilter] = useState("all");
  const [colorMode, setColorMode] = useState("era"); // 'era' or 'amber'

  const filtered = useMemo(() =>
    filter === "all" ? data.vocab : data.vocab.filter(v => v.era === filter),
    [data.vocab, filter]);

  const corpusPeak = Math.max(...data.vocab.map(t => Math.max(...t.rates)));

  // grid template: row label | one column per bin
  const cols = data.bins.length;
  const gridTemplate = `190px repeat(${cols}, 1fr)`;

  return (
    <div className="col fade-in" style={{ gap: "var(--gap)" }}>

      <Panel idx="08"
             title="Era vocabulary heatmap · 55 terms × 5-year bins"
             meta="rate per 1,000 reports · normalized per term">
        <div className="row" style={{ alignItems: "center", marginBottom: 14, gap: 16, flexWrap: "wrap" }}>
          <div className="eyebrow">Filter by era:</div>
          <div className="seg">
            <button className={"btn" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>All</button>
            {Object.entries(ERA_LABEL).map(([k, v]) => (
              <button key={k} className={"btn" + (filter === k ? " active" : "")}
                      onClick={() => setFilter(k)}>{v}</button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div className="eyebrow">Color:</div>
          <div className="seg">
            <button className={"btn" + (colorMode === "era" ? " active" : "")} onClick={() => setColorMode("era")}>Per era</button>
            <button className={"btn" + (colorMode === "amber" ? " active" : "")} onClick={() => setColorMode("amber")}>Amber</button>
          </div>
        </div>

        <div className="heatmap" style={{ gridTemplateColumns: gridTemplate }}>
          {/* Header row */}
          <div />
          {data.bins.map(b => (
            <div key={b} style={{
              fontFamily: "var(--f-mono)", fontSize: 9.5,
              color: "var(--text-2)", textAlign: "center", paddingBottom: 4,
            }}>{b}</div>
          ))}

          {/* term rows */}
          {filtered.map((term, i) => {
            const peak = Math.max(...term.rates);
            const hue = colorMode === "era" ? ERA_HUE[term.era] : 75;
            const isSelected = selectedTerm?.term === term.term;
            return (
              <React.Fragment key={term.term}>
                <div className="hm-row-lbl"
                     onClick={() => setSelectedTerm(term)}
                     style={{
                       cursor: "default",
                       color: isSelected ? "var(--accent)" : "var(--text-1)",
                       fontWeight: isSelected ? 600 : 400,
                       borderRight: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
                     }}>
                  <span style={{
                    display: "inline-block", width: 6, height: 6, borderRadius: 1,
                    background: `oklch(0.7 0.14 ${ERA_HUE[term.era]})`,
                    marginRight: 8,
                  }} />
                  {term.term}
                </div>
                {term.rates.map((v, j) => (
                  <div key={j}
                       className="hm-cell"
                       style={{ background: heatColor(v, peak, hue) }}
                       onMouseEnter={(e) => tt.show(e,
                         <div>
                           <b>"{term.term}"</b>
                           <div className="ttkv"><span>bin start</span><b>{data.bins[j]}</b></div>
                           <div className="ttkv"><span>rate</span><b>{v}/1k</b></div>
                           <div className="ttkv"><span>era</span><b>{ERA_LABEL[term.era]}</b></div>
                         </div>
                       )}
                       onMouseMove={(e) => tt.move(e)}
                       onMouseLeave={tt.hide}
                       onClick={() => setSelectedTerm(term)} />
                ))}
              </React.Fragment>
            );
          })}
        </div>

        <div className="method-note" style={{ marginTop: 16 }}>
          Each row is normalized to its own peak. Color intensity reflects <i>relative</i> usage of that term over time, not absolute rate.
          Click a term to see its curve in detail. The pattern is unambiguous: witnesses use the words their culture provides.
        </div>
      </Panel>

      {/* Detail for selected term */}
      <div className="grid grid-2-1">
        <Panel idx="09" title={`"${selectedTerm.term}" · rate per 1,000 reports`}
               meta={`peak ${selectedTerm.peak} · ${ERA_LABEL[selectedTerm.era]} era`}>
          <TermCurve term={selectedTerm} bins={data.bins} eras={data.eras} tt={tt} />
        </Panel>
        <Panel idx="10" title="What this means" meta="caveats below">
          <div className="lede" style={{ fontSize: 15 }}>
            "{selectedTerm.term}" peaks during the <em>{ERA_LABEL[selectedTerm.era]}</em> era
            ({selectedTerm.peak}) at a rate of <em>{Math.max(...selectedTerm.rates)} per 1,000 reports</em>,
            its lowest at <em>{Math.min(...selectedTerm.rates)}/1k</em>.
          </div>
          <div className="divider" />
          <div className="kvline">
            <span className="k">first non-zero bin</span>
            <span className="v">{data.bins[selectedTerm.rates.findIndex(r => r > 0)] || "—"}</span>
          </div>
          <div className="kvline">
            <span className="k">peak bin</span>
            <span className="v">{data.bins[selectedTerm.rates.indexOf(Math.max(...selectedTerm.rates))]}</span>
          </div>
          <div className="kvline">
            <span className="k">peak rate</span>
            <span className="v" style={{ color: "var(--accent)" }}>{Math.max(...selectedTerm.rates)}/1k</span>
          </div>
          <div className="kvline">
            <span className="k">era cohort</span>
            <span className="v">{ERA_LABEL[selectedTerm.era]}</span>
          </div>
        </Panel>
      </div>

      {/* ERAS DETAIL */}
      <Panel idx="11" title="The eras, in the words of witnesses" meta="excerpts from §4 of the paper">
        <div className="grid grid-3" style={{ gap: 16 }}>
          {ERA_EXPLAINERS.map(e => (
            <div key={e.era} style={{
              borderTop: `3px solid oklch(0.74 0.13 ${ERA_HUE[e.era]})`,
              padding: "14px 16px",
              background: "var(--bg-2)",
            }}>
              <div className="eyebrow" style={{ color: `oklch(0.78 0.13 ${ERA_HUE[e.era]})` }}>{e.years} · {ERA_LABEL[e.era].toUpperCase()}</div>
              <h4 style={{ margin: "8px 0 8px", fontFamily: "var(--f-serif)", fontSize: 17, fontWeight: 500 }}>{e.title}</h4>
              <p style={{ fontSize: 12.5, color: "var(--text-1)", lineHeight: 1.55, margin: 0 }}>{e.body}</p>
              <div className="narr-tags" style={{ marginTop: 12 }}>
                {e.terms.map(t => <Tag key={t} tone="accent">{t}</Tag>)}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

const ERA_EXPLAINERS = [
  { era: "saucer", years: "1947–1965", title: "The saucer era",
    terms: ["flying saucer", "disc", "cigar"],
    body: "“Flying saucer” enters American English with Kenneth Arnold's June 1947 report. “Disc” and “saucer” peak at 179 and 141 per 1k in the early 1950s. The terms didn't disappear because saucer shapes stopped being reported — witnesses stopped using those words." },
  { era: "abduction", years: "1965–1985", title: "The abduction era",
    terms: ["hovering", "abduction", "missing time", "silent"],
    body: "“Hovering” peaks at 287/1k in the 1970s. “Missing time” — diagnostic of abduction narratives after Budd Hopkins's 1981 book — spikes at 15/1k in the mid-1980s, exactly when Hopkins and Strieber were publishing." },
  { era: "triangle", years: "1982–2000", title: "The triangle era",
    terms: ["triangle", "chevron", "boomerang"],
    body: "“Triangle” and “triangular” together peak at 196/1k in the 1990s, coinciding with the Belgian wave (1989–90), Hudson Valley (1982–86), and the Phoenix Lights (1997). The black triangle enters the lexicon as a primary shape category." },
  { era: "orange", years: "2005–2020", title: "The orange-orb era",
    terms: ["orange", "fireball", "chinese lantern"],
    body: "“Orange” explodes to 269/1k in the 2010s, up from near zero before 2000. “Chinese lantern” appears for the first time at 11/1k — a term that literally did not exist in UFO reporting before sky lanterns became commercially available around 2008." },
  { era: "disclosure", years: "2017–present", title: "The post-disclosure era",
    terms: ["drone", "tic-tac", "starlink", "UAP"],
    body: "“Drone” reaches 61/1k in the 2020s. “Tic-tac” — a term coined by Navy pilots in 2004 but not public until the 2017 NYT disclosure — appears at 12/1k. “Starlink” at 19/1k. “Orb” reaches 61/1k, notably used in congressional testimony." },
];

// ── Term curve ────────────────────────────────────────────────────────
function TermCurve({ term, bins, eras, tt }) {
  const w = 720, h = 220;
  const pad = { l: 44, r: 16, t: 20, b: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const max = Math.max(...term.rates, 1);
  const x = (i) => pad.l + (i / (bins.length - 1)) * innerW;
  const y = (v) => pad.t + (1 - v / max) * innerH;
  const pts = term.rates.map((v, i) => [x(i), y(v)]);
  const d = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const dArea = d + ` L ${pad.l + innerW},${pad.t + innerH} L ${pad.l},${pad.t + innerH} Z`;

  // map bins to year ranges; place era bands
  const yearMin = bins[0];
  const yearMax = bins[bins.length - 1] + 5;
  const xYear = (yr) => pad.l + ((yr - yearMin) / (yearMax - yearMin)) * innerW;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
      {/* era bands */}
      {eras.map((e, i) => (
        <rect key={i} x={xYear(e.start)} y={pad.t} width={xYear(e.end) - xYear(e.start)} height={innerH}
              fill={`var(--era-${e.color})`} opacity="0.07" />
      ))}
      {/* gridlines */}
      {[0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={pad.l} x2={pad.l + innerW} y1={pad.t + innerH * (1 - t)} y2={pad.t + innerH * (1 - t)}
              className="tl-grid" />
      ))}
      {/* area + line */}
      <path d={dArea} fill="var(--accent-soft)" />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" />
      {/* dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="var(--bg-0)" stroke="var(--accent)" strokeWidth="1.5"
                onMouseEnter={(e) => tt.show(e,
                  <div><b>{bins[i]}–{bins[i] + 4}</b><div className="ttkv"><span>rate</span><b>{term.rates[i]}/1k</b></div></div>
                )}
                onMouseMove={(e) => tt.move(e)}
                onMouseLeave={tt.hide} />
      ))}
      {/* axis */}
      <line x1={pad.l} y1={pad.t + innerH} x2={pad.l + innerW} y2={pad.t + innerH} className="tl-axis" />
      {bins.filter((_, i) => i % 2 === 0).map(b => (
        <text key={b} x={xYear(b + 2.5)} y={pad.t + innerH + 16} textAnchor="middle" className="tl-lbl">{b}</text>
      ))}
      {[0, max / 2, max].map((v, i) => (
        <text key={i} x={pad.l - 8} y={y(v) + 3} textAnchor="end" className="tl-lbl">{Math.round(v)}/1k</text>
      ))}
    </svg>
  );
}

window.VocabularyTab = VocabularyTab;
