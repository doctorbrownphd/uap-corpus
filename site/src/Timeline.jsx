// Reports-per-year timeline with era overlays and known-event flags.

function YearlyTimeline({ yearly, eras, flags, w = 920, h = 240, onYearHover, onYearLeave, onYearClick, selectedYear }) {
  const pad = { l: 44, r: 16, t: 30, b: 30 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const minYear = Math.min(...yearly.map(y => y.year));
  const maxYear = Math.max(...yearly.map(y => y.year));
  const maxCount = Math.max(...yearly.map(y => y.count));

  const x = (yr) => pad.l + ((yr - minYear) / (maxYear - minYear)) * innerW;
  const y = (v)  => pad.t + (1 - v / maxCount) * innerH;

  const barW = innerW / (maxYear - minYear + 1) - 0.5;

  // Decade ticks
  const decades = [];
  for (let d = Math.ceil(minYear / 10) * 10; d <= maxYear; d += 10) decades.push(d);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="timeline" style={{ width: "100%", height: "auto" }}>
      {/* era bands */}
      {eras.map((e, i) => {
        const x0 = x(e.start), x1 = x(e.end);
        const colorVar = `var(--era-${e.color})`;
        return (
          <g key={i}>
            <rect x={x0} y={pad.t - 18} width={x1 - x0} height={innerH + 18}
                  fill={colorVar} className="tl-era" />
            <text x={x0 + 4} y={pad.t - 6} className="tl-era-lbl">{e.label.toUpperCase()}</text>
          </g>
        );
      })}

      {/* gridlines */}
      {[0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={pad.l} x2={w - pad.r} y1={pad.t + innerH * (1 - t)} y2={pad.t + innerH * (1 - t)}
              className="tl-grid" />
      ))}

      {/* bars */}
      {yearly.map((d, i) => (
        <rect key={i} x={x(d.year) - barW / 2} y={y(d.count)}
              width={barW} height={pad.t + innerH - y(d.count)}
              className="tl-bar"
              fill={selectedYear === d.year ? "var(--accent)" : "var(--accent)"}
              opacity={selectedYear == null || selectedYear === d.year ? 0.9 : 0.32}
              onMouseEnter={(e) => onYearHover && onYearHover(e, d)}
              onMouseMove={(e) => onYearHover && onYearHover(e, d)}
              onMouseLeave={onYearLeave}
              onClick={() => onYearClick && onYearClick(d.year)} />
      ))}

      {/* axis */}
      <line x1={pad.l} y1={pad.t + innerH} x2={w - pad.r} y2={pad.t + innerH} className="tl-axis" />
      {decades.map(d => (
        <g key={d}>
          <line x1={x(d)} x2={x(d)} y1={pad.t + innerH} y2={pad.t + innerH + 4} className="tl-axis" />
          <text x={x(d)} y={pad.t + innerH + 16} textAnchor="middle" className="tl-lbl">{d}</text>
        </g>
      ))}

      {/* y-axis labels */}
      {[0, maxCount * 0.5, maxCount].map((v, i) => (
        <text key={i} x={pad.l - 8} y={y(v) + 3} textAnchor="end" className="tl-lbl">{fmt(Math.round(v))}</text>
      ))}

      {/* flags */}
      {flags && flags.map((f, i) => {
        const fy = parseInt(f.date);
        if (fy < minYear || fy > maxYear) return null;
        const fx = x(fy);
        const yPos = pad.t - 22;
        return (
          <g key={i}>
            <line x1={fx} x2={fx} y1={yPos + 8} y2={pad.t + innerH}
                  stroke="var(--accent)" className="tl-flag-line" />
            <circle cx={fx} cy={yPos + 6} r="3.5" fill="var(--bg-0)" stroke="var(--accent)" className="tl-flag-circle" />
            <text x={fx + 5} y={yPos + 4} className="tl-flag-lbl">{f.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

window.YearlyTimeline = YearlyTimeline;
