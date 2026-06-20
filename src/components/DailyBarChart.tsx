"use client";

import { BarChart, Bar, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface Point {
  label: string;
  amount: number;
}

// Daily-spend bars above this peso amount are drawn in the darker "heavy" green
// to flag higher-spend days at a glance.
const HEAVY_SPEND_THRESHOLD = 300;
const BAR_COLOR = "#7FCE3E";
const BAR_COLOR_HEAVY = "#0E5A3C";

// 14-day expense bars, built on Recharts so hovering a bar shows a real
// tooltip ("<date>: <amount>").
export function DailyBarChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <Tooltip
          cursor={{ fill: "#E8EFE0" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as Point;
            return (
              <div className="mint-tooltip">
                {d.label}: {formatCurrency(d.amount)}
              </div>
            );
          }}
        />
        <Bar dataKey="amount" radius={[6, 6, 3, 3]} maxBarSize={22}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.amount > HEAVY_SPEND_THRESHOLD ? BAR_COLOR_HEAVY : BAR_COLOR}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
