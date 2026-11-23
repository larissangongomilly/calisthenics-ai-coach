import { test } from "node:test";
import assert from "node:assert/strict";
import { describeStreak, getStreak } from "../src/streak.js";
import { getSkillPath, isLevelUnlocked } from "../src/path.js";
import { createEmptyProgress } from "../src/progress.js";
import { getSkillsForLevel } from "../src/skills.js";

const WEDNESDAY = new Date("2026-11-25T12:00:00Z");

test("streak counts weeks in a row (Monday to Sunday, Berlin)", () => {
  assert.equal(getStreak([], WEDNESDAY).weeks, 0);
  assert.equal(getStreak(["2026-11-23"], WEDNESDAY).weeks, 1);
  assert.equal(getStreak(["2026-11-15", "2026-11-22", "2026-11-24"], WEDNESDAY).weeks, 3);
  assert.equal(getStreak(["2026-11-16", "2026-11-17", "2026-11-24"], WEDNESDAY).weeks, 2, "several days in one week count once");
});

test("the running week does not break the streak, a missed week does", () => {
  const lastWeekOnly = getStreak(["2026-11-22"], WEDNESDAY);
  assert.equal(lastWeekOnly.weeks, 1);
  assert.equal(lastWeekOnly.practicedThisWeek, false);
  assert.equal(getStreak(["2026-11-10"], WEDNESDAY).weeks, 0);
  assert.equal(getStreak(["2026-11-03", "2026-11-24"], WEDNESDAY).weeks, 1);
});

test("weeks switch at midnight Berlin time and across the new year", () => {
  assert.equal(getStreak(["2026-11-29"], new Date("2026-11-29T22:30:00Z")).practicedThisWeek, true);
  assert.equal(getStreak(["2026-11-29"], new Date("2026-11-29T23:30:00Z")).practicedThisWeek, false);
  assert.equal(getStreak(["2026-12-31", "2027-01-04"], new Date("2027-01-05T12:00:00Z")).weeks, 2);
});

test("streak text", () => {
  assert.match(describeStreak({ weeks: 0, practicedThisWeek: false }), /0 weeks/);
  assert.equal(describeStreak({ weeks: 1, practicedThisWeek: true }), "Weekly streak: 1 week.");
  assert.match(describeStreak({ weeks: 4, practicedThisWeek: false }), /keep it/);
});

function completed(ids) {
  const entry = { completedAt: "2026-11-23T10:00:00Z", lastPracticedAt: "x", bestReps: 5, bestSeconds: 0, bestScore: 90 };
  return { ...createEmptyProgress(), skills: Object.fromEntries(ids.map((id) => [id, entry])) };
}

test("only level 1 is unlocked at the start", () => {
  const path = getSkillPath(createEmptyProgress());
  assert.equal(path.length, 7);
  assert.equal(path[0].unlocked, true);
  assert.equal(path[1].unlocked, false);
});

test("a level unlocks when every skill of the level before is completed", () => {
  const someDone = getSkillPath(completed(["push-up"]));
  assert.equal(someDone[0].doneCount, 1);
  assert.equal(someDone[1].unlocked, false);

  const level1 = getSkillsForLevel(1).map((s) => s.id);
  const allDone = getSkillPath(completed(level1));
  assert.equal(allDone[0].completed, true);
  assert.equal(allDone[1].unlocked, true);
  assert.equal(allDone[2].unlocked, false);
});

test("levels cannot be skipped", () => {
  const level2 = getSkillsForLevel(2).map((s) => s.id);
  const path = getSkillPath(completed(level2));
  assert.equal(path[1].unlocked, false);
  assert.equal(path[2].unlocked, false);
  assert.equal(isLevelUnlocked(createEmptyProgress(), 1), true);
  assert.equal(isLevelUnlocked(createEmptyProgress(), 3), false);
});
