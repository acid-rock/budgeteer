"use client";

import { useRef, useState } from "react";
import { todayDateString } from "@/lib/utils";

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MS_PER_DAY = 86_400_000;

// Sprout heatmap palette: level 0 (none) → level 4 (busiest day).
const LEVELS = ["#E8EFE0", "#CBE79A", "#93D34F", "#3FA66A", "#0E5A3C"];

// Map a day's transaction count to a 0–4 intensity level.
function levelForCount(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

interface Cell {
  date: string;
  count: number;
  level: number;
  future: boolean;
}

function formatCellDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTH_ABBR[m - 1]} ${d}, ${y}`;
}

// Build 53 Sunday-first week columns ending at today (app timezone), each day a
// { level, future } cell. Month labels mark the column where a new month starts.
function buildGrid(countByDate: Record<string, number>) {
  const todayStr = todayDateString();
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const today = new Date(Date.UTC(ty, tm - 1, td));
  const start = new Date(today.getTime() - 52 * 7 * MS_PER_DAY);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay()); // back to Sunday

  const cells: Cell[] = [];
  const months: { label: string; col: number }[] = [];
  let cur = new Date(start);
  let lastMonth = -1;

  for (let w = 0; w < 53; w++) {
    for (let d = 0; d < 7; d++) {
      const iso = cur.toISOString().slice(0, 10);
      const future = iso > todayStr;
      const count = countByDate[iso] ?? 0;
      cells.push({
        date: iso,
        count,
        level: future ? 0 : levelForCount(count),
        future,
      });
      if (d === 0) {
        const m = cur.getUTCMonth();
        if (m !== lastMonth) {
          months.push({ label: MONTH_ABBR[m], col: w });
          lastMonth = m;
        }
      }
      cur = new Date(cur.getTime() + MS_PER_DAY);
    }
  }
  return { cells, months };
}

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

export function ActivityGrid({
  countByDate,
}: {
  countByDate: Record<string, number>;
}) {
  const { cells, months } = buildGrid(countByDate);

  // Anchor the tooltip to this non-scrolling wrapper (not to .heat, which
  // becomes a horizontal scroll container on phones and would clip it).
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(
    null
  );

  function showTip(e: React.MouseEvent, c: Cell) {
    if (c.future) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      text: `${formatCellDate(c.date)}: ${c.count} transaction${
        c.count === 1 ? "" : "s"
      }`,
    });
  }

  return (
    <div className="heat-wrap" ref={wrapRef} style={{ position: "relative" }}>
      <div className="heat">
        <div className="heat-months">
          {months.map((m, i) => (
            <span key={i} style={{ gridColumnStart: m.col + 1 }}>
              {m.label}
            </span>
          ))}
        </div>
        <div className="heat-body">
          <div className="heat-days">
            {DAY_LABELS.map((d, i) => (
              <span key={i} style={{ gridRow: i + 1 }}>
                {d}
              </span>
            ))}
          </div>
          <div className="heat-cells">
            {cells.map((c, i) => (
              <i
                key={i}
                onMouseEnter={(e) => showTip(e, c)}
                onMouseLeave={() => setTip(null)}
                style={{ background: c.future ? "transparent" : LEVELS[c.level] }}
              />
            ))}
          </div>
        </div>
        <div className="heat-legend">
          <span>Less</span>
          {LEVELS.map((c, i) => (
            <i key={i} style={{ background: c }} />
          ))}
          <span>More</span>
        </div>
      </div>
      {tip && (
        <div
          className="mint-tooltip"
          style={{
            position: "absolute",
            left: tip.x,
            top: tip.y - 34,
            transform: "translateX(-50%)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 5,
          }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}
