import { test } from "node:test";
import assert from "node:assert/strict";
import { createGuide } from "../src/guide.js";
import { getExercise } from "../src/exercises.js";
import { getSkillColors, hasFigure, renderFigure } from "../src/figures.js";
import { LEVELS, SKILLS } from "../src/skills.js";
import { cleanName, loadName, saveName } from "../src/profile.js";
import { memoryStorage, plank, pose, handstand, pullUp, HANG } from "./helpers/fake-pose.js";

test("guide: speaks the first step at once and moves on step by step", () => {
  const guide = createGuide([
    { say: "A", check: (p) => p.ok },
    { say: "B", wait: 1000 },
    { say: "C", check: (p) => p.ok },
  ]);
  let r = guide.update({ visible: false }, 0);
  assert.equal(r.step, 1);
  assert.equal(r.isNew, true);
  assert.match(r.text, /whole body/);

  r = guide.update({ visible: true, ok: true }, 100);
  assert.equal(r.step, 1, "a check has to hold for a moment");
  r = guide.update({ visible: true, ok: true }, 650);
  assert.equal(r.step, 2);

  r = guide.update({ visible: true, ok: false }, 1200);
  assert.equal(r.step, 2, "wait step still waiting");
  r = guide.update({ visible: true, ok: false }, 1700);
  assert.equal(r.step, 3);

  guide.update({ visible: true, ok: true }, 1800);
  r = guide.update({ visible: true, ok: false }, 2000);
  assert.equal(r.step, 3, "a check that breaks does not count");

  guide.update({ visible: true, ok: true }, 2100);
  r = guide.update({ visible: true, ok: true }, 2700);
  assert.equal(r.done, true);
});

test("guide: a simulated push-up goes through every step", () => {
  const guide = createGuide(getExercise("push-up").setup);
  let t = 0;
  let r;
  const hold = (points) => {
    for (let i = 0; i < 25; i += 1) {
      r = guide.update(pose(points), (t += 33));
    }
  };
  const kneeling = { ...plank(170), knee: { x: 0.6, y: 0.9 }, ankle: { x: 0.45, y: 0.92 }, hip: { x: 0.5, y: 0.72 } };
  hold(kneeling);
  hold(kneeling);
  assert.equal(r.step, 3, "hands down while kneeling");
  hold(plank(170, 0.07));
  assert.equal(r.step, 4, "legs straight but hips sag");
  hold(plank(170));
  assert.equal(r.done, true);
});

test("level 1 skills have a guided setup", () => {
  for (const id of ["push-up", "inverted-row", "hollow-body-hold", "crow-pose"]) {
    assert.ok(getExercise(id).setup.length >= 4, id);
  }
});

test("every skill has a guided setup that starts with the camera or the coach", () => {
  for (const skill of SKILLS) {
    const setup = getExercise(skill.id).setup;
    assert.ok(Array.isArray(setup) && setup.length >= 3, skill.id);
    for (const step of setup) {
      assert.ok(typeof step.say === "string" && step.say.length > 10, skill.id);
      assert.ok(typeof step.check === "function" || Number.isFinite(step.wait), skill.id);
    }
    const first = setup[0].say;
    assert.ok(skill.coachRequired ? /coach/.test(first) : /phone|camera|side/i.test(first), skill.id);
  }
});

test("no guided setup crashes on random poses", () => {
  let seed = 11;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const point = () => ({ x: random(), y: random() });
  for (const skill of SKILLS) {
    const guide = createGuide(getExercise(skill.id).setup);
    for (let i = 0; i < 100; i += 1) {
      const r = guide.update(pose({ shoulder: point(), elbow: point(), wrist: point(), hip: point(), knee: point(), ankle: point() }), i * 100);
      assert.equal(typeof r.text, "string", skill.id);
    }
  }
});

// Holds each pose for a second (30 frames) and returns the last guide answer.
function walk(setup, poses) {
  const guide = createGuide(setup);
  let t = 0;
  let r;
  for (const p of poses) {
    for (let i = 0; i < 30; i += 1) {
      r = guide.update(pose(p), (t += 33));
    }
  }
  // Wait steps need time: keep the last pose for 10 more seconds.
  for (let i = 0; i < 300; i += 1) {
    r = guide.update(pose(poses.at(-1)), (t += 33));
  }
  return r;
}

test("simulated free handstand and pull-up setups reach the end", () => {
  const standingHandsDown = { ...handstand(), ankle: { x: 0.6, y: 0.95 }, knee: { x: 0.58, y: 0.9 }, hip: { x: 0.55, y: 0.8 }, shoulder: { x: 0.5, y: 0.75 } };
  assert.equal(walk(getExercise("free-handstand").setup, [standingHandsDown, handstand(), handstand()]).done, true);
  assert.equal(walk(getExercise("pull-up").setup, [pullUp(175)]).done, true);
  assert.equal(walk(getExercise("hanging-knee-raise").setup, [HANG]).done, true);
});

test("every skill has a figure in its level color", () => {
  for (const skill of SKILLS) {
    assert.ok(hasFigure(skill.id), skill.id);
    const level = LEVELS.find((l) => l.level === skill.level);
    assert.deepEqual(getSkillColors(skill.id), { bright: level.color, done: level.dark });
  }
  const svg = renderFigure("crow-pose", "#c6f432", "#0f1115");
  assert.match(svg, /^<svg/);
  assert.match(svg, /#c6f432/);
});

test("names are trimmed, limited and stored safely", () => {
  assert.equal(cleanName("  Alex   Coach  "), "Alex Coach");
  assert.equal(cleanName("x".repeat(50)).length, 30);
  const storage = memoryStorage();
  assert.equal(saveName(" Alex ", storage), true);
  assert.equal(loadName(storage), "Alex");
  const blocked = {
    getItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(loadName(blocked), "");
});
