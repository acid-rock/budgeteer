"use client";

import { PieChart, Pie, Cell } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/colors";

// Spending-share donut, built on Recharts. Per-segment hover gives a subtle
// brightness highlight (see .mint-donut .arc in globals.css); the breakdown is
// read off the legend beside it.
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
  const data = segments.map((s) => ({
    name: s.name,
    value: s.amount,
  }));

  // Scale the center figure down as it grows so 5–6 digit totals stay inside
  // the hole. Sizes are relative to the donut so it holds at any `size`.
  const totalStr = formatCurrency(total);
  const len = totalStr.length;
  const fontPx =
    (len <= 9 ? 0.135 : len <= 11 ? 0.115 : len <= 13 ? 0.097 : 0.083) * size;

  const outerRadius = size / 2 - 4;
  const innerRadius = Math.max(outerRadius - stroke, 0);

  return (
    <div className="mint-donut" style={{ width: size, height: size }}>
      <PieChart width={size} height={size}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={90}
          endAngle={-270}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell
              key={i}
              className="arc"
              fill={CHART_PALETTE[i % CHART_PALETTE.length]}
            />
          ))}
        </Pie>
      </PieChart>
      <div className="ctr">
        <span className="b">{centerLabel}</span>
        <span className="t num" style={{ fontSize: `${fontPx}px` }}>
          {totalStr}
        </span>
      </div>
    </div>
  );
}
