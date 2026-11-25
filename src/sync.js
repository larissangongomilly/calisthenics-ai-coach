// Merges the data on this device with the data in the user's account.
// Pure functions only (no network), so they can be tested.
//
// - Progress is merged: nothing done on any device is lost.
// - Settings and profile: the side that was changed last wins.
// - Body data (height, weight, birth year) is health data and never leaves the device.
import { MAX_HISTORY, cleanProgress } from "./progress.js";
import { cleanSettings } from "./settings.js";
import { cleanName } from "./profile.js";

const SYNC_KEY = "syncState";

const earliest = (a, b) => (a && b ? (a < b ? a : b) : a || b || null);
const latest = (a, b) => (a && b ? (a > b ? a : b) : a || b || null);
const union = (a, b) => [...new Set([...a, ...b])].sort();

function mergeSkill(a, b) {
  if (!a) return b;
  if (!b) return a;
  const byDate = new Map();
  for (const set of [...a.history, ...b.history]) {
    byDate.set(set.date, set); // the same set saved on both sides counts once
  }
  const history = [...byDate.values()].sort((x, y) => (x.date < y.date ? -1 : 1)).slice(-MAX_HISTORY);
  return {
    completedAt: earliest(a.completedAt, b.completedAt),
    bestReps: Math.max(a.bestReps, b.bestReps),
    bestSeconds: Math.max(a.bestSeconds, b.bestSeconds),
    bestScore: Math.max(a.bestScore, b.bestScore),
    lastPracticedAt: latest(a.lastPracticedAt, b.lastPracticedAt),
    history,
    goalDays: union(a.goalDays, b.goalDays),
  };
}

export function mergeProgress(local, remote) {
  const a = cleanProgress(local);
  const b = cleanProgress(remote);
  const skills = {};
  for (const id of new Set([...Object.keys(a.skills), ...Object.keys(b.skills)])) {
    skills[id] = mergeSkill(a.skills[id], b.skills[id]);
  }
  return { ...a, skills, practiceDays: union(a.practiceDays, b.practiceDays) };
}

// Picks the side that was changed last. A side that was never changed
// (no changedAt, for example a fresh install) loses against one that was.
export function pickNewer(local, remote) {
  if (!remote?.changedAt) return local;
  if (!local?.changedAt) return remote;
  return remote.changedAt > local.changedAt ? remote : local;
}

// The part of the profile that goes into the account (no body data).
export function toCloudProfile(name, details) {
  return { name: cleanName(name), photo: details.photo ?? "", goalSkill: details.goalSkill ?? "" };
}

// Combines local and account data.
// local:  { progress, settings, profile: {name, photo, goalSkill}, settingsChangedAt, profileChangedAt }
// remote: the account row ({ progress, settings, profile } with changedAt inside settings and profile) or null
// Returns the merged data and the row to save in the account.
export function mergeAll(local, remote) {
  const progress = mergeProgress(local.progress, remote?.progress);

  const { changedAt: settingsRemoteAt, ...remoteSettings } = remote?.settings ?? {};
  const settingsSide = pickNewer(
    { value: local.settings, changedAt: local.settingsChangedAt },
    { value: remoteSettings, changedAt: settingsRemoteAt }
  );
  const settings = cleanSettings(settingsSide.value);

  const { changedAt: profileRemoteAt, ...remoteProfile } = remote?.profile ?? {};
  const profileSide = pickNewer(
    { value: local.profile, changedAt: local.profileChangedAt },
    { value: remoteProfile, changedAt: profileRemoteAt }
  );
  const profile = toCloudProfile(profileSide.value.name, profileSide.value);

  return {
    progress,
    settings,
    profile,
    settingsChangedAt: settingsSide.changedAt ?? null,
    profileChangedAt: profileSide.changedAt ?? null,
    row: {
      progress,
      settings: { ...settings, changedAt: settingsSide.changedAt ?? null },
      profile: { ...profile, changedAt: profileSide.changedAt ?? null },
    },
  };
}

// When settings and profile were last changed on this device, and the last sync.
export function loadSyncState(storage = globalThis.localStorage) {
  try {
    const data = JSON.parse(storage.getItem(SYNC_KEY) ?? "{}");
    const time = (value) => (typeof value === "string" ? value : null);
    return {
      settingsChangedAt: time(data.settingsChangedAt),
      profileChangedAt: time(data.profileChangedAt),
      lastSyncAt: time(data.lastSyncAt),
    };
  } catch (error) {
    return { settingsChangedAt: null, profileChangedAt: null, lastSyncAt: null };
  }
}

export function saveSyncState(changes, storage = globalThis.localStorage) {
  const state = { ...loadSyncState(storage), ...changes };
  try {
    storage.setItem(SYNC_KEY, JSON.stringify(state));
  } catch (error) {
    // Not saved: the next sync simply merges again.
  }
  return state;
}

// part: "settings" or "profile"
export function markChanged(part, now = new Date(), storage = globalThis.localStorage) {
  return saveSyncState({ [`${part}ChangedAt`]: now.toISOString() }, storage);
}
