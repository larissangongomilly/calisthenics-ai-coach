// Saves the user's progress in the browser (localStorage). There is no login yet.
// Limitation: progress is lost if the user clears the browser data.
import { RULES, getSkill } from "./skills.js";

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
export const MAX_HISTORY = 20;

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
// Returns { progress, isPractice, newlyCompleted }. Does not save by itself.
export function recordSet(progress, skillId, result, now = new Date()) {
  const skill = getSkill(skillId);
  if (!skill) {
    return { progress, isPractice: false, newlyCompleted: false };
  }

  const reps = isNumber(result.reps) ? result.reps : 0;
  const seconds = isNumber(result.seconds) ? result.seconds : 0;
  const score = isNumber(result.score) ? result.score : 0;

  const isPractice =
    skill.evaluable &&
    (reps >= RULES.practice.minCleanReps || seconds >= RULES.practice.minHoldSeconds);

  const done =
    skill.measure === "hold"
      ? seconds >= RULES.holdCompleted.minHoldSeconds &&
        score >= RULES.holdCompleted.minFormScore
      : reps >= RULES.skillCompleted.minCleanReps &&
        score >= RULES.skillCompleted.minFormScore;

  const old = progress.skills[skillId] ?? cleanSkillEntry({});
  const newlyCompleted = skill.evaluable && done && !old.completedAt;

  const set = cleanSet({ date: now.toISOString(), reps, seconds, score, notes: result.errors });

  const entry = {
    completedAt: newlyCompleted ? now.toISOString() : old.completedAt,
    bestReps: Math.max(old.bestReps, reps),
    bestSeconds: Math.max(old.bestSeconds, seconds),
    bestScore: Math.max(old.bestScore, score),
    lastPracticedAt: now.toISOString(),
    history: [...old.history, set].slice(-MAX_HISTORY),
  };

  const practiceDays = isPractice
    ? [...new Set([...progress.practiceDays, toBerlinDay(now)])].sort()
    : progress.practiceDays;

  return {
    progress: { ...progress, skills: { ...progress.skills, [skillId]: entry }, practiceDays },
    isPractice,
    newlyCompleted,
  };
}
