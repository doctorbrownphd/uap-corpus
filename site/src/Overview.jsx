// OVERVIEW TAB — landing view
// Lede + reports/year timeline + shapes + geography + featured narratives

function OverviewTab({ data, tt, onJumpTab, onSelectState, onSelectArchetype, onSelectFlap }) {
  const [yearHover, setYearHover] = useState(null);
  const featuredFlags = [
    { date: "1947", label: "Arnold" },
    { date: "1997", label: "Phoenix" },
    { date: "2004", label: "Tinley Park" },
    { date: "2015", label: "Trident" },
    { date: "2020", label: "Starlink" },
  ];

  return (
    <div className="col fade-in" style={{ gap: "var(--gap)" }}>
      {/* LEDE */}
      <Panel idx="01" title="Corpus Overview" meta="all values from §2 / §3 of the source paper">
        <div className="row" style={{ alignItems: "flex-start", gap: 32 }}>
          <div style={{ flex: 2, minWidth: 0 }}>
            <p className="lede">
              The National UFO Reporting Center has logged <em>{fmt(data.headline.total_reports)}</em> first-person
              witness narratives since 1974. Treated as a sociolinguistic corpus, the text reveals
              statistical structure that is interpretable <em>regardless of one's beliefs</em> about
              the underlying phenomena — vocabulary that tracks cultural availability, independent
              witnesses converging on shared language, and 30 stable narrative archetypes.
            </p>
            <div className="row" style={{ marginTop: 18, gap: 18, flexWrap: "wrap" }}>
              <button className="btn" onClick={() => onJumpTab("vocabulary")}>
                <span style={{ color: "var(--accent)" }}>→</span> Era vocabulary
              </button>
              <button className="btn" onClick={() => onJumpTab("geography")}>
                <span style={{ color: "var(--accent)" }}>→</span> Map &amp; flaps
              </button>
              <button className="btn" onClick={() => onJumpTab("archetypes")}>
                <span style={{ color: "var(--accent)" }}>→</span> 30 archetypes
              </button>
              <button className="btn" onClick={() => onJumpTab("samenight")}>
                <span style={{ color: "var(--accent)" }}>→</span> Same-night clusters
              </button>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Two readings, one corpus</div>
            <div className="kvline">
              <span className="k">Cultural-priming</span>
              <span className="v" style={{ color: "var(--text-1)" }}>
                Witnesses describe what their culture has named.
              </span>
            </div>
            <div className="kvline">
              <span className="k">Observational</span>
              <span className="v" style={{ color: "var(--text-1)" }}>
                Witnesses describe similar things because they saw similar things.
              </span>
            </div>
            <div className="kvline" style={{ borderBottom: 0 }}>
              <span className="k">This paper</span>
              <span className="v" style={{ color: "var(--accent)" }}>
                Documents structure. Does not adjudicate.
              </span>
            </div>
          </div>
        </div>
      </Panel>

      {/* TIMELINE */}
      <Panel idx="02"
             title="Reports per year · 1945–2023"
             meta={`peak ${data.headline.peak_year} · ${fmt(data.headline.peak_year_reports)} reports`}>
        <YearlyTimeline yearly={data.yearly} eras={data.eras} flags={featuredFlags}
                        h={260}
                        selectedYear={yearHover?.year}
                        onYearHover={(e, d) => { setYearHover(d); tt.show(e,
                          <div>
                            <b>{d.year}</b>
                            <div className="ttkv"><span>reports</span><b>{fmt(d.count)}</b></div>
                            <div className="ttkv"><span>share of corpus</span><b>{fmtPct(d.count / data.headline.total_reports * 100)}</b></div>
                          </div>
                        ); }}
                        onYearLeave={() => { setYearHover(null); tt.hide(); }} />
        <div className="method-note" style={{ marginTop: 14, borderTop: 0, padding: "10px 0", background: "transparent" }}>
          Volume tracks internet adoption. The 2010s alone account for {fmt(data.headline.decade_2010s)} reports
          ({fmtPct(data.headline.decade_2010s / data.headline.total_reports * 100)} of the corpus). All temporal
          analyses use rates per 1,000 reports, not raw counts, to correct for this recency bias.
        </div>
      </Panel>

      {/* ERAS */}
      <Panel idx="03"
             title="Five cultural eras"
             meta="vocabulary peaks dated from witness language alone">
        <EraRibbon eras={data.eras} />
      </Panel>

      {/* SHAPES + GEOGRAPHY */}
      <div className="grid grid-2">
        <Panel idx="04"
               title="Reported shapes"
               meta={`${data.headline.shape_categories} normalized categories`}>
          <BarList
            data={data.shapes.slice(0, 15)}
            getLabel={(d) => d.shape}
            getValue={(d) => d.count}
            getDisplay={(d) => fmt(d.count)}
            accent="accent"
            onHover={(e, d) => tt.show(e,
              <div>
                <b>{d.shape}</b>
                <div className="ttkv"><span>reports</span><b>{fmt(d.count)}</b></div>
                <div className="ttkv"><span>share</span><b>{fmtPct(d.pct)}</b></div>
              </div>
            )}
            onLeave={tt.hide}
          />
          <div className="method-note" style={{ marginTop: 14, borderTop: 0, padding: "10px 0", background: "transparent" }}>
            "Light" dominates because at night, most witnesses can describe luminosity and movement but not solid geometry.
          </div>
        </Panel>

        <Panel idx="05"
               title="Geographic distribution"
               meta="all 50 states + DC · 85.9% city-matched">
          <USMap stateData={data.states} mode="count"
                 onHover={(e, s) => tt.show(e,
                   <div>
                     <b>{s.name || s.st} ({s.st})</b>
                     <div className="ttkv"><span>reports</span><b>{fmt(s.count)}</b></div>
                     <div className="ttkv"><span>per-capita anomaly</span><b>{(s.anom || 1).toFixed(2)}×</b></div>
                   </div>
                 )}
                 onLeave={tt.hide}
                 onClick={onSelectState} />
          <div className="row" style={{ marginTop: 14, gap: 16, flexWrap: "wrap" }}>
            {data.states.slice(0, 4).map(s => (
              <div key={s.st} style={{ flex: 1, minWidth: 120 }}>
                <div className="eyebrow">{s.st} · {s.name}</div>
                <div style={{ fontFamily: "var(--f-serif)", fontSize: 20, color: "var(--text-0)" }}>
                  {fmt(s.count)}
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--text-2)" }}>
                  {s.anom > 1.5 ? `${s.anom.toFixed(1)}× anomaly` : `${fmtPct(s.count / data.headline.total_reports * 100)} of corpus`}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* FEATURED NARRATIVES */}
      <Panel idx="06"
             title="Three representative narratives"
             meta="excerpts §2 — preserved as-filed">
        <div className="grid grid-3">
          {data.narratives.slice(0, 3).map(n => (
            <div className="narr" key={n.id}>
              <div className="narr-head">
                <span className="narr-id">{n.id}</span>
                <span>·</span>
                <span>{n.date}</span>
                <span>·</span>
                <span>{n.place}</span>
              </div>
              <div className="narr-text">"{n.text}"</div>
              <div className="narr-tags">
                <Tag tone="accent">{n.shape}</Tag>
                <Tag>archetype {n.archetype}</Tag>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, textAlign: "right" }}>
          <button className="btn" onClick={() => onJumpTab("narratives")}>
            → All {data.narratives.length} sample narratives
          </button>
        </div>
      </Panel>

      {/* PIPELINE */}
      <Panel idx="07"
             title="Pipeline · 10 stages"
             meta="idempotent · MIT-licensed · reproducible from `make all`">
        <div className="pipe">
          {data.pipeline.map(p => (
            <div className="pipe-step" key={p.step}>
              <div className="pipe-num">▸ STEP {String(p.step).padStart(2, "0")}</div>
              <div className="pipe-name">{p.name}</div>
              <div className="pipe-desc">{p.desc}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

window.OverviewTab = OverviewTab;
