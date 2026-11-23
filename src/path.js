// Works out which levels are unlocked and how far the user is in each level.
// Rules: level 1 is always unlocked. A level is completed when all of its
// skills are completed, and that unlocks the next level. See docs/skill-path.md.
import { LEVELS, RULES, getSkillsForLevel } from "./skills.js";

export function getSkillPath(progress) {
  const levels = [];
  let previousCompleted = true;

  for (const { level, name } of LEVELS) {
    const skills = getSkillsForLevel(level).map((skill) => {
      const entry = progress.skills[skill.id];
      return {
        ...skill,
        completed: Boolean(entry?.completedAt),
        practiced: Boolean(entry?.lastPracticedAt),
        bestReps: entry?.bestReps ?? 0,
        bestSeconds: entry?.bestSeconds ?? 0,
        bestScore: entry?.bestScore ?? 0,
        completedAt: entry?.completedAt ?? null,
        history: entry?.history ?? [],
      };
    });

    const doneCount = skills.filter((s) => s.completed).length;
    const unlocked = level <= RULES.firstUnlockedLevel || previousCompleted;
    const completed = doneCount === skills.length;

    levels.push({ level, name, unlocked, completed, doneCount, total: skills.length, skills });
    previousCompleted = unlocked && completed;
  }

  return levels;
}

export function isLevelUnlocked(progress, level) {
  return getSkillPath(progress).some((l) => l.level === level && l.unlocked);
}
