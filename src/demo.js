// Demo mode: open the app with "?demo" to try it with sample data.
// Everything happens in memory: the real progress on the device is never
// read or changed, nothing syncs to an account, and a reload starts over.
import { createEmptyProgress, recordSet } from "./progress.js";
import { getSkill } from "./skills.js";

export const DEMO_NAME = "Alex";
const DEMO_GOAL = "free-handstand";
const DAYS = 70; // about 10 weeks of training

export function isDemoUrl(search) {
  return new URLSearchParams(search).has("demo");
}

// A Storage-like object that only lives in memory.
export function memoryStorage() {
  const map = new Map();
  return {
    get length() {
      return map.size;
    },
    key: (index) => [...map.keys()][index] ?? null,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(String(key), String(value)),
    removeItem: (key) => void map.delete(key),
    clear: () => map.clear(),
  };
}

// Per skill: [first day, last day, share of the goal at the start, at the end].
// A share above 1 means the goal is reached, so the skill gets completed.
const PLAN = {
  "push-up": [0, 30, 0.6, 2.4],
  "inverted-row": [0, 34, 0.5, 1.5],
  "hollow-body-hold": [2, 36, 0.5, 1.6],
  "crow-pose": [6, 40, 0.2, 1.8],
  "elbow-lever-assisted": [36, 56, 0.5, 1.4],
  "hanging-knee-raise": [36, 55, 0.6, 1.5],
  "pike-push-up": [38, 62, 0.5, 1.5],
  "pull-up": [38, 70, 0.3, 1.4],
  "tuck-l-sit": [44, 66, 0.4, 1.3],
  "wall-handstand": [50, 70, 0.3, 0.75],
  "frog-stand-straight": [56, 70, 0.2, 0.6],
  "bar-dip": [58, 70, 0.3, 0.8],
};

const DAY_MS = 864e5;

// Sample progress of a user who trained about 4 times a week for 10 weeks,
// finished level 1 and is halfway through level 2. The last training day is
// yesterday, so the calendar and the streak always look current.
// The numbers come from a fixed seed, so the demo looks the same every time.
export function createDemoProgress(now = new Date()) {
  let seed = 11;
  const random = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const yesterdayEvening = new Date(now.getTime() - DAY_MS);
  yesterdayEvening.setHours(18, 30, 0, 0);
  const start = yesterdayEvening.getTime() - DAYS * DAY_MS;

  let progress = createEmptyProgress();
  for (let day = 0; day <= DAYS; day += 1) {
    const weekday = new Date(start + day * DAY_MS).getDay();
    const trains = day === DAYS || ([1, 3, 5, 6].includes(weekday) && random() > 0.12);
    if (!trains) continue;

    const active = Object.entries(PLAN).filter(([, [from, to]]) => day >= from && day <= to);
    const today = active.sort(() => random() - 0.5).slice(0, 3);
    for (const [id, [from, to, startShare, endShare]] of today) {
      const skill = getSkill(id);
      const share = startShare + (endShare - startShare) * ((day - from) / Math.max(1, to - from));
      for (let set = 0; set < 3; set += 1) {
        const value = Math.max(1, Math.round(skill.goal * share * (1 - set * 0.08) + (random() - 0.5) * 2));
        const score = Math.min(98, Math.round(68 + share * 14 + random() * 10 - set * 3));
        const errors = score < 80 ? [set === 2 ? "Hips sagged (18% of the set)" : "Elbows flared out (12% of the set)"] : [];
        const when = new Date(start + day * DAY_MS + set * 240e3);
        const result = skill.measure === "hold" ? { seconds: value, score, errors } : { reps: value, score, errors };
        progress = recordSet(progress, id, result, when).progress;
      }
    }
  }
  return progress;
}

// Fills a storage with the sample user.
export function fillDemoStorage(storage, now = new Date()) {
  storage.setItem("userName", DEMO_NAME);
  storage.setItem("progress", JSON.stringify(createDemoProgress(now)));
  storage.setItem("profileDetails", JSON.stringify({ goalSkill: DEMO_GOAL }));
  return storage;
}
