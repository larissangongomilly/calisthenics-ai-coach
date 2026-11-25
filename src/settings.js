// App settings, stored on the device (like the name and the progress).
import { REST_LIMITS, SETS_LIMITS, fitsLimits } from "./workout.js";

const SETTINGS_KEY = "settings";

export const CAMERAS = ["user", "environment"]; // front, back
export const COUNTDOWNS = [0, 3, 5, 10]; // seconds before a set starts
export const SETUP_MODES = ["first", "always", "never"]; // when the guided setup runs
export const STRICTNESS = ["easy", "normal", "strict"]; // how strict reps and holds are judged
export const COACH_TALK = ["full", "counts"]; // form tips and counts, or counts only
export const APPEARANCES = ["system", "dark", "light"]; // follow the phone, or always dark or light

export const DEFAULT_SETTINGS = Object.freeze({
  // Appearance
  appearance: "system",
  // Training
  countdown: 5,
  setupMode: "first", // guide into the position the first time only
  strictness: "normal",
  sets: 3, // sets per workout (see SETS_LIMITS)
  restSeconds: 90, // rest between sets (see REST_LIMITS)
  // Camera
  camera: "user", // "user" = front camera, "environment" = back camera
  skeleton: true, // draw the body lines on the video
  mirror: true, // show the front camera like a mirror
  // Coach
  voice: true, // spoken coaching on or off (the phone sets the volume)
  coachTalk: "full",
  vibration: true,
});

const oneOf = (list, value, fallback) => (list.includes(value) ? value : fallback);
const bool = (value, fallback) => (typeof value === "boolean" ? value : fallback);

// Keeps only known settings with valid values. Anything else gets the default.
export function cleanSettings(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  const d = DEFAULT_SETTINGS;
  return {
    appearance: oneOf(APPEARANCES, data.appearance, d.appearance),
    countdown: oneOf(COUNTDOWNS, data.countdown, d.countdown),
    setupMode: oneOf(SETUP_MODES, data.setupMode, d.setupMode),
    strictness: oneOf(STRICTNESS, data.strictness, d.strictness),
    sets: fitsLimits(data.sets, SETS_LIMITS) ? data.sets : d.sets,
    restSeconds: fitsLimits(data.restSeconds, REST_LIMITS) ? data.restSeconds : d.restSeconds,
    camera: oneOf(CAMERAS, data.camera, d.camera),
    skeleton: bool(data.skeleton, d.skeleton),
    mirror: bool(data.mirror, d.mirror),
    voice: bool(data.voice, d.voice),
    coachTalk: oneOf(COACH_TALK, data.coachTalk, d.coachTalk),
    vibration: bool(data.vibration, d.vibration),
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

// Whether the guided setup starts switched on for a skill.
export function guideStartsOn(setupMode, seenBefore) {
  if (setupMode === "always") return true;
  if (setupMode === "never") return false;
  return !seenBefore;
}
