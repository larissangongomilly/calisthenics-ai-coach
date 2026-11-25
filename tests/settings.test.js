import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, cleanSettings, guideStartsOn, loadSettings, updateSettings } from "../src/settings.js";
import { memoryStorage } from "./helpers/fake-pose.js";

test("defaults: 5 s countdown, guide the first time, normal strictness, skeleton on", () => {
  assert.equal(DEFAULT_SETTINGS.appearance, "system");
  const settings = loadSettings(memoryStorage());
  assert.deepEqual(settings, DEFAULT_SETTINGS);
  assert.equal(settings.countdown, 5);
  assert.equal(settings.setupMode, "first");
  assert.equal(settings.strictness, "normal");
  assert.equal(settings.skeleton, true);
  assert.equal(settings.mirror, true);
  assert.equal(settings.coachTalk, "full");
  assert.equal(settings.vibration, true);
});

test("bad and unknown values fall back to the defaults", () => {
  const settings = cleanSettings({
    voice: "yes",
    camera: "side",
    sets: 11,
    restSeconds: 50,
    countdown: 4,
    setupMode: "sometimes",
    strictness: "hard",
    skeleton: 1,
    coachTalk: "loud",
    volume: 0.5,
    extra: 1,
  });
  assert.deepEqual(settings, DEFAULT_SETTINGS);
  assert.equal(cleanSettings({ sets: 2.5 }).sets, DEFAULT_SETTINGS.sets);
  assert.equal(cleanSettings({ restSeconds: 700 }).restSeconds, DEFAULT_SETTINGS.restSeconds);
});

test("users can pick their own sets and rest time", () => {
  const own = cleanSettings({ sets: 7, restSeconds: 45 });
  assert.equal(own.sets, 7);
  assert.equal(own.restSeconds, 45);
  assert.equal(cleanSettings({ restSeconds: 600 }).restSeconds, 600);
});

test("settings are saved and loaded", () => {
  const storage = memoryStorage();
  updateSettings({ voice: false, countdown: 10, strictness: "strict" }, storage);
  updateSettings({ camera: "environment", skeleton: false, mirror: false }, storage);
  updateSettings({ coachTalk: "counts", vibration: false, setupMode: "never" }, storage);
  assert.deepEqual(loadSettings(storage), {
    ...DEFAULT_SETTINGS,
    voice: false,
    countdown: 10,
    strictness: "strict",
    camera: "environment",
    skeleton: false,
    mirror: false,
    coachTalk: "counts",
    vibration: false,
    setupMode: "never",
  });
});

test("blocked storage still returns usable settings", () => {
  const blocked = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  assert.deepEqual(loadSettings(blocked), DEFAULT_SETTINGS);
  assert.equal(updateSettings({ voice: false }, blocked).voice, false);
});

test("the setup mode decides whether the guide starts switched on", () => {
  assert.equal(guideStartsOn("first", false), true);
  assert.equal(guideStartsOn("first", true), false);
  assert.equal(guideStartsOn("always", true), true);
  assert.equal(guideStartsOn("never", false), false);
});

test("appearance follows the phone by default and can be fixed", async () => {
  const { resolveTheme } = await import("../src/theme.js");
  assert.equal(DEFAULT_SETTINGS.appearance, "system");
  assert.equal(cleanSettings({ appearance: "blue" }).appearance, "system");
  assert.equal(cleanSettings({ appearance: "light" }).appearance, "light");
  assert.equal(resolveTheme("system", true), "light");
  assert.equal(resolveTheme("system", false), "dark");
  assert.equal(resolveTheme("dark", true), "dark");
  assert.equal(resolveTheme("light", false), "light");
});
