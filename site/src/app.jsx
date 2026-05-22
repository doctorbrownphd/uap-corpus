// Main App — assembles shell, tab routing, search, tweaks

const TABS = [
  { id: "overview",   label: "Overview",        num: "01" },
  { id: "vocabulary", label: "Era vocabulary",  num: "02" },
  { id: "geography",  label: "Geography & flaps", num: "03" },
  { id: "archetypes", label: "Archetypes",      num: "04" },
  { id: "samenight",  label: "Same-night",      num: "05" },
  { id: "validation", label: "Validation",      num: "06" },
  { id: "narratives", label: "Narratives",      num: "07" },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "density": "regular",
  "accent": "#d99c5c",
  "scanlines": true
}/*EDITMODE-END*/;

function App() {
  const data = window.UAP_DATA;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [selectedState, setSelectedState] = useState(null);
  const [selectedArchetype, setSelectedArchetype] = useState(null);
  const tt = useTooltip();

  // Apply tweaks to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", t.theme);
    root.setAttribute("data-density", t.density);
    root.style.setProperty("--accent", t.accent);
    // derive soft/line variants
    root.style.setProperty("--accent-soft", t.accent + "2e");
    root.style.setProperty("--accent-line", t.accent + "8c");
    document.body.style.backgroundImage = t.scanlines ? "" : "none";
  }, [t]);

  // Cmd-K / Ctrl-K focus search
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("search-input")?.focus();
      }
      if (e.key === "Escape") {
        setQuery(""); setSelectedState(null); setSelectedArchetype(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const matchCount = useMemo(() => {
    if (!query) return null;
    const q = query.toLowerCase();
    return {
      narratives: data.narratives.filter(n =>
        n.text.toLowerCase().includes(q) || n.place.toLowerCase().includes(q)).length,
      states: data.states.filter(s => s.name.toLowerCase().includes(q) || s.st.toLowerCase() === q).length,
      vocab: data.vocab.filter(v => v.term.includes(q)).length,
      archetypes: data.archetypes.filter(a => a.desc.toLowerCase().includes(q) ||
        a.terms.some(term => term.includes(q))).length,
    };
  }, [query, data]);

  const onJumpTab = (id) => { setTab(id); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const onSelectState = (st) => { setSelectedState(st); };
  const onSelectArchetype = (id) => { setSelectedArchetype(id); };

  const tabProps = { data, tt, query, onJumpTab, onSelectState, onSelectArchetype };

  return (
    <>
      {/* Classification band */}
      <div className="classband">
        <div>
          <span className="dot" />
          corpus analysis · open data · MIT-licensed pipeline
        </div>
        <div className="right">
          <span>148K RAW → 112K CLEANED</span>
          <span>384d EMBEDDINGS</span>
          <span>v3.0</span>
        </div>
      </div>

      {/* Top bar */}
      <header className="topbar">
        <div className="brand">
          {/* Chronicle decade ruler icon */}
          <a href="https://onehundredyears.report" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <svg width="14" height="56" viewBox="0 0 18 72" style={{ marginRight: 14 }}>
              <line x1="0" y1="0" x2="0" y2="72" stroke="var(--accent)" strokeWidth="1.5"/>
              <line x1="0" y1="0"  x2="12" y2="0"  stroke="var(--accent)" strokeWidth="1.5"/>
              <line x1="0" y1="8"  x2="7"  y2="8"  stroke="var(--accent)" strokeWidth="0.8"/>
              <line x1="0" y1="16" x2="7"  y2="16" stroke="var(--accent)" strokeWidth="0.8"/>
              <line x1="0" y1="24" x2="12" y2="24" stroke="var(--accent)" strokeWidth="1.5"/>
              <line x1="0" y1="32" x2="7"  y2="32" stroke="var(--accent)" strokeWidth="0.8"/>
              <line x1="0" y1="40" x2="7"  y2="40" stroke="var(--accent)" strokeWidth="0.8"/>
              <line x1="0" y1="48" x2="12" y2="48" stroke="var(--accent)" strokeWidth="1.5"/>
              <line x1="0" y1="56" x2="7"  y2="56" stroke="var(--accent)" strokeWidth="0.8"/>
              <line x1="0" y1="64" x2="7"  y2="64" stroke="var(--accent)" strokeWidth="0.8"/>
              <line x1="0" y1="72" x2="12" y2="72" stroke="var(--accent)" strokeWidth="1.5"/>
            </svg>
          </a>
          <div className="brand-title">
            <span style={{ fontFamily: "'Cormorant Garamond', var(--f-serif)", fontWeight: 600, letterSpacing: "0.25em", fontSize: 10, color: "var(--accent)" }}>One Hundred Years of</span>
            <b style={{ fontFamily: "'Playfair Display', var(--f-serif)", letterSpacing: "-0.01em" }}>UFO Witness Reports</b>
          </div>
        </div>
        <div className="topbar-right">
          <div className="search">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input id="search-input" type="text"
                   placeholder="search terms, places, archetypes…"
                   value={query} onChange={(e) => setQuery(e.target.value)} />
            <kbd>⌘K</kbd>
          </div>
          <div className="topbar-meta">
            <span><span className="live-dot" />OPEN PIPELINE · REPRODUCIBLE</span>
            <span>READING: PASSIVE / CULTURAL-PRIMING / OBSERVATIONAL</span>
          </div>
        </div>
      </header>

      {/* Stat row */}
      <div className="statrow">
        <StatCard label="Reports analyzed" value={fmt(data.headline.total_reports)}
                  sub={`from ${fmt(data.headline.raw_reports)} raw · ${data.headline.retention_pct}% retention`} />
        <StatCard label="Time span" value="118 yrs"
                  sub={`${data.headline.span[0]} – ${data.headline.span[1]}`} />
        <StatCard label="Same-night clusters" value={fmt(data.headline.same_night_clusters)}
                  sub={`${fmt(data.headline.clustered_reports)} reports · ${data.headline.clustered_pct}%`} accent />
        <StatCard label="Narrative archetypes" value={data.headline.archetypes}
                  sub={`${fmt(data.headline.archetyped_reports)} reports · ${data.headline.archetyped_pct}%`} />
        <StatCard label="Flaps detected" value={data.headline.flaps_detected}
                  sub="3× weekly baseline · 1990–2023" />
        <StatCard label="Reference events" value="10 / 10"
                  sub="all pass ≥ 2 of 4 methods" />
      </div>

      {/* Search results */}
      {query && matchCount && (
        <div style={{
          padding: "10px 32px", background: "var(--bg-1)",
          borderBottom: "1px solid var(--border-1)",
          display: "flex", gap: 24, fontFamily: "var(--f-mono)", fontSize: 11,
          alignItems: "center",
        }}>
          <span className="eyebrow">matching “{query}” →</span>
          <span style={{ color: "var(--text-1)" }}>{matchCount.narratives} narratives</span>
          <span style={{ color: "var(--text-1)" }}>{matchCount.vocab} vocabulary terms</span>
          <span style={{ color: "var(--text-1)" }}>{matchCount.archetypes} archetypes</span>
          <span style={{ color: "var(--text-1)" }}>{matchCount.states} states</span>
          <button className="btn" style={{ marginLeft: "auto", padding: "2px 8px" }} onClick={() => setQuery("")}>clear ✕</button>
        </div>
      )}

      {/* Tabs */}
      <nav className="tabs">
        {TABS.map(x => (
          <button key={x.id} className={"tab" + (tab === x.id ? " active" : "")}
                  onClick={() => setTab(x.id)}>
            <span className="tab-num">{x.num}</span>
            {x.label}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <span className="tab" style={{ borderBottom: 0, color: "var(--text-3)" }}>
          §{TABS.find(x => x.id === tab)?.num} of {TABS.length}
        </span>
      </nav>

      {/* Body */}
      <main className="shell" key={tab}>
        {tab === "overview"   && <OverviewTab {...tabProps} />}
        {tab === "vocabulary" && <VocabularyTab data={data} tt={tt} />}
        {tab === "geography"  && <GeographyTab data={data} tt={tt}
                                               selectedState={selectedState}
                                               onSelectState={setSelectedState} />}
        {tab === "archetypes" && <ArchetypesTab data={data} tt={tt}
                                                selectedArchetype={selectedArchetype}
                                                onSelectArchetype={setSelectedArchetype} />}
        {tab === "samenight"  && <SameNightTab data={data} tt={tt} onSelectState={setSelectedState} />}
        {tab === "validation" && <ValidationTab data={data} tt={tt} />}
        {tab === "narratives" && <NarrativesTab data={data} tt={tt} query={query}
                                                onJumpTab={setTab} onSelectArchetype={setSelectedArchetype} />}
      </main>

      {/* Footer */}
      <footer style={{
        padding: "24px 32px 40px",
        borderTop: "1px solid var(--border-1)",
        background: "var(--bg-1)",
        marginTop: 40,
        display: "flex", alignItems: "center", gap: 14,
      }}>
        {/* Chronicle logo (small) */}
        <a href="https://onehundredyears.report" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="12" height="36" viewBox="0 0 18 72">
            <line x1="0" y1="0" x2="0" y2="72" stroke="var(--accent)" strokeWidth="1.5"/>
            <line x1="0" y1="0"  x2="12" y2="0"  stroke="var(--accent)" strokeWidth="1.5"/>
            <line x1="0" y1="24" x2="12" y2="24" stroke="var(--accent)" strokeWidth="1.5"/>
            <line x1="0" y1="48" x2="12" y2="48" stroke="var(--accent)" strokeWidth="1.5"/>
            <line x1="0" y1="72" x2="12" y2="72" stroke="var(--accent)" strokeWidth="1.5"/>
          </svg>
          <span style={{ fontFamily: "'Cormorant Garamond', var(--f-serif)", fontSize: 11, color: "var(--text-2)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            One Hundred Years
          </span>
        </a>
        <div style={{ marginLeft: "auto", display: "flex", gap: 18, alignItems: "center" }}>
          <a href="/paper.pdf" target="_blank" rel="noopener" style={{ textDecoration: "none" }}>
            <Tag tone="accent">paper PDF</Tag>
          </a>
          <Tag>MIT</Tag>
          <a href="https://github.com/doctorbrownphd/uap-corpus" target="_blank" rel="noopener" style={{ textDecoration: "none" }}>
            <Tag>GitHub</Tag>
          </a>
        </div>
      </footer>

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakRadio label="Mode" value={t.theme}
                    options={["dark", "light"]}
                    onChange={(v) => setTweak("theme", v)} />
        <TweakColor label="Accent" value={t.accent}
                    options={["#d99c5c", "#5cc7d9", "#8cd95c", "#d96d5c", "#bf8cd9"]}
                    onChange={(v) => setTweak("accent", v)} />
        <TweakToggle label="Scanline texture" value={t.scanlines}
                     onChange={(v) => setTweak("scanlines", v)} />
        <TweakSection label="Layout" />
        <TweakRadio label="Density" value={t.density}
                    options={["compact", "regular", "comfy"]}
                    onChange={(v) => setTweak("density", v)} />
      </TweaksPanel>

      {tt.node}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
