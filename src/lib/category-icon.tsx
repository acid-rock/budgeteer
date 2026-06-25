// Category line-icon set ported from the "Sprout" design — one cohesive set
// (24×24, 1.7 stroke, round caps) so every category reads the same regardless of
// its tile color. Stored as raw inner-SVG markup and rendered with currentColor,
// so the caller controls the color via CSS. Server- and client-safe.

const CAT_ICON_PATHS: Record<string, string> = {
  Groceries:
    '<circle cx="9" cy="21" r="1"/><circle cx="18" cy="21" r="1"/><path d="M2.5 3h2l2.2 11.4a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.2L20 7H6"/>',
  "Dining Out":
    '<path d="M3 2v6a2.2 2.2 0 0 0 4.4 0V2"/><path d="M5.2 8v14"/><path d="M19 2c-1.6 0-3 2.2-3 5.5 0 2.4 1.2 3.5 3 3.5V2z"/><path d="M19 11v11"/>',
  Entertainment:
    '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5"/>',
  Transport:
    '<path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"/><path d="M5 11h14a2 2 0 0 1 2 2v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2 2 0 0 1 2-2z"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/>',
  Miscellaneous:
    '<path d="M3 7.5V4a1 1 0 0 1 1-1h3.5a2 2 0 0 1 1.4.6l10 10a2 2 0 0 1 0 2.8l-4.1 4.1a2 2 0 0 1-2.8 0l-10-10A2 2 0 0 1 3 8z"/><circle cx="7" cy="7" r="1.2"/>',
  Academic:
    '<path d="M2 8.5 12 4l10 4.5-10 4.5z"/><path d="M6 10.5V15c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6v-4.5"/><path d="M22 8.5V14"/>',
  Allowance:
    '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><path d="M15.5 14.5h2.5"/>',
  Bills: '<path d="M13 2 4 13h6l-1 9 9-11h-6l1-9z"/>',
  Rent: '<path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M10 20v-6h4v6"/>',
  // Added in the same style for this app's income categories.
  Salary:
    '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.4"/><path d="M6 10.5v3M18 10.5v3"/>',
  Freelance:
    '<rect x="3" y="5" width="18" height="11" rx="2"/><path d="M2 20h20"/>',
  Investments: '<path d="M3 17l6-6 4 4 7-7"/><path d="M16 8h5v5"/>',
  // Piggy bank — used for savings buckets.
  Savings:
    '<path d="M19 6c-1.5 0-2.7 1.2-3 2-3.6-1.4-11-.4-11 5 0 1.8.8 3 2 4v3h3v-2h3v2h3v-3.5c.7-.5 1.3-1 1.7-1.5H21v-4h-1.6c-.2-.6-.6-1.1-1-1.5L19 6z"/><path d="M2 10v1.5A2.5 2.5 0 0 0 4.5 14"/><circle cx="15.5" cy="11" r="1"/>',
  _default: '<circle cx="12" cy="12" r="8"/>',
};

// Match a category name to an icon by keyword so custom categories still get a
// sensible icon; unmatched names fall back by kind to a money/tag icon.
const KEYWORD_KEYS: { match: RegExp; key: string }[] = [
  { match: /grocer|market|supermarket/, key: "Groceries" },
  { match: /din(e|ing)|restaurant|cafe|coffee|food|lunch|breakfast/, key: "Dining Out" },
  { match: /entertain|movie|game|stream|netflix|spotify|subscription|hobby|music/, key: "Entertainment" },
  { match: /transport|\bcar\b|fuel|gas|petrol|uber|grab|taxi|bus|train|commute|parking|travel|flight/, key: "Transport" },
  { match: /rent|mortgage|housing|landlord/, key: "Rent" },
  { match: /electric|water|internet|wifi|phone|\bbill|utilit/, key: "Bills" },
  { match: /educat|school|tuition|book|course|study|class|academ/, key: "Academic" },
  { match: /allowance|gift|present/, key: "Allowance" },
  { match: /salary|payroll|paycheck|wage|bonus/, key: "Salary" },
  { match: /freelance|contract|gig|consult/, key: "Freelance" },
  { match: /invest|stock|dividend|crypto|interest/, key: "Investments" },
  { match: /misc|other|general/, key: "Miscellaneous" },
];

function iconKeyFor(name: string, kind: string): string {
  // Savings buckets always read as a piggy bank regardless of their name.
  if (kind === "savings") return "Savings";
  const normalized = name.toLowerCase();
  for (const { match, key } of KEYWORD_KEYS) {
    if (match.test(normalized)) return key;
  }
  return kind === "income" ? "Salary" : "Miscellaneous";
}

export function CategoryIcon({
  name,
  kind,
  size = 20,
}: {
  name: string;
  kind: string;
  size?: number;
}) {
  const inner = CAT_ICON_PATHS[iconKeyFor(name, kind)] ?? CAT_ICON_PATHS._default;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      // Static, hardcoded SVG markup (no user input) — safe to inline.
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
