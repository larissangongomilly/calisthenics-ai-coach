// Dark mode ("Graphite and lime") or light mode ("Light and lime").
// The colors live in style.css; this only picks the theme.
// index.html runs the same check before the page is drawn.

const THEME_COLORS = { dark: "#0f1115", light: "#f4f4ef" }; // --bg of each theme

// "system" follows the phone; "dark" and "light" are fixed.
export function resolveTheme(appearance, systemPrefersLight) {
  if (appearance === "dark" || appearance === "light") {
    return appearance;
  }
  return systemPrefersLight ? "light" : "dark";
}

const lightQuery = () => globalThis.matchMedia?.("(prefers-color-scheme: light)");

export function applyTheme(appearance) {
  const theme = resolveTheme(appearance, Boolean(lightQuery()?.matches));
  const root = document.documentElement;
  if (theme === "light") {
    root.dataset.theme = "light";
  } else {
    delete root.dataset.theme;
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  return theme;
}

// Calls back when the phone switches between dark and light mode.
export function watchSystemTheme(callback) {
  lightQuery()?.addEventListener?.("change", callback);
}
