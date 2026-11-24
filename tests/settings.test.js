import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, cleanSettings, loadSettings, updateSettings } from "../src/settings.js";
import { memoryStorage } from "./helpers/fake-pose.js";

test("settings start with defaults and drop bad values", () => {
  assert.deepEqual(loadSettings(memoryStorage()), DEFAULT_SETTINGS);
  assert.deepEqual(cleanSettings({ voice: "yes", volume: 5, camera: "side", sets: 11, restSeconds: 50, extra: 1 }), {
    ...DEFAULT_SETTINGS,
    volume: 1,
  });
  assert.equal(cleanSettings({ volume: 0 }).volume, 0.2);
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
  updateSettings({ voice: false }, storage);
  updateSettings({ camera: "environment" }, storage);
  updateSettings({ sets: 5, restSeconds: 120 }, storage);
  assert.deepEqual(loadSettings(storage), { voice: false, volume: 1, camera: "environment", sets: 5, restSeconds: 120 });
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
