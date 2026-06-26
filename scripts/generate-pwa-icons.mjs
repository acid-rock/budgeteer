// Generates the PWA / home-screen PNG icons from a vector "Sprout" brand mark
// (green tile + lime "B"). The "B" is drawn as stroked paths rather than <text>
// so rasterization doesn't depend on a system font being installed.
//
// Run with: node scripts/generate-pwa-icons.mjs
// Outputs into public/. Re-run if the brand mark changes.

import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

const GREEN = "#0e5a3c";
const LIME = "#bff24a";

// The "B" glyph as stroked paths on a 512 grid (stem + two lobes).
const B_PATH =
  "M188 138 V374 " +
  "M188 138 H296 C350 138 366 168 366 197 C366 226 350 256 296 256 H188 " +
  "M188 256 H306 C360 256 378 286 378 315 C378 344 360 374 306 374 H188";

function glyph(scale = 1) {
  const inner = `<path d="${B_PATH}" fill="none" stroke="${LIME}" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (scale === 1) return inner;
  // Scale about the canvas centre (keeps the mark inside a maskable safe zone).
  return `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${inner}</g>`;
}

// purpose "any": rounded green tile, transparent outside the corners.
function anyTile(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="112" fill="${GREEN}"/>
    ${glyph(1)}
  </svg>`;
}

// Full-bleed green square. For maskable, the mark is scaled into the safe zone;
// for Apple touch (which applies its own rounded mask), the mark stays full size.
function fullBleed(size, scale) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="${GREEN}"/>
    ${glyph(scale)}
  </svg>`;
}

const targets = [
  { file: "icon-192.png", svg: anyTile(192) },
  { file: "icon-512.png", svg: anyTile(512) },
  { file: "icon-maskable-512.png", svg: fullBleed(512, 0.85) },
  { file: "apple-icon.png", svg: fullBleed(180, 1) },
];

for (const { file, svg } of targets) {
  await sharp(Buffer.from(svg)).png().toFile(join(publicDir, file));
  console.log(`wrote public/${file}`);
}
