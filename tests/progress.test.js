import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_HISTORY,
  createEmptyProgress,
  loadProgress,
  recordSet,
  saveProgress,
  toBerlinDay,
} from "../src/progress.js";
import { memoryStorage } from "./helpers/fake-pose.js";

const DAY_1 = new Date("2026-11-23T10:00:00Z");
const DAY_1_EVENING = new Date("2026-11-23T19:00:00Z");
const DAY_2 = new Date("2026-11-25T10:00:00Z");

test("missing, broken or blocked storage gives empty progress", () => {
  assert.deepEqual(loadProgress(memoryStorage()), createEmptyProgress());
  assert.deepEqual(loadProgress(memoryStorage([["progress", "{broken"]])), createEmptyProgress());
  const blocked = {
    getItem() {
      throw new Error("blocked");
    },
  };
  assert.deepEqual(loadProgress(blocked), createEmptyProgress());
});

test("bad fields are cleaned and unknown skills dropped", () => {
  const stored = {
    version: 1,
    skills: {
      "push-up": { bestReps: "x", bestScore: 90, history: [null, { date: 5 }, { date: "x", reps: "a", notes: [1, "ok"] }] },
      "not-a-skill": {},
    },
    practiceDays: ["2026-11-23", "bad", 5, "2026-11-23"],
  };
  const progress = loadProgress(memoryStorage([["progress", JSON.stringify(stored)]]));
  const entry = progress.skills["push-up"];
  assert.equal(entry.bestReps, 0);
  assert.equal(entry.bestScore, 90);
  assert.equal(entry.history.length, 1);
  assert.deepEqual(entry.history[0].notes, ["ok"]);
  assert.equal(progress.skills["not-a-skill"], undefined);
  assert.deepEqual(progress.practiceDays, ["2026-11-23"]);
});

test("old data without history or goal days still loads", () => {
  const stored = { version: 1, skills: { "push-up": { bestReps: 3, bestScore: 70 } }, practiceDays: [] };
  const entry = loadProgress(memoryStorage([["progress", JSON.stringify(stored)]])).skills["push-up"];
  assert.deepEqual(entry.history, []);
  assert.deepEqual(entry.goalDays, []);
});

test("days use the Berlin calendar", () => {
  // Sunday 23:30 UTC is already Monday 00:30 in Berlin
  assert.equal(toBerlinDay(new Date("2026-11-22T23:30:00Z")), "2026-11-23");
});

test("practice starts at half of the goal", () => {
  let r = recordSet(createEmptyProgress(), "push-up", { reps: 2, score: 95 }, DAY_1);
  assert.equal(r.isPractice, false);
  r = recordSet(r.progress, "push-up", { reps: 3, score: 40 }, DAY_1);
  assert.equal(r.isPractice, true);
  assert.equal(r.goalReached, false);
  assert.deepEqual(r.progress.practiceDays, ["2026-11-23"]);
});

test("the goal needs the full amount and at least 80% form", () => {
  let r = recordSet(createEmptyProgress(), "push-up", { reps: 5, score: 79 }, DAY_1);
  assert.equal(r.goalReached, false);
  r = recordSet(r.progress, "push-up", { reps: 5, score: 80 }, DAY_1);
  assert.equal(r.goalReached, true);
});

test("a skill is completed after reaching the goal on two different days", () => {
  let r = recordSet(createEmptyProgress(), "push-up", { reps: 5, score: 85 }, DAY_1);
  assert.equal(r.newlyCompleted, false);
  r = recordSet(r.progress, "push-up", { reps: 6, score: 90 }, DAY_1_EVENING);
  assert.equal(r.goalDaysCount, 1, "the same day only counts once");
  assert.equal(r.newlyCompleted, false);
  r = recordSet(r.progress, "push-up", { reps: 5, score: 85 }, DAY_2);
  assert.equal(r.newlyCompleted, true);
  assert.ok(r.progress.skills["push-up"].completedAt);
  r = recordSet(r.progress, "push-up", { reps: 7, score: 95 }, DAY_2);
  assert.equal(r.newlyCompleted, false, "completed only once");
  assert.equal(r.progress.skills["push-up"].bestReps, 7);
});

test("hard skills with short goals count as practice too", () => {
  let r = recordSet(createEmptyProgress(), "full-planche", { seconds: 2, score: 50 }, DAY_1);
  assert.equal(r.isPractice, true);
  r = recordSet(r.progress, "full-planche", { seconds: 3, score: 81 }, DAY_1);
  assert.equal(r.goalReached, true);
});

test("sets are saved with notes and the history is capped", () => {
  let progress = recordSet(createEmptyProgress(), "push-up", { reps: 4, score: 75, errors: ["Hips sagged (20% of the set)"] }, DAY_1).progress;
  const first = progress.skills["push-up"].history[0];
  assert.equal(first.reps, 4);
  assert.deepEqual(first.notes, ["Hips sagged (20% of the set)"]);
  for (let i = 0; i < MAX_HISTORY + 10; i += 1) {
    progress = recordSet(progress, "push-up", { reps: 1, score: 50, errors: [] }, DAY_2).progress;
  }
  assert.equal(progress.skills["push-up"].history.length, MAX_HISTORY);
});

test("save and load round trip", () => {
  const progress = recordSet(createEmptyProgress(), "push-up", { reps: 5, score: 90, errors: [] }, DAY_1).progress;
  const storage = memoryStorage();
  assert.equal(saveProgress(progress, storage), true);
  assert.deepEqual(loadProgress(storage), progress);
});

test("saving reports failure instead of crashing", () => {
  const full = {
    setItem() {
      throw new Error("quota");
    },
  };
  assert.equal(saveProgress(createEmptyProgress(), full), false);
});

test("unknown skill ids change nothing", () => {
  const empty = createEmptyProgress();
  const r = recordSet(empty, "moon-walk", { reps: 99, score: 100 }, DAY_1);
  assert.equal(r.progress, empty);
  assert.equal(r.isPractice, false);
});
