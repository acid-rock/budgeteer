// Sprout chart palette — dark→light greens, used for donut/legend/bars by index,
// and assigned stably per category name for dots/icons across the app.
export const CHART_PALETTE = [
  "#0E5A3C",
  "#127A4F",
  "#3FA66A",
  "#7FCE3E",
  "#BFF24A",
  "#D6E8A0",
];

// Tile background + icon color for a category swatch, per the Sprout design:
// expense → a soft 16% tint of the category color with a dark-green icon;
// income → solid positive green with a white icon. Used everywhere a category
// icon tile appears (cards, transaction rows, dashboard, budgets, reports).
export function categoryTile(
  color: string,
  kind: string
): { background: string; color: string } {
  if (kind === "income") {
    return { background: "var(--pos)", color: "#fff" };
  }
  // Savings buckets get the bright lime tile with a dark-green icon so they read
  // as distinct from spend/income categories across the app.
  if (kind === "savings") {
    return { background: "var(--lime)", color: "var(--green)" };
  }
  return {
    background: `color-mix(in srgb, ${color} 16%, #fff)`,
    color: "var(--green)",
  };
}

// Deterministic color for a category name so the same category always reads the
// same hue regardless of where it appears (recent activity, tags, cards).
export function colorForCategory(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return CHART_PALETTE[h % CHART_PALETTE.length];
}
