import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanDetails, initials, loadDetails, updateDetails } from "../src/profile.js";
import { currentLevel, getBadges, goalProgress, longestStreak } from "../src/badges.js";
import { createEmptyProgress, recordSet } from "../src/progress.js";
import { memoryStorage } from "./helpers/fake-pose.js";

const known = (id) => ["push-up", "pull-up"].includes(id);

test("profile details keep only valid optional values", () => {
  const details = cleanDetails(
    { photo: "javascript:alert(1)", goalSkill: "moon-walk", heightCm: "172", weightKg: 20, birthYear: "abc" },
    known
  );
  assert.deepEqual(details, { photo: "", goalSkill: "", heightCm: 172, weightKg: null, birthYear: null });
  assert.equal(cleanDetails({ photo: "data:image/jpeg;base64,AAA" }).photo, "data:image/jpeg;base64,AAA");
});

test("profile details are saved and loaded", () => {
  const storage = memoryStorage();
  updateDetails({ goalSkill: "pull-up", heightCm: 170 }, known, storage);
  updateDetails({ weightKg: 64.6 }, known, storage);
  assert.deepEqual(loadDetails(known, storage), { photo: "", goalSkill: "pull-up", heightCm: 170, weightKg: 65, birthYear: null });
});

test("initials come from the first two names", () => {
  assert.equal(initials("Alex Smith"), "AS");
  assert.equal(initials("  sam "), "S");
  assert.equal(initials(""), "");
});

test("the longest streak counts weeks in a row, even after a break", () => {
  // Three weeks in a row, a break, then one week.
  assert.equal(longestStreak(["2026-10-05", "2026-10-13", "2026-10-21", "2026-11-16"]), 3);
  assert.equal(longestStreak([]), 0);
});

test("badges are earned from the progress", () => {
  const now = new Date("2026-11-24T10:00:00Z");
  const empty = getBadges(createEmptyProgress(), now);
  assert.ok(empty.every((badge) => !badge.earned));
  assert.equal(new Set(empty.map((badge) => badge.id)).size, empty.length, "badge ids are unique");

  let progress = recordSet(createEmptyProgress(), "push-up", { reps: 6, score: 96 }, new Date("2026-11-23T10:00:00Z")).progress;
  progress = recordSet(progress, "push-up", { reps: 6, score: 90 }, new Date("2026-11-24T09:00:00Z")).progress;
  const earned = getBadges(progress, now).filter((badge) => badge.earned).map((badge) => badge.id);
  assert.deepEqual(earned.sort(), ["clean-set", "first-set", "first-skill"]);
});

test("the current level and the way to a goal skill", () => {
  const empty = createEmptyProgress();
  assert.equal(currentLevel(empty).level, 1);
  const goal = goalProgress(empty, "pull-up");
  assert.equal(goal.skill.id, "pull-up");
  assert.equal(goal.done, 0);
  assert.equal(goal.remaining, goal.total);
  assert.equal(goalProgress(empty, "moon-walk"), null);
});
