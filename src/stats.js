// Training statistics for the Stats tab, calculated from the saved progress.
// Every saved set is in progress.skills[id].history (see progress.js).
import { toBerlinDay } from "./progress.js";
import { getSkill } from "./skills.js";
import { weekNumber } from "./streak.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// "YYYY-MM-DD" plus n days (the dates are calendar days, so UTC math is safe).
function addDays(day, n) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

// Monday of the week of a "YYYY-MM-DD" day.
export function weekStart(day) {
  const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  return addDays(day, -weekday);
}

// All saved sets of all skills, oldest first:
// { skillId, day, date, reps, seconds, score, measure }
export function allSets(progress) {
  const sets = [];
  for (const [skillId, entry] of Object.entries(progress.skills)) {
    const skill = getSkill(skillId);
    for (const set of entry.history) {
      const date = new Date(set.date);
      if (Number.isNaN(date.getTime())) continue;
      sets.push({ skillId, day: toBerlinDay(date), date: set.date, reps: set.reps, seconds: set.seconds, score: set.score, measure: skill.measure });
    }
  }
  return sets.sort((a, b) => a.date.localeCompare(b.date));
}

// Totals for the last `count` weeks (Monday to Sunday), oldest first.
export function weeklyTotals(progress, now = new Date(), count = 8) {
  const thisMonday = weekStart(toBerlinDay(now));
  const weeks = Array.from({ length: count }, (_, i) => ({
    weekStart: addDays(thisMonday, -7 * (count - 1 - i)),
    sets: 0,
    reps: 0,
    holdSeconds: 0,
    days: new Set(),
  }));
  const byWeek = new Map(weeks.map((week) => [weekNumber(week.weekStart), week]));
  for (const set of allSets(progress)) {
    const week = byWeek.get(weekNumber(set.day));
    if (!week) continue;
    week.sets += 1;
    week.reps += set.measure === "reps" ? set.reps : 0;
    week.holdSeconds += set.measure === "hold" ? set.seconds : 0;
    week.days.add(set.day);
  }
  return weeks.map(({ days, ...week }) => ({ ...week, activeDays: days.size }));
}

// Calendar of the last `count` weeks: rows of 7 days (Monday first) with the
// number of sets on each day. Days after today are marked as future.
export function trainingCalendar(progress, now = new Date(), count = 6) {
  const today = toBerlinDay(now);
  const firstDay = addDays(weekStart(today), -7 * (count - 1));
  const setsPerDay = new Map();
  for (const set of allSets(progress)) {
    setsPerDay.set(set.day, (setsPerDay.get(set.day) ?? 0) + 1);
  }
  return Array.from({ length: count }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const day = addDays(firstDay, week * 7 + weekday);
      return { day, sets: setsPerDay.get(day) ?? 0, future: day > today, today: day === today };
    })
  );
}

// Every set of one skill as a point for the progress curve.
// value = reps for rep skills, seconds for hold skills.
export function skillSeries(progress, skillId) {
  const skill = getSkill(skillId);
  const entry = progress.skills[skillId];
  if (!skill || !entry) return [];
  return entry.history.map((set) => ({
    date: set.date,
    value: skill.measure === "hold" ? set.seconds : set.reps,
    score: set.score,
  }));
}

// Practiced skills with their best values, most recently trained first.
export function personalBests(progress) {
  return Object.entries(progress.skills)
    .filter(([, entry]) => entry.history.length > 0 || entry.lastPracticedAt)
    .map(([skillId, entry]) => {
      const skill = getSkill(skillId);
      return {
        skillId,
        name: skill.name,
        measure: skill.measure,
        best: skill.measure === "hold" ? entry.bestSeconds : entry.bestReps,
        bestScore: entry.bestScore,
        sets: entry.history.length,
        completed: Boolean(entry.completedAt),
        lastPracticedAt: entry.lastPracticedAt ?? "",
      };
    })
    .sort((a, b) => b.lastPracticedAt.localeCompare(a.lastPracticedAt));
}

// Headline numbers.
export function overview(progress, now = new Date()) {
  const sets = allSets(progress);
  const thisWeek = weeklyTotals(progress, now, 1)[0];
  return {
    totalSets: sets.length,
    totalReps: sets.reduce((sum, set) => sum + (set.measure === "reps" ? set.reps : 0), 0),
    trainingDays: new Set(sets.map((set) => set.day)).size,
    skillsCompleted: Object.values(progress.skills).filter((entry) => entry.completedAt).length,
    thisWeek,
  };
}
