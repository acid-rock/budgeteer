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

// Deterministic color for a category name so the same category always reads the
// same hue regardless of where it appears (recent activity, tags, cards).
export function colorForCategory(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return CHART_PALETTE[h % CHART_PALETTE.length];
}
