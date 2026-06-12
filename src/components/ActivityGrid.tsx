import { todayDateString } from "@/lib/utils";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MS_PER_DAY = 86_400_000;

// Build a 12×7 grid of YYYY-MM-DD strings (Sun–Sat columns, oldest→newest).
// Anchored to today in the app timezone so dates match how transactions are stored.
function buildWeeks(): string[][] {
  const todayStr = todayDateString();
  const [y, m, d] = todayStr.split("-").map(Number);
  const todayUTC = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = todayUTC.getUTCDay(); // 0=Sun
  const startMs = todayUTC.getTime() - (dayOfWeek + 357) * MS_PER_DAY;
  return Array.from({ length: 52 }, (_, w) =>
    Array.from({ length: 7 }, (_, di) =>
      new Date(startMs + (w * 7 + di) * MS_PER_DAY).toISOString().slice(0, 10)
    )
  );
}

function getMonthIdx(dateStr: string): number {
  return parseInt(dateStr.slice(5, 7), 10) - 1;
}

export function ActivityGrid({ activeDates }: { activeDates: Set<string> }) {
  const weeks = buildWeeks();
  const todayStr = todayDateString();

  return (
    <div className="flex gap-1 overflow-x-auto">
      {/* Day-of-week labels (Mon / Wed / Fri only, like GitHub) */}
      <div className="flex flex-col gap-1 pr-1 pt-5">
        {["", "Mon", "", "Wed", "", "Fri", ""].map((label, i) => (
          <div
            key={i}
            className="flex h-3 items-center text-[10px] leading-none text-slate-400"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Week columns */}
      {weeks.map((week, wi) => {
        const monthIdx = getMonthIdx(week[0]);
        const showMonth = wi === 0 || monthIdx !== getMonthIdx(weeks[wi - 1][0]);
        return (
          <div key={wi} className="flex flex-col gap-1">
            {/* Month label row */}
            <div className="h-4 whitespace-nowrap text-[10px] leading-4 text-slate-400">
              {showMonth ? MONTH_NAMES[monthIdx] : ""}
            </div>
            {/* Day squares */}
            {week.map((dateStr, di) => {
              const isFuture = dateStr > todayStr;
              const isActive = !isFuture && activeDates.has(dateStr);
              return (
                <div
                  key={di}
                  title={dateStr}
                  className={`h-3 w-3 rounded-sm ${
                    isFuture
                      ? "bg-slate-50"
                      : isActive
                        ? "bg-slate-900"
                        : "bg-slate-100"
                  }`}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
