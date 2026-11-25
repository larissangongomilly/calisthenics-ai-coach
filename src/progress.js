// Saves the user's progress in the browser (localStorage). With an account it is
// also synced (see sync.js and cloud.js).
// Limitation: progress is lost if the user clears the browser data.
import { RULES, getPracticeMinimum, getSkill } from "./skills.js";

const STORAGE_KEY = "progress";
const VERSION = 1;

// Practice dates use the Berlin calendar day, so the weekly streak
// (Monday to Sunday, Europe/Berlin) can be calculated from them later.
const TIME_ZONE = "Europe/Berlin";

export function createEmptyProgress() {
  return { version: VERSION, skills: {}, practiceDays: [] };
}

// Returns the calendar day as "YYYY-MM-DD" in Berlin time.
export function toBerlinDay(date) {
  // The "en-CA" locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
}

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isDay(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// How many sets per skill are kept in the history (oldest are dropped).
export const MAX_HISTORY = 100;

// One saved set: { date, reps, seconds, score, notes[] }
function cleanSet(set) {
  if (!set || typeof set !== "object" || typeof set.date !== "string") {
    return null;
  }
  return {
    date: set.date,
    reps: isNumber(set.reps) ? set.reps : 0,
    seconds: isNumber(set.seconds) ? set.seconds : 0,
    score: isNumber(set.score) ? set.score : 0,
    notes: Array.isArray(set.notes) ? set.notes.filter((n) => typeof n === "string").slice(0, 10) : [],
  };
}

// Keeps only valid entries, so broken or old data never crashes the app.
// Data saved before the history existed simply gets an empty history.
function cleanSkillEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const history = Array.isArray(entry.history)
    ? entry.history.map(cleanSet).filter(Boolean).slice(-MAX_HISTORY)
    : [];
  return {
    completedAt: typeof entry.completedAt === "string" ? entry.completedAt : null,
    bestReps: isNumber(entry.bestReps) ? entry.bestReps : 0,
    bestSeconds: isNumber(entry.bestSeconds) ? entry.bestSeconds : 0,
    bestScore: isNumber(entry.bestScore) ? entry.bestScore : 0,
    lastPracticedAt: typeof entry.lastPracticedAt === "string" ? entry.lastPracticedAt : null,
    history,
    // Berlin days ("YYYY-MM-DD") on which the goal was reached
    goalDays: Array.isArray(entry.goalDays) ? [...new Set(entry.goalDays.filter(isDay))].sort() : [],
  };
}

export function cleanProgress(data) {
  const progress = createEmptyProgress();
  if (!data || typeof data !== "object" || data.version !== VERSION) {
    return progress;
  }

  if (data.skills && typeof data.skills === "object") {
    for (const [id, entry] of Object.entries(data.skills)) {
      const clean = cleanSkillEntry(entry);
      if (getSkill(id) && clean) {
        progress.skills[id] = clean;
      }
    }
  }

  if (Array.isArray(data.practiceDays)) {
    progress.practiceDays = [...new Set(data.practiceDays.filter(isDay))].sort();
  }

  return progress;
}

// Browser storage can fail (private mode, blocked storage), so every access is wrapped.
export function loadProgress(storage = globalThis.localStorage) {
  try {
    const text = storage.getItem(STORAGE_KEY);
    return text ? cleanProgress(JSON.parse(text)) : createEmptyProgress();
  } catch (error) {
    return createEmptyProgress();
  }
}

export function saveProgress(progress, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch (error) {
    return false;
  }
}

// Updates the progress with the result of one set.
// result: { reps, seconds, score, errors } (score in percent, reps = clean reps,
// errors = form notes from the tracker summary).
// Returns { progress, isPractice, goalReached, goalDaysCount, newlyCompleted }.
// Does not save by itself.
export function recordSet(progress, skillId, result, now = new Date()) {
  const skill = getSkill(skillId);
  if (!skill) {
    return { progress, isPractice: false, goalReached: false, goalDaysCount: 0, newlyCompleted: false };
  }

  const reps = isNumber(result.reps) ? result.reps : 0;
  const seconds = isNumber(result.seconds) ? result.seconds : 0;
  const score = isNumber(result.score) ? result.score : 0;
  const amount = skill.measure === "hold" ? seconds : reps;
  const today = toBerlinDay(now);

  // Practice: at least half of the goal (see RULES.practice)
  const isPractice = skill.evaluable && amount >= getPracticeMinimum(skill);

  // Goal: the full goal with good form in this set
  const goalReached = skill.evaluable && amount >= skill.goal && score >= RULES.goal.minFormScore;

  const old = progress.skills[skillId] ?? cleanSkillEntry({});
  const goalDays = goalReached ? [...new Set([...old.goalDays, today])].sort() : old.goalDays;

  // Completed: goal reached on enough different days
  const newlyCompleted =
    !old.completedAt && goalDays.length >= RULES.completion.daysNeeded;

  const set = cleanSet({ date: now.toISOString(), reps, seconds, score, notes: result.errors });

  const entry = {
    completedAt: newlyCompleted ? now.toISOString() : old.completedAt,
    bestReps: Math.max(old.bestReps, reps),
    bestSeconds: Math.max(old.bestSeconds, seconds),
    bestScore: Math.max(old.bestScore, score),
    lastPracticedAt: now.toISOString(),
    history: [...old.history, set].slice(-MAX_HISTORY),
    goalDays,
  };

  const practiceDays = isPractice
    ? [...new Set([...progress.practiceDays, today])].sort()
    : progress.practiceDays;

  return {
    progress: { ...progress, skills: { ...progress.skills, [skillId]: entry }, practiceDays },
    isPractice,
    goalReached,
    goalDaysCount: goalDays.length,
    newlyCompleted,
  };
}
