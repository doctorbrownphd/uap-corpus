// GEOGRAPHY & FLAPS TAB
// Combined map view with flap detection table and state detail

function GeographyTab({ data, tt, selectedState, onSelectState }) {
  const [mapMode, setMapMode] = useState("count"); // 'count' or 'anom'
  const [flapFilter, setFlapFilter] = useState("all");

  const stateData = useMemo(() =>
    selectedState ? data.states.find(s => s.st === selectedState) : null,
    [selectedState, data.states]);

  const stateFlaps = useMemo(() =>
    selectedState ? data.flaps.filter(f => f.st === selectedState) : data.flaps,
    [selectedState, data.flaps]);

  const filteredFlaps = useMemo(() => {
    let f = stateFlaps;
    if (flapFilter !== "all") f = f.filter(x => x.shape === flapFilter);
    return f;
  }, [stateFlaps, flapFilter]);

  const shapesInFlaps = useMemo(() =>
    [...new Set(data.flaps.map(f => f.shape))], [data.flaps]);

  return (
    <div className="col fade-in" style={{ gap: "var(--gap)" }}>

      {/* Map + state detail */}
      <div className="grid grid-2-1">
        <Panel idx="12"
               title="Reports by state"
               meta={`mode: ${mapMode === "count" ? "absolute volume" : "per-capita anomaly factor"}`}>
          <div className="row" style={{ marginBottom: 14, alignItems: "center", gap: 16 }}>
            <div className="eyebrow">Color scale:</div>
            <div className="seg">
              <button className={"btn" + (mapMode === "count" ? " active" : "")} onClick={() => setMapMode("count")}>Report count</button>
              <button className={"btn" + (mapMode === "anom" ? " active" : "")} onClick={() => setMapMode("anom")}>Per-capita anomaly</button>
            </div>
            {selectedState && (
              <button className="btn" style={{ marginLeft: "auto" }}
                      onClick={() => onSelectState(null)}>Clear selection ✕</button>
            )}
          </div>
          <USMap stateData={data.states} mode={mapMode}
                 active={selectedState}
                 onHover={(e, s) => tt.show(e,
                   <div>
                     <b>{s.name || s.st} ({s.st})</b>
                     <div className="ttkv"><span>reports</span><b>{fmt(s.count)}</b></div>
                     <div className="ttkv"><span>per-capita anomaly</span>
                       <b style={{ color: (s.anom || 1) > 1.5 ? "var(--accent)" : "var(--text-0)" }}>{(s.anom || 1).toFixed(2)}×</b></div>
                     <div className="ttkv"><span>click to filter ↓</span><b>—</b></div>
                   </div>
                 )}
                 onLeave={tt.hide}
                 onClick={onSelectState} />

          <div className="method-note" style={{ marginTop: 14 }}>
            Click any state to filter the flap table below. Washington's 3.1× anomaly is attributable to Arnold's 1947 sighting being filed there
            and to NUFORC's physical location near Seattle.
          </div>
        </Panel>

        <Panel idx="13"
               title={selectedState ? `${stateData.name} detail` : "Top states · ranked"}
               meta={selectedState ? `${selectedState}` : "by report count"}>
          {selectedState ? (
            <div className="col" style={{ gap: 14 }}>
              <div>
                <div className="eyebrow">total reports</div>
                <div className="serif" style={{ fontSize: 38, lineHeight: 1.05, color: "var(--text-0)" }}>{fmt(stateData.count)}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--text-2)" }}>
                  {fmtPct(stateData.count / data.headline.total_reports * 100)} of the corpus
                </div>
              </div>
              <div className="divider" />
              <div className="kvline">
                <span className="k">rank</span>
                <span className="v">#{data.states.sort((a,b)=>b.count-a.count).findIndex(s=>s.st===selectedState)+1} of 51</span>
              </div>
              <div className="kvline">
                <span className="k">population</span>
                <span className="v">{stateData.pop}M</span>
              </div>
              <div className="kvline">
                <span className="k">per-capita anomaly</span>
                <span className="v" style={{ color: stateData.anom > 1.5 ? "var(--accent)" : "var(--text-0)" }}>
                  {stateData.anom.toFixed(2)}×
                </span>
              </div>
              <div className="kvline">
                <span className="k">flaps detected</span>
                <span className="v">{stateFlaps.length}</span>
              </div>
              {stateFlaps.length > 0 && (
                <div className="kvline">
                  <span className="k">top flap</span>
                  <span className="v">{stateFlaps[0].event} · {stateFlaps[0].ratio}×</span>
                </div>
              )}
            </div>
          ) : (
            <BarList
              data={data.states.slice(0, 10)}
              getLabel={(s) => s.st}
              getValue={(s) => s.count}
              getDisplay={(s) => fmt(s.count)}
              onHover={(e, s) => tt.show(e,
                <div>
                  <b>{s.name}</b>
                  <div className="ttkv"><span>reports</span><b>{fmt(s.count)}</b></div>
                  <div className="ttkv"><span>anomaly</span><b>{s.anom.toFixed(2)}×</b></div>
                </div>
              )}
              onLeave={tt.hide}
            />
          )}
        </Panel>
      </div>

      {/* Flap detector */}
      <Panel idx="14"
             title="Flap detector · top events"
             meta={`${data.headline.flaps_detected} detected · 3× weekly baseline · 1-day median half-life`}>
        <div className="row" style={{ marginBottom: 12, alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div className="eyebrow">Filter by shape:</div>
          <div className="seg">
            <button className={"btn" + (flapFilter === "all" ? " active" : "")} onClick={() => setFlapFilter("all")}>All shapes</button>
            {shapesInFlaps.map(s => (
              <button key={s} className={"btn" + (flapFilter === s ? " active" : "")}
                      onClick={() => setFlapFilter(s)}>{s}</button>
            ))}
          </div>
          {(selectedState || flapFilter !== "all") && (
            <div className="eyebrow" style={{ color: "var(--accent)", marginLeft: "auto" }}>
              showing {filteredFlaps.length} of {data.flaps.length}
            </div>
          )}
        </div>

        <table className="dt">
          <thead>
            <tr>
              <th>Rank</th>
              <th>State</th>
              <th>Date</th>
              <th>Event</th>
              <th>Shape</th>
              <th className="num">Reports</th>
              <th className="num">Ratio</th>
              <th>Intensity</th>
            </tr>
          </thead>
          <tbody>
            {filteredFlaps.map((f, i) => {
              const ratioMax = 28;
              const pct = (f.ratio / ratioMax) * 100;
              return (
                <tr key={i} onMouseEnter={(e) => tt.show(e,
                  <div>
                    <b>{f.event}</b>
                    <div className="ttkv"><span>state · date</span><b>{f.st} · {f.date}</b></div>
                    <div className="ttkv"><span>reports in flap</span><b>{f.reports}</b></div>
                    <div className="ttkv"><span>vs baseline</span><b style={{ color: "var(--accent)" }}>{f.ratio}×</b></div>
                  </div>
                )} onMouseMove={(e) => tt.move(e)} onMouseLeave={tt.hide}>
                  <td className="num" style={{ color: "var(--text-3)" }}>#{f.rank}</td>
                  <td>
                    <button className="btn" style={{ padding: "2px 8px", fontSize: 10 }}
                            onClick={() => onSelectState(f.st)}>{f.st}</button>
                  </td>
                  <td>{f.date}</td>
                  <td style={{ color: "var(--text-0)" }}>{f.event}</td>
                  <td><Tag>{f.shape}</Tag></td>
                  <td className="num">{f.reports}</td>
                  <td className="num lift">{f.ratio.toFixed(1)}×</td>
                  <td style={{ width: 180 }}>
                    <div className="bar-track" style={{ height: 8 }}>
                      <div className="bar-fill" style={{ width: pct + "%" }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="method-note" style={{ marginTop: 14 }}>
          A flap is a week where state-level reporting exceeds 3× its annual baseline. 530 detected across 1990–2023, with a median duration of 7 days and a median half-life of 1 day — flaps do not self-sustain.
          The Phoenix Lights flap is the highest-intensity event in the corpus regardless of threshold choice.
        </div>
      </Panel>
    </div>
  );
}

window.GeographyTab = GeographyTab;
