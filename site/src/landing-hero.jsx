// Landing — top hero: wordmark + rotating evidence moment.

function Wordmark({ size = 1 }) {
  const s = (n) => n * size;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'flex-start', gap: s(14),
    }}>
      {/* Ruler-mark "E" */}
      <svg width={s(34)} height={s(108)} viewBox="0 0 34 108" style={{ marginTop: s(8) }}>
        <line x1="6" y1="2" x2="6" y2="106" stroke="#C9A84C" strokeWidth="1.2" />
        <line x1="6" y1="6" x2="24" y2="6" stroke="#C9A84C" strokeWidth="1.2" />
        <line x1="6" y1="54" x2="20" y2="54" stroke="#C9A84C" strokeWidth="1.2" />
        <line x1="6" y1="102" x2="24" y2="102" stroke="#C9A84C" strokeWidth="1.2" />
        {[14, 22, 30, 38, 46, 62, 70, 78, 86, 94].map(y => (
          <line key={y} x1="6" y1={y} x2="12" y2={y} stroke="#C9A84C" strokeWidth="0.6" opacity="0.5" />
        ))}
      </svg>

      <div>
        <div className="mono" style={{
          color: '#C9A84C', fontSize: s(11), letterSpacing: s(0.45),
          textTransform: 'uppercase', fontWeight: 700, marginBottom: s(4),
        }}>
          One Hundred
        </div>
        <div className="serif" style={{
          color: '#E6ECF2', fontSize: s(72), lineHeight: 0.85,
          fontWeight: 800, letterSpacing: s(-2),
        }}>
          Years
        </div>
        <div style={{
          color: '#C9A84C', fontFamily: 'Italianno, cursive',
          fontSize: s(36), lineHeight: 1, marginTop: s(2), letterSpacing: s(0.2),
        }}>
          of —
        </div>
      </div>
    </div>
  );
}

function LandingHero({ onPickEvidence }) {
  const evidence = window.EVIDENCE;
  const [idx, setIdx] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % evidence.length), 8000);
    return () => clearTimeout(t);
  }, [idx, paused, evidence.length]);

  const cur = evidence[idx];

  return (
    <div style={{
      position: 'relative',
      padding: '36px 56px 60px',
      background: 'linear-gradient(180deg, rgba(15,20,33,0.6) 0%, rgba(11,16,25,0) 100%)',
      borderBottom: '1px solid #1B2740',
      overflow: 'hidden',
    }}>
      {/* Background isobar decoration */}
      <svg style={{
        position: 'absolute', top: -100, right: -200, width: 900, height: 900,
        opacity: 0.05, pointerEvents: 'none',
      }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <ellipse key={i} cx="450" cy="450" rx={120 + i * 60} ry={80 + i * 40}
            fill="none" stroke="#C9A84C" strokeWidth="0.5"
            strokeDasharray={i % 2 === 0 ? '0' : '3 6'} />
        ))}
      </svg>

      {/* Top strip: wordmark + meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
        <Wordmark />
        <TopMeta />
      </div>

      {/* Evidence stage */}
      <div style={{
        marginTop: 64, display: 'grid', gridTemplateColumns: '1fr 480px', gap: 64,
        alignItems: 'center', minHeight: 360, position: 'relative', zIndex: 2,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}>

        {/* Left: the quote */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
            <span className="mono" style={{
              color: '#C9A84C', fontSize: 11, letterSpacing: 0.4,
              textTransform: 'uppercase', fontWeight: 700,
            }}>
              ▌ Evidence · file 0{idx + 1} of 0{evidence.length}
            </span>
            <span style={{ flex: 1, height: 1, background: 'linear-gradient(to right, #C9A84C, transparent)' }} />
          </div>

          <div key={idx} style={{ opacity: 1, transition: 'opacity 400ms ease' }}>
            <div className="mono" style={{
              color: '#E6ECF2', fontSize: 14, letterSpacing: 0.2, fontWeight: 700,
              textTransform: 'uppercase', marginBottom: 18,
            }}>
              {cur.date} <span style={{ color: '#4E6A82' }}>·</span> <span style={{ color: '#8BAFC7', fontWeight: 400 }}>{cur.place}</span>
            </div>

            <blockquote className="serif" style={{
              margin: 0, color: '#E6ECF2', fontSize: 38, lineHeight: 1.18,
              fontWeight: 300, letterSpacing: -0.4, fontStyle: 'italic',
              textWrap: 'pretty', maxWidth: 780,
            }}>
              &ldquo;{cur.quote}&rdquo;
            </blockquote>

            <div style={{ display: 'flex', gap: 28, alignItems: 'baseline', marginTop: 32 }}>
              <div>
                <div className="mono" style={{
                  color: '#4E6A82', fontSize: 10, letterSpacing: 0.2,
                  textTransform: 'uppercase', marginBottom: 4,
                }}>Source</div>
                <div className="mono" style={{ color: '#8BAFC7', fontSize: 12 }}>
                  {cur.source}
                </div>
              </div>
              <button onClick={() => onPickEvidence?.(cur.slug)} className="mono" style={{
                background: 'transparent', color: '#C9A84C', border: '1px solid #C9A84C',
                padding: '10px 18px', fontSize: 11, letterSpacing: 0.25, textTransform: 'uppercase',
                cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontWeight: 700,
                marginLeft: 'auto',
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#C9A84C'; e.currentTarget.style.color = '#0B1019'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#C9A84C'; }}>
                Read № {cur.n} · {cur.issue} →
              </button>
            </div>
          </div>

          {/* Dots */}
          <div style={{ display: 'flex', gap: 6, marginTop: 32, alignItems: 'center' }}>
            {evidence.map((_, i) => {
              const active = i === idx;
              return (
                <button key={i} onClick={() => setIdx(i)} style={{
                  background: 'transparent', border: 'none', cursor: 'pointer', padding: 6,
                }}>
                  <span style={{
                    display: 'block', height: 2, width: active ? 36 : 16,
                    background: active ? '#C9A84C' : '#243353',
                    transition: 'all 400ms', position: 'relative', overflow: 'hidden',
                  }}>
                    {active && !paused && (
                      <span style={{
                        position: 'absolute', inset: 0, background: '#0B1019',
                        animation: 'evidence-bar 8s linear forwards',
                        transformOrigin: 'right center',
                      }} />
                    )}
                  </span>
                </button>
              );
            })}
            <style>{`@keyframes evidence-bar { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
            <span className="mono" style={{ color: '#4E6A82', fontSize: 9.5, marginLeft: 14, letterSpacing: 0.2, textTransform: 'uppercase' }}>
              {paused ? '\u23F8 Paused on hover' : 'Auto · 8s'}
            </span>
          </div>
        </div>

        {/* Right: tagline + manifesto */}
        <div style={{ borderLeft: '1px solid #1B2740', paddingLeft: 36 }}>
          <div className="serif" style={{
            color: '#E6ECF2', fontSize: 22, lineHeight: 1.45, fontWeight: 300, letterSpacing: -0.1,
            textWrap: 'pretty',
          }}>
            One hundred years of data. <em style={{ color: '#C9A84C', fontStyle: 'italic' }}>Analyzed.
            Visualized. Open.</em>
          </div>
          <div className="serif" style={{
            color: '#8BAFC7', fontSize: 14, marginTop: 16, lineHeight: 1.6, textWrap: 'pretty',
          }}>
            A reporting series. Ten datasets. Each one a question the historical record can finally answer.
            Independent. No ads, no tracking, no paywall. Data and code under MIT.
          </div>

          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <StatLine label="Volume" value={`${window.VOL_META.version} · 10 issues planned`} />
            <StatLine label="Live now" value="4 issues · public" />
            <StatLine label="In progress" value="6 issues · see status below" />
            <StatLine label="Updated" value={window.VOL_META.updated} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TopMeta() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <span className="mono" style={{ color: '#4E6A82', fontSize: 10, letterSpacing: 0.2, textTransform: 'uppercase' }}>
          {window.VOL_META.version}
        </span>
        <span style={{ width: 4, height: 4, background: '#243353', borderRadius: '50%' }} />
        <span className="mono" style={{ color: '#E6ECF2', fontSize: 11, letterSpacing: 0.18, fontWeight: 700 }}>
          {window.VOL_META.live} LIVE
        </span>
        <span className="mono" style={{ color: '#8BAFC7', fontSize: 11, letterSpacing: 0.18 }}>
          · {window.VOL_META.inProgress} IN PROGRESS
        </span>
        <span style={{ width: 4, height: 4, background: '#243353', borderRadius: '50%' }} />
        <span className="mono" style={{ color: '#4E6A82', fontSize: 10, letterSpacing: 0.2 }}>
          UPDATED {window.VOL_META.updated}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <a className="mono" href="#archive" style={{
          color: '#8BAFC7', fontSize: 11, letterSpacing: 0.18, textTransform: 'uppercase',
          textDecoration: 'none', borderBottom: '1px solid transparent',
        }}>Archive</a>
        <span className="mono" style={{
          color: '#4E6A82', fontSize: 11, letterSpacing: 0.18, textTransform: 'uppercase',
          cursor: 'default',
        }}>Methodology</span>
        <span className="mono" style={{
          color: '#4E6A82', fontSize: 11, letterSpacing: 0.18, textTransform: 'uppercase',
          cursor: 'default',
        }}>Newsletter</span>
        <a className="mono" href="https://github.com/doctorbrownphd" target="_blank" rel="noopener" style={{
          color: '#C9A84C', fontSize: 11, letterSpacing: 0.18, textTransform: 'uppercase',
          textDecoration: 'none', border: '1px solid #C9A84C', padding: '6px 12px',
        }}>GitHub ↗</a>
      </div>
    </div>
  );
}

function StatLine({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
      <span className="mono" style={{
        color: '#4E6A82', fontSize: 10, letterSpacing: 0.2, textTransform: 'uppercase',
        minWidth: 84,
      }}>{label}</span>
      <span style={{ flex: 1, height: 1, borderBottom: '1px dotted #243353' }} />
      <span className="mono" style={{ color: '#E6ECF2', fontSize: 12, letterSpacing: 0.05 }}>{value}</span>
    </div>
  );
}

Object.assign(window, { LandingHero, Wordmark });
