// Synthesis Layer — Extension 03
// LLM-powered plain-language findings grounded in pre-computed data.
// Calls the ohy-synthesis Cloudflare Worker, which proxies to Claude API.

const WORKER_URL = 'https://ohy-synthesis.jeremyhaynes.workers.dev';

// ── Query matching: extract relevant data slice from UAP_DATA ────────

function matchQuery(query, data) {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  // Match state
  const stateMatch = data.states.find(s =>
    s.name.toLowerCase() === q || s.st.toLowerCase() === q
  );
  if (stateMatch) {
    const stateFlaps = data.flaps.filter(f => f.st === stateMatch.st);
    const stateClusters = data.sameNight.filter(c => c.states.includes(stateMatch.st));
    return {
      type: 'state',
      label: stateMatch.name,
      context: { state: stateMatch, flaps: stateFlaps, clusters: stateClusters, headline: data.headline },
    };
  }

  // Match shape
  const shapeMatch = data.shapes.find(s => s.shape.toLowerCase() === q);
  if (shapeMatch) {
    const shapeArchetypes = data.archetypes.filter(a => a.shape === shapeMatch.shape);
    const shapeVocab = data.vocab.filter(v => v.term.includes(shapeMatch.shape));
    return {
      type: 'shape',
      label: shapeMatch.shape,
      context: { shape: shapeMatch, archetypes: shapeArchetypes, vocab: shapeVocab, headline: data.headline },
    };
  }

  // Match archetype by ID or description
  const archMatch = data.archetypes.find(a =>
    a.id.toLowerCase() === q || a.desc.toLowerCase().includes(q)
  );
  if (archMatch) {
    return {
      type: 'archetype',
      label: archMatch.desc,
      context: { archetype: archMatch, headline: data.headline },
    };
  }

  // Match year
  const yearNum = parseInt(q, 10);
  if (yearNum >= 1905 && yearNum <= 2023) {
    const yearData = data.yearly.find(y => y.year === yearNum);
    const era = data.eras.find(e => yearNum >= e.start && yearNum <= e.end);
    const yearFlaps = data.flaps.filter(f => f.date.startsWith(String(yearNum)));
    const yearClusters = data.sameNight.filter(c => c.date.startsWith(String(yearNum)));
    return {
      type: 'year',
      label: String(yearNum),
      context: { year: yearData, era, flaps: yearFlaps, clusters: yearClusters, headline: data.headline },
    };
  }

  // Match known event
  const eventMatch = data.validation.find(v => v.event.toLowerCase().includes(q));
  if (eventMatch) {
    const eventFlaps = data.flaps.filter(f => f.event.toLowerCase().includes(q));
    const eventClusters = data.sameNight.filter(c =>
      (c.trigger || '').toLowerCase().includes(q) || (c.phrase || '').toLowerCase().includes(q)
    );
    const eventSigs = data.signaturePhrases.filter(s => s.event.toLowerCase().includes(q));
    return {
      type: 'event',
      label: eventMatch.event,
      context: { event: eventMatch, flaps: eventFlaps, clusters: eventClusters, signatures: eventSigs, headline: data.headline },
    };
  }

  // Match vocabulary term
  const vocabMatch = data.vocab.find(v => v.term === q);
  if (vocabMatch) {
    return {
      type: 'term',
      label: vocabMatch.term,
      context: { term: vocabMatch, bins: data.bins, headline: data.headline },
    };
  }

  // Fuzzy: try partial matches
  const fuzzyState = data.states.find(s => s.name.toLowerCase().includes(q));
  if (fuzzyState) {
    const stateFlaps = data.flaps.filter(f => f.st === fuzzyState.st);
    const stateClusters = data.sameNight.filter(c => c.states.includes(fuzzyState.st));
    return {
      type: 'state',
      label: fuzzyState.name,
      context: { state: fuzzyState, flaps: stateFlaps, clusters: stateClusters, headline: data.headline },
    };
  }

  const fuzzyEvent = data.flaps.find(f => f.event.toLowerCase().includes(q));
  if (fuzzyEvent) {
    return {
      type: 'event',
      label: fuzzyEvent.event,
      context: { flap: fuzzyEvent, headline: data.headline },
    };
  }

  const fuzzyVocab = data.vocab.find(v => v.term.includes(q));
  if (fuzzyVocab) {
    return {
      type: 'term',
      label: fuzzyVocab.term,
      context: { term: fuzzyVocab, bins: data.bins, headline: data.headline },
    };
  }

  return null;
}

// ── Suggestions ──────────────────────────────────────────────────────

function getSuggestions(data) {
  return [
    { label: 'Arizona', type: 'state' },
    { label: 'triangle', type: 'shape' },
    { label: '2014', type: 'year' },
    { label: 'Phoenix Lights', type: 'event' },
    { label: 'flying saucer', type: 'term' },
    { label: 'Washington', type: 'state' },
    { label: 'tic-tac', type: 'term' },
    { label: 'orange', type: 'term' },
  ];
}

// ── Confidence badge ─────────────────────────────────────────────────

function ConfidenceBadge({ level }) {
  const colors = {
    'HIGH CONFIDENCE': { bg: 'rgba(76,175,80,0.15)', border: 'rgba(76,175,80,0.4)', text: '#4CAF50' },
    'MODERATE CONFIDENCE': { bg: 'rgba(255,183,77,0.15)', border: 'rgba(255,183,77,0.4)', text: '#FFB74D' },
    'CANDIDATE': { bg: 'rgba(144,164,174,0.15)', border: 'rgba(144,164,174,0.4)', text: '#90A4AE' },
  };
  const c = colors[level] || colors['CANDIDATE'];
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 3,
      fontSize: 10, fontFamily: 'var(--f-mono)', letterSpacing: '0.1em',
      fontWeight: 600, textTransform: 'uppercase',
      background: c.bg, border: '1px solid ' + c.border, color: c.text,
    }}>{level}</span>
  );
}

// ── Raw data display ─────────────────────────────────────────────────

function RawDataTable({ context }) {
  const rows = [];
  function flatten(obj, prefix) {
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => {
        if (typeof item === 'object' && item !== null) {
          flatten(item, prefix + '[' + i + ']');
        } else {
          rows.push({ key: prefix + '[' + i + ']', value: String(item) });
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'object' && v !== null) {
          flatten(v, prefix ? prefix + '.' + k : k);
        } else {
          rows.push({ key: prefix ? prefix + '.' + k : k, value: String(v) });
        }
      }
    }
  }
  flatten(context, '');
  // Limit to first 40 rows
  const display = rows.slice(0, 40);

  return (
    <div style={{
      maxHeight: 300, overflowY: 'auto',
      border: '1px solid var(--border-1)', borderRadius: 4,
      fontSize: 11, fontFamily: 'var(--f-mono)',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-1)', position: 'sticky', top: 0, background: 'var(--bg-1)' }}>
            <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-3)', fontWeight: 500 }}>Field</th>
            <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-3)', fontWeight: 500 }}>Value</th>
          </tr>
        </thead>
        <tbody>
          {display.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-1)' }}>
              <td style={{ padding: '3px 8px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{r.key}</td>
              <td style={{ padding: '3px 8px', color: 'var(--text-1)' }}>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 40 && (
        <div style={{ padding: '4px 8px', color: 'var(--text-3)', fontSize: 10 }}>
          + {rows.length - 40} more fields
        </div>
      )}
    </div>
  );
}

// ── Main Synthesis Tab ───────────────────────────────────────────────

function SynthesisTab({ data }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [matchInfo, setMatchInfo] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const inputRef = useRef(null);

  const suggestions = useMemo(() => getSuggestions(data), [data]);

  async function runSynthesis(queryStr) {
    const q = queryStr || input;
    if (!q.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setShowRaw(false);

    const match = matchQuery(q, data);
    setMatchInfo(match);

    if (!match) {
      setError('No matching data found for "' + q + '." Try a state name, shape, year (1905–2023), event, or vocabulary term.');
      setLoading(false);
      return;
    }

    try {
      const resp = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q.trim(), context: match.context }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || 'Synthesis service returned ' + resp.status);
      }

      const synthesis = await resp.json();
      setResult(synthesis);
    } catch (err) {
      setError(err.message || 'Failed to reach synthesis service');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSynthesis();
    }
  }

  function handleSuggestion(label) {
    setInput(label);
    runSynthesis(label);
  }

  return (
    <div>
      <Panel idx="8.1" title="Synthesis Engine"
             meta="Extension 03 · Claude-powered · grounded in pre-computed data"
             footer="Every finding is synthesized from the pre-computed corpus data shown below. The LLM synthesizes; it does not invent.">
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontFamily: 'var(--f-serif)', fontSize: 15, color: 'var(--text-2)',
            lineHeight: 1.6, maxWidth: 720, marginBottom: 16,
          }}>
            Type a state, shape, year, event, or vocabulary term. The synthesis engine translates
            pre-computed model outputs into plain-language findings at any resolution.
          </div>

          {/* Search input */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 600 }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-2)', border: '1px solid var(--border-1)',
              borderRadius: 4, padding: '8px 12px',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="5" stroke="var(--text-3)" strokeWidth="1.4" />
                <path d="M11 11l3 3" stroke="var(--text-3)" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Arizona, triangle, 2014, Phoenix Lights, flying saucer"
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontFamily: 'var(--f-mono)', fontSize: 13, color: 'var(--text-1)',
                  letterSpacing: '0.02em',
                }}
              />
            </div>
            <button
              onClick={() => runSynthesis()}
              disabled={loading || !input.trim()}
              style={{
                padding: '8px 16px', borderRadius: 4, border: '1px solid var(--accent)',
                background: loading ? 'var(--bg-2)' : 'var(--accent)',
                color: loading ? 'var(--text-3)' : '#000',
                fontFamily: 'var(--f-mono)', fontSize: 11, fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'synthesizing...' : 'synthesize'}
            </button>
          </div>

          {/* Suggestions */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em', marginRight: 4, alignSelf: 'center' }}>TRY:</span>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => handleSuggestion(s.label)} style={{
                padding: '3px 8px', borderRadius: 3,
                border: '1px solid var(--border-1)', background: 'var(--bg-2)',
                color: 'var(--text-2)', fontFamily: 'var(--f-mono)', fontSize: 11,
                cursor: 'pointer', letterSpacing: '0.02em',
              }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: 4,
            border: '1px solid rgba(244,67,54,0.3)', background: 'rgba(244,67,54,0.08)',
            fontFamily: 'var(--f-mono)', fontSize: 12, color: '#EF5350',
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{
            padding: '24px 16px', textAlign: 'center',
            fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--text-3)',
            letterSpacing: '0.1em',
          }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ animation: 'pulse 1.5s ease-in-out infinite', display: 'inline-block' }}>
                analyzing corpus data...
              </span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
              {matchInfo && <>matched: {matchInfo.type} &rarr; {matchInfo.label}</>}
            </div>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div style={{ marginTop: 4 }}>
            {/* Query match info */}
            <div style={{
              display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12,
              fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--text-3)',
              letterSpacing: '0.08em',
            }}>
              <span>QUERY TYPE: {(result.query_type || matchInfo?.type || '').toUpperCase()}</span>
              <span>&middot;</span>
              <span>MATCHED: {matchInfo?.label}</span>
              {result.cached && <><span>&middot;</span><span>CACHED</span></>}
            </div>

            {/* Synthesis text */}
            <div style={{
              padding: '16px 20px', borderRadius: 4,
              border: '1px solid var(--border-1)', background: 'var(--bg-2)',
              fontFamily: 'var(--f-serif)', fontSize: 15, lineHeight: 1.7,
              color: 'var(--text-1)', marginBottom: 12,
            }}>
              {result.synthesis}
            </div>

            {/* Confidence + sources row */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              <ConfidenceBadge level={result.confidence || 'CANDIDATE'} />
              {result.sources && result.sources.length > 0 && (
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--text-3)' }}>
                  SOURCES: {result.sources.join(', ')}
                </div>
              )}
            </div>

            {/* Raw data toggle */}
            <button onClick={() => setShowRaw(!showRaw)} style={{
              padding: '4px 10px', borderRadius: 3,
              border: '1px solid var(--border-1)', background: 'var(--bg-2)',
              color: 'var(--text-2)', fontFamily: 'var(--f-mono)', fontSize: 11,
              cursor: 'pointer', letterSpacing: '0.05em',
            }}>
              {showRaw ? 'hide raw data \u25B4' : 'show raw data \u25BE'}
            </button>

            {showRaw && matchInfo && (
              <div style={{ marginTop: 10 }}>
                <RawDataTable context={matchInfo.context} />
              </div>
            )}
          </div>
        )}
      </Panel>

      {/* Methodology note */}
      <Panel idx="8.2" title="How the synthesis engine works"
             meta="Architecture · grounding · confidence">
        <div style={{
          fontFamily: 'var(--f-serif)', fontSize: 14, color: 'var(--text-2)',
          lineHeight: 1.7, maxWidth: 720,
        }}>
          <p style={{ margin: '0 0 12px' }}>
            The synthesis engine is not a chatbot. It receives pre-computed data from the corpus analysis
            pipeline and translates it into plain-language findings using Claude (Anthropic).
          </p>
          <p style={{ margin: '0 0 12px' }}>
            Every numerical claim in a synthesis is grounded in the data visible in the "raw data" panel below
            each finding. The model cannot invent statistics or make claims beyond what the data supports.
          </p>
          <p style={{ margin: '0 0 12px' }}>
            Findings are labeled with confidence levels inherited from the series-wide system:
          </p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ConfidenceBadge level="HIGH CONFIDENCE" />
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-3)' }}>directly in the data</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ConfidenceBadge level="MODERATE CONFIDENCE" />
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-3)' }}>minimal inference</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ConfidenceBadge level="CANDIDATE" />
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-3)' }}>requires assumptions</span>
            </div>
          </div>
          <p style={{ margin: 0, fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-3)' }}>
            Responses are cached for 24 hours. The same query always returns the same synthesis.
          </p>
        </div>
      </Panel>
    </div>
  );
}

Object.assign(window, { SynthesisTab });
