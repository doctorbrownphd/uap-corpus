// Tile-grid US map used as the choropleth across the dashboard.
// Each state is a 36×36 cell positioned on a 13×6 conceptual grid.

const STATE_GRID = {
  // [col, row]
  AK:[0,1], HI:[0,3],
  WA:[1,1], OR:[1,2], CA:[1,3],
  ID:[2,2], NV:[2,3],
  MT:[3,1], WY:[3,2], UT:[3,3], AZ:[3,4],
  ND:[4,1], SD:[4,2], CO:[4,3], NM:[4,4], TX:[4,5],
  MN:[5,1], IA:[5,2], NE:[5,3], KS:[5,4], OK:[5,5],
  WI:[6,1], IL:[6,2], MO:[6,3], AR:[6,4], LA:[6,5],
  MI:[7,1], IN:[7,2], KY:[7,3], TN:[7,4], MS:[7,5],
  OH:[8,2], WV:[8,3], NC:[8,4], AL:[8,5],
  NY:[9,1], PA:[9,2], VA:[9,3], SC:[9,4], GA:[9,5],
  VT:[10,0], MA:[10,1], NJ:[10,2], MD:[10,3], DC:[10,4], FL:[10,5],
  NH:[11,0], CT:[11,2], DE:[11,3],
  ME:[12,0], RI:[12,2],
};

function TileMap({ states, mode = "count", active, onHover, onLeave, onClick, highlights = [], cellSize = 36, gap = 4 }) {
  const byState = useMemo(() => Object.fromEntries(states.map(s => [s.st, s])), [states]);
  const cols = 13, rows = 6;
  const W = cols * (cellSize + gap);
  const H = rows * (cellSize + gap);

  const max = useMemo(() => Math.max(...states.map(s =>
    mode === "anom" ? s.anom : s.count)), [states, mode]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {Object.entries(STATE_GRID).map(([st, [c, r]]) => {
        const x = c * (cellSize + gap);
        const y = r * (cellSize + gap);
        const s = byState[st];
        if (!s) return null;
        const v = mode === "anom" ? s.anom : s.count;
        const t = Math.min(1, v / max);
        const fill = `oklch(${(0.20 + t * 0.55).toFixed(3)} ${(0.005 + t * 0.16).toFixed(3)} 75)`;
        const isActive = active === st;
        const isHi = highlights.includes(st);
        return (
          <g key={st}
             onMouseEnter={(e) => onHover && onHover(e, s)}
             onMouseMove={(e) => onHover && onHover(e, s)}
             onMouseLeave={onLeave}
             onClick={() => onClick && onClick(st)}
             style={{ cursor: "default" }}>
            <rect x={x} y={y} width={cellSize} height={cellSize}
                  rx="2"
                  fill={isHi ? "var(--accent)" : fill}
                  stroke={isActive ? "var(--text-0)" : isHi ? "var(--accent)" : "var(--bg-0)"}
                  strokeWidth={isActive ? 2.5 : isHi ? 2 : 0.5}
                  opacity={highlights.length > 0 && !isHi && !isActive ? 0.3 : 1}
                  className="state-path" />
            <text x={x + cellSize / 2} y={y + cellSize / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="state-lbl"
                  style={{ fill: isHi ? "var(--bg-0)" : t > 0.55 ? "var(--bg-0)" : "var(--text-1)", fontWeight: isHi ? 700 : 500 }}>
              {st}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

window.TileMap = TileMap;
window.STATE_GRID = STATE_GRID;
