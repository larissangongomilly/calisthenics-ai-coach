import { test } from "node:test";
import assert from "node:assert/strict";
import { EXERCISES, getExercise } from "../src/exercises.js";
import { SKILLS, getPracticeMinimum } from "../src/skills.js";
import { createTracker } from "../src/tracker.js";
import { HANG, SUPPORT, handstand, hollow, plank, pose, pullUp } from "./helpers/fake-pose.js";

// Feeds a list of poses into a tracker, 33 ms apart (about 30 frames per second).
function run(tracker, poses, start = 0) {
  let frame;
  poses.forEach((p, i) => {
    frame = tracker.update(p, start + i * 33);
  });
  return frame;
}

test("every skill has camera rules, a goal and a matching measure", () => {
  for (const skill of SKILLS) {
    const exercise = EXERCISES[skill.id];
    assert.ok(exercise, `${skill.id} has rules`);
    assert.equal(exercise.measure, skill.measure, `${skill.id} measure`);
    assert.ok(Number.isInteger(skill.goal) && skill.goal > 0, `${skill.id} goal`);
  }
  assert.equal(Object.keys(EXERCISES).length, SKILLS.length);
  assert.deepEqual(SKILLS.filter((s) => !s.beta).map((s) => s.id), ["push-up"]);
});

test("practice minimum is half the goal, rounded up", () => {
  assert.equal(getPracticeMinimum({ goal: 5 }), 3);
  assert.equal(getPracticeMinimum({ goal: 30 }), 15);
  assert.equal(getPracticeMinimum({ goal: 1 }), 1);
});

test("no rule crashes on random poses", () => {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const point = () => ({ x: random(), y: random() });
  for (const skill of SKILLS) {
    const tracker = createTracker(getExercise(skill.id));
    for (let i = 0; i < 200; i += 1) {
      const frame = tracker.update(
        pose({ shoulder: point(), elbow: point(), wrist: point(), hip: point(), knee: point(), ankle: point() }),
        i * 33
      );
      assert.equal(typeof frame.text, "string", skill.id);
      assert.ok(frame.text.length > 0, skill.id);
    }
    assert.ok(Number.isFinite(tracker.summary().score), skill.id);
  }
});

test("push-up: counts full reps, ignores shallow ones and knee push-ups", () => {
  const tracker = createTracker(getExercise("push-up"));
  const rep = [170, 150, 130, 110, 90, 80, 90, 110, 130, 150, 170].map((a) => pose(plank(a)));
  let frame = run(tracker, [...rep, ...rep, ...rep]);
  assert.equal(frame.reps, 3);

  frame = run(tracker, [170, 150, 130, 110, 130, 150, 170].map((a) => pose(plank(a))), 5000);
  assert.equal(frame.reps, 3, "shallow rep is not counted");

  frame = tracker.update(pose(plank(170, 0, true)), 9000);
  assert.match(frame.state, /^position:Knees down/);

  const summary = tracker.summary();
  assert.equal(summary.score, 100);
  assert.ok(summary.errors.some((e) => e.includes("full range")));
});

test("push-up: works on a phone in portrait mode", () => {
  const phone = { width: 720, height: 1280 };
  const frames = (angles) => angles.map((a) => pose(plank(a, 0, false, phone), phone));
  const tracker = createTracker(getExercise("push-up"));

  // Good reps with arms almost (not fully) locked at the top count.
  const goodRep = [165, 150, 130, 110, 90, 80, 90, 110, 130, 150, 165];
  let frame = run(tracker, frames([...goodRep, ...goodRep]));
  assert.equal(frame.reps, 2);

  // A shallow rep (only down to 120 degrees) does not count.
  frame = run(tracker, frames([165, 150, 135, 120, 135, 150, 165]), 5000);
  assert.equal(frame.reps, 2);
  assert.ok(tracker.summary().errors.some((e) => e.includes("full range")));
});

test("push-up: a deep rep stays in position at the bottom", () => {
  const tracker = createTracker(getExercise("push-up"));
  assert.equal(tracker.update(pose(plank(50)), 0).inPosition, true);
});

test("push-up: sagging and high hips are detected", () => {
  const tracker = createTracker(getExercise("push-up"));
  let frame = run(tracker, Array(40).fill(pose(plank(170, 0.09))));
  assert.equal(frame.state, "sagging");
  frame = tracker.update(pose(plank(170, -0.08)), 5000);
  assert.equal(frame.state, "high");
  assert.ok(tracker.summary().errors.some((e) => e.startsWith("Hips sagged")));
  assert.ok(tracker.summary().score < 100);
});

test("hollow body hold: times the hold and spots low legs", () => {
  const tracker = createTracker(getExercise("hollow-body-hold"));
  let frame = run(tracker, Array(400).fill(pose(hollow(25))));
  assert.equal(frame.state, "good");
  assert.ok(frame.bestHoldSeconds >= 12 && frame.bestHoldSeconds <= 14);

  frame = tracker.update(pose(hollow(10)), 400 * 33);
  assert.equal(frame.state, "legs-low");

  frame = tracker.update(pose(hollow(-5)), 401 * 33);
  assert.equal(frame.inPosition, false);
  assert.ok(tracker.summary().seconds >= 12, "best hold is kept after leaving the position");
});

test("handstand: straight line is good, banana shape is not, plank is no handstand", () => {
  const tracker = createTracker(getExercise("free-handstand"));
  assert.equal(tracker.update(pose(handstand()), 0).state, "good");
  assert.equal(tracker.update(pose(handstand(0.12)), 33).state, "line");
  assert.equal(tracker.update(pose(plank(170)), 66).inPosition, false);
});

test("muscle-up counts each move from hang to support", () => {
  const tracker = createTracker(getExercise("bar-muscle-up"));
  const frame = run(tracker, [HANG, HANG, SUPPORT, SUPPORT, HANG, SUPPORT].map((p) => pose(p)));
  assert.equal(frame.reps, 2);
});

test("pull-up counts a full rep", () => {
  const tracker = createTracker(getExercise("pull-up"));
  const frame = run(tracker, [175, 150, 120, 90, 60, 90, 120, 150, 175].map((a) => pose(pullUp(a))));
  assert.equal(frame.reps, 1);
});

test("strictness: easy counts slightly shallower reps", () => {
  const shallow = [170, 150, 130, 110, 95, 110, 130, 150, 170].map((a) => pose(plank(a)));
  assert.equal(run(createTracker(getExercise("push-up")), shallow).reps, 0, "normal: 95 degrees is not deep enough");
  assert.equal(run(createTracker(getExercise("push-up"), { strictness: "easy" }), shallow).reps, 1);
});

test("strictness: strict only counts reps with good form", () => {
  const sagging = [170, 150, 130, 110, 90, 80, 90, 110, 130, 150, 170].map((a) => pose(plank(a, 0.09)));
  const good = [170, 150, 130, 110, 90, 80, 90, 110, 130, 150, 170].map((a) => pose(plank(a)));
  const normal = createTracker(getExercise("push-up"));
  assert.equal(run(normal, sagging).reps, 1);

  const strict = createTracker(getExercise("push-up"), { strictness: "strict" });
  let frame = run(strict, sagging);
  assert.equal(frame.reps, 0);
  frame = run(strict, good, 5000);
  assert.equal(frame.reps, 1);
  assert.ok(strict.summary().errors.some((e) => e.includes("strict mode")));
});

test("strictness: strict hold time only runs with good form", () => {
  const strict = createTracker(getExercise("hollow-body-hold"), { strictness: "strict" });
  const frame = run(strict, [...Array(100).fill(pose(hollow(10))), ...Array(100).fill(pose(hollow(25)))]);
  assert.ok(frame.bestHoldSeconds >= 2 && frame.bestHoldSeconds <= 4, String(frame.bestHoldSeconds));
});
