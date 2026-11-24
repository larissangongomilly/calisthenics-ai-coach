// A workout is a few sets of one skill with a rest between them.
// Each set is saved to the progress when it ends (see progress.js); this
// module only keeps the sets of the running workout for the summary.

// Users pick their own sets and rest time inside these limits.
export const SETS_LIMITS = Object.freeze({ min: 1, max: 10, step: 1 });
export const REST_LIMITS = Object.freeze({ min: 15, max: 600, step: 15 }); // seconds
export const REST_CALLOUTS = [30, 10, 3, 2, 1]; // seconds left that the coach says out loud

// Strongest progress news first.
const NEWS_ORDER = ["completed", "goal", "practice", null];

function newsOf(update) {
  if (update.newlyCompleted) return "completed";
  if (update.goalReached) return "goal";
  if (update.isPractice) return "practice";
  return null;
}

export function createWorkout({ sets, restSeconds }) {
  const done = []; // { reps, seconds, score, errors, news }

  return {
    sets,
    restSeconds,

    // Number of the set that runs now (1-based).
    get currentSet() {
      return Math.min(done.length + 1, sets);
    },

    get finishedSets() {
      return done.length;
    },

    // result: tracker summary, update: return value of recordSet.
    addSet(result, update) {
      done.push({ ...result, news: newsOf(update) });
    },

    isFinished() {
      return done.length >= sets;
    },

    summary() {
      const scores = done.map((set) => set.score);
      const news = NEWS_ORDER.find((item) => done.some((set) => set.news === item)) ?? null;
      return {
        sets: done.map(({ reps, seconds, score }) => ({ reps, seconds, score })),
        totalReps: done.reduce((sum, set) => sum + set.reps, 0),
        bestSeconds: Math.max(0, ...done.map((set) => set.seconds)),
        averageScore: scores.length === 0 ? 0 : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        // Form notes of the last set, which is the most tired one.
        errors: done.at(-1)?.errors ?? [],
        news,
      };
    },
  };
}

// 95 → "1:35"
export function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

// Moves a value one step up (direction 1) or down (-1) and keeps it on the
// step grid inside the limits.
export function stepValue(value, direction, { min, max, step }) {
  const onGrid = Math.round((value - min) / step) * step + min;
  return Math.min(max, Math.max(min, onGrid + direction * step));
}

// True when the value is allowed by the limits.
export function fitsLimits(value, { min, max, step }) {
  return Number.isInteger(value) && value >= min && value <= max && (value - min) % step === 0;
}

// Words for a rest time: 90 → "90 seconds", 120 → "2 minutes",
// 150 → "2 minutes 30 seconds".
export function describeRest(seconds) {
  if (seconds < 120) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} minutes` : `${minutes} minutes ${rest} seconds`;
}
