// VALIDATION + SIGNATURE PHRASES TAB

const METHODS = [
  { key: "SN", name: "Same-night",    desc: "Embedding cluster on shared date" },
  { key: "FL", name: "Flap",          desc: "3× weekly baseline detection" },
  { key: "SP", name: "Signature",     desc: "N-gram lift vs corpus" },
  { key: "SD", name: "Shape",         desc: "Distinctive shape distribution" },
];

function ValidationTab({ data, tt }) {
  const totalsByMethod = METHODS.map(m => ({
    ...m, count: data.validation.filter(v => v[m.key]).length,
  }));

  return (
    <div className="col fade-in" style={{ gap: "var(--gap)" }}>

      <Panel idx="19"
             title="Validation · 10 reference events × 4 detection methods"
             meta="all 10 pass ≥ 2/4 · 7 pass ≥ 3/4">
        <p className="lede" style={{ marginBottom: 16 }}>
          Five historically prominent sightings (Phoenix Lights, Tinley Park, Stephenville, O'Hare, Hudson Valley) and
          five events with known physical triggers (Trident missile test, SpaceX Vandenberg launch, Leonid meteors,
          Starlink trains, July 4th lanterns). For each, we ask whether four independent detection methods surface
          the event <em>without guidance</em>.
        </p>

        {/* Method legend */}
        <div className="row" style={{ marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
          {totalsByMethod.map(m => (
            <div key={m.key} style={{
              flex: 1, minWidth: 180,
              padding: 12, background: "var(--bg-2)",
              borderTop: "2px solid var(--green)",
            }}>
              <div className="eyebrow" style={{ color: "var(--green)" }}>method · {m.key}</div>
              <div style={{ fontFamily: "var(--f-serif)", fontSize: 18, color: "var(--text-0)" }}>{m.name}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--text-2)", marginTop: 4 }}>{m.desc}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--accent)", marginTop: 8 }}>
                {m.count} / 10 events detected
              </div>
            </div>
          ))}
        </div>

        {/* Matrix */}
        <div className="vmatrix" style={{ gridTemplateColumns: "1.5fr 0.5fr repeat(4, 0.7fr) 0.6fr" }}>
          <div className="vm-cell hdr event">Event</div>
          <div className="vm-cell hdr">Year</div>
          {METHODS.map(m => <div key={m.key} className="vm-cell hdr">{m.name}</div>)}
          <div className="vm-cell hdr">Score</div>

          {data.validation.map((v, i) => {
            const score = METHODS.filter(m => v[m.key]).length;
            return (
              <React.Fragment key={i}>
                <div className="vm-cell event">
                  <span style={{
                    marginRight: 10,
                    fontSize: 9, padding: "1px 5px", borderRadius: 2,
                    background: v.kind === "triggered" ? "var(--cool)" : "var(--accent-soft)",
                    color: v.kind === "triggered" ? "var(--bg-0)" : "var(--accent)",
                    letterSpacing: 0.08, textTransform: "uppercase",
                    fontFamily: "var(--f-mono)",
                  }}>{v.kind === "triggered" ? "trigger" : "historic"}</span>
                  {v.event}
                </div>
                <div className="vm-cell">{v.year}</div>
                {METHODS.map(m => (
                  <div key={m.key} className="vm-cell">
                    {v[m.key]
                      ? <span className="vchk">●</span>
                      : <span className="vmiss">○</span>}
                  </div>
                ))}
                <div className="vm-cell" style={{
                  color: score >= 3 ? "var(--green)" : score >= 2 ? "var(--accent)" : "var(--red)",
                  fontWeight: 600,
                }}>{score}/4</div>
              </React.Fragment>
            );
          })}
        </div>

        <div className="method-note" style={{ marginTop: 18 }}>
          Detection misses are individually interpretable: Stephenville's reports were distributed across multiple weeks
          rather than concentrated into a single flap; O'Hare's witnesses described a single hovering disc, which the
          shape filter could not distinguish from the "circle" baseline; Hudson Valley's wave spanned several years,
          too diffuse for the weekly flap detector.
        </div>
      </Panel>

      {/* Signature phrases */}
      <Panel idx="20"
             title="Signature phrases · linguistic fingerprints"
             meta="lift = event rate ÷ corpus baseline rate">
        <p className="lede" style={{ fontSize: 14, marginBottom: 18 }}>
          Each well-documented event produces a distinctive phrase profile — bigrams and trigrams that appear at
          elevated rates in event reports compared to the corpus baseline. The Tinley Park fingerprint produces the
          highest lifts in the corpus: <em>"tinley park"</em> at 391× and <em>"red lights"</em> at 15×.
          Witnesses converge on nearly identical language independently.
        </p>

        <table className="dt">
          <thead>
            <tr>
              <th>Event</th>
              <th>Phrase</th>
              <th className="num">Event rate</th>
              <th className="num">Baseline</th>
              <th className="num">Lift</th>
              <th>Intensity</th>
            </tr>
          </thead>
          <tbody>
            {data.signaturePhrases.map((p, i) => {
              const maxLift = Math.max(...data.signaturePhrases.map(x => x.lift));
              const pct = (p.lift / maxLift) * 100;
              return (
                <tr key={i}>
                  <td style={{ color: "var(--text-0)" }}>{p.event}</td>
                  <td style={{ fontFamily: "var(--f-mono)", fontStyle: "italic", color: "var(--accent)" }}>"{p.phrase}"</td>
                  <td className="num">{p.eventRate.toFixed(1)}%</td>
                  <td className="num">{p.baseline.toFixed(1)}%</td>
                  <td className="num lift">{p.lift}×</td>
                  <td style={{ width: 220 }}>
                    <div className="bar-track" style={{ height: 8 }}>
                      <div className="bar-fill" style={{ width: pct + "%" }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="method-note" style={{ marginTop: 18 }}>
          The Starlink signature is linguistically noteworthy: it contains phrases witnesses <i>improvised</i> to describe a phenomenon no one
          had words for yet — "evenly spaced," "single file," "straight line." These are not UFO terms; they are descriptive inventions
          for a novel visual experience.
        </div>
      </Panel>
    </div>
  );
}

window.ValidationTab = ValidationTab;
