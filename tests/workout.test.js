import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorkout, describeRest, formatClock } from "../src/workout.js";

const set = (reps, score, errors = []) => ({ reps, seconds: 0, score, errors });
const practice = { isPractice: true, goalReached: false, newlyCompleted: false };
const goal = { isPractice: true, goalReached: true, newlyCompleted: false };

test("a workout counts its sets and ends after the last one", () => {
  const workout = createWorkout({ sets: 3, restSeconds: 90 });
  assert.equal(workout.currentSet, 1);
  workout.addSet(set(5, 90), practice);
  assert.equal(workout.currentSet, 2);
  assert.equal(workout.isFinished(), false);
  workout.addSet(set(4, 80), goal);
  workout.addSet(set(3, 70, ["Hips sagged (20% of the set)"]), practice);
  assert.equal(workout.isFinished(), true);
  assert.equal(workout.currentSet, 3);

  const summary = workout.summary();
  assert.equal(summary.totalReps, 12);
  assert.equal(summary.averageScore, 80);
  assert.equal(summary.sets.length, 3);
  assert.equal(summary.news, "goal", "the strongest news of all sets wins");
  assert.deepEqual(summary.errors, ["Hips sagged (20% of the set)"]);
});

test("hold workouts keep the best hold", () => {
  const workout = createWorkout({ sets: 2, restSeconds: 60 });
  workout.addSet({ reps: 0, seconds: 20, score: 90, errors: [] }, practice);
  workout.addSet({ reps: 0, seconds: 25, score: 70, errors: [] }, practice);
  assert.equal(workout.summary().bestSeconds, 25);
});

test("an empty workout has a safe summary", () => {
  const summary = createWorkout({ sets: 3, restSeconds: 90 }).summary();
  assert.equal(summary.averageScore, 0);
  assert.equal(summary.bestSeconds, 0);
  assert.equal(summary.news, null);
});

test("rest time words and clock", () => {
  assert.equal(formatClock(95), "1:35");
  assert.equal(formatClock(9.2), "0:10");
  assert.equal(formatClock(-3), "0:00");
  assert.equal(describeRest(90), "90 seconds");
  assert.equal(describeRest(120), "2 minutes");
});
