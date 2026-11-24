// Badges on the profile. They are worked out from the progress every time,
// so nothing extra is stored and a badge can never get out of sync.
import { getSkillPath } from "./path.js";
import { allSets, overview } from "./stats.js";
import { weekNumber } from "./streak.js";

// Longest run of weeks in a row with practice (the streak can break later,
// the badge stays).
export function longestStreak(practiceDays) {
  const weeks = [...new Set(practiceDays.map(weekNumber))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  weeks.forEach((week, i) => {
    run = i > 0 && week === weeks[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

const LEVEL_BADGE_NAMES = {
  1: "Basics done",
  2: "First steps done",
  3: "Free skills done",
  4: "Advanced done",
  5: "Very advanced done",
  6: "Expert done",
  7: "Elite",
};

export function getBadges(progress, now = new Date()) {
  const numbers = overview(progress, now);
  const sets = allSets(progress);
  const streak = longestStreak(progress.practiceDays);
  const levels = getSkillPath(progress);
  const longestHold = Math.max(0, ...sets.filter((set) => set.measure === "hold").map((set) => set.seconds));
  const bestForm = Math.max(0, ...sets.map((set) => set.score));

  const badges = [
    { id: "first-set", name: "First set", text: "Finish your first set.", earned: numbers.totalSets >= 1 },
    { id: "first-skill", name: "First skill", text: "Complete your first skill.", earned: numbers.skillsCompleted >= 1 },
    { id: "five-skills", name: "Five skills", text: "Complete 5 skills.", earned: numbers.skillsCompleted >= 5 },
    { id: "clean-set", name: "Clean set", text: "Finish a set with at least 95% form.", earned: bestForm >= 95 },
    { id: "streak-4", name: "4-week streak", text: "Train 4 weeks in a row.", earned: streak >= 4 },
    { id: "streak-12", name: "12-week streak", text: "Train 12 weeks in a row.", earned: streak >= 12 },
    { id: "reps-100", name: "100 reps", text: "Do 100 reps in total.", earned: numbers.totalReps >= 100 },
    { id: "reps-1000", name: "1000 reps", text: "Do 1000 reps in total.", earned: numbers.totalReps >= 1000 },
    { id: "days-10", name: "10 training days", text: "Train on 10 different days.", earned: numbers.trainingDays >= 10 },
    { id: "days-50", name: "50 training days", text: "Train on 50 different days.", earned: numbers.trainingDays >= 50 },
    { id: "hold-60", name: "One minute", text: "Hold a skill for 1:00 in one set.", earned: longestHold >= 60 },
  ];

  for (const level of levels) {
    badges.push({
      id: `level-${level.level}`,
      name: LEVEL_BADGE_NAMES[level.level] ?? `Level ${level.level} done`,
      text: `Complete every skill of level ${level.level}.`,
      earned: level.completed,
      level: level.level,
    });
  }
  return badges;
}

// The level the user is working on: the first unlocked level that is not completed.
export function currentLevel(progress) {
  const levels = getSkillPath(progress);
  return levels.find((level) => level.unlocked && !level.completed) ?? levels.at(-1);
}

// How far the user is from a goal skill: skills on the path up to and
// including the goal that are not completed yet.
export function goalProgress(progress, goalSkillId) {
  const levels = getSkillPath(progress);
  const path = levels.flatMap((level) => level.skills);
  const index = path.findIndex((skill) => skill.id === goalSkillId);
  if (index === -1) {
    return null;
  }
  const upToGoal = path.slice(0, index + 1);
  const done = upToGoal.filter((skill) => skill.completed).length;
  return {
    skill: path[index],
    done,
    total: upToGoal.length,
    remaining: upToGoal.length - done,
    completed: path[index].completed,
  };
}
