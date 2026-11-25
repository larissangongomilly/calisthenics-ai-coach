// Draws the Stats tab: headline tiles, sets per week, training calendar,
// progress curve per skill and personal bests. Charts are plain SVG.
// Tapping a bar, day or point shows its exact value in the caption below.
import { LEVELS, getSkill } from "./skills.js";
import { formatClock } from "./workout.js";
import { overview, personalBests, skillSeries, trainingCalendar, weeklyTotals } from "./stats.js";

// Colors are CSS variables (style.css), so the charts follow dark and light mode.
const ACCENT = "var(--accent-text)";
const TRACK = "var(--surface-2)";
const GRID = "var(--border)";
const MUTED = "var(--muted)";
const SVG_NS = "http://www.w3.org/2000/svg";

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const longDay = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const setDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/Berlin" });

const dayLabel = (day, format = shortDate) => format.format(new Date(`${day}T00:00:00Z`));

function svg(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) {
    // Colors go through style: SVG attributes do not understand var().
    if (key === "fill" || key === "stroke") {
      element.style.setProperty(key, String(value));
    } else {
      element.setAttribute(key, String(value));
    }
  }
  return element;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// Marks one element as selected and writes its caption.
function makeSelectable(elements, caption, describe, start) {
  function select(index) {
    elements.forEach((element, i) => element.classList.toggle("is-selected", i === index));
    caption.textContent = describe(index);
  }
  elements.forEach((element, index) => {
    element.setAttribute("tabindex", "0");
    element.setAttribute("role", "button");
    element.addEventListener("click", () => select(index));
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select(index);
      }
    });
  });
  select(start);
}

// ---------- Tiles ----------

function renderTiles(container, numbers) {
  const tiles = [
    ["Reps this week", numbers.thisWeek.reps],
    ["Days this week", numbers.thisWeek.activeDays],
    ["Total sets", numbers.totalSets],
    ["Skills completed", numbers.skillsCompleted],
  ];
  container.replaceChildren(
    ...tiles.map(([label, value]) => {
      const tile = document.createElement("div");
      tile.className = "stat-tile";
      tile.innerHTML = `<p class="stat-label"></p><p class="stat-value"></p>`;
      tile.querySelector(".stat-label").textContent = label;
      tile.querySelector(".stat-value").textContent = String(value);
      return tile;
    })
  );
}

// ---------- Sets per week (bars stacked by level) ----------
// Sets, not reps: hold skills have no reps, so a week of handstands would
// look empty. Each bar is split by the level of the skills, in level colors.

const W = 320;
const SURFACE = "var(--surface)";
const levelColor = (level) => LEVELS.find((l) => l.level === level)?.color ?? ACCENT;

// Small row of level colors under a chart, only for the levels that appear.
function levelLegend(levels) {
  const legend = document.createElement("div");
  legend.className = "level-legend";
  for (const level of [...levels].sort((a, b) => a - b)) {
    const item = document.createElement("span");
    item.className = "level-legend-item";
    const swatch = document.createElement("span");
    swatch.className = "level-swatch";
    swatch.style.background = levelColor(level);
    item.append(swatch, `Level ${level}`);
    legend.append(item);
  }
  return legend;
}

function renderWeeklyChart(container, caption, weeks) {
  const H = 150;
  const top = 12;
  const bottom = 24;
  const plotH = H - top - bottom;
  const max = Math.max(1, ...weeks.map((week) => week.sets));
  const slot = W / weeks.length;
  const barW = Math.min(26, slot - 10);
  const levels = new Set();

  const chart = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart", role: "img", "aria-label": "Sets per week by level, last 8 weeks" });
  chart.append(svg("line", { x1: 0, x2: W, y1: top + plotH, y2: top + plotH, stroke: GRID, "stroke-width": 1 }));

  const hits = weeks.map((week, i) => {
    const x = i * slot + (slot - barW) / 2;
    const group = svg("g", { class: "chart-hit" });
    // Bigger invisible hit area than the bar itself.
    group.append(svg("rect", { x: i * slot, y: 0, width: slot, height: H, fill: "transparent" }));

    // Segments from the lowest level at the bottom to the highest on top.
    const parts = Object.entries(week.setsByLevel)
      .map(([level, sets]) => [Number(level), sets])
      .sort((a, b) => a[0] - b[0]);
    let y = top + plotH;
    parts.forEach(([level, sets], index) => {
      levels.add(level);
      const h = Math.max(3, (sets / max) * plotH);
      const isTop = index === parts.length - 1;
      const y0 = y - h;
      const r = isTop ? Math.min(4, h) : 0;
      group.append(
        svg("path", {
          class: "bar",
          d: `M${x},${y} V${y0 + r} Q${x},${y0} ${x + r},${y0} H${x + barW - r} Q${x + barW},${y0} ${x + barW},${y0 + r} V${y} Z`,
          fill: levelColor(level),
        })
      );
      // 2px surface gap between stacked segments.
      if (!isTop) {
        group.append(svg("line", { x1: x, x2: x + barW, y1: y0, y2: y0, stroke: SURFACE, "stroke-width": 2 }));
      }
      y = y0;
    });

    const label = svg("text", { x: x + barW / 2, y: H - 6, "text-anchor": "middle", class: "chart-axis" });
    label.textContent = i === weeks.length - 1 ? "Now" : dayLabel(week.weekStart);
    // Only every other date label fits on a phone.
    if (i % 2 === (weeks.length - 1) % 2) group.append(label);
    chart.append(group);
    return group;
  });

  container.replaceChildren(chart, ...(levels.size > 0 ? [levelLegend(levels)] : []));
  makeSelectable(
    hits,
    caption,
    (i) => {
      const week = weeks[i];
      const when = i === weeks.length - 1 ? "This week" : `Week of ${dayLabel(week.weekStart)}`;
      const reps = week.reps > 0 ? ` · ${plural(week.reps, "rep")}` : "";
      const holds = week.holdSeconds > 0 ? ` · ${formatClock(week.holdSeconds)} holds` : "";
      return `${when}: ${plural(week.sets, "set")}${reps}${holds}`;
    },
    weeks.length - 1
  );
}

// ---------- Training calendar ----------
// Each day shows its date. Training days are filled with the color of the
// highest level trained that day, so you can see when you moved up a level.

const dayNumber = (day) => String(Number(day.slice(8, 10)));

function renderCalendar(container, caption, calendar) {
  const grid = document.createElement("div");
  grid.className = "calendar";
  for (const name of ["M", "T", "W", "T", "F", "S", "S"]) {
    const head = document.createElement("span");
    head.className = "calendar-head";
    head.textContent = name;
    grid.append(head);
  }
  const days = calendar.flat();
  const levels = new Set();
  const cells = days.map((day) => {
    const cell = document.createElement("span");
    cell.className = "calendar-day";
    const trained = day.sets > 0;
    cell.classList.toggle("is-trained", trained);
    cell.classList.toggle("is-today", day.today);
    cell.classList.toggle("is-future", day.future);
    if (trained) {
      levels.add(day.topLevel);
      cell.style.setProperty("--day-color", levelColor(day.topLevel));
    }
    // Month name on the 1st, so the grid is easy to place in time.
    cell.textContent = day.day.endsWith("-01") ? dayLabel(day.day).replace(" ", "\n") : dayNumber(day.day);
    cell.setAttribute("aria-label", `${dayLabel(day.day, longDay)}: ${plural(day.sets, "set")}`);
    grid.append(cell);
    return cell;
  });
  container.replaceChildren(grid, ...(levels.size > 0 ? [levelLegend(levels)] : []));
  const todayIndex = days.findIndex((day) => day.today);
  makeSelectable(
    cells,
    caption,
    (i) => {
      const day = days[i];
      const when = day.today ? "Today" : dayLabel(day.day, longDay);
      if (day.future) return `${when}: still ahead`;
      if (day.sets === 0) return day.today ? "Today: no sets yet" : `${when}: rest day`;
      const skills = day.skills.map((id) => getSkill(id)?.name ?? id).join(", ");
      return `${when}: ${plural(day.sets, "set")} · ${skills}`;
    },
    todayIndex
  );
}

// ---------- Progress curve of one skill ----------

const MAX_POINTS = 20;

function renderSkillChart(container, caption, skill, points) {
  const shown = points.slice(-MAX_POINTS);
  const unit = skill.measure === "hold" ? "s" : "reps";
  if (shown.length === 0) {
    container.replaceChildren();
    caption.textContent = "No sets for this skill yet.";
    return;
  }

  const H = 160;
  const left = 38;
  const right = 12;
  const top = 14;
  const bottom = 14;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const max = Math.max(skill.goal, ...shown.map((p) => p.value)) * 1.15;
  const yOf = (value) => top + plotH - (value / max) * plotH;
  const xOf = (i) => (shown.length === 1 ? left + plotW / 2 : left + (i / (shown.length - 1)) * plotW);

  const chart = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart", role: "img", "aria-label": `${skill.name}: ${unit} per set` });
  chart.append(svg("line", { x1: left, x2: W - right, y1: top + plotH, y2: top + plotH, stroke: GRID, "stroke-width": 1 }));
  const zero = svg("text", { x: left - 6, y: top + plotH + 4, "text-anchor": "end", class: "chart-axis" });
  zero.textContent = "0";
  chart.append(zero);

  // Goal as a dashed reference line.
  const goalY = yOf(skill.goal);
  chart.append(svg("line", { x1: left, x2: W - right, y1: goalY, y2: goalY, stroke: MUTED, "stroke-width": 1, "stroke-dasharray": "4 4" }));
  const goalLabel = svg("text", { x: left - 6, y: goalY + 4, "text-anchor": "end", class: "chart-axis" });
  const isHold = skill.measure === "hold";
  goalLabel.textContent = isHold ? formatClock(skill.goal) : String(skill.goal);
  chart.append(goalLabel);

  // Best value as the top label, so the height of the line can be read.
  const best = Math.max(...shown.map((p) => p.value));
  if (yOf(best) < goalY - 14) {
    const bestY = yOf(best);
    chart.append(svg("line", { x1: left, x2: W - right, y1: bestY, y2: bestY, stroke: GRID, "stroke-width": 1 }));
    const bestLabel = svg("text", { x: left - 6, y: bestY + 4, "text-anchor": "end", class: "chart-axis" });
    bestLabel.textContent = isHold ? formatClock(best) : String(best);
    chart.append(bestLabel);
  }

  if (shown.length > 1) {
    const d = shown.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i)},${yOf(p.value)}`).join(" ");
    chart.append(svg("path", { d, fill: "none", stroke: ACCENT, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
  }

  const slot = shown.length === 1 ? plotW : plotW / (shown.length - 1);
  const hits = shown.map((p, i) => {
    const group = svg("g", { class: "chart-hit" });
    group.append(svg("rect", { x: xOf(i) - slot / 2, y: 0, width: slot, height: H, fill: "transparent" }));
    // 2px surface ring keeps the dot readable on the line.
    group.append(svg("circle", { class: "dot", cx: xOf(i), cy: yOf(p.value), r: 4.5, fill: ACCENT, stroke: SURFACE, "stroke-width": 2 }));
    chart.append(group);
    return group;
  });

  container.replaceChildren(chart);
  makeSelectable(
    hits,
    caption,
    (i) => {
      const p = shown[i];
      const amount = skill.measure === "hold" ? formatClock(p.value) : plural(p.value, "rep");
      return `${setDate.format(new Date(p.date))}: ${amount} · ${p.score}% form · goal ${skill.measure === "hold" ? formatClock(skill.goal) : `${skill.goal} ${unit}`}`;
    },
    shown.length - 1
  );
}

// ---------- Personal bests ----------

function renderBests(list, bests) {
  list.replaceChildren(
    ...bests.map((best) => {
      const item = document.createElement("li");
      item.className = "history-item";
      const name = document.createElement("span");
      name.textContent = best.completed ? `${best.name} ✓` : best.name;
      const value = document.createElement("span");
      value.className = "history-value";
      value.textContent = `${best.measure === "hold" ? formatClock(best.best) : plural(best.best, "rep")} · ${best.bestScore}%`;
      item.append(name, value);
      return item;
    })
  );
}

// ---------- Whole tab ----------

// parts: elements of the Stats screen (see index.html). state.skillId is the
// skill shown in the curve; it is kept between visits.
export function renderStats(parts, progress, state, now = new Date()) {
  const numbers = overview(progress, now);
  const empty = numbers.totalSets === 0;
  parts.empty.hidden = !empty;
  parts.content.hidden = empty;
  if (empty) return;

  renderTiles(parts.tiles, numbers);
  renderWeeklyChart(parts.weekly, parts.weeklyCaption, weeklyTotals(progress, now));
  renderCalendar(parts.calendar, parts.calendarCaption, trainingCalendar(progress, now));

  const bests = personalBests(progress);
  if (!bests.some((best) => best.skillId === state.skillId)) {
    state.skillId = bests[0]?.skillId ?? null;
  }
  parts.skillSelect.replaceChildren(
    ...bests.map((best) => {
      const option = document.createElement("option");
      option.value = best.skillId;
      option.textContent = best.name;
      return option;
    })
  );
  parts.skillSelect.value = state.skillId;
  parts.skillSelect.onchange = () => {
    state.skillId = parts.skillSelect.value;
    const skill = getSkill(state.skillId);
    renderSkillChart(parts.skillChart, parts.skillCaption, skill, skillSeries(progress, state.skillId));
  };
  renderSkillChart(parts.skillChart, parts.skillCaption, getSkill(state.skillId), skillSeries(progress, state.skillId));

  renderBests(parts.bests, bests);
}
