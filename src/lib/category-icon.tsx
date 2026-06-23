import { createElement } from "react";
import {
  Briefcase,
  Laptop,
  TrendingUp,
  Gift,
  PiggyBank,
  Banknote,
  ShoppingCart,
  Home,
  UtensilsCrossed,
  Car,
  Zap,
  HeartPulse,
  ShoppingBag,
  Clapperboard,
  Plane,
  GraduationCap,
  Coins,
  Receipt,
  type LucideIcon,
} from "lucide-react";

// Name keyword → icon. First match wins, so order more specific terms earlier.
// Covers the seeded categories plus common ones; unmatched names fall back to a
// kind-based default (coins for income, receipt for expense).
const KEYWORD_ICONS: { match: RegExp; icon: LucideIcon }[] = [
  { match: /salary|payroll|paycheck|wage/, icon: Briefcase },
  { match: /freelance|contract|gig|consult/, icon: Laptop },
  { match: /invest|stock|dividend|crypto|interest/, icon: TrendingUp },
  { match: /allowance|gift|present/, icon: Gift },
  { match: /saving|deposit/, icon: PiggyBank },
  { match: /bonus|refund|reimburse/, icon: Banknote },
  { match: /grocer|market|supermarket/, icon: ShoppingCart },
  { match: /rent|mortgage|housing|landlord|utilit/, icon: Home },
  { match: /din(e|ing)|restaurant|cafe|coffee|food|lunch|breakfast/, icon: UtensilsCrossed },
  { match: /transport|\bcar\b|fuel|gas|petrol|uber|grab|taxi|bus|train|commute|parking/, icon: Car },
  { match: /electric|water|internet|wifi|phone|\bbill/, icon: Zap },
  { match: /health|medic|doctor|pharmac|hospital|dental|fitness|gym/, icon: HeartPulse },
  { match: /shop|cloth|apparel|retail|fashion/, icon: ShoppingBag },
  { match: /entertain|movie|game|stream|netflix|spotify|subscription|hobby/, icon: Clapperboard },
  { match: /travel|flight|hotel|trip|vacation|holiday/, icon: Plane },
  { match: /educat|school|tuition|book|course|study|class/, icon: GraduationCap },
];

// `kind` is "income" | "expense" but typed as string since it often arrives
// straight from Prisma (where the column is a plain string).
export function iconForCategory(name: string, kind: string): LucideIcon {
  const normalized = name.toLowerCase();
  for (const { match, icon } of KEYWORD_ICONS) {
    if (match.test(normalized)) return icon;
  }
  return kind === "income" ? Coins : Receipt;
}

// Renders the icon for a category, inheriting the current text color so callers
// control it via CSS `color` (white on a colored tile, the category hue on a
// light tile). Server- and client-safe (plain SVG, no hooks).
export function CategoryIcon({
  name,
  kind,
  size = 20,
}: {
  name: string;
  kind: string;
  size?: number;
}) {
  // createElement (not <Icon />) because the icon is selected at render from a
  // static module-level set — this isn't a component defined during render.
  return createElement(iconForCategory(name, kind), {
    size,
    strokeWidth: 2,
    "aria-hidden": true,
  });
}
