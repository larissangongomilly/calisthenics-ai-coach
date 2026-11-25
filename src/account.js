// The "Account" part of the profile: sign in with an email code, sync,
// sign out and delete the account. Hidden when accounts are not set up.
import { deleteAccount, getUser, isCloudConfigured, onAuthChange, sendCode, signOut, syncNow, verifyCode } from "./cloud.js";
import { loadSyncState } from "./sync.js";

const $ = (selector) => document.querySelector(selector);

const parts = {
  section: $("#account-section"),
  emailForm: $("#account-email-form"),
  email: $("#account-email"),
  codeForm: $("#account-code-form"),
  code: $("#account-code"),
  otherEmail: $("#account-other-email"),
  signedIn: $("#account-signed-in"),
  user: $("#account-user"),
  lastSync: $("#account-last-sync"),
  sync: $("#account-sync"),
  signOut: $("#account-sign-out"),
  delete: $("#account-delete"),
  status: $("#account-status"),
};

let user = null;
let syncing = null;
let options = null;

function showStatus(text) {
  parts.status.textContent = text;
  parts.status.hidden = !text;
}

// Short, friendly messages instead of technical errors.
function explain(error) {
  if (!navigator.onLine || /fetch|network/i.test(String(error?.message))) {
    return "No connection. Your data is saved on this device and syncs later.";
  }
  if (/expired|invalid|token/i.test(String(error?.message))) {
    return "That code did not work. Check it or ask for a new one.";
  }
  if (/rate|too many|seconds/i.test(String(error?.message))) {
    return "Please wait a moment before asking for a new code.";
  }
  return "Something went wrong. Please try again.";
}

function formatSyncTime(iso) {
  if (!iso) return "Not synced yet.";
  const time = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  return `Last synced: ${time}`;
}

function render() {
  const signedIn = Boolean(user);
  parts.signedIn.hidden = !signedIn;
  parts.emailForm.hidden = signedIn || !parts.codeForm.hidden;
  if (signedIn) {
    parts.codeForm.hidden = true;
    parts.user.textContent = user.email ?? "";
    parts.lastSync.textContent = formatSyncTime(loadSyncState().lastSyncAt);
  }
}

function setBusy(busy) {
  for (const button of parts.section.querySelectorAll("button")) {
    button.disabled = busy;
  }
}

// Syncs now. quiet: no message (used after each set and at start).
export async function requestSync({ quiet = true } = {}) {
  if (!user || !options) return;
  syncing ??= syncNow(options.readLocal, options.writeLocal)
    .then(() => {
      if (!quiet) showStatus("Synced.");
      render();
    })
    .catch((error) => {
      if (!quiet) showStatus(explain(error));
    })
    .finally(() => {
      syncing = null;
    });
  return syncing;
}

async function submitEmail(event) {
  event.preventDefault();
  const email = parts.email.value.trim();
  if (!email) return;
  setBusy(true);
  try {
    await sendCode(email);
    parts.emailForm.hidden = true;
    parts.codeForm.hidden = false;
    parts.code.value = "";
    parts.code.focus();
    showStatus(`We sent a code to ${email}. It can take a minute. Check your spam folder too.`);
  } catch (error) {
    showStatus(explain(error));
  } finally {
    setBusy(false);
  }
}

async function submitCode(event) {
  event.preventDefault();
  const code = parts.code.value.replace(/\s/g, "");
  if (!code) return;
  setBusy(true);
  try {
    user = await verifyCode(parts.email.value.trim(), code);
    parts.codeForm.hidden = true;
    render();
    showStatus("Signed in. Syncing your data…");
    await requestSync({ quiet: false });
  } catch (error) {
    showStatus(explain(error));
  } finally {
    setBusy(false);
  }
}

function useOtherEmail() {
  parts.codeForm.hidden = true;
  parts.emailForm.hidden = false;
  showStatus("");
  parts.email.focus();
}

async function doSignOut() {
  setBusy(true);
  try {
    await requestSync();
    await signOut();
    user = null;
    render();
    showStatus("Signed out. Your data stays on this device.");
  } catch (error) {
    showStatus(explain(error));
  } finally {
    setBusy(false);
  }
}

async function doDelete() {
  const ok = await options.confirm(
    "Delete your account?",
    "Your account and all data in it are deleted for good. This cannot be undone. The data on this device stays; use Reset all progress in the settings to remove it too."
  );
  if (!ok) return;
  setBusy(true);
  try {
    await deleteAccount();
    user = null;
    render();
    showStatus("Your account was deleted.");
  } catch (error) {
    showStatus(explain(error));
  } finally {
    setBusy(false);
  }
}

// readLocal(), writeLocal(merged): see syncNow in cloud.js.
// confirm(title, text): asks the user, resolves to true or false.
export async function initAccount(setup) {
  if (!isCloudConfigured()) return;
  options = setup;
  parts.section.hidden = false;
  parts.emailForm.addEventListener("submit", submitEmail);
  parts.codeForm.addEventListener("submit", submitCode);
  parts.otherEmail.addEventListener("click", useOtherEmail);
  parts.sync.addEventListener("click", () => requestSync({ quiet: false }));
  parts.signOut.addEventListener("click", doSignOut);
  parts.delete.addEventListener("click", doDelete);
  window.addEventListener("online", () => requestSync());

  try {
    user = await getUser();
  } catch (error) {
    user = null;
  }
  render();
  await onAuthChange((next) => {
    user = next;
    render();
  });
  requestSync();
}

export function isSignedIn() {
  return Boolean(user);
}
