// Stores the user's name in the browser. There is no login yet.
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
