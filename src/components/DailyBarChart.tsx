"use client";

import { BarChart, Bar, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface Point {
  label: string;
  amount: number;
}

// 14-day expense bars, built on Recharts so hovering a bar shows a real
// tooltip ("<date>: <amount>"). Days over ₱300 get the darker green.
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
            <Cell key={i} fill={d.amount > 300 ? "#0E5A3C" : "#7FCE3E"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
