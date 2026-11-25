// Draws the app's lists: the home road, the skills list and the skill sheet.
import { CAMERA_VIEWS, LEVELS, RULES, TRACKS, getCompletionGoal } from "./skills.js";
import { getSkillPath } from "./path.js";
import { formatClock } from "./workout.js";
import { STATE_COLORS, getSkillColors, renderFigure } from "./figures.js";

// Background colors behind figures (must match the CSS), so the outline works.
const BG_PAGE = "var(--bg)";
const BG_CARD = "var(--surface-2)";
const BG_SHEET = "var(--surface)";

// Figure color by state: done = the skill's color, darker; next = the skill's
// bright color; unlocked = gray; locked = dark gray.
function figureColor(skill, { unlocked, current }) {
  if (skill.completed) {
    return getSkillColors(skill.id).done;
  }
  if (current) {
    return getSkillColors(skill.id).bright;
  }
  return unlocked ? STATE_COLORS.open : STATE_COLORS.locked;
}

// ---------- Icons (inline SVG, so they follow the text color) ----------
const ICONS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" stroke-width="2.4" fill="none"/>',
  chevron: '<path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
};

function icon(name, size = 28) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${ICONS[name]}</svg>`;
}

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) {
    el.className = className;
  }
  if (text !== undefined) {
    el.textContent = text;
  }
  return el;
}

// Short status text for a skill (used in the list and the sheet).
export function skillStatus(skill) {
  if (skill.completed) {
    return "Completed";
  }
  if (skill.practiced) {
    const best =
      skill.measure === "hold"
        ? formatClock(skill.bestSeconds)
        : `${skill.bestReps} ${skill.bestReps === 1 ? "rep" : "reps"}`;
    return `Best: ${best} · ${skill.bestScore}%`;
  }
  return "Not started";
}

// The next skill to train: the first unlocked skill that is not completed yet.
function findCurrentSkillId(levels) {
  for (const level of levels) {
    if (!level.unlocked) {
      return null;
    }
    const next = level.skills.find((skill) => !skill.completed);
    if (next) {
      return next.id;
    }
  }
  return null;
}

// Progress ring for a level header: fills with done skills, shows "2/4",
// a check when the level is completed, or a lock when it is locked.
const RING_RADIUS = 18;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function progressRing(level) {
  const share = level.total === 0 ? 0 : level.doneCount / level.total;
  const filled = (RING_LENGTH * share).toFixed(1);
  let center;
  if (!level.unlocked) {
    center = `<g transform="translate(13 13) scale(0.75)" style="color:var(--faint)">${ICONS.lock}</g>`;
  } else if (level.completed) {
    center = `<g transform="translate(10 10)" style="color:var(--level-color)">${ICONS.check}</g>`;
  } else {
    center = `<text x="22" y="26" text-anchor="middle" class="ring-text">${level.doneCount}/${level.total}</text>`;
  }
  const arc =
    share > 0
      ? `<circle cx="22" cy="22" r="${RING_RADIUS}" fill="none" style="stroke:var(--level-color)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${filled} ${RING_LENGTH.toFixed(1)}" transform="rotate(-90 22 22)"/>`
      : "";
  return `<svg width="44" height="44" viewBox="0 0 44 44" aria-label="${level.doneCount} of ${level.total} skills done"><circle cx="22" cy="22" r="${RING_RADIUS}" fill="none" style="stroke:var(--surface-2)" stroke-width="4"/>${arc}${center}</svg>`;
}

// Horizontal offsets for the winding road (in px), repeated for every level.
const ROAD_OFFSETS = [0, 52, 78, 52, 0, -52, -78, -52];

// ---------- Home: the road ----------
// onSelect(skill, levelUnlocked) is called when a node is tapped.
export function renderRoad(container, progress, onSelect) {
  container.replaceChildren();
  const levels = getSkillPath(progress);
  const currentId = findCurrentSkillId(levels);
  let currentNode = null;

  for (const level of levels) {
    // Level header: name on the left, a progress ring on the right.
    const colors = LEVELS.find((l) => l.level === level.level);
    const header = element("div", "level-header");
    if (!level.unlocked) {
      header.classList.add("is-locked");
    }
    header.style.setProperty("--level-color", level.completed ? colors.dark : colors.color);
    const text = element("div");
    text.append(
      element("p", "level-kicker", level.unlocked ? `Level ${level.level}` : `Level ${level.level} · locked`),
      element("p", "level-name", level.name)
    );
    const ring = element("span", "level-ring");
    ring.innerHTML = progressRing(level);
    header.append(text, ring);
    container.append(header);

    level.skills.forEach((skill, index) => {
      const offset = ROAD_OFFSETS[index % ROAD_OFFSETS.length];

      // Small dots from the previous skill to this one. They use the level's
      // dark color when the previous skill is completed, otherwise gray.
      if (index > 0) {
        const previous = level.skills[index - 1];
        const fromX = ROAD_OFFSETS[(index - 1) % ROAD_OFFSETS.length];
        const dots = element("div", "road-dots");
        for (const t of [0.2, 0.5, 0.8]) {
          const dot = element("span", "road-dot");
          dot.style.transform = `translateX(${Math.round(fromX + (offset - fromX) * t)}px)`;
          if (previous.completed) {
            dot.style.background = colors.dark;
          }
          dots.append(dot);
        }
        container.append(dots);
      }

      const step = element("div", "road-step");
      step.style.transform = `translateX(${offset}px)`;

      const node = element("button", "node");
      node.type = "button";
      node.setAttribute("aria-label", `${skill.name}, ${skillStatus(skill)}`);
      const isCurrent = skill.id === currentId;
      if (skill.track === "C") {
        node.classList.add("is-milestone");
      }

      const color = figureColor(skill, { unlocked: level.unlocked, current: isCurrent });
      node.innerHTML = renderFigure(skill.id, color, BG_PAGE);

      // Small badge: check when done, lock when locked
      if (skill.completed) {
        const badge = element("span", "node-badge is-done");
        badge.style.background = getSkillColors(skill.id).done;
        badge.innerHTML = icon("check", 14);
        node.append(badge);
      } else if (!level.unlocked) {
        const badge = element("span", "node-badge is-locked");
        badge.innerHTML = icon("lock", 14);
        node.append(badge);
      }
      node.addEventListener("click", () => onSelect(skill, level.unlocked, isCurrent));

      if (isCurrent) {
        step.classList.add("has-bubble");
        step.append(element("span", "start-bubble", "Start"));
        currentNode = step;
      }

      const label = element("p", "node-label", skill.name);
      if (isCurrent) {
        label.classList.add("is-current");
      }
      step.append(node, label);
      container.append(step);
    });
  }

  return currentNode;
}

// ---------- Skills tab: filterable list ----------
// filter: { level: number | null, query: string }
export function renderSkillList(container, progress, filter, onSelect) {
  container.replaceChildren();
  const query = filter.query.trim().toLowerCase();
  let shown = 0;

  for (const level of getSkillPath(progress)) {
    if (filter.level !== null && level.level !== filter.level) {
      continue;
    }
    for (const skill of level.skills) {
      if (query && !skill.name.toLowerCase().includes(query)) {
        continue;
      }
      shown += 1;

      const item = element("li");
      const row = element("button", "skill-row");
      row.type = "button";

      // Mini figure: colored when done, gray otherwise
      const rowIcon = element("span", "row-icon");
      const color = figureColor(skill, { unlocked: level.unlocked, current: false });
      rowIcon.innerHTML = renderFigure(skill.id, color, BG_CARD);
      if (!level.unlocked) {
        const badge = element("span", "row-badge");
        badge.innerHTML = icon("lock", 12);
        rowIcon.append(badge);
      }

      const text = element("span", "row-text");
      const title = element("span", "row-title", skill.name);
      if (skill.beta) {
        title.append(element("span", "tag", "Beta"));
      }
      text.append(
        title,
        element("span", "row-meta", `Level ${level.level} · ${TRACKS[skill.track]} · ${skillStatus(skill)}`)
      );

      const chevron = element("span", "row-chevron");
      chevron.innerHTML = icon("chevron", 20);

      row.append(rowIcon, text, chevron);
      row.addEventListener("click", () => onSelect(skill, level.unlocked));
      item.append(row);
      container.append(item);
    }
  }

  if (shown === 0) {
    container.append(element("li", "empty", "No skills found."));
  }
}

// Level filter chips: "All", "Level 1" ... "Level 7".
export function renderLevelChips(container, activeLevel, onChange) {
  container.replaceChildren();
  const options = [{ level: null, label: "All" }, ...LEVELS.map((l) => ({ level: l.level, label: `Level ${l.level}` }))];
  for (const option of options) {
    const chip = element("button", "chip", option.label);
    chip.type = "button";
    chip.setAttribute("role", "tab");
    chip.setAttribute("aria-selected", String(option.level === activeLevel));
    if (option.level === activeLevel) {
      chip.classList.add("is-active");
    }
    chip.addEventListener("click", () => onChange(option.level));
    container.append(chip);
  }
}

// ---------- Skill sheet ----------
export function fillSkillSheet(parts, skill, levelUnlocked, isCurrent = false) {
  const color = figureColor(skill, { unlocked: levelUnlocked, current: isCurrent });
  parts.figure.innerHTML = renderFigure(skill.id, color, BG_SHEET);

  const levelName = LEVELS.find((l) => l.level === skill.level)?.name ?? "";
  parts.meta.textContent = `Level ${skill.level} · ${levelName} · ${TRACKS[skill.track]}${skill.beta ? " · Beta" : ""}`;
  parts.title.textContent = skill.name;
  parts.status.textContent = levelUnlocked ? skillStatus(skill) : "Locked · you can still try it";

  const warnings = [];
  if (skill.coachRequired) {
    warnings.push("Only with a qualified coach and proper equipment.");
  }
  if (skill.beta) {
    warnings.push("Beta: camera feedback is not tested yet.");
  }
  parts.warning.hidden = warnings.length === 0;
  parts.warning.textContent = warnings.join(" ");

  parts.camera.textContent = CAMERA_VIEWS[skill.camera];
  parts.cue.textContent = `“${skill.cue}”`;
  parts.milestones.replaceChildren(...skill.milestones.map((m) => element("li", "", m)));

  fillSkillProgress(parts, skill);
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
});

function formatAmount(skill, set) {
  if (skill.measure === "hold") {
    return formatClock(set.seconds);
  }
  return `${set.reps} ${set.reps === 1 ? "rep" : "reps"}`;
}

// "Your progress": goal, best values, notes of the last set, last sets.
function fillSkillProgress(parts, skill) {
  parts.goal.textContent = getCompletionGoal(skill);
  const { daysNeeded } = RULES.completion;
  if (skill.completedAt) {
    parts.goalState.textContent = `✓ Completed on ${DATE_FORMAT.format(new Date(skill.completedAt))}`;
  } else {
    const days = Math.min(skill.goalDays.length, daysNeeded);
    parts.goalState.textContent = `Goal reached on ${days} of ${daysNeeded} days`;
  }

  const history = skill.history;
  parts.empty.hidden = history.length > 0;
  parts.progress.hidden = history.length === 0;
  if (history.length === 0) {
    return;
  }

  const isHold = skill.measure === "hold";
  parts.bestLabel.textContent = isHold ? "Best hold" : "Best reps";
  parts.best.textContent = isHold ? formatClock(skill.bestSeconds) : String(skill.bestReps);
  parts.bestScore.textContent = `${skill.bestScore}%`;
  parts.sets.textContent = String(history.length);

  const last = history[history.length - 1];
  const notes = last.notes.length > 0 ? last.notes : ["No form issues found."];
  parts.notes.replaceChildren(...notes.map((note) => element("li", "", note)));

  // Newest first, at most 5 sets
  const recent = history.slice(-5).reverse();
  parts.history.replaceChildren(
    ...recent.map((set) => {
      const item = element("li", "history-item");
      item.append(
        element("span", "history-date", DATE_FORMAT.format(new Date(set.date))),
        element("span", "history-value", `${formatAmount(skill, set)} · ${set.score}%`)
      );
      return item;
    })
  );
}
