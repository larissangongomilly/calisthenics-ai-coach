// Draws the Stats tab: headline tiles, reps per week, training calendar,
// progress curve per skill and personal bests. Charts are plain SVG.
// Tapping a bar, day or point shows its exact value in the caption below.
import { getSkill } from "./skills.js";
import { formatClock } from "./workout.js";
import { overview, personalBests, skillSeries, trainingCalendar, weeklyTotals } from "./stats.js";

const ACCENT = "#c6f432";
const TRACK = "#20242d";
const GRID = "#2a2f3a";
const MUTED = "#9aa3b2";
const SVG_NS = "http://www.w3.org/2000/svg";

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const longDay = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const setDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/Berlin" });

const dayLabel = (day, format = shortDate) => format.format(new Date(`${day}T00:00:00Z`));

function svg(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
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

// ---------- Reps per week (bars) ----------

const W = 320;

function renderWeeklyChart(container, caption, weeks) {
  const H = 150;
  const top = 12;
  const bottom = 24;
  const plotH = H - top - bottom;
  const max = Math.max(1, ...weeks.map((week) => week.reps));
  const slot = W / weeks.length;
  const barW = Math.min(26, slot - 10);

  const chart = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart", role: "img", "aria-label": "Reps per week, last 8 weeks" });
  chart.append(svg("line", { x1: 0, x2: W, y1: top + plotH, y2: top + plotH, stroke: GRID, "stroke-width": 1 }));

  const hits = weeks.map((week, i) => {
    const x = i * slot + (slot - barW) / 2;
    const h = week.reps === 0 ? 0 : Math.max(4, (week.reps / max) * plotH);
    const group = svg("g", { class: "chart-hit" });
    // Bigger invisible hit area than the bar itself.
    group.append(svg("rect", { x: i * slot, y: 0, width: slot, height: H, fill: "transparent" }));
    if (h > 0) {
      // Rounded top, flat on the baseline.
      const y = top + plotH - h;
      const r = Math.min(4, h);
      group.append(
        svg("path", {
          class: "bar",
          d: `M${x},${top + plotH} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${top + plotH} Z`,
          fill: ACCENT,
        })
      );
    }
    const label = svg("text", { x: x + barW / 2, y: H - 6, "text-anchor": "middle", class: "chart-axis" });
    label.textContent = i === weeks.length - 1 ? "Now" : dayLabel(week.weekStart);
    // Only every other date label fits on a phone.
    if (i % 2 === (weeks.length - 1) % 2) group.append(label);
    chart.append(group);
    return group;
  });

  container.replaceChildren(chart);
  makeSelectable(
    hits,
    caption,
    (i) => {
      const week = weeks[i];
      const when = i === weeks.length - 1 ? "This week" : `Week of ${dayLabel(week.weekStart)}`;
      const holds = week.holdSeconds > 0 ? ` · ${formatClock(week.holdSeconds)} holds` : "";
      return `${when}: ${plural(week.reps, "rep")}${holds} · ${plural(week.sets, "set")}`;
    },
    weeks.length - 1
  );
}

// ---------- Training calendar ----------

function level(sets) {
  if (sets === 0) return 0;
  if (sets <= 2) return 1;
  if (sets <= 5) return 2;
  return 3;
}

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
  const cells = days.map((day) => {
    const cell = document.createElement("span");
    cell.className = `calendar-day level-${level(day.sets)}`;
    cell.classList.toggle("is-today", day.today);
    cell.classList.toggle("is-future", day.future);
    cell.setAttribute("aria-label", `${dayLabel(day.day, longDay)}: ${plural(day.sets, "set")}`);
    grid.append(cell);
    return cell;
  });
  container.replaceChildren(grid);
  const todayIndex = days.findIndex((day) => day.today);
  makeSelectable(
    cells,
    caption,
    (i) => {
      const day = days[i];
      if (day.future) return `${dayLabel(day.day, longDay)}: still ahead`;
      if (day.today && day.sets === 0) return "Today: no sets yet";
      return `${dayLabel(day.day, longDay)}: ${day.sets === 0 ? "rest day" : plural(day.sets, "set")}`;
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
    group.append(svg("circle", { class: "dot", cx: xOf(i), cy: yOf(p.value), r: 4.5, fill: ACCENT, stroke: "#181b22", "stroke-width": 2 }));
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
      return `${setDate.format(new Date(p.date))}: ${amount} · ${p.score}% form · goal ${skill.goal} ${unit}`;
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
