// Stylized US state map with Albers projection.
// Decodes topojson client-side. Highlighted states glow.

// FIPS → state abbrev
const FIPS_TO_ST = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT",
  "10":"DE","11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL",
  "18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD",
  "25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE",
  "32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND",
  "39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD",
  "47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV",
  "55":"WI","56":"WY","72":"PR",
};

// Decode topojson arcs → SVG path strings
function decodeTopo(topo) {
  const { arcs: rawArcs, transform } = topo;
  const { scale: [sx, sy], translate: [tx, ty] } = transform;

  // Decode delta-encoded arcs
  const arcs = rawArcs.map(arc => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => {
      x += dx; y += dy;
      return [x * sx + tx, y * sy + ty];
    });
  });

  // Convert arc references to coordinate rings
  function arcToCoords(arcIdx) {
    if (arcIdx >= 0) return arcs[arcIdx].slice();
    return arcs[~arcIdx].slice().reverse();
  }

  function ringToCoords(ring) {
    let coords = [];
    ring.forEach(idx => { coords = coords.concat(arcToCoords(idx)); });
    return coords;
  }

  // Build SVG path for each state
  const geoms = topo.objects.states.geometries;
  const states = {};

  geoms.forEach(g => {
    const st = FIPS_TO_ST[g.id];
    if (!st) return;
    let d = "";
    const polygons = g.type === "Polygon" ? [g.arcs] : g.arcs;
    polygons.forEach(polygon => {
      polygon.forEach(ring => {
        const coords = ringToCoords(ring);
        coords.forEach((pt, i) => {
          d += (i === 0 ? "M" : "L") + pt[0].toFixed(1) + "," + pt[1].toFixed(1);
        });
        d += "Z";
      });
    });
    states[st] = d;
  });

  return states;
}

// Compute bounding box — exclude AK/HI from primary bbox to avoid
// the huge vertical gap from Albers USA inset positioning
function pathsBBox(paths) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const skip = new Set(["AK", "HI"]);
  Object.entries(paths).forEach(([st, d]) => {
    if (skip.has(st)) return;
    const nums = d.match(/-?\d+\.?\d*/g);
    if (!nums) return;
    for (let i = 0; i < nums.length; i += 2) {
      const x = +nums[i], y = +nums[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  });
  // Add some room at bottom-left for AK/HI insets
  minX -= 80; minY -= 20;
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

function USMap({ stateData, highlights = [], active, onHover, onLeave, onClick, mode = "count" }) {
  const [paths, setPaths] = useState(null);
  const [bbox, setBBox] = useState(null);

  useEffect(() => {
    fetch("src/us-states-topo.json")
      .then(r => r.json())
      .then(topo => {
        const p = decodeTopo(topo);
        setPaths(p);
        setBBox(pathsBBox(p));
      });
  }, []);

  const byState = useMemo(() =>
    stateData ? Object.fromEntries(stateData.map(s => [s.st, s])) : {},
    [stateData]
  );
  const max = useMemo(() =>
    stateData ? Math.max(...stateData.map(s => mode === "anom" ? s.anom : s.count)) : 1,
    [stateData, mode]
  );

  if (!paths || !bbox) return <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)" }}>Loading map…</div>;

  // Hardcoded viewBox for Albers USA: covers CONUS + AK/HI insets
  // Y: 50 (top of WA/ME with margin) to 630 (bottom of HI/FL), X: -70 (AK) to 940 (ME)
  const vb = "-70 50 1010 580";
  const hasHighlights = highlights.length > 0;

  return (
    <svg viewBox={vb} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "auto", display: "block", maxHeight: 420, overflow: "hidden" }}>
      <defs>
        <filter id="state-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="var(--accent)" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* Background states (non-highlighted) first */}
      {Object.entries(paths).map(([st, d]) => {
        const isHi = highlights.includes(st);
        const isAct = active === st;
        if (isHi || isAct) return null;
        const s = byState[st];
        const v = s ? (mode === "anom" ? s.anom : s.count) : 0;
        const t = Math.min(1, v / max);
        const isDark = document.documentElement.getAttribute("data-theme") !== "light";
        const fill = isDark
          ? `oklch(${(0.22 + t * 0.18).toFixed(3)} ${(0.010 + t * 0.05).toFixed(3)} 75)`
          : `oklch(${(0.88 - t * 0.30).toFixed(3)} ${(0.020 + t * 0.12).toFixed(3)} 55)`;
        return (
          <path key={st} d={d}
            fill={fill}
            stroke={isDark ? "oklch(0.35 0.015 75)" : "oklch(0.78 0.025 52)"}
            strokeWidth="1.2"
            strokeLinejoin="round"
            opacity={hasHighlights ? 0.6 : 1}
            style={{ cursor: "default", transition: "opacity 200ms" }}
            onMouseEnter={onHover ? (e) => onHover(e, s || { st, name: st, count: 0 }) : undefined}
            onMouseMove={onHover ? (e) => onHover(e, s || { st, name: st, count: 0 }) : undefined}
            onMouseLeave={onLeave}
            onClick={onClick ? () => onClick(st) : undefined}
          />
        );
      })}

      {/* Highlighted states — on top, bright with outer glow */}
      {Object.entries(paths).map(([st, d]) => {
        const isHi = highlights.includes(st);
        const isAct = active === st;
        if (!isHi && !isAct) return null;
        const s = byState[st];
        return (
          <React.Fragment key={st}>
            {/* Glow shadow behind */}
            <path d={d}
              fill="var(--accent)" stroke="none"
              opacity="0.35"
              filter="url(#state-glow)"
              style={{ pointerEvents: "none" }} />
            {/* Crisp state on top */}
            <path d={d}
              fill="var(--accent)"
              stroke="var(--bg-0)"
              strokeWidth="1.8"
              strokeLinejoin="round"
              style={{ cursor: "default" }}
              onMouseEnter={onHover ? (e) => onHover(e, s || { st, name: st, count: 0 }) : undefined}
              onMouseMove={onHover ? (e) => onHover(e, s || { st, name: st, count: 0 }) : undefined}
              onMouseLeave={onLeave}
              onClick={onClick ? () => onClick(st) : undefined}
            />
          </React.Fragment>
        );
      })}

      {/* State labels for highlighted states */}
      {highlights.length > 0 && Object.entries(paths).map(([st, d]) => {
        if (!highlights.includes(st)) return null;
        // Rough centroid from path bounding box
        const nums = d.match(/-?\d+\.?\d*/g) || [];
        let xs = [], ys = [];
        for (let i = 0; i < nums.length - 1; i += 2) {
          xs.push(+nums[i]); ys.push(+nums[i+1]);
        }
        if (!xs.length) return null;
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        return (
          <text key={"lbl-" + st} x={cx} y={cy}
            textAnchor="middle" dominantBaseline="middle"
            style={{
              fontFamily: "var(--f-mono)", fontSize: "8px", fontWeight: 700,
              fill: "var(--bg-0)", pointerEvents: "none",
              textShadow: "0 0 4px var(--accent)",
            }}>
            {st}
          </text>
        );
      })}
    </svg>
  );
}

window.USMap = USMap;
