// Writes the app icon as SVG (public/icons/icon.svg and icon-maskable.svg):
// the frog stand as a lime outline on graphite, like the figures in the app.
// The PNG icons are made from these files on macOS:
//   qlmanage -t -s 512 -o <folder> public/icons/icon.svg, then sips -z for the smaller sizes.
import { writeFileSync } from "node:fs";
import { renderFigure } from "../src/figures.js";

const BG = "#1a1d24"; // graphite
const ACCENT = "#c6f432"; // lime
const FIGURE_BOX = "22 36 60 60"; // the frog stand without its floor

// scale: share of the icon the figure may use (maskable icons need a safe zone)
function icon(scale) {
  const inner = renderFigure("frog-stand-straight", ACCENT, BG)
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>$/, "")
    .replace(/<line[^>]*\/>/g, ""); // drop the floor
  const size = 100 * scale;
  const offset = (100 - size) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
<rect width="100" height="100" fill="${BG}"/>
<svg x="${offset}" y="${offset}" width="${size}" height="${size}" viewBox="${FIGURE_BOX}">${inner}</svg>
</svg>
`;
}

writeFileSync(new URL("../public/icons/icon.svg", import.meta.url), icon(0.8));
writeFileSync(new URL("../public/icons/icon-maskable.svg", import.meta.url), icon(0.7));
