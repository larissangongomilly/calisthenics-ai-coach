// App settings, stored in the browser (like the name and the progress).
import { REST_OPTIONS, SET_OPTIONS } from "./workout.js";

const SETTINGS_KEY = "settings";

export const CAMERAS = ["user", "environment"]; // front, back

export const DEFAULT_SETTINGS = Object.freeze({
  voice: true, // spoken coaching on or off
  volume: 1, // 0.2 to 1
  camera: "user", // "user" = front camera, "environment" = back camera
  sets: 3, // sets per workout
  restSeconds: 90, // rest between sets
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Keeps only known settings with valid values. Anything else gets the default.
export function cleanSettings(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  return {
    voice: typeof data.voice === "boolean" ? data.voice : DEFAULT_SETTINGS.voice,
    volume: Number.isFinite(data.volume) ? clamp(data.volume, 0.2, 1) : DEFAULT_SETTINGS.volume,
    camera: CAMERAS.includes(data.camera) ? data.camera : DEFAULT_SETTINGS.camera,
    sets: SET_OPTIONS.includes(data.sets) ? data.sets : DEFAULT_SETTINGS.sets,
    restSeconds: REST_OPTIONS.includes(data.restSeconds) ? data.restSeconds : DEFAULT_SETTINGS.restSeconds,
  };
}

export function loadSettings(storage = globalThis.localStorage) {
  try {
    const text = storage.getItem(SETTINGS_KEY);
    return cleanSettings(text ? JSON.parse(text) : null);
  } catch (error) {
    return cleanSettings(null);
  }
}

// Saves the changed fields and returns the new settings (also when saving fails).
export function updateSettings(changes, storage = globalThis.localStorage) {
  const settings = cleanSettings({ ...loadSettings(storage), ...changes });
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    // Not saved: the settings still apply until the app is closed.
  }
  return settings;
}
