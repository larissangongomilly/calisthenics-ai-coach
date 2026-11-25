// The user's account (Supabase, EU region). Optional: without the two
// environment variables, or without signing in, the app works fully offline.
//
// Sign-in: the user enters an email address and gets a 6-digit code
// (no password). Sign in with Apple and Google come with the native app.
import { mergeAll } from "./sync.js";

const URL = import.meta.env?.VITE_SUPABASE_URL ?? "";
const ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY ?? "";
const TABLE = "user_data";

let clientPromise = null;

export function isCloudConfigured() {
  return Boolean(URL && ANON_KEY);
}

// The library is only loaded when an account is used.
function getClient() {
  if (!isCloudConfigured()) {
    return Promise.reject(new Error("Accounts are not set up."));
  }
  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) => createClient(URL, ANON_KEY));
  return clientPromise;
}

export async function getUser() {
  if (!isCloudConfigured()) return null;
  const client = await getClient();
  const { data } = await client.auth.getSession();
  return data.session?.user ?? null;
}

// Calls back with the user (or null) whenever someone signs in or out.
export async function onAuthChange(callback) {
  if (!isCloudConfigured()) return;
  const client = await getClient();
  client.auth.onAuthStateChange((event, session) => callback(session?.user ?? null, event));
}

export async function sendCode(email) {
  const client = await getClient();
  const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyCode(email, code) {
  const client = await getClient();
  const { data, error } = await client.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  const client = await getClient();
  await client.auth.signOut({ scope: "local" });
}

// Deletes the account and all its data in the cloud. Data on this device stays.
export async function deleteAccount() {
  const client = await getClient();
  const { error } = await client.rpc("delete_account");
  if (error) throw error;
  await client.auth.signOut({ scope: "local" });
}

// Merges this device with the account and saves the result on both sides.
// readLocal() returns the local data (see mergeAll in sync.js),
// writeLocal(merged) saves the merged data on this device.
export async function syncNow(readLocal, writeLocal) {
  const client = await getClient();
  const user = await getUser();
  if (!user) return null;

  const { data: remote, error: readError } = await client
    .from(TABLE)
    .select("progress, settings, profile")
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) throw readError;

  const merged = mergeAll(readLocal(), remote);
  const { error: writeError } = await client
    .from(TABLE)
    .upsert({ user_id: user.id, ...merged.row, updated_at: new Date().toISOString() });
  if (writeError) throw writeError;

  writeLocal(merged);
  return merged;
}

// After "Reset all progress": the account starts from zero too.
export async function resetCloudProgress() {
  const client = await getClient();
  const user = await getUser();
  if (!user) return;
  const { error } = await client.from(TABLE).update({ progress: {}, updated_at: new Date().toISOString() }).eq("user_id", user.id);
  if (error) throw error;
}
