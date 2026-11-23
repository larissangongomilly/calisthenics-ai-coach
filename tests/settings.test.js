import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, cleanSettings, loadSettings, updateSettings } from "../src/settings.js";
import { memoryStorage } from "./helpers/fake-pose.js";

test("settings start with defaults and drop bad values", () => {
  assert.deepEqual(loadSettings(memoryStorage()), DEFAULT_SETTINGS);
  assert.deepEqual(cleanSettings({ voice: "yes", volume: 5, camera: "side", extra: 1 }), {
    voice: true,
    volume: 1,
    camera: "user",
  });
  assert.equal(cleanSettings({ volume: 0 }).volume, 0.2);
});

test("settings are saved and loaded", () => {
  const storage = memoryStorage();
  updateSettings({ voice: false }, storage);
  updateSettings({ camera: "environment" }, storage);
  assert.deepEqual(loadSettings(storage), { voice: false, volume: 1, camera: "environment" });
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
