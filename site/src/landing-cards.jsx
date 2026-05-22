// Issue cards for the bento grid.
// Plus the small "viz silhouettes" each card carries.

// ===================== Viz silhouettes =====================

function VizSilhouette({ kind, width = 200, height = 60, color = '#8BAFC7', dim }) {
  const c = dim ? '#3a526b' : color;
  const accent = dim ? '#5d4f2c' : '#C9A84C';
  const W = width, H = height;
  const seedRand = (k) => {
    let x = 1;
    for (let i = 0; i < k.length; i++) x = (x * 9301 + k.charCodeAt(i)) % 233280;
    return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
  };

  if (kind === 'anomaly-bars') {
    const r = seedRand('atm');
    const bars = Array.from({ length: 80 }).map((_, i) => {
      const t = i / 80;
      const v = (t < 0.3 ? -0.4 : t < 0.55 ? -0.2 : -0.1 + (t - 0.55) * 4) + (r() - 0.5) * 0.8;
      return v;
    });
    const max = 2.5;
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <line x1="0" x2={W} y1={H/2} y2={H/2} stroke={c} strokeWidth="0.5" opacity="0.4" strokeDasharray="2 3" />
        {bars.map((v, i) => {
          const x = (i / bars.length) * W;
          const bw = W / bars.length - 0.4;
          const h = Math.min(Math.abs(v) / max * (H / 2), H / 2);
          const col = v >= 0 ? (dim ? '#7a3a37' : '#D73027') : (dim ? '#3a5a78' : '#74ADD1');
          return <rect key={i} x={x} y={v >= 0 ? H/2 - h : H/2} width={bw} height={h} fill={col} opacity={dim ? 0.5 : 0.95} />;
        })}
      </svg>
    );
  }

  if (kind === 'cluster-dots') {
    const r = seedRand('ufo');
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {Array.from({ length: 70 }).map((_, i) => {
          const cx = r() * W, cy = r() * H;
          const centers = [[W*0.3, H*0.55], [W*0.6, H*0.35], [W*0.82, H*0.65]];
          const cent = centers[i % 3];
          const px = cent[0] + (cx - W/2) * 0.35;
          const py = cent[1] + (cy - H/2) * 0.35;
          return <circle key={i} cx={px} cy={py} r={r() * 1.5 + 0.6} fill={i % 4 === 0 ? accent : c} opacity={0.7} />;
        })}
        {[[W*0.3, H*0.55, 22], [W*0.6, H*0.35, 16], [W*0.82, H*0.65, 18]].map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={p[2]} fill="none" stroke={c} strokeWidth="0.4" opacity="0.3" strokeDasharray="2 3" />
        ))}
      </svg>
    );
  }

  if (kind === 'name-waves') {
    const lines = ['mary','jen','linda','jen2','sarah'];
    const r = seedRand('names');
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {lines.map((nm, k) => {
          const peak = 0.15 + r() * 0.7;
          const width = 0.18 + r() * 0.18;
          const pts = [];
          for (let i = 0; i <= 30; i++) {
            const t = i / 30;
            const v = Math.exp(-Math.pow((t - peak) / width, 2));
            pts.push([t * W, H - v * (H - 10 - k * 4) - k * 2]);
          }
          const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
          return <path key={nm} d={d} fill="none" stroke={k === 1 ? accent : c} strokeWidth={k === 1 ? 1.2 : 0.7} opacity={0.6} />;
        })}
      </svg>
    );
  }

  if (kind === 'breach-line') {
    const breachT = 0.65;
    const path = `M0,${H*0.85} L${W*breachT},${H*0.85} L${W*breachT},${H*0.4} L${W*0.85},${H*0.4} L${W*0.85},${H*0.15} L${W},${H*0.15}`;
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <line x1="0" x2={W} y1={H*0.85} y2={H*0.85} stroke={c} strokeWidth="0.4" opacity="0.3" strokeDasharray="2 3" />
        <line x1={W*breachT} x2={W*breachT} y1="0" y2={H} stroke={accent} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.7" />
        <path d={path} fill="none" stroke={c} strokeWidth="1.4" />
        <circle cx={W*breachT} cy={H*0.85} r="2.5" fill={accent} />
        <text x={W*breachT + 4} y={H*0.85 - 4} fill={accent} fontSize="7" fontFamily="Space Mono" letterSpacing="0.5">1947</text>
      </svg>
    );
  }

  if (kind === 'declining') {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const v = 0.3 + 0.55 * Math.exp(-Math.pow((t - 0.55) / 0.18, 2)) * 0.9 + (t > 0.75 ? -(t - 0.75) * 1.4 : 0);
      pts.push([t * W, H - v * H * 0.85 - H * 0.05]);
    }
    return SparkPath(pts, W, H, c, accent);
  }
  if (kind === 'rising-bars') {
    const r = seedRand('dd');
    const bars = Array.from({ length: 24 }).map((_, i) => {
      const t = i / 24;
      return 0.2 + t * 0.7 + (r() - 0.5) * 0.18;
    });
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {bars.map((v, i) => {
          const bw = W / bars.length - 1.4;
          const x = (i / bars.length) * W;
          const h = v * (H - 8);
          return <rect key={i} x={x} y={H - h - 4} width={bw} height={h} fill={c} opacity={0.6 + (i / bars.length) * 0.35} />;
        })}
      </svg>
    );
  }
  if (kind === 'cliffs') {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <path d={`M0,${H*0.3} L${W*0.42},${H*0.3} L${W*0.42},${H*0.78} L${W*0.62},${H*0.78} L${W*0.62},${H*0.18} L${W},${H*0.18}`} fill="none" stroke={c} strokeWidth="1.4" />
        <line x1={W*0.42} x2={W*0.42} y1="0" y2={H} stroke={accent} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
        <line x1={W*0.62} x2={W*0.62} y1="0" y2={H} stroke={accent} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
        <text x={W*0.42 + 4} y={10} fill={accent} fontSize="7" fontFamily="Space Mono">1924</text>
        <text x={W*0.62 + 4} y={10} fill={accent} fontSize="7" fontFamily="Space Mono">1965</text>
      </svg>
    );
  }
  if (kind === 'rising-line') {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const v = 0.1 + (t < 0.6 ? t * 0.2 : 0.12 + (t - 0.6) * 1.7);
      pts.push([t * W, H - Math.min(v, 1) * H * 0.85 - H * 0.05]);
    }
    return SparkPath(pts, W, H, c, accent, W * 0.6);
  }
  if (kind === 'falling') {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const v = 0.92 * Math.exp(-t * 3.5) + 0.05;
      pts.push([t * W, H - v * H * 0.85 - H * 0.05]);
    }
    return SparkPath(pts, W, H, c, accent);
  }
  if (kind === 'spikes') {
    const spikes = [0.08, 0.22, 0.4, 0.55, 0.72, 0.85];
    const heights = [0.95, 0.3, 0.5, 0.42, 0.6, 0.8];
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <line x1="0" x2={W} y1={H*0.95} y2={H*0.95} stroke={c} strokeWidth="0.4" opacity="0.4" />
        {spikes.map((t, i) => (
          <line key={i} x1={t * W} x2={t * W} y1={H*0.95} y2={H*0.95 - heights[i] * H * 0.85}
            stroke={i === 0 || i === heights.length - 1 ? accent : c} strokeWidth={i === 0 ? 1.6 : 1} opacity="0.9" />
        ))}
      </svg>
    );
  }
  return null;
}

function SparkPath(pts, W, H, c, accent, markX) {
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const fill = d + ` L${W},${H} L0,${H} Z`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <path d={fill} fill={c} opacity="0.08" />
      <path d={d} fill="none" stroke={c} strokeWidth="1.4" />
      {markX != null && <line x1={markX} x2={markX} y1="0" y2={H} stroke={accent} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.7" />}
    </svg>
  );
}

// ===================== Live indicator =====================
function LiveDot({ pulse = true }) {
  return (
    <span style={{
      position: 'relative', display: 'inline-flex', alignItems: 'center',
      width: 10, height: 10,
    }}>
      <span style={{
        position: 'absolute', inset: 0, background: '#C9A84C', borderRadius: '50%',
        opacity: 0.5, animation: pulse ? 'pulseRing 2.4s ease-out infinite' : 'none',
      }} />
      <span style={{ position: 'absolute', inset: 2, background: '#C9A84C', borderRadius: '50%' }} />
    </span>
  );
}

// ===================== Cards =====================

function HeroIssueCard({ issue }) {
  const [hover, setHover] = React.useState(false);
  return (
    <a href={issue.href || '#'}
       onMouseEnter={() => setHover(true)}
       onMouseLeave={() => setHover(false)}
       style={{
      display: 'flex', flexDirection: 'column',
      background: 'rgba(15,20,33,0.85)',
      border: '1px solid ' + (hover ? '#C9A84C' : '#2a3a5e'),
      padding: 0, position: 'relative', overflow: 'hidden',
      textDecoration: 'none', color: 'inherit',
      transition: 'border-color 200ms, transform 200ms',
      transform: hover ? 'translateY(-2px)' : 'none',
      gridColumn: '1 / 7', gridRow: '1 / 3',
    }}>
      {/* Top strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '20px 28px', borderBottom: '1px solid #1B2740',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#C9A84C', color: '#0B1019',
          padding: '5px 10px', borderRadius: 0,
        }}>
          <LiveDot pulse={false} />
          <span className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.25, textTransform: 'uppercase' }}>
            Newly live · 22 May 2026
          </span>
        </div>
        <span className="mono" style={{ color: '#4E6A82', fontSize: 10, letterSpacing: 0.2, marginLeft: 'auto' }}>
          № {issue.n}
        </span>
        <span className="mono" style={{ color: '#8BAFC7', fontSize: 10, letterSpacing: 0.15 }}>
          DATA REFRESHED · {issue.refreshed.toUpperCase()}
        </span>
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 0, flex: 1 }}>
        <div style={{ padding: '32px 28px 24px' }}>
          <div className="serif" style={{
            fontSize: 56, lineHeight: 0.95, color: '#E6ECF2', fontWeight: 800, letterSpacing: -1.5,
          }}>
            {issue.title}
          </div>
          <div className="serif" style={{
            fontSize: 20, color: '#C9A84C', marginTop: 14, fontStyle: 'italic', lineHeight: 1.4,
            fontWeight: 300, textWrap: 'pretty', maxWidth: 540,
          }}>
            {issue.quote}
          </div>
          <div className="serif" style={{
            fontSize: 14.5, color: '#8BAFC7', marginTop: 16, lineHeight: 1.6, maxWidth: 520, textWrap: 'pretty',
          }}>
            {issue.blurb}
          </div>
        </div>

        {/* Right rail: stat strip */}
        <div style={{ borderLeft: '1px solid #1B2740', display: 'flex', flexDirection: 'column' }}>
          {issue.stats.map((s, i) => (
            <div key={i} style={{
              padding: '14px 18px', borderBottom: i < issue.stats.length - 1 ? '1px solid #1B2740' : 'none',
              flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <div className="mono" style={{ color: i === issue.stats.length - 1 ? '#D73027' : '#E6ECF2', fontSize: 20, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1 }}>
                {s[0]}
              </div>
              <div className="mono" style={{ color: '#4E6A82', fontSize: 9.5, letterSpacing: 0.18, textTransform: 'uppercase', marginTop: 4 }}>
                {s[1]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: viz + CTA */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px', borderTop: '1px solid #1B2740', background: 'rgba(11,16,25,0.5)',
      }}>
        <VizSilhouette kind={issue.viz} width={280} height={48} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="mono" style={{
            color: hover ? '#C9A84C' : '#8BAFC7', fontSize: 10.5, letterSpacing: 0.15,
            transition: 'opacity 200ms', opacity: hover ? 1 : 0.85,
            maxWidth: 280, textAlign: 'right',
          }}>
            {hover ? `↳ ${issue.discovery}` : 'Hover for the finding · click to enter'}
          </div>
          <span className="mono" style={{
            color: hover ? '#C9A84C' : '#E6ECF2', fontSize: 12, letterSpacing: 0.2,
            textTransform: 'uppercase', fontWeight: 700,
            transition: 'transform 200ms', transform: hover ? 'translateX(4px)' : 'none',
          }}>
            Read →
          </span>
        </div>
      </div>
    </a>
  );
}

function LiveIssueCard({ issue, area }) {
  const [hover, setHover] = React.useState(false);
  return (
    <a href={issue.href || '#' + issue.slug}
       onMouseEnter={() => setHover(true)}
       onMouseLeave={() => setHover(false)}
       style={{
      display: 'flex', flexDirection: 'column',
      background: 'rgba(13,17,28,0.7)',
      border: '1px solid ' + (hover ? '#C9A84C' : '#1B2740'),
      textDecoration: 'none', color: 'inherit',
      transition: 'border-color 200ms, transform 200ms',
      transform: hover ? 'translateY(-2px)' : 'none',
      position: 'relative', overflow: 'hidden',
      gridArea: area,
    }}>
      {/* Top */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 20px', borderBottom: '1px solid #1B2740',
      }}>
        <LiveDot />
        <span className="mono" style={{ color: '#C9A84C', fontSize: 10, fontWeight: 700, letterSpacing: 0.25 }}>LIVE</span>
        <span className="mono" style={{ color: '#4E6A82', fontSize: 10, letterSpacing: 0.2, marginLeft: 'auto' }}>
          № {issue.n}
        </span>
      </div>
      <div style={{ padding: '16px 20px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="serif" style={{
          fontSize: 24, color: '#E6ECF2', fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.1,
        }}>{issue.title}</div>
        <div className="serif" style={{
          fontSize: 13, color: '#8BAFC7', lineHeight: 1.55, marginTop: 10, flex: 1,
          textWrap: 'pretty',
        }}>{issue.blurb}</div>

        {/* Stat strip */}
        <div style={{ display: 'flex', gap: 14, marginTop: 14, paddingTop: 12, borderTop: '1px solid #1B2740' }}>
          {issue.stats.map((s, i) => (
            <div key={i}>
              <span className="mono" style={{ color: '#E6ECF2', fontSize: 12, fontWeight: 700, letterSpacing: -0.1 }}>{s[0]}</span>{' '}
              <span className="mono" style={{ color: '#4E6A82', fontSize: 9, letterSpacing: 0.18, textTransform: 'uppercase' }}>{s[1]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Viz strip */}
      <div style={{
        padding: '8px 14px 10px', borderTop: '1px solid #1B2740',
        background: 'rgba(11,16,25,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        minHeight: 60,
      }}>
        <VizSilhouette kind={issue.viz} width={170} height={40} />
        <span className="mono" style={{
          color: hover ? '#C9A84C' : '#4E6A82', fontSize: 10, letterSpacing: 0.18, textTransform: 'uppercase',
          transition: 'all 200ms', transform: hover ? 'translateX(2px)' : 'none', whiteSpace: 'nowrap',
        }}>
          Read →
        </span>
      </div>

      {/* Hover overlay with discovery */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'rgba(201,168,76,0.95)', color: '#0B1019',
        padding: '8px 16px', transform: hover ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 260ms cubic-bezier(.2,.7,.2,1)',
      }}>
        <span className="mono" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.15 }}>
          ↳ {issue.discovery}
        </span>
      </div>
    </a>
  );
}

function ComingIssueCard({ issue, area }) {
  const [hover, setHover] = React.useState(false);
  const stage = window.stageIndex(issue.stage);
  return (
    <div
       onMouseEnter={() => setHover(true)}
       onMouseLeave={() => setHover(false)}
       style={{
      display: 'flex', flexDirection: 'column',
      background: 'rgba(13,17,28,0.5)',
      border: '1px dashed ' + (hover ? '#3a4f73' : '#243353'),
      transition: 'border-color 200ms',
      position: 'relative', overflow: 'hidden',
      gridArea: area, cursor: 'default',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 20px', borderBottom: '1px dashed #243353',
      }}>
        <span className="mono" style={{
          color: '#4E6A82', fontSize: 10, fontWeight: 700, letterSpacing: 0.25,
          textTransform: 'uppercase',
        }}>In progress</span>
        <span className="mono" style={{ color: '#4E6A82', fontSize: 10, letterSpacing: 0.2, marginLeft: 'auto' }}>
          № {issue.n}
        </span>
      </div>
      <div style={{ padding: '16px 20px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="serif" style={{
          fontSize: 22, color: '#8BAFC7', fontWeight: 600, letterSpacing: -0.3, lineHeight: 1.1,
        }}>{issue.title}</div>
        <div className="serif" style={{
          fontSize: 12.5, color: '#5d7691', lineHeight: 1.55, flex: 1, textWrap: 'pretty',
        }}>{issue.blurb}</div>
        <div className="mono" style={{ color: '#4E6A82', fontSize: 10, letterSpacing: 0.12, marginTop: 4 }}>
          ▌ {issue.teaser}
        </div>
      </div>

      {/* Viz silhouette dim */}
      <div style={{ padding: '4px 14px 6px' }}>
        <VizSilhouette kind={issue.viz} width={220} height={36} dim />
      </div>

      {/* Progress bar */}
      <div style={{
        padding: '10px 20px 14px', borderTop: '1px dashed #243353',
        background: 'rgba(11,16,25,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {window.STAGES.map((s, i) => {
            const done = i <= stage;
            const cur = i === stage;
            return (
              <React.Fragment key={s}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1,
                }}>
                  <div style={{
                    width: '100%', height: 2,
                    background: done ? '#C9A84C' : '#243353',
                    opacity: done && !cur ? 0.6 : 1,
                  }} />
                  <span className="mono" style={{
                    color: cur ? '#C9A84C' : done ? '#8BAFC7' : '#4E6A82',
                    fontSize: 8.5, letterSpacing: 0.18, fontWeight: cur ? 700 : 400,
                  }}>
                    {s}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ManifestoCard({ area }) {
  return (
    <div style={{
      gridArea: area,
      border: '1px solid #C9A84C66',
      background: 'linear-gradient(135deg, rgba(201,168,76,0.06), rgba(11,16,25,0.4))',
      padding: '20px 24px 22px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      position: 'relative', overflow: 'hidden',
    }}>
      <span className="mono" style={{
        color: '#C9A84C', fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
        textTransform: 'uppercase',
      }}>▌ The manifesto</span>
      <div className="serif" style={{
        fontSize: 19, color: '#E6ECF2', lineHeight: 1.42, marginTop: 12, letterSpacing: -0.15,
        fontWeight: 300, fontStyle: 'italic', textWrap: 'pretty',
      }}>
        An independent research project. No ads. No tracking. No paywall.
        One hundred years of data — visualized honestly, methodology published, source code open.
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px solid #1B2740', flexWrap: 'wrap', gap: 8 }}>
        <span className="mono" style={{ color: '#8BAFC7', fontSize: 10.5, letterSpacing: 0.18, textTransform: 'uppercase' }}>
          MIT licensed · CC0 data
        </span>
        <a href="#newsletter" className="mono" style={{
          color: '#C9A84C', fontSize: 11, letterSpacing: 0.2, textTransform: 'uppercase', fontWeight: 700,
          textDecoration: 'none', borderBottom: '1px solid #C9A84C', paddingBottom: 1,
        }}>
          Subscribe to dispatches →
        </a>
      </div>
    </div>
  );
}

Object.assign(window, { HeroIssueCard, LiveIssueCard, ComingIssueCard, ManifestoCard, LiveDot, VizSilhouette });
