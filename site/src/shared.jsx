// Shared primitives used across the dashboard.
// Exposes to window so other Babel scripts can use them.

const { useState, useRef, useEffect, useMemo, useCallback } = React;

// ── Number formatting ─────────────────────────────────────────────────
const fmt = (n) => {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 10_000) return (n / 1000).toFixed(1) + "k";
  if (Math.abs(n) >= 1000) return n.toLocaleString();
  return n.toString();
};
const fmtPct = (n) => (n == null ? "—" : (n.toFixed(n < 10 ? 1 : 0)) + "%");
const fmtRange = (a, b) => `${a}–${b}`;

// ── Tooltip (singleton, follows pointer) ──────────────────────────────
function useTooltip() {
  const [tt, setTT] = useState(null);
  const show = useCallback((evt, content) => {
    setTT({ x: evt.clientX, y: evt.clientY, content });
  }, []);
  const move = useCallback((evt) => {
    setTT(prev => prev ? { ...prev, x: evt.clientX, y: evt.clientY } : null);
  }, []);
  const hide = useCallback(() => setTT(null), []);
  const node = tt ? (
    <div className="tt" style={{
      left: Math.min(tt.x + 14, window.innerWidth - 300),
      top:  Math.min(tt.y + 14, window.innerHeight - 120),
    }}>{tt.content}</div>
  ) : null;
  return { show, move, hide, node };
}

// ── Section panel ─────────────────────────────────────────────────────
function Panel({ idx, title, meta, children, tight, footer, style, className = "" }) {
  return (
    <section className={"panel " + className} style={style}>
      <header className="panel-hd">
        <div className="panel-title">
          {idx != null && <span className="idx">§ {idx}</span>}
          <span>{title}</span>
        </div>
        {meta && <div className="panel-meta">{meta}</div>}
      </header>
      <div className={"panel-body" + (tight ? " tight" : "")}>{children}</div>
      {footer && <div className="method-note">{footer}</div>}
    </section>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat">
      <div className="stat-lbl">{label}</div>
      <div className={"stat-val" + (accent ? " stat-accent" : "")}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ── Bar list ──────────────────────────────────────────────────────────
function BarList({ data, max, getLabel, getValue, getDisplay, accent = "accent", onHover, onLeave }) {
  const m = max ?? Math.max(...data.map(getValue));
  return (
    <div className="bars">
      {data.map((d, i) => {
        const v = getValue(d);
        const pct = (v / m) * 100;
        return (
          <div className="bar-row" key={i}
               onMouseEnter={onHover ? (e) => onHover(e, d) : undefined}
               onMouseMove={onHover ? (e) => onHover(e, d) : undefined}
               onMouseLeave={onLeave}>
            <div className="lbl">{getLabel(d)}</div>
            <div className="bar-track">
              <div className={"bar-fill " + accent} style={{ width: pct + "%" }} />
            </div>
            <div className="val">{getDisplay ? getDisplay(d) : fmt(v)}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Sparkline ──────────────────────────────────────────────────────────
function Sparkline({ data, w = 200, h = 40, accent = "var(--accent)" }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data);
  const step = w / (data.length - 1 || 1);
  const pts = data.map((v, i) => [i * step, h - (v / max) * (h - 4) - 2]);
  const d = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const dArea = d + ` L ${w},${h} L 0,${h} Z`;
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <path d={dArea} fill={accent} opacity="0.18" />
      <path d={d} fill="none" stroke={accent} strokeWidth="1.5" />
    </svg>
  );
}

// ── Tag ───────────────────────────────────────────────────────────────
function Tag({ tone = "", children, onClick, active }) {
  return (
    <span className={"tag " + tone + (active ? " solid" : "")} onClick={onClick}>
      {children}
    </span>
  );
}

// ── Era ribbon ────────────────────────────────────────────────────────
function EraRibbon({ eras }) {
  return (
    <div className="eras">
      {eras.map((e, i) => (
        <div className={"era " + e.color} key={i}>
          <div className="era-name">{e.label}</div>
          <div className="era-years">{e.start}–{e.end}</div>
          <div className="era-desc">{e.descr}</div>
        </div>
      ))}
    </div>
  );
}

// ── Heatmap color scale (per-row normalization) ──────────────────────
function heatColor(v, peak, eraColor) {
  if (!v) return "var(--bg-1)";
  const t = Math.min(1, v / peak);
  // Map t to amber intensity (or per-era color)
  // Use OKLCH lightness/chroma ramp
  const L = (0.18 + t * 0.58).toFixed(3);
  const C = (0.005 + t * 0.18).toFixed(3);
  const hue = eraColor || 75;
  return `oklch(${L} ${C} ${hue})`;
}

// ── Click outside hook ────────────────────────────────────────────────
function useClickOutside(ref, cb) {
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [ref, cb]);
}

// Expose all
Object.assign(window, {
  React, useState, useEffect, useMemo, useRef, useCallback,
  fmt, fmtPct, fmtRange,
  useTooltip, Panel, StatCard, BarList, Sparkline, Tag, EraRibbon, heatColor, useClickOutside,
});
