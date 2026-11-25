import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { buildPose } from "./pose.js";
import { getExercise } from "./exercises.js";
import { createTracker } from "./tracker.js";
import { createGuide } from "./guide.js";
import { setVoiceOptions, speak } from "./voice.js";
import { createEmptyProgress, loadProgress, recordSet, saveProgress } from "./progress.js";
import { describeStreak, getStreak } from "./streak.js";
import { isLevelUnlocked } from "./path.js";
import { CAMERA_VIEWS, SKILLS, getSkill } from "./skills.js";
import { BODY_LIMITS, cleanName, initials, loadDetails, loadName, saveName, updateDetails } from "./profile.js";
import { currentLevel, getBadges, goalProgress } from "./badges.js";
import { getSkillColors, renderFigure } from "./figures.js";
import { DEFAULT_SETTINGS, guideStartsOn, loadSettings, updateSettings } from "./settings.js";
import { applyTheme, watchSystemTheme } from "./theme.js";
import { REST_CALLOUTS, REST_LIMITS, SETS_LIMITS, createWorkout, describeRest, formatClock, stepValue } from "./workout.js";
import { renderStats } from "./stats-view.js";
import { overview } from "./stats.js";
import { fillSkillSheet, renderLevelChips, renderRoad, renderSkillList } from "./views.js";

const $ = (selector) => document.querySelector(selector);

// Screens
const screens = {
  welcome: $("#welcome-screen"),
  home: $("#home-screen"),
  skills: $("#skills-screen"),
  stats: $("#stats-screen"),
  profile: $("#profile-screen"),
  settings: $("#settings-screen"),
  training: $("#training-screen"),
  results: $("#results-screen"),
};
const tabBar = $("#tab-bar");
const tabs = document.querySelectorAll(".tab");

// Welcome
const welcomeForm = $("#welcome-form");
const nameInput = $("#name-input");

// Home
const helloText = $("#hello-text");
const streakCount = $("#streak-count");
const streakText = $("#streak-text");
const road = $("#road");

// Skills
const skillSearch = $("#skill-search");
const levelFilter = $("#level-filter");
const skillList = $("#skill-list");

// Stats
const statsParts = {
  empty: $("#stats-empty"),
  content: $("#stats-content"),
  tiles: $("#stats-tiles"),
  weekly: $("#weekly-chart"),
  weeklyCaption: $("#weekly-caption"),
  calendar: $("#calendar"),
  calendarCaption: $("#calendar-caption"),
  skillSelect: $("#stats-skill"),
  skillChart: $("#skill-chart"),
  skillCaption: $("#skill-caption"),
  bests: $("#stats-bests"),
};
const statsState = { skillId: null };

// Profile
const profileParts = {
  avatarButton: $("#avatar-button"),
  avatarImg: $("#avatar-img"),
  avatarInitials: $("#avatar-initials"),
  avatarInput: $("#avatar-input"),
  removePhoto: $("#remove-photo"),
  name: $("#profile-display-name"),
  level: $("#profile-level"),
  tiles: $("#profile-tiles"),
  goalSelect: $("#goal-skill"),
  goalBox: $("#goal-box"),
  goalFigure: $("#goal-figure"),
  goalText: $("#goal-text"),
  goalFill: $("#goal-bar-fill"),
  goalNote: $("#goal-note"),
  badgeList: $("#badge-list"),
  badgeCount: $("#badge-count"),
  height: $("#body-height"),
  weight: $("#body-weight"),
  year: $("#body-year"),
};
const nameForm = $("#name-form");
const profileName = $("#profile-name");
const nameSaved = $("#name-saved");

// Settings
const openSettingsButton = $("#open-settings");
const closeSettingsButton = $("#close-settings");
const settingControls = document.querySelectorAll("#settings-screen [data-setting]");
const strictnessNote = $("#strictness-note");
const testVoiceButton = $("#test-voice");
const resetGuidesButton = $("#reset-guides");
const resetSafetyButton = $("#reset-safety");
const helpSaved = $("#help-saved");
const resetProgressButton = $("#reset-progress");

// Skill sheet
const sheet = $("#skill-sheet");
const sheetParts = {
  figure: $("#sheet-figure"),
  meta: $("#sheet-meta"),
  title: $("#sheet-title"),
  status: $("#sheet-status"),
  warning: $("#sheet-warning"),
  camera: $("#sheet-camera"),
  cue: $("#sheet-cue"),
  milestones: $("#sheet-milestones"),
  goal: $("#sheet-goal"),
  goalState: $("#sheet-goal-state"),
  empty: $("#sheet-empty"),
  progress: $("#sheet-progress"),
  bestLabel: $("#sheet-best-label"),
  best: $("#sheet-best"),
  bestScore: $("#sheet-best-score"),
  sets: $("#sheet-sets"),
  notes: $("#sheet-notes"),
  history: $("#sheet-history"),
};

// Training
const trainingTitle = $("#training-title");
const trainingIntro = $("#training-intro");
const closeTrainingButton = $("#close-training");
const skillCamera = $("#skill-camera");
const skillCue = $("#skill-cue");
const skillBeta = $("#skill-beta");
const workoutParts = {
  setsDown: $("#sets-down"),
  setsUp: $("#sets-up"),
  setsValue: $("#sets-value"),
  restDown: $("#rest-down"),
  restUp: $("#rest-up"),
  restValue: $("#rest-value"),
  reset: $("#workout-default"),
};
const guideOption = $("#guide-option");
const guideToggle = $("#guide-toggle");
const skipGuideButton = $("#skip-guide");
const startButton = $("#start-button");
const pauseButton = $("#pause-button");
const finishButton = $("#finish-button");
const message = $("#message");
const cameraBox = $("#camera-box");
const video = $("#camera");
const flipCameraButton = $("#flip-camera");
const countdownBox = $("#countdown");
// The flip button only shows when the phone has a front and a back camera.
let hasTwoCameras = false;
const canvas = $("#overlay");
const ctx = canvas.getContext("2d");
const statsBox = $("#stats");
const angleText = $("#angle");
const feedbackText = $("#feedback");
const repsText = $("#reps");
const setLabel = $("#set-label");

// Rest between sets
const restBox = $("#rest-box");
const restClock = $("#rest-clock");
const restNext = $("#rest-next");
const restLast = $("#rest-last");
const restAddButton = $("#rest-add");
const restSkipButton = $("#rest-skip");
const restEndButton = $("#rest-end");

// Results
const resultsTitle = $("#results-title");
const summaryScoreLabel = $("#summary-score-label");
const summarySetsCard = $("#summary-sets-card");
const summarySets = $("#summary-sets");
const summaryNotesTitle = $("#summary-notes-title");
const summarySkill = $("#summary-skill");
const summaryAmountLabel = $("#summary-amount-label");
const summaryReps = $("#summary-reps");
const summaryScore = $("#summary-score");
const summaryErrors = $("#summary-errors");
const summaryProgress = $("#summary-progress");
const summaryStreak = $("#summary-streak");
const newSetButton = $("#new-set-button");
const doneButton = $("#done-button");

// Dialogs
const safetyDialog = $("#safety-dialog");
const safetyLink = $("#safety-link");
const hintDialog = $("#hint-dialog");
const hintTitle = $("#hint-title");
const hintText = $("#hint-text");

const SAFETY_KEY = "safetyNoticeHidden";
const GUIDE_SEEN_KEY = "guideSeen"; // Skills whose guided setup the user has finished once
const HOLD_ANNOUNCE_EVERY = 5; // Say the hold time every 5 seconds.

let userName = loadName();
let settings = loadSettings();
setVoiceOptions(settings);
applyTheme(settings.appearance);
watchSystemTheme(() => applyTheme(settings.appearance));
let activeTab = "home";
let skillFilter = { level: null, query: "" };

let currentSkillId = "push-up";
let exercise = getExercise(currentSkillId);
let tracker = createTracker(exercise, { strictness: settings.strictness });

let poseLandmarker;
let stream = null;
let running = false;
let animationId = 0;
let trainingState = "intro"; // "intro", "running", "paused" or "rest"
let workout = null; // Sets of the running workout (see workout.js)
let rest = null; // { endsAt, lastCallout, timer } while resting
let wakeLock = null; // Keeps the screen on during a workout
let progressSaveFailed = false;
let lastState = null;
let lastPartialAt = 0;
let lastRejectedAt = 0;
let countdownToken = 0; // changes when a running countdown must stop
let lastAnnouncedHold = 0;
let guide = null; // Guided setup while it runs, otherwise null

// ---------- Guided setup: remember which skills were guided once ----------

function loadGuideSeen() {
  try {
    const list = JSON.parse(localStorage.getItem(GUIDE_SEEN_KEY) ?? "[]");
    return new Set(Array.isArray(list) ? list : []);
  } catch (error) {
    return new Set();
  }
}

function markGuideSeen(skillId) {
  const seen = loadGuideSeen();
  seen.add(skillId);
  try {
    localStorage.setItem(GUIDE_SEEN_KEY, JSON.stringify([...seen]));
  } catch (error) {
    // Not saved: the guide is simply switched on again next time.
  }
}

function endGuide() {
  if (guide) {
    markGuideSeen(currentSkillId);
  }
  guide = null;
  skipGuideButton.hidden = true;
  lastState = null; // So the first form cue is spoken
}

// ---------- Screens and tabs ----------

function showScreen(name) {
  for (const [key, section] of Object.entries(screens)) {
    section.hidden = key !== name;
  }
  tabBar.hidden = !["home", "skills", "stats", "profile", "settings"].includes(name);
  const activeName = name === "settings" ? "profile" : name;
  for (const tab of tabs) {
    tab.classList.toggle("is-active", tab.dataset.tab === activeName);
  }
  window.scrollTo(0, 0);
}

function renderHome() {
  const progress = loadProgress();
  const streak = getStreak(progress.practiceDays);
  helloText.textContent = userName ? `Hi, ${userName}!` : "Hi!";
  streakCount.textContent = String(streak.weeks);
  streakText.textContent = describeStreak(streak);
  return renderRoad(road, progress, openSkillSheet);
}

function renderSkills() {
  renderLevelChips(levelFilter, skillFilter.level, (level) => {
    skillFilter = { ...skillFilter, level };
    renderSkills();
  });
  renderSkillList(skillList, loadProgress(), skillFilter, openSkillSheet);
}

function showTab(tab) {
  activeTab = tab;
  if (tab === "home") {
    const currentStep = renderHome();
    showScreen("home");
    // Scroll the next skill into view, like opening a map at your position.
    currentStep?.scrollIntoView({ block: "center" });
  } else if (tab === "skills") {
    renderSkills();
    showScreen("skills");
  } else if (tab === "stats") {
    renderStats(statsParts, loadProgress(), statsState);
    showScreen("stats");
  } else {
    renderProfile();
    showScreen("profile");
  }
}

// ---------- Welcome ----------

function finishWelcome(event) {
  event.preventDefault();
  const name = cleanName(nameInput.value);
  if (!name) {
    nameInput.focus();
    return;
  }
  userName = name;
  saveName(name); // If saving fails, the name is kept until the app is closed.
  showTab("home");
}

// ---------- Profile ----------

const isKnownSkill = (id) => Boolean(getSkill(id));
let details = loadDetails(isKnownSkill);

function renderAvatar() {
  const { avatarImg, avatarInitials, removePhoto } = profileParts;
  avatarImg.hidden = !details.photo;
  if (details.photo) {
    avatarImg.src = details.photo;
  } else {
    avatarImg.removeAttribute("src");
  }
  avatarInitials.hidden = Boolean(details.photo);
  avatarInitials.textContent = initials(userName) || "?";
  removePhoto.hidden = !details.photo;
}

function renderGoal(progress) {
  const { goalSelect, goalBox, goalFigure, goalText, goalFill, goalNote } = profileParts;
  if (goalSelect.options.length === 0) {
    const none = new Option("Choose a skill you are working toward", "");
    goalSelect.append(none, ...SKILLS.map((skill) => new Option(`Level ${skill.level} · ${skill.name}`, skill.id)));
  }
  goalSelect.value = details.goalSkill;
  const goal = details.goalSkill ? goalProgress(progress, details.goalSkill) : null;
  goalBox.hidden = !goal;
  if (!goal) {
    return;
  }
  const colors = getSkillColors(goal.skill.id);
  goalFigure.innerHTML = renderFigure(goal.skill.id, goal.completed ? colors.done : colors.bright, "var(--surface)");
  goalFill.style.width = `${Math.round((goal.done / goal.total) * 100)}%`;
  goalFill.style.background = colors.bright;
  if (goal.completed) {
    goalText.textContent = `${goal.skill.name} completed!`;
    goalNote.textContent = "Pick your next goal.";
  } else {
    goalText.textContent = `${goal.done} of ${goal.total} skills on the way`;
    goalNote.textContent =
      goal.remaining === 1 ? "Only the goal skill itself is left." : `${goal.remaining} skills to go, including the goal.`;
  }
}

function renderBadges(progress) {
  const badges = getBadges(progress);
  const earned = badges.filter((badge) => badge.earned).length;
  profileParts.badgeCount.textContent = `${earned} of ${badges.length}`;
  profileParts.badgeList.replaceChildren(
    ...badges.map((badge) => {
      const item = document.createElement("li");
      item.className = `badge${badge.earned ? " is-earned" : ""}`;
      if (badge.level) {
        item.style.setProperty("--badge-color", getLevelColor(badge.level));
      }
      item.innerHTML = `<span class="badge-icon" aria-hidden="true"></span><span class="badge-name"></span><span class="badge-text"></span>`;
      item.querySelector(".badge-icon").textContent = badge.earned ? "★" : "☆";
      item.querySelector(".badge-name").textContent = badge.name;
      item.querySelector(".badge-text").textContent = badge.earned ? "Earned" : badge.text;
      return item;
    })
  );
}

function getLevelColor(level) {
  const skill = SKILLS.find((s) => s.level === level);
  return skill ? getSkillColors(skill.id).bright : "";
}

function renderProfile() {
  const progress = loadProgress();
  const level = currentLevel(progress);
  const numbers = overview(progress);
  const streak = getStreak(progress.practiceDays);

  renderAvatar();
  profileParts.name.textContent = userName;
  profileParts.level.textContent = level.completed ? "All levels completed" : `Level ${level.level} · ${level.name}`;
  profileParts.level.style.color = getLevelColor(level.level);

  const tiles = [
    ["Skills completed", numbers.skillsCompleted],
    ["Week streak", streak.weeks],
    ["Training days", numbers.trainingDays],
    ["Total reps", numbers.totalReps],
  ];
  profileParts.tiles.replaceChildren(
    ...tiles.map(([label, value]) => {
      const tile = document.createElement("div");
      tile.className = "stat-tile";
      tile.innerHTML = `<p class="stat-label"></p><p class="stat-value"></p>`;
      tile.querySelector(".stat-label").textContent = label;
      tile.querySelector(".stat-value").textContent = String(value);
      return tile;
    })
  );

  renderGoal(progress);
  renderBadges(progress);

  profileName.value = userName;
  profileParts.height.value = details.heightCm ?? "";
  profileParts.weight.value = details.weightKg ?? "";
  profileParts.year.value = details.birthYear ?? "";
  nameSaved.hidden = true;
}

function changeDetails(changes) {
  const result = updateDetails(changes, isKnownSkill);
  details = result.details;
  return result.saved;
}

// Makes a small square photo (160 px) so it fits into the device storage.
function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const size = 160;
      const side = Math.min(image.width, image.height);
      const photo = document.createElement("canvas");
      photo.width = size;
      photo.height = size;
      photo
        .getContext("2d")
        .drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(photo.toDataURL("image/jpeg", 0.8));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Not an image"));
    };
    image.src = url;
  });
}

async function changePhoto() {
  const file = profileParts.avatarInput.files?.[0];
  profileParts.avatarInput.value = "";
  if (!file) {
    return;
  }
  try {
    const photo = await resizePhoto(file);
    const saved = changeDetails({ photo });
    renderAvatar();
    if (!saved) {
      await confirmHint("Photo not saved", "There is not enough space on this device. The photo shows until you close the app.");
    }
  } catch (error) {
    await confirmHint("Could not use this photo", "Please pick a JPEG or PNG image.");
  }
}

// ---------- Settings ----------

const STRICTNESS_TEXT = {
  easy: "Reps count even if they are a little less deep. Good for getting started.",
  normal: "Reps need the full range. Form tips are given, but every full rep counts.",
  strict: "A rep only counts with good form, and hold time stops while your form breaks.",
};

function renderSettings() {
  for (const control of settingControls) {
    const value = settings[control.dataset.setting];
    if (control.type === "checkbox") {
      control.checked = value;
      continue;
    }
    for (const button of control.querySelectorAll("[data-value]")) {
      const active = button.dataset.value === String(value);
      button.classList.toggle("is-active", active);
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", String(active));
    }
  }
  strictnessNote.textContent = STRICTNESS_TEXT[settings.strictness];
  testVoiceButton.disabled = !settings.voice;
  helpSaved.hidden = true;
}

function changeSettings(changes) {
  settings = updateSettings(changes);
  setVoiceOptions(settings);
  applyTheme(settings.appearance);
  renderSettings();
}

// Turns a data-value string back into the type of the default setting.
function settingValue(key, text) {
  return typeof DEFAULT_SETTINGS[key] === "number" ? Number(text) : text;
}

function showSettings() {
  renderSettings();
  showScreen("settings");
}

function saveProfileName(event) {
  event.preventDefault();
  const name = cleanName(profileName.value);
  if (!name) {
    profileName.focus();
    return;
  }
  const bodyFields = [
    [profileParts.height, BODY_LIMITS.heightCm, "Height", "cm"],
    [profileParts.weight, BODY_LIMITS.weightKg, "Weight", "kg"],
    [profileParts.year, BODY_LIMITS.birthYear, "Birth year", ""],
  ];
  for (const [input, { min, max }, label, unit] of bodyFields) {
    const value = Number(input.value);
    if (input.value !== "" && !(value >= min && value <= max)) {
      nameSaved.textContent = `${label} must be between ${min} and ${max}${unit ? ` ${unit}` : ""}.`;
      nameSaved.hidden = false;
      input.focus();
      return;
    }
  }
  userName = name;
  saveName(name);
  const saved = changeDetails({
    heightCm: profileParts.height.value,
    weightKg: profileParts.weight.value,
    birthYear: profileParts.year.value,
  });
  renderProfile();
  nameSaved.textContent = saved ? "Saved." : "Could not save on this device.";
  nameSaved.hidden = false;
}

function forget(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    // Storage blocked: nothing was stored either.
  }
  helpSaved.hidden = false;
}

async function resetProgress() {
  const ok = await confirmHint(
    "Reset all progress?",
    "All sets, goals, completed skills and your streak will be deleted. This cannot be undone."
  );
  if (ok) {
    saveProgress(createEmptyProgress());
    showTab("home");
  }
}

// ---------- Browser storage for the safety notice ----------

function isSafetyHidden() {
  try {
    return localStorage.getItem(SAFETY_KEY) === "true";
  } catch (error) {
    return false;
  }
}

function hideSafetyForever() {
  try {
    localStorage.setItem(SAFETY_KEY, "true");
  } catch (error) {
    // Not saved, the notice will simply show again next time.
  }
}

// Shows the safety notice. Resolves to true if the user accepted it.
function showSafetyNotice() {
  return new Promise((resolve) => {
    safetyDialog.addEventListener(
      "close",
      () => {
        const choice = safetyDialog.returnValue;
        if (choice === "hide") {
          hideSafetyForever();
        }
        resolve(choice === "ok" || choice === "hide");
      },
      { once: true }
    );
    safetyDialog.returnValue = "";
    safetyDialog.showModal();
  });
}

// ---------- Hints (Continue / Cancel) ----------

// Only one hint can wait for an answer at a time. One shared "close"
// listener answers it, so an old dialog can never answer a newer one.
let resolveHint = null;
hintDialog.addEventListener("close", () => {
  const resolve = resolveHint;
  resolveHint = null;
  resolve?.(hintDialog.returnValue === "continue");
});

function confirmHint(title, text) {
  return new Promise((resolve) => {
    resolveHint?.(false);
    resolveHint = resolve;
    hintTitle.textContent = title;
    hintText.textContent = text;
    hintDialog.returnValue = "";
    hintDialog.showModal();
  });
}

// ---------- Skill sheet and skill choice ----------

let sheetSkill = null;

function openSkillSheet(skill, levelUnlocked, isCurrent = false) {
  sheetSkill = skill;
  fillSkillSheet(sheetParts, skill, levelUnlocked, isCurrent);
  sheet.returnValue = "";
  sheet.showModal();
}

sheet.addEventListener("close", () => {
  if (sheet.returnValue === "start" && sheetSkill) {
    chooseSkill(sheetSkill);
  }
});

// Tapping the dark area outside the sheet closes it.
sheet.addEventListener("click", (event) => {
  if (event.target === sheet) {
    sheet.close("cancel");
  }
});

// Free choice: any skill can be trained. Locked levels and
// coach-only skills show a safety hint first.
async function chooseSkill(skill) {
  if (skill.coachRequired) {
    const ok = await confirmHint(
      "Coach required",
      "This skill puts very high load on shoulders and elbows. Only train it with a qualified coach, proper equipment and assistance."
    );
    if (!ok) {
      return;
    }
  }

  if (!isLevelUnlocked(loadProgress(), skill.level)) {
    const ok = await confirmHint(
      "Not unlocked yet",
      `This skill is usually trained after level ${skill.level - 1}. Make sure you have the basics first.`
    );
    if (!ok) {
      return;
    }
  }

  openTraining(skill.id);
}

// ---------- Training ----------

function setTrainingState(state) {
  trainingState = state;
  trainingIntro.hidden = state !== "intro";
  cameraBox.hidden = state !== "running";
  flipCameraButton.hidden = state !== "running" || !hasTwoCameras;
  restBox.hidden = state !== "rest";
  statsBox.hidden = state === "intro" || state === "rest";
  pauseButton.hidden = state === "intro" || state === "rest";
  finishButton.hidden = state === "intro" || state === "rest";
  pauseButton.textContent = state === "paused" ? "Resume" : "Pause";
}

function resetSet() {
  tracker = createTracker(exercise, { strictness: settings.strictness });
  guide = null;
  skipGuideButton.hidden = true;
  lastState = null;
  lastPartialAt = 0;
  lastAnnouncedHold = 0;
  message.textContent = "";
  angleText.textContent = "";
  feedbackText.textContent = "";
  repsText.textContent = "";
}

function openTraining(skillId) {
  const skill = getSkill(skillId);
  currentSkillId = skillId;
  exercise = getExercise(skillId);
  trainingTitle.textContent = skill.name;
  skillCamera.textContent = CAMERA_VIEWS[skill.camera];
  skillCue.textContent = `“${skill.cue}”`;
  skillBeta.hidden = !skill.beta;
  // The guide is on by default until the user has finished it once for this skill.
  guideOption.hidden = !exercise.setup;
  guideToggle.checked = Boolean(exercise.setup) && guideStartsOn(settings.setupMode, loadGuideSeen().has(skillId));
  workout = null;
  renderWorkoutChoices();
  resetSet();
  setTrainingState("intro");
  showScreen("training");
}

// ---------- Sets and rest ----------

function renderWorkoutChoices() {
  const { sets, restSeconds } = settings;
  const parts = workoutParts;
  parts.setsValue.textContent = String(sets);
  parts.restValue.textContent = formatClock(restSeconds);
  parts.setsDown.disabled = sets <= SETS_LIMITS.min;
  parts.setsUp.disabled = sets >= SETS_LIMITS.max;
  parts.restDown.disabled = restSeconds <= REST_LIMITS.min;
  parts.restUp.disabled = restSeconds >= REST_LIMITS.max;
  const isDefault = sets === DEFAULT_SETTINGS.sets && restSeconds === DEFAULT_SETTINGS.restSeconds;
  parts.reset.hidden = isDefault;
  parts.reset.textContent = `Back to default (${DEFAULT_SETTINGS.sets} sets · ${formatClock(DEFAULT_SETTINGS.restSeconds)})`;
}

function changeWorkoutChoice(changes) {
  settings = updateSettings(changes);
  renderWorkoutChoices();
}

workoutParts.setsDown.addEventListener("click", () => changeWorkoutChoice({ sets: stepValue(settings.sets, -1, SETS_LIMITS) }));
workoutParts.setsUp.addEventListener("click", () => changeWorkoutChoice({ sets: stepValue(settings.sets, 1, SETS_LIMITS) }));
workoutParts.restDown.addEventListener("click", () =>
  changeWorkoutChoice({ restSeconds: stepValue(settings.restSeconds, -1, REST_LIMITS) })
);
workoutParts.restUp.addEventListener("click", () =>
  changeWorkoutChoice({ restSeconds: stepValue(settings.restSeconds, 1, REST_LIMITS) })
);
workoutParts.reset.addEventListener("click", () =>
  changeWorkoutChoice({ sets: DEFAULT_SETTINGS.sets, restSeconds: DEFAULT_SETTINGS.restSeconds })
);

function showSetLabel() {
  setLabel.textContent = workout && workout.sets > 1 ? `Set ${workout.currentSet} of ${workout.sets}` : "";
}

function describeAmount(result) {
  if (exercise.measure === "hold") {
    return `${result.seconds} s`;
  }
  return `${result.reps} ${result.reps === 1 ? "rep" : "reps"}`;
}

// The screen must stay on: the phone stands on the floor during the whole workout.
async function keepScreenOn() {
  try {
    wakeLock = (await navigator.wakeLock?.request("screen")) ?? null;
  } catch (error) {
    wakeLock = null; // Not supported or not allowed: the app still works.
  }
}

function allowScreenOff() {
  wakeLock?.release().catch(() => {});
  wakeLock = null;
}

function startRest(result) {
  const seconds = workout.restSeconds;
  rest = { endsAt: Date.now() + seconds * 1000, lastCallout: Infinity, timer: 0 };
  restNext.textContent = `Next: set ${workout.currentSet} of ${workout.sets}`;
  restLast.textContent = `Set ${workout.finishedSets}: ${describeAmount(result)} · ${result.score}% form`;
  setTrainingState("rest");
  speak(`Set ${workout.finishedSets} done. ${describeAmount(result).replace(" s", " seconds")}. Rest ${describeRest(seconds)}.`, {
    priority: true,
  });
  tickRest();
  rest.timer = setInterval(tickRest, 250);
}

function stopRest() {
  if (rest) {
    clearInterval(rest.timer);
  }
  rest = null;
}

function tickRest() {
  if (!rest) {
    return;
  }
  const remaining = (rest.endsAt - Date.now()) / 1000;
  restClock.textContent = formatClock(remaining);

  if (remaining <= 0) {
    stopRest();
    buzz([200, 100, 200]);
    startNextSet();
    return;
  }

  // Say only the closest callout that was just reached (30, 10, 3, 2, 1).
  const reached = REST_CALLOUTS.filter((at) => remaining <= at && at < rest.lastCallout);
  if (reached.length > 0) {
    const at = Math.min(...reached);
    rest.lastCallout = at;
    speak(at >= 10 ? `${at} seconds.` : String(at), { priority: true });
  }
}

// ---------- Countdown and vibration ----------

function buzz(pattern) {
  if (settings.vibration) {
    navigator.vibrate?.(pattern); // Android browsers only; the store app will use the phone's haptics.
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Counts down before a set so there is time to get into position.
// Returns false when the training was paused or closed during the countdown.
async function runCountdown() {
  const seconds = settings.countdown;
  if (seconds === 0) {
    return true;
  }
  const token = ++countdownToken;
  countdownBox.hidden = false;
  for (let left = seconds; left > 0; left -= 1) {
    countdownBox.textContent = String(left);
    speak(String(left), { priority: true });
    buzz(40);
    await wait(1000);
    if (token !== countdownToken || trainingState !== "running") {
      return false;
    }
  }
  countdownBox.hidden = true;
  speak("Go!", { priority: true });
  buzz([80, 60, 80]);
  return true;
}

function cancelCountdown() {
  countdownToken += 1;
  countdownBox.hidden = true;
}

async function startNextSet() {
  resetSet();
  showSetLabel();
  const cameraStarted = await startCamera();
  if (!cameraStarted) {
    setTrainingState("paused");
    return;
  }
  setTrainingState("running");
  speak(`Set ${workout.currentSet}. Get into position.`, { priority: true });
  startAnalysis();
}

async function loadPoseModel() {
  const vision = await FilesetResolver.forVisionTasks(
    `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${__MEDIAPIPE_VERSION__}/wasm`
  );

  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
    },
    runningMode: "VIDEO",
    numPoses: 1,
  });
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: settings.camera },
      audio: false,
    });
    video.srcObject = stream;
    cameraBox.classList.toggle("is-mirrored", settings.camera === "user" && settings.mirror);
    // Device lists are only complete after camera access was allowed.
    checkCameras();
    return true;
  } catch (error) {
    message.textContent = "Could not access the camera. Please allow camera access.";
    return false;
  }
}

async function checkCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    hasTwoCameras = devices.filter((device) => device.kind === "videoinput").length > 1;
  } catch (error) {
    hasTwoCameras = false;
  }
  flipCameraButton.hidden = trainingState !== "running" || !hasTwoCameras;
}

// Switches between front and back camera while filming. The set keeps running.
async function flipCamera() {
  const previous = settings.camera;
  flipCameraButton.disabled = true;
  stopCamera();
  settings = updateSettings({ camera: previous === "user" ? "environment" : "user" });
  let started = await startCamera();
  if (!started) {
    // The other camera did not start: go back to the one that worked.
    settings = updateSettings({ camera: previous });
    started = await startCamera();
  }
  if (started) {
    message.textContent = "";
  }
  flipCameraButton.disabled = false;
}

flipCameraButton.addEventListener("click", flipCamera);

// Turns the camera fully off (the camera light goes out).
function stopCamera() {
  if (stream) {
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }
  stream = null;
  video.srcObject = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function startAnalysis() {
  running = true;
  animationId = requestAnimationFrame(detectPose);
}

function stopAnalysis() {
  running = false;
  cancelAnimationFrame(animationId);
}

function stopEverything() {
  cancelCountdown();
  stopAnalysis();
  stopCamera();
  window.speechSynthesis.cancel();
}

// Shows and speaks feedback. Speaks only when the state changes.
function giveFeedback(state, text, spokenText) {
  feedbackText.textContent = text;
  // "Counts only": form tips are shown but not spoken. Position prompts are still spoken.
  const isFormTip = !state.startsWith("position:") && state !== "not_visible";
  if (settings.coachTalk === "counts" && isFormTip) {
    lastState = state;
    return;
  }
  if (state !== lastState) {
    const spoken = speak(spokenText);
    if (spoken) {
      lastState = state;
    }
  }
}

function drawSkeleton(landmarks) {
  // Draw the bones (lines between joints)
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  for (const connection of PoseLandmarker.POSE_CONNECTIONS) {
    const from = landmarks[connection.start];
    const to = landmarks[connection.end];
    ctx.beginPath();
    ctx.moveTo(from.x * canvas.width, from.y * canvas.height);
    ctx.lineTo(to.x * canvas.width, to.y * canvas.height);
    ctx.stroke();
  }

  // Draw the joints (dots)
  ctx.fillStyle = "#c6f432";
  for (const point of landmarks) {
    ctx.beginPath();
    ctx.arc(point.x * canvas.width, point.y * canvas.height, 5, 0, 2 * Math.PI);
    ctx.fill();
  }
}

// Shows reps or hold time and speaks counts.
function showProgress(result) {
  if (exercise.measure === "hold") {
    const seconds = result.holdSeconds;
    if (seconds > 0 && seconds % HOLD_ANNOUNCE_EVERY === 0 && seconds !== lastAnnouncedHold) {
      lastAnnouncedHold = seconds;
      speak(`${seconds} seconds`, { priority: true });
    }
    if (seconds === 0) {
      lastAnnouncedHold = 0;
    }
    repsText.textContent = `${seconds} s · best ${result.bestHoldSeconds} s`;
    return;
  }

  if (result.event === "rep") {
    speak(String(result.reps), { priority: true });
  } else if (result.event === "partial") {
    lastPartialAt = Date.now();
    if (settings.coachTalk === "full") {
      speak(exercise.rep.partialCue ?? "Use the full range.", { priority: true });
    }
  } else if (result.event === "rejected") {
    lastRejectedAt = Date.now();
    speak(settings.coachTalk === "full" ? "Not counted. Keep your form clean." : "Not counted.", { priority: true });
  }
  const depthHint =
    Date.now() - lastPartialAt < 3000 ? " · full range!" : Date.now() - lastRejectedAt < 3000 ? " · not counted (form)" : "";
  repsText.textContent = `${result.reps} ${result.reps === 1 ? "rep" : "reps"}${depthHint}`;
}

function runGuide(pose) {
  const step = guide.update(pose, performance.now());
  feedbackText.textContent = step.text;
  repsText.textContent = step.done ? "" : `Step ${step.step} of ${guide.total}`;
  if (step.isNew) {
    speak(step.spoken, { priority: true });
  }
  if (step.done) {
    endGuide();
  }
}

function detectPose() {
  if (!running) {
    return;
  }

  if (video.videoWidth > 0) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const result = poseLandmarker.detectForVideo(video, performance.now());
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Nobody in view yet: the guide still speaks its first step.
    if (guide && result.landmarks.length === 0) {
      runGuide({ visible: false });
    }

    for (const landmarks of result.landmarks) {
      if (settings.skeleton) {
        drawSkeleton(landmarks);
      }

      const pose = buildPose(landmarks, canvas.width, canvas.height);
      angleText.textContent = `Tracking ${pose.side.name} side · elbow ${Math.round(pose.m.elbow)}°`;

      // Guided setup first: one instruction at a time until the user is in position.
      if (guide) {
        runGuide(pose);
        continue;
      }

      const frame = tracker.update(pose, performance.now());
      giveFeedback(frame.state, frame.text, frame.spoken);
      if (frame.inPosition) {
        showProgress(frame);
      }
    }
  }
  animationId = requestAnimationFrame(detectPose);
}

async function startTraining() {
  // Show the safety notice first, unless the user chose to hide it
  if (!isSafetyHidden()) {
    const accepted = await showSafetyNotice();
    if (!accepted) {
      return;
    }
  }

  const cameraStarted = await startCamera();
  if (!cameraStarted) {
    return;
  }
  workout = createWorkout({ sets: settings.sets, restSeconds: settings.restSeconds });
  progressSaveFailed = false;
  keepScreenOn();
  showSetLabel();
  setTrainingState("running");

  if (guideToggle.checked && exercise.setup) {
    guide = createGuide(exercise.setup);
    skipGuideButton.hidden = false;
  }

  try {
    if (!poseLandmarker) {
      message.textContent = "Loading your coach...";
      await loadPoseModel();
    }
    message.textContent = "";
    if (await runCountdown()) {
      startAnalysis();
    }
  } catch (error) {
    console.error(error);
    stopCamera();
    setTrainingState("intro");
    message.textContent = "Could not load the pose model.";
  }
}

// Pausing turns the camera off. The reps and statistics of the set are kept.
function pauseTraining() {
  stopEverything();
  message.textContent = "Paused. Tap Resume when you are ready.";
  setTrainingState("paused");
}

async function resumeTraining() {
  const cameraStarted = await startCamera();
  if (!cameraStarted) {
    return;
  }
  message.textContent = "";
  lastState = null;
  setTrainingState("running");
  if (await runCountdown()) {
    startAnalysis();
  }
}

// Leaving the training without "Finish set" does not save the set.
async function closeTraining() {
  const savedSets = workout?.finishedSets ?? 0;
  const setRunning = trainingState !== "intro" && trainingState !== "rest" && tracker.hasData();
  if (setRunning || savedSets > 0) {
    const parts = [];
    if (setRunning) parts.push("This set will not be saved.");
    if (savedSets > 0) parts.push(`Your ${savedSets} finished ${savedSets === 1 ? "set is" : "sets are"} saved.`);
    const leave = await confirmHint("Leave workout?", parts.join(" "));
    if (!leave) {
      return;
    }
  }
  stopRest();
  stopEverything();
  allowScreenOff();
  workout = null;
  showTab(activeTab);
}

// Ends the set: stops the camera, saves the set, then rests or shows the results.
function finishSet() {
  stopEverything();

  if (!tracker.hasData()) {
    if (workout && workout.finishedSets > 0) {
      showWorkoutResults(); // Ended early: show the sets that were done.
    } else {
      showEmptyResults();
    }
    return;
  }

  const result = tracker.summary();
  const update = recordSet(loadProgress(), currentSkillId, result);
  if (!saveProgress(update.progress)) {
    progressSaveFailed = true;
  }
  workout.addSet(result, update);

  if (workout.isFinished()) {
    showWorkoutResults();
  } else {
    startRest(result);
  }
}

function fillResultsHeader(title) {
  resultsTitle.textContent = title;
  summarySkill.textContent = getSkill(currentSkillId).name;
  summaryErrors.replaceChildren();
  summarySets.replaceChildren();
  summaryProgress.textContent = "";
  summaryStreak.textContent = describeStreak(getStreak(loadProgress().practiceDays));
}

function addListItem(list, text) {
  const item = document.createElement("li");
  item.textContent = text;
  list.appendChild(item);
}

function showEmptyResults() {
  allowScreenOff();
  fillResultsHeader("Set finished");
  summaryAmountLabel.textContent = exercise.measure === "hold" ? "Best hold" : "Reps";
  summaryScoreLabel.textContent = "Form score";
  summaryReps.textContent = "–";
  summaryScore.textContent = "–";
  summarySetsCard.hidden = true;
  summaryNotesTitle.textContent = "Form notes";
  addListItem(summaryErrors, "No set recorded. Get into the starting position first, then finish your set.");
  workout = null;
  showScreen("results");
}

const NEWS_TEXT = {
  completed: "Skill completed! Well done.",
  goal: "Goal reached! Reach it again on another day to complete this skill.",
  practice: "Practice counted for this week.",
};

function showWorkoutResults() {
  stopRest();
  allowScreenOff();
  const summary = workout.summary();
  const isHold = exercise.measure === "hold";
  const many = summary.sets.length > 1;

  fillResultsHeader(many ? "Workout finished" : "Set finished");
  summaryAmountLabel.textContent = isHold ? "Best hold" : many ? "Total reps" : "Reps";
  summaryReps.textContent = isHold ? `${summary.bestSeconds} s` : String(summary.totalReps);
  summaryScoreLabel.textContent = many ? "Avg. form" : "Form score";
  summaryScore.textContent = `${summary.averageScore}%`;

  summarySetsCard.hidden = !many;
  summary.sets.forEach((set, index) => {
    const item = document.createElement("li");
    item.className = "set-item";
    const name = document.createElement("span");
    name.className = "set-name";
    name.textContent = `Set ${index + 1}`;
    const value = document.createElement("span");
    value.className = "set-value";
    value.textContent = `${describeAmount(set)} · ${set.score}%`;
    item.append(name, value);
    summarySets.appendChild(item);
  });

  summaryNotesTitle.textContent = many ? "Form notes (last set)" : "Form notes";
  const notes = summary.errors.length === 0 ? ["No form issues found. Nice work!"] : summary.errors;
  for (const note of notes) {
    addListItem(summaryErrors, note);
  }

  summaryProgress.textContent = NEWS_TEXT[summary.news] ?? "";
  if (progressSaveFailed) {
    summaryProgress.textContent += " (Progress could not be saved in this browser.)";
  }

  showScreen("results");
  const amount = isHold
    ? `Best hold ${summary.bestSeconds} seconds.`
    : `${summary.totalReps} ${many ? "reps in total" : "reps"}.`;
  const completedText = summary.news === "completed" ? " Skill completed. Well done." : "";
  speak(
    `${many ? "Workout" : "Set"} finished. ${amount} ${many ? "Average form" : "Form score"} ${summary.averageScore} percent.${completedText}`,
    { priority: true }
  );
  workout = null;
}

// ---------- Events ----------

welcomeForm.addEventListener("submit", finishWelcome);
for (const tab of tabs) {
  tab.addEventListener("click", () => showTab(tab.dataset.tab));
}
skillSearch.addEventListener("input", () => {
  skillFilter = { ...skillFilter, query: skillSearch.value };
  renderSkillList(skillList, loadProgress(), skillFilter, openSkillSheet);
});
safetyLink.addEventListener("click", showSafetyNotice);
startButton.addEventListener("click", startTraining);
closeTrainingButton.addEventListener("click", closeTraining);
pauseButton.addEventListener("click", () => {
  if (trainingState === "paused") {
    resumeTraining();
  } else {
    pauseTraining();
  }
});
finishButton.addEventListener("click", finishSet);
skipGuideButton.addEventListener("click", () => {
  window.speechSynthesis.cancel();
  endGuide();
  feedbackText.textContent = "";
  repsText.textContent = "";
});
newSetButton.addEventListener("click", () => openTraining(currentSkillId));
restAddButton.addEventListener("click", () => {
  if (rest) {
    rest.endsAt += 30000;
    rest.lastCallout = Infinity;
    tickRest();
  }
});
restSkipButton.addEventListener("click", () => {
  if (rest) {
    rest.endsAt = Date.now();
    tickRest();
  }
});
restEndButton.addEventListener("click", showWorkoutResults);
// The browser drops the wake lock when the app is in the background.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && workout && (!wakeLock || wakeLock.released)) {
    keepScreenOn();
  }
});
doneButton.addEventListener("click", () => {
  window.speechSynthesis.cancel();
  showTab(activeTab);
});

nameForm.addEventListener("submit", saveProfileName);
profileParts.avatarButton.addEventListener("click", () => profileParts.avatarInput.click());
profileParts.avatarInput.addEventListener("change", changePhoto);
profileParts.removePhoto.addEventListener("click", () => {
  changeDetails({ photo: "" });
  renderAvatar();
});
profileParts.goalSelect.addEventListener("change", () => {
  changeDetails({ goalSkill: profileParts.goalSelect.value });
  renderGoal(loadProgress());
});
openSettingsButton.addEventListener("click", showSettings);
closeSettingsButton.addEventListener("click", () => showTab("profile"));
for (const control of settingControls) {
  const key = control.dataset.setting;
  if (control.type === "checkbox") {
    control.addEventListener("change", () => changeSettings({ [key]: control.checked }));
  } else {
    control.addEventListener("click", (event) => {
      const button = event.target.closest("[data-value]");
      if (button) {
        changeSettings({ [key]: settingValue(key, button.dataset.value) });
      }
    });
  }
}
testVoiceButton.addEventListener("click", () => {
  speak(userName ? `Hi ${userName}. Ready when you are.` : "Ready when you are.", { priority: true });
});
resetGuidesButton.addEventListener("click", () => forget(GUIDE_SEEN_KEY));
resetSafetyButton.addEventListener("click", () => forget(SAFETY_KEY));
resetProgressButton.addEventListener("click", resetProgress);

// ---------- Start ----------

// Offline support and model cache for the installed app (see public/sw.js).
// Not in development, so the dev server always shows fresh files.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
    console.warn("Service worker not registered:", error);
  });
}

if (userName) {
  showTab("home");
} else {
  showScreen("welcome");
}
