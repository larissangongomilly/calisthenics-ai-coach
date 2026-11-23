import { test } from "node:test";
import assert from "node:assert/strict";
import { createEmptyProgress, recordSet } from "../src/progress.js";
import { overview, personalBests, skillSeries, trainingCalendar, weekStart, weeklyTotals } from "../src/stats.js";

const WEDNESDAY = new Date("2026-11-25T12:00:00Z");

function trained(sets) {
  let progress = createEmptyProgress();
  for (const [skillId, result, when] of sets) {
    progress = recordSet(progress, skillId, { errors: [], ...result }, new Date(when)).progress;
  }
  return progress;
}

const progress = trained([
  ["push-up", { reps: 5, score: 90 }, "2026-11-16T10:00:00Z"], // last week
  ["push-up", { reps: 6, score: 85 }, "2026-11-23T10:00:00Z"], // Monday
  ["push-up", { reps: 4, score: 70 }, "2026-11-23T10:05:00Z"],
  ["hollow-body-hold", { seconds: 20, score: 80 }, "2026-11-24T18:00:00Z"],
]);

test("weeks start on Monday", () => {
  assert.equal(weekStart("2026-11-25"), "2026-11-23");
  assert.equal(weekStart("2026-11-23"), "2026-11-23");
  assert.equal(weekStart("2026-11-29"), "2026-11-23");
});

test("weekly totals add up reps, holds, sets and days", () => {
  const weeks = weeklyTotals(progress, WEDNESDAY, 3);
  assert.deepEqual(weeks.map((w) => w.weekStart), ["2026-11-09", "2026-11-16", "2026-11-23"]);
  assert.deepEqual(weeks[2], { weekStart: "2026-11-23", sets: 3, reps: 10, holdSeconds: 20, activeDays: 2 });
  assert.equal(weeks[1].reps, 5);
  assert.equal(weeks[0].sets, 0);
});

test("the calendar marks training days, today and the future", () => {
  const calendar = trainingCalendar(progress, WEDNESDAY, 2);
  assert.equal(calendar.length, 2);
  assert.equal(calendar[1][0].day, "2026-11-23");
  assert.equal(calendar[1][0].sets, 2);
  assert.equal(calendar[1][2].today, true);
  assert.equal(calendar[1][3].future, true);
  assert.equal(calendar[0][0].sets, 1);
});

test("skill curve, bests and overview", () => {
  assert.deepEqual(skillSeries(progress, "push-up").map((p) => p.value), [5, 6, 4]);
  assert.deepEqual(skillSeries(progress, "hollow-body-hold").map((p) => p.value), [20]);
  assert.deepEqual(skillSeries(progress, "pull-up"), []);

  const bests = personalBests(progress);
  assert.deepEqual(bests.map((b) => b.skillId), ["hollow-body-hold", "push-up"]);
  assert.equal(bests[1].best, 6);

  const numbers = overview(progress, WEDNESDAY);
  assert.equal(numbers.totalSets, 4);
  assert.equal(numbers.totalReps, 15);
  assert.equal(numbers.trainingDays, 3);
  assert.equal(numbers.thisWeek.sets, 3);
});

test("empty progress gives empty stats", () => {
  const empty = createEmptyProgress();
  assert.equal(overview(empty, WEDNESDAY).totalSets, 0);
  assert.equal(weeklyTotals(empty, WEDNESDAY).length, 8);
  assert.deepEqual(personalBests(empty), []);
});
