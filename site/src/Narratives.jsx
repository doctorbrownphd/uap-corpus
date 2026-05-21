// NARRATIVES READER TAB

function NarrativesTab({ data, tt, query, onJumpTab, onSelectArchetype }) {
  const [shapeFilter, setShapeFilter] = useState("all");
  const [sortMode, setSortMode] = useState("date");

  const shapes = useMemo(() =>
    [...new Set(data.narratives.map(n => n.shape))], [data.narratives]);

  const filtered = useMemo(() => {
    let arr = data.narratives;
    if (shapeFilter !== "all") arr = arr.filter(n => n.shape === shapeFilter);
    if (query) {
      const q = query.toLowerCase();
      arr = arr.filter(n =>
        n.text.toLowerCase().includes(q) ||
        n.place.toLowerCase().includes(q) ||
        n.shape.includes(q) ||
        n.archetype.toLowerCase().includes(q));
    }
    if (sortMode === "date") arr = [...arr].sort((a, b) => a.date.localeCompare(b.date));
    if (sortMode === "shape") arr = [...arr].sort((a, b) => a.shape.localeCompare(b.shape));
    return arr;
  }, [data.narratives, shapeFilter, sortMode, query]);

  return (
    <div className="col fade-in" style={{ gap: "var(--gap)" }}>

      <Panel idx="21"
             title="Witness narrative archive · sample reports"
             meta={`median report: ${data.headline.median_narrative_chars} chars · preserved as-filed`}>
        <p className="lede" style={{ marginBottom: 18 }}>
          The full NUFORC archive remains the property of NUFORC and is not redistributed here.
          These are the three reference narratives quoted in §2 of the paper, plus illustrative
          excerpts matching each of the major archetypes and reference events. Spelling and
          grammar are preserved as filed.
        </p>

        <div className="row" style={{ marginBottom: 18, alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div className="eyebrow">Filter by shape:</div>
          <div className="seg">
            <button className={"btn" + (shapeFilter === "all" ? " active" : "")} onClick={() => setShapeFilter("all")}>All</button>
            {shapes.map(s => (
              <button key={s} className={"btn" + (shapeFilter === s ? " active" : "")}
                      onClick={() => setShapeFilter(s)}>{s}</button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div className="eyebrow">Sort:</div>
          <div className="seg">
            <button className={"btn" + (sortMode === "date" ? " active" : "")} onClick={() => setSortMode("date")}>Date</button>
            <button className={"btn" + (sortMode === "shape" ? " active" : "")} onClick={() => setSortMode("shape")}>Shape</button>
          </div>
          {query && (
            <div className="eyebrow" style={{ color: "var(--accent)" }}>matching “{query}”</div>
          )}
        </div>

        <div className="grid grid-2">
          {filtered.length === 0 && (
            <div className="mono" style={{ color: "var(--text-3)", padding: 20 }}>
              No narratives match these filters.
            </div>
          )}
          {filtered.map(n => (
            <NarrativeCard key={n.id} n={n} query={query} onSelectArchetype={onSelectArchetype} onJumpTab={onJumpTab} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function NarrativeCard({ n, query, onSelectArchetype, onJumpTab }) {
  // highlight query
  const textWithHighlight = useMemo(() => {
    if (!query) return n.text;
    const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = n.text.split(new RegExp(`(${q})`, 'ig'));
    return parts.map((p, i) =>
      i % 2 === 1
        ? <mark key={i} style={{ background: "var(--accent)", color: "var(--bg-0)", padding: "0 2px" }}>{p}</mark>
        : p
    );
  }, [n.text, query]);

  return (
    <div className="narr">
      <div className="narr-head">
        <span className="narr-id">{n.id}</span>
        <span>·</span>
        <span>{n.date}</span>
        <span>·</span>
        <span>{n.place}</span>
      </div>
      <div className="narr-text">"{textWithHighlight}"</div>
      <div className="narr-tags">
        <Tag tone="accent">{n.shape}</Tag>
        <span onClick={() => { onSelectArchetype(n.archetype); onJumpTab("archetypes"); }}>
          <Tag>→ archetype {n.archetype}</Tag>
        </span>
      </div>
    </div>
  );
}

window.NarrativesTab = NarrativesTab;
