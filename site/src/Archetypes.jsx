// ARCHETYPES TAB
// UMAP scatter + archetype detail + group filter

const GROUP_LABELS = {
  "non-prosaic": "Non-prosaic",
  "prosaic": "Prosaic",
  "novel": "Emergent / novel",
  "meta": "Meta-evidentiary",
};
const GROUP_COLORS = {
  "non-prosaic": "var(--accent)",
  "prosaic":     "var(--cool)",
  "novel":       "var(--green)",
  "meta":        "var(--text-2)",
};

function ArchetypesTab({ data, tt, selectedArchetype, onSelectArchetype }) {
  const [groupFilter, setGroupFilter] = useState("all");

  const filtered = useMemo(() =>
    groupFilter === "all" ? data.archetypes : data.archetypes.filter(a => a.group === groupFilter),
    [data.archetypes, groupFilter]);

  const selected = useMemo(() =>
    selectedArchetype ? data.archetypes.find(a => a.id === selectedArchetype) : null,
    [selectedArchetype, data.archetypes]);

  const relatedNarratives = useMemo(() =>
    selected ? data.narratives.filter(n => n.archetype === selected.id) : [],
    [selected, data.narratives]);

  return (
    <div className="col fade-in" style={{ gap: "var(--gap)" }}>

      <Panel idx="15"
             title="Narrative archetypes · UMAP projection"
             meta={`${data.headline.archetypes} clusters · ${fmt(data.headline.archetyped_reports)} reports archetyped (${fmtPct(data.headline.archetyped_pct)})`}>
        <div className="row" style={{ marginBottom: 14, alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div className="eyebrow">Filter by group:</div>
          <div className="seg">
            <button className={"btn" + (groupFilter === "all" ? " active" : "")} onClick={() => setGroupFilter("all")}>All</button>
            {Object.entries(GROUP_LABELS).map(([k, v]) => (
              <button key={k} className={"btn" + (groupFilter === k ? " active" : "")}
                      onClick={() => setGroupFilter(k)}
                      style={{ "--ac": GROUP_COLORS[k] }}>{v}</button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
            {Object.entries(GROUP_LABELS).map(([k, v]) => (
              <div key={k} className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 1, background: GROUP_COLORS[k] }} />
                {v}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-2-1">
          <ArchetypeScatter
            archetypes={data.archetypes}
            filtered={filtered}
            selectedId={selectedArchetype}
            onSelect={onSelectArchetype}
            tt={tt}
          />

          <div className="col" style={{ gap: 14 }}>
            {selected ? (
              <div>
                <div className="eyebrow" style={{ color: GROUP_COLORS[selected.group] }}>
                  {selected.id} · {GROUP_LABELS[selected.group]}
                </div>
                <h3 style={{ margin: "8px 0", fontFamily: "var(--f-serif)", fontSize: 22, fontWeight: 500 }}>
                  {selected.desc}
                </h3>
                <div className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
                  {fmt(selected.n)} reports · top shape: <b style={{ color: "var(--text-0)" }}>{selected.shape}</b>
                </div>
                <div className="divider" />
                <div className="eyebrow" style={{ marginBottom: 8 }}>Distinctive TF-IDF terms</div>
                <div className="narr-tags">
                  {selected.terms.map(t => <Tag key={t} tone="accent">{t}</Tag>)}
                </div>
                <div className="divider" />
                <div className="eyebrow" style={{ marginBottom: 8 }}>Sample narratives</div>
                {relatedNarratives.length > 0 ? relatedNarratives.map(n => (
                  <div key={n.id} style={{
                    padding: 12, marginBottom: 8,
                    background: "var(--bg-2)", borderLeft: "2px solid var(--accent)",
                    fontFamily: "var(--f-serif)", fontSize: 12.5, color: "var(--text-1)",
                    lineHeight: 1.55, fontStyle: "italic",
                  }}>
                    <div className="mono" style={{ fontSize: 9.5, color: "var(--text-3)", fontStyle: "normal", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.1 }}>
                      {n.date} · {n.place}
                    </div>
                    "{n.text.slice(0, 220)}{n.text.length > 220 ? "…" : ""}"
                  </div>
                )) : (
                  <div className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
                    No sample narrative tagged to this archetype in the public excerpt set.
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="eyebrow" style={{ marginBottom: 12 }}>Selection · pick a cluster</div>
                <p className="lede" style={{ fontSize: 14 }}>
                  Reduce 384-dim sentence embeddings to 25-dim with UMAP, then cluster with HDBSCAN
                  (min_cluster_size=200, min_samples=10). The result: <em>30 stable archetypes</em>
                  covering 36.2% of the corpus.
                </p>
                <div className="divider" />
                <p style={{ fontSize: 12.5, color: "var(--text-1)", lineHeight: 1.55 }}>
                  Hynek's "nocturnal light," "daylight disc," and "close encounter" types are recognizable here.
                  Two emergent categories — <b>sound-only encounters</b> and <b>animal-reaction reports</b> —
                  have no Hynek equivalent but form tight, coherent clusters.
                </p>
                <div className="divider" />
                <p style={{ fontSize: 12.5, color: "var(--text-1)", lineHeight: 1.55 }}>
                  Prosaic categories — meteors, drones, missile launches, balloons — separate
                  cleanly from non-prosaic ones rather than mixing.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="method-note" style={{ marginTop: 16 }}>
          The bimodal structure of the embedding space means that under sweep
          (min_cluster_size 100–500, min_samples 5–20), the cluster count ranges from 2 to 62.
          The 30 archetypes here are one resolution of the hierarchy; the prosaic/non-prosaic separation
          and the novel categories hold across min_samples=15–20.
        </div>
      </Panel>

      {/* Full archetype table */}
      <Panel idx="16"
             title="All archetypes · ranked by volume"
             meta="click any row to highlight in scatter">
        <table className="dt">
          <thead>
            <tr>
              <th>ID</th>
              <th>Description</th>
              <th>Group</th>
              <th>Top shape</th>
              <th>Distinctive terms</th>
              <th className="num">Reports</th>
              <th>Share</th>
            </tr>
          </thead>
          <tbody>
            {[...data.archetypes].sort((a, b) => b.n - a.n).map(a => {
              const pct = a.n / data.headline.archetyped_reports * 100;
              return (
                <tr key={a.id}
                    onClick={() => onSelectArchetype(a.id)}
                    style={{
                      background: selectedArchetype === a.id ? "var(--bg-2)" : undefined,
                      cursor: "default",
                    }}>
                  <td style={{ color: GROUP_COLORS[a.group], fontWeight: 600 }}>{a.id}</td>
                  <td style={{ color: "var(--text-0)" }}>{a.desc}</td>
                  <td>
                    <span style={{
                      fontSize: 10, padding: "1px 6px", borderRadius: 2,
                      background: GROUP_COLORS[a.group] + "33",
                      color: GROUP_COLORS[a.group],
                      letterSpacing: 0.06, textTransform: "uppercase",
                    }}>{GROUP_LABELS[a.group]}</span>
                  </td>
                  <td>{a.shape}</td>
                  <td style={{ color: "var(--text-2)" }}>{a.terms.slice(0, 3).join(", ")}</td>
                  <td className="num">{fmt(a.n)}</td>
                  <td style={{ width: 160 }}>
                    <div className="bar-track" style={{ height: 6 }}>
                      <div className="bar-fill" style={{
                        width: (pct / 9) * 100 + "%",
                        background: GROUP_COLORS[a.group],
                      }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function ArchetypeScatter({ archetypes, filtered, selectedId, onSelect, tt }) {
  const w = 720, h = 480;
  const pad = 40;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const maxN = Math.max(...archetypes.map(a => a.n));

  const filteredIds = new Set(filtered.map(a => a.id));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="archetype-scatter"
         style={{ background: "var(--bg-2)", border: "1px solid var(--border-1)", borderRadius: 6 }}>
      {/* Grid */}
      {[0.25, 0.5, 0.75].map(t => (
        <React.Fragment key={t}>
          <line x1={pad + innerW * t} y1={pad} x2={pad + innerW * t} y2={pad + innerH}
                stroke="var(--border-1)" strokeDasharray="2 3" opacity="0.6" />
          <line y1={pad + innerH * t} x1={pad} y2={pad + innerH * t} x2={pad + innerW}
                stroke="var(--border-1)" strokeDasharray="2 3" opacity="0.6" />
        </React.Fragment>
      ))}

      {/* Axes labels */}
      <text x={pad} y={h - 8} className="tl-lbl">← prosaic</text>
      <text x={pad + innerW} y={h - 8} textAnchor="end" className="tl-lbl">non-prosaic →</text>
      <text x={pad} y={pad - 12} className="tl-lbl">↑ novel</text>
      <text x={pad} y={h - pad + 14} className="tl-lbl">↓ generic</text>

      {/* axes lines */}
      <line x1={pad} y1={pad + innerH / 2} x2={pad + innerW} y2={pad + innerH / 2}
            stroke="var(--border-2)" strokeWidth="0.5" />
      <line x1={pad + innerW / 2} y1={pad} x2={pad + innerW / 2} y2={pad + innerH}
            stroke="var(--border-2)" strokeWidth="0.5" />

      {/* Bubbles */}
      {archetypes.map(a => {
        const cx = pad + a.x * innerW;
        const cy = pad + (1 - a.y) * innerH;
        const r = 6 + Math.sqrt(a.n / maxN) * 26;
        const inFilter = filteredIds.has(a.id);
        const isSel = selectedId === a.id;
        return (
          <g key={a.id}
             onClick={() => onSelect(a.id)}
             onMouseEnter={(e) => tt.show(e,
               <div>
                 <b>{a.id} — {a.desc}</b>
                 <div className="ttkv"><span>reports</span><b>{fmt(a.n)}</b></div>
                 <div className="ttkv"><span>top shape</span><b>{a.shape}</b></div>
                 <div className="ttkv"><span>group</span><b>{GROUP_LABELS[a.group]}</b></div>
                 <div style={{ marginTop: 4, color: "var(--text-2)" }}>{a.terms.slice(0, 3).join(" · ")}</div>
               </div>
             )}
             onMouseMove={(e) => tt.move(e)}
             onMouseLeave={tt.hide}>
            <circle cx={cx} cy={cy} r={r}
                    fill={GROUP_COLORS[a.group]}
                    fillOpacity={inFilter ? (isSel ? 0.85 : 0.55) : 0.10}
                    stroke={isSel ? "var(--accent)" : GROUP_COLORS[a.group]}
                    strokeWidth={isSel ? 2.5 : 1}
                    strokeOpacity={inFilter ? 0.9 : 0.2}
                    className="arch-bubble" />
            {a.n > 600 && inFilter && (
              <text x={cx} y={cy + 3} textAnchor="middle" className="arch-label"
                    style={{ fill: "var(--bg-0)", fontWeight: 600 }}>
                {a.id}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

window.ArchetypesTab = ArchetypesTab;
