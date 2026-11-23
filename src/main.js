import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { buildPose } from "./pose.js";
import { getExercise } from "./exercises.js";
import { createTracker } from "./tracker.js";
import { createGuide } from "./guide.js";
import { speak } from "./voice.js";
import { loadProgress, recordSet, saveProgress } from "./progress.js";
import { describeStreak, getStreak } from "./streak.js";
import { isLevelUnlocked } from "./path.js";
import { CAMERA_VIEWS, getSkill } from "./skills.js";
import { loadName, saveName, cleanName } from "./profile.js";
import { fillSkillSheet, renderLevelChips, renderRoad, renderSkillList } from "./views.js";

const $ = (selector) => document.querySelector(selector);

// Screens
const screens = {
  welcome: $("#welcome-screen"),
  home: $("#home-screen"),
  skills: $("#skills-screen"),
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
const guideOption = $("#guide-option");
const guideToggle = $("#guide-toggle");
const skipGuideButton = $("#skip-guide");
const startButton = $("#start-button");
const pauseButton = $("#pause-button");
const finishButton = $("#finish-button");
const message = $("#message");
const cameraBox = $("#camera-box");
const video = $("#camera");
const canvas = $("#overlay");
const ctx = canvas.getContext("2d");
const statsBox = $("#stats");
const angleText = $("#angle");
const feedbackText = $("#feedback");
const repsText = $("#reps");

// Results
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
let activeTab = "home";
let skillFilter = { level: null, query: "" };

let currentSkillId = "push-up";
let exercise = getExercise(currentSkillId);
let tracker = createTracker(exercise);

let poseLandmarker;
let stream = null;
let running = false;
let animationId = 0;
let trainingState = "intro"; // "intro", "running" or "paused"
let lastState = null;
let lastPartialAt = 0;
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
  tabBar.hidden = name !== "home" && name !== "skills";
  for (const tab of tabs) {
    tab.classList.toggle("is-active", tab.dataset.tab === name);
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
  } else {
    renderSkills();
    showScreen("skills");
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
  statsBox.hidden = state === "intro";
  pauseButton.hidden = state === "intro";
  finishButton.hidden = state === "intro";
  pauseButton.textContent = state === "paused" ? "Resume" : "Pause";
}

function resetSet() {
  tracker = createTracker(exercise);
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
  guideToggle.checked = Boolean(exercise.setup) && !loadGuideSeen().has(skillId);
  resetSet();
  setTrainingState("intro");
  showScreen("training");
}

async function loadPoseModel() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
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
      video: { facingMode: "user" },
      audio: false,
    });
    video.srcObject = stream;
    return true;
  } catch (error) {
    message.textContent = "Could not access the camera. Please allow camera access.";
    return false;
  }
}

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
  stopAnalysis();
  stopCamera();
  window.speechSynthesis.cancel();
}

// Shows and speaks feedback. Speaks only when the state changes.
function giveFeedback(state, text, spokenText) {
  feedbackText.textContent = text;
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
    speak(exercise.rep.partialCue ?? "Use the full range.", { priority: true });
  }
  const depthHint = Date.now() - lastPartialAt < 3000 ? " · full range!" : "";
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
      drawSkeleton(landmarks);

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
    startAnalysis();
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
  startAnalysis();
}

// Leaving the training without "Finish set" does not save the set.
async function closeTraining() {
  if (trainingState !== "intro" && tracker.hasData()) {
    const leave = await confirmHint("Leave training?", "This set will not be saved.");
    if (!leave) {
      return;
    }
  }
  stopEverything();
  showTab(activeTab);
}

// Ends the set: stops everything, turns the camera off, shows the results.
function finishSet() {
  stopEverything();
  summaryErrors.replaceChildren();
  summaryProgress.textContent = "";
  summarySkill.textContent = getSkill(currentSkillId).name;
  summaryStreak.textContent = describeStreak(getStreak(loadProgress().practiceDays));

  const isHold = exercise.measure === "hold";
  summaryAmountLabel.textContent = isHold ? "Best hold" : "Reps";

  if (!tracker.hasData()) {
    summaryReps.textContent = "–";
    summaryScore.textContent = "–";
    const item = document.createElement("li");
    item.textContent = "No set recorded. Get into the starting position first, then finish your set.";
    summaryErrors.appendChild(item);
    showScreen("results");
    return;
  }

  const result = tracker.summary();
  summaryReps.textContent = isHold ? `${result.seconds} s` : String(result.reps);
  summaryScore.textContent = `${result.score}%`;

  const notes = result.errors.length === 0 ? ["No form issues found. Nice work!"] : result.errors;
  for (const note of notes) {
    const item = document.createElement("li");
    item.textContent = note;
    summaryErrors.appendChild(item);
  }

  // Save the set to the user's progress
  const update = recordSet(loadProgress(), currentSkillId, result);
  const saved = saveProgress(update.progress);
  if (update.newlyCompleted) {
    summaryProgress.textContent = "Skill completed! Well done.";
  } else if (update.goalReached) {
    summaryProgress.textContent =
      "Goal reached! Reach it again on another day to complete this skill.";
  } else if (update.isPractice) {
    summaryProgress.textContent = "Practice counted for this week.";
  }
  if (!saved) {
    summaryProgress.textContent += " (Progress could not be saved in this browser.)";
  }
  summaryStreak.textContent = describeStreak(getStreak(update.progress.practiceDays));

  showScreen("results");
  const amount = isHold ? `Best hold ${result.seconds} seconds.` : `${result.reps} reps.`;
  const completedText = update.newlyCompleted ? " Skill completed. Well done." : "";
  speak(`Set finished. ${amount} Form score ${result.score} percent.${completedText}`, {
    priority: true,
  });
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
doneButton.addEventListener("click", () => {
  window.speechSynthesis.cancel();
  showTab(activeTab);
});

// ---------- Start ----------

if (userName) {
  showTab("home");
} else {
  showScreen("welcome");
}
