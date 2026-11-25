import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSyncState, markChanged, mergeAll, mergeProgress, pickNewer, toCloudProfile } from "../src/sync.js";
import { DEFAULT_SETTINGS } from "../src/settings.js";
import { MAX_HISTORY } from "../src/progress.js";
import { memoryStorage } from "./helpers/fake-pose.js";

const set = (date, reps = 10) => ({ date, reps, seconds: 0, score: 90, notes: [] });
const skill = (extra) => ({
  completedAt: null,
  bestReps: 0,
  bestSeconds: 0,
  bestScore: 0,
  lastPracticedAt: null,
  history: [],
  goalDays: [],
  ...extra,
});

test("progress from two devices is merged without losing anything", () => {
  const phone = {
    version: 1,
    practiceDays: ["2026-11-02", "2026-11-04"],
    skills: {
      "push-up": skill({
        bestReps: 15,
        completedAt: "2026-11-04T10:00:00.000Z",
        lastPracticedAt: "2026-11-04T10:00:00.000Z",
        history: [set("2026-11-02T10:00:00.000Z"), set("2026-11-04T10:00:00.000Z", 15)],
        goalDays: ["2026-11-02", "2026-11-04"],
      }),
    },
  };
  const tablet = {
    version: 1,
    practiceDays: ["2026-11-03", "2026-11-04"],
    skills: {
      "push-up": skill({
        bestReps: 12,
        bestScore: 95,
        completedAt: "2026-11-03T10:00:00.000Z",
        lastPracticedAt: "2026-11-05T10:00:00.000Z",
        history: [set("2026-11-02T10:00:00.000Z"), set("2026-11-05T10:00:00.000Z", 12)],
        goalDays: ["2026-11-03"],
      }),
      "pike-push-up": skill({ bestReps: 6, history: [set("2026-11-03T09:00:00.000Z", 6)] }),
    },
  };

  const merged = mergeProgress(phone, tablet);
  assert.deepEqual(merged.practiceDays, ["2026-11-02", "2026-11-03", "2026-11-04"]);
  const pushUp = merged.skills["push-up"];
  assert.equal(pushUp.bestReps, 15);
  assert.equal(pushUp.bestScore, 95);
  assert.equal(pushUp.completedAt, "2026-11-03T10:00:00.000Z");
  assert.equal(pushUp.lastPracticedAt, "2026-11-05T10:00:00.000Z");
  assert.deepEqual(pushUp.goalDays, ["2026-11-02", "2026-11-03", "2026-11-04"]);
  assert.deepEqual(
    pushUp.history.map((s) => s.date),
    ["2026-11-02T10:00:00.000Z", "2026-11-04T10:00:00.000Z", "2026-11-05T10:00:00.000Z"]
  );
  assert.equal(merged.skills["pike-push-up"].bestReps, 6);
  assert.deepEqual(mergeProgress(phone, tablet), mergeProgress(tablet, phone));
});

test("merged history keeps only the newest sets", () => {
  const days = (start, count) =>
    Array.from({ length: count }, (_, i) => set(new Date(Date.UTC(2026, 0, 1) + (start + i) * 3600000).toISOString()));
  const a = { version: 1, practiceDays: [], skills: { "push-up": skill({ history: days(0, 80) }) } };
  const b = { version: 1, practiceDays: [], skills: { "push-up": skill({ history: days(80, 80) }) } };
  const history = mergeProgress(a, b).skills["push-up"].history;
  assert.equal(history.length, MAX_HISTORY);
  assert.equal(history.at(-1).date, days(159, 1)[0].date);
});

test("no account data yet: the local progress is kept", () => {
  const local = { version: 1, practiceDays: ["2026-11-02"], skills: { "push-up": skill({ bestReps: 3 }) } };
  assert.equal(mergeProgress(local, null).skills["push-up"].bestReps, 3);
  assert.deepEqual(mergeProgress(null, local).practiceDays, ["2026-11-02"]);
});

test("settings and profile: the side changed last wins, a never changed side loses", () => {
  const old = { value: "old", changedAt: "2026-11-01T00:00:00.000Z" };
  const fresh = { value: "new", changedAt: "2026-11-02T00:00:00.000Z" };
  assert.equal(pickNewer(old, fresh).value, "new");
  assert.equal(pickNewer(fresh, old).value, "new");
  assert.equal(pickNewer({ value: "default", changedAt: null }, old).value, "old");
  assert.equal(pickNewer(old, { value: "default", changedAt: null }).value, "old");
});

test("a fresh install takes settings and profile from the account", () => {
  const local = {
    progress: null,
    settings: DEFAULT_SETTINGS,
    profile: { name: "", photo: "", goalSkill: "" },
    settingsChangedAt: null,
    profileChangedAt: null,
  };
  const remote = {
    progress: { version: 1, practiceDays: ["2026-11-02"], skills: {} },
    settings: { ...DEFAULT_SETTINGS, appearance: "light", changedAt: "2026-11-01T00:00:00.000Z" },
    profile: { name: "Alex", photo: "", goalSkill: "free-handstand", changedAt: "2026-11-01T00:00:00.000Z" },
  };
  const merged = mergeAll(local, remote);
  assert.equal(merged.settings.appearance, "light");
  assert.equal(merged.profile.name, "Alex");
  assert.equal(merged.profile.goalSkill, "free-handstand");
  assert.deepEqual(merged.progress.practiceDays, ["2026-11-02"]);
  assert.equal(merged.row.settings.changedAt, "2026-11-01T00:00:00.000Z");
  assert.equal("changedAt" in merged.settings, false);
});

test("body data never goes into the account", () => {
  const cloud = toCloudProfile("  Alex ", { photo: "", goalSkill: "", heightCm: 170, weightKg: 60, birthYear: 1990 });
  assert.deepEqual(cloud, { name: "Alex", photo: "", goalSkill: "" });
});

test("change times are stored per part", () => {
  const storage = memoryStorage();
  assert.equal(loadSyncState(storage).settingsChangedAt, null);
  markChanged("settings", new Date("2026-11-02T00:00:00.000Z"), storage);
  markChanged("profile", new Date("2026-11-03T00:00:00.000Z"), storage);
  assert.deepEqual(loadSyncState(storage), {
    settingsChangedAt: "2026-11-02T00:00:00.000Z",
    profileChangedAt: "2026-11-03T00:00:00.000Z",
    lastSyncAt: null,
  });
});
