import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMO_NAME, createDemoProgress, fillDemoStorage, isDemoUrl, memoryStorage } from "../src/demo.js";
import { cleanProgress, toBerlinDay } from "../src/progress.js";
import { getSkillPath } from "../src/path.js";

const NOW = new Date("2026-11-25T10:00:00Z");

test("demo mode starts with ?demo only", () => {
  assert.equal(isDemoUrl("?demo"), true);
  assert.equal(isDemoUrl("?demo=1&x=2"), true);
  assert.equal(isDemoUrl(""), false);
  assert.equal(isDemoUrl("?demon"), false);
});

test("demo progress is valid, the same every time and ends yesterday", () => {
  const progress = createDemoProgress(NOW);
  assert.deepEqual(cleanProgress(progress), progress);
  assert.deepEqual(createDemoProgress(NOW), progress);
  const yesterday = toBerlinDay(new Date(NOW.getTime() - 864e5));
  assert.equal(progress.practiceDays.at(-1), yesterday);
  const allDates = Object.values(progress.skills).flatMap((skill) => skill.history.map((set) => Date.parse(set.date)));
  assert.ok(allDates.every((date) => date < NOW.getTime()), "no set lies in the future");
});

test("the demo user finished level 1 and is working on level 2", () => {
  const levels = getSkillPath(createDemoProgress(NOW));
  assert.equal(levels[0].completed, true);
  assert.equal(levels[1].completed, false);
  assert.ok(levels[1].doneCount >= 3);
});

test("the demo storage holds the sample user and works like localStorage", () => {
  const storage = fillDemoStorage(memoryStorage(), NOW);
  assert.equal(storage.getItem("userName"), DEMO_NAME);
  assert.ok(JSON.parse(storage.getItem("progress")).practiceDays.length > 20);
  storage.removeItem("userName");
  assert.equal(storage.getItem("userName"), null);
  assert.equal(storage.length, 2);
  storage.clear();
  assert.equal(storage.length, 0);
});
