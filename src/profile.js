// Stores the user's profile on this device. There is no account yet.
const NAME_KEY = "userName";
const MAX_LENGTH = 30;

export function cleanName(name) {
  return String(name ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_LENGTH);
}

export function loadName(storage = globalThis.localStorage) {
  try {
    return cleanName(storage.getItem(NAME_KEY));
  } catch (error) {
    return "";
  }
}

export function saveName(name, storage = globalThis.localStorage) {
  try {
    storage.setItem(NAME_KEY, cleanName(name));
    return true;
  } catch (error) {
    return false;
  }
}

// More about the user, all optional: photo, goal skill and body data.
// Body data is health data, so it stays on this device and is never required.
const DETAILS_KEY = "profileDetails";
const MAX_PHOTO_LENGTH = 200000; // a small resized JPEG as data URL

export const BODY_LIMITS = Object.freeze({
  heightCm: { min: 100, max: 230 },
  weightKg: { min: 30, max: 250 },
  birthYear: { min: 1920, max: 2020 },
});

const EMPTY_DETAILS = Object.freeze({ photo: "", goalSkill: "", heightCm: null, weightKg: null, birthYear: null });

function inRange(value, { min, max }) {
  const number = Number(value);
  return value !== null && value !== "" && Number.isFinite(number) && number >= min && number <= max
    ? Math.round(number)
    : null;
}

// isKnownSkill: function that says whether a skill id exists.
export function cleanDetails(raw, isKnownSkill = () => true) {
  const data = raw && typeof raw === "object" ? raw : {};
  const photo = typeof data.photo === "string" && data.photo.startsWith("data:image/") && data.photo.length <= MAX_PHOTO_LENGTH ? data.photo : "";
  return {
    photo,
    goalSkill: typeof data.goalSkill === "string" && isKnownSkill(data.goalSkill) ? data.goalSkill : "",
    heightCm: inRange(data.heightCm, BODY_LIMITS.heightCm),
    weightKg: inRange(data.weightKg, BODY_LIMITS.weightKg),
    birthYear: inRange(data.birthYear, BODY_LIMITS.birthYear),
  };
}

export function loadDetails(isKnownSkill, storage = globalThis.localStorage) {
  try {
    const text = storage.getItem(DETAILS_KEY);
    return cleanDetails(text ? JSON.parse(text) : EMPTY_DETAILS, isKnownSkill);
  } catch (error) {
    return { ...EMPTY_DETAILS };
  }
}

// Saves the changed fields and returns the new details.
export function updateDetails(changes, isKnownSkill, storage = globalThis.localStorage) {
  const details = cleanDetails({ ...loadDetails(isKnownSkill, storage), ...changes }, isKnownSkill);
  try {
    storage.setItem(DETAILS_KEY, JSON.stringify(details));
    return { details, saved: true };
  } catch (error) {
    return { details, saved: false };
  }
}

// "Alex Smith" → "AS", "sam" → "S"
export function initials(name) {
  return cleanName(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}
