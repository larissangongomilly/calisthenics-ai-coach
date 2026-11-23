// Writes the app icon as SVG (public/icons/icon.svg and icon-maskable.svg).
// The PNG icons were made from these files (macOS: qlmanage -t -s 512).
import { writeFileSync } from "node:fs";
import { renderFigure } from "../src/figures.js";

const BG = "#0f1115";
const ACCENT = "#c6f432";

// scale: share of the icon the figure may use (maskable icons need a safe zone)
function icon(scale) {
  const inner = renderFigure("full-planche", ACCENT, BG).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  const size = 100 * scale;
  const offset = (100 - size) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
<rect width="100" height="100" fill="${BG}"/>
<svg x="${offset}" y="${offset}" width="${size}" height="${size}" viewBox="-2 30 104 70">${inner}</svg>
</svg>
`;
}

writeFileSync(new URL("../public/icons/icon.svg", import.meta.url), icon(0.9));
writeFileSync(new URL("../public/icons/icon-maskable.svg", import.meta.url), icon(0.7));
