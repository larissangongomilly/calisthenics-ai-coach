// Draws the skill path screen: levels, locked and unlocked skills, progress.
import { CAMERA_VIEWS, TRACKS } from "./skills.js";
import { getSkillPath } from "./path.js";

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

// Short status text for one skill card.
function skillStatus(skill) {
  if (!skill.evaluable) {
    return { text: "Coming soon", type: "soon" };
  }
  if (skill.completed) {
    return { text: "Completed", type: "done" };
  }
  if (skill.practiced) {
    const best =
      skill.measure === "hold"
        ? `${skill.bestSeconds} s`
        : `${skill.bestReps} ${skill.bestReps === 1 ? "rep" : "reps"}`;
    return { text: `Best: ${best} · ${skill.bestScore}%`, type: "progress" };
  }
  return { text: "Not started", type: "new" };
}

function renderSkill(skill, levelUnlocked, onStart) {
  const card = element("li", "skill-card");
  if (!levelUnlocked) {
    card.classList.add("is-locked");
  }

  const header = element("div", "skill-header");
  header.append(element("span", "skill-name", skill.name));
  const status = skillStatus(skill);
  header.append(element("span", `skill-status status-${status.type}`, status.text));
  card.append(header);

  card.append(element("p", "skill-track", `${skill.track} · ${TRACKS[skill.track]}`));

  if (skill.coachRequired) {
    card.append(
      element("p", "skill-warning", "Only with a qualified coach and proper equipment.")
    );
  }

  card.append(element("p", "skill-info", `Camera: ${CAMERA_VIEWS[skill.camera]}`));
  card.append(element("p", "skill-info", `Coach cue: “${skill.cue}”`));

  if (skill.milestones.length > 0) {
    const list = element("ol", "skill-milestones");
    for (const milestone of skill.milestones) {
      list.append(element("li", "", milestone));
    }
    card.append(list);
  }

  if (skill.evaluable) {
    const button = element("button", "skill-start", "Train this skill");
    button.addEventListener("click", () => onStart(skill));
    card.append(button);
  }

  return card;
}

// onStart(skill) is called when the user taps "Train this skill".
export function renderSkillPath(container, progress, onStart) {
  container.replaceChildren();

  for (const level of getSkillPath(progress)) {
    const details = element("details", "level-card");
    details.open = level.unlocked && !level.completed;
    if (!level.unlocked) {
      details.classList.add("is-locked");
    }

    const summary = element("summary", "level-summary");
    summary.append(element("span", "level-title", `Level ${level.level} · ${level.name}`));
    const state = level.completed
      ? "Completed"
      : level.unlocked
        ? `${level.doneCount}/${level.total} done`
        : "Locked";
    summary.append(element("span", "level-state", state));
    details.append(summary);

    if (!level.unlocked) {
      details.append(
        element("p", "level-hint", `Complete all skills of level ${level.level - 1} to unlock.`)
      );
    }

    const list = element("ul", "skill-list");
    for (const skill of level.skills) {
      list.append(renderSkill(skill, level.unlocked, onStart));
    }
    details.append(list);
    container.append(details);
  }
}
