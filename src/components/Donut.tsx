import { formatCurrency } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/colors";

// Spending-share donut — pure SVG, works in server or client components.
export function Donut({
  segments,
  total,
  size = 180,
  stroke = 11,
  centerLabel = "Spent",
}: {
  segments: { name: string; amount: number }[];
  total: number;
  size?: number;
  stroke?: number;
  centerLabel?: string;
}) {
  const r = 42;
  const C = 2 * Math.PI * r;
  let acc = 0;
  const arcs = segments.map((it, i) => {
    const pct = total > 0 ? it.amount / total : 0;
    const arc = {
      color: CHART_PALETTE[i % CHART_PALETTE.length],
      dash: pct * C,
      gap: C - pct * C,
      offset: -acc * C,
    };
    acc += pct;
    return arc;
  });

  // Scale the center figure down as it grows so 5–6 digit totals stay inside
  // the hole. Sizes are relative to the donut so it holds at any `size`.
  const totalStr = formatCurrency(total);
  const len = totalStr.length;
  const fontPx =
    (len <= 9 ? 0.135 : len <= 11 ? 0.115 : len <= 13 ? 0.097 : 0.083) * size;

  return (
    <div className="mint-donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <g transform="rotate(-90 50 50)">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#EEF2EA" strokeWidth={stroke} />
          {arcs.map((a, i) => (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={stroke}
              strokeDasharray={`${a.dash} ${a.gap}`}
              strokeDashoffset={a.offset}
              strokeLinecap="butt"
            />
          ))}
        </g>
      </svg>
      <div className="ctr">
        <span className="b">{centerLabel}</span>
        <span className="t num" style={{ fontSize: `${fontPx}px` }}>
          {totalStr}
        </span>
      </div>
    </div>
  );
}
