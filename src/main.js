import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { buildPose } from "./pose.js";
import { getExercise } from "./exercises.js";
import { createTracker } from "./tracker.js";
import { speak } from "./voice.js";
import { loadProgress, recordSet, saveProgress } from "./progress.js";
import { describeStreak, getStreak } from "./streak.js";
import { renderSkillPath } from "./path-screen.js";
import { isLevelUnlocked } from "./path.js";
import { CAMERA_VIEWS, getSkill } from "./skills.js";

const trainingScreen = document.querySelector("#training-screen");
const resultsScreen = document.querySelector("#results-screen");
const pathScreen = document.querySelector("#path-screen");
const pathButton = document.querySelector("#path-button");
const resultsPathButton = document.querySelector("#results-path-button");
const pathBackButton = document.querySelector("#path-back-button");
const pathLevels = document.querySelector("#path-levels");
const pathStreak = document.querySelector("#path-streak");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const finishButton = document.querySelector("#finish-button");
const newSetButton = document.querySelector("#new-set-button");
const message = document.querySelector("#message");
const cameraBox = document.querySelector("#camera-box");
const video = document.querySelector("#camera");
const canvas = document.querySelector("#overlay");
const ctx = canvas.getContext("2d");
const statsBox = document.querySelector("#stats");
const angleText = document.querySelector("#angle");
const feedbackText = document.querySelector("#feedback");
const repsText = document.querySelector("#reps");
const safetyDialog = document.querySelector("#safety-dialog");
const safetyLink = document.querySelector("#safety-link");
const summaryReps = document.querySelector("#summary-reps");
const summaryScore = document.querySelector("#summary-score");
const summaryErrors = document.querySelector("#summary-errors");
const summaryProgress = document.querySelector("#summary-progress");
const summaryStreak = document.querySelector("#summary-streak");
const skillTitle = document.querySelector("#skill-title");
const skillCamera = document.querySelector("#skill-camera");
const skillCue = document.querySelector("#skill-cue");
const hintDialog = document.querySelector("#hint-dialog");
const hintTitle = document.querySelector("#hint-title");
const hintText = document.querySelector("#hint-text");

const SAFETY_KEY = "safetyNoticeHidden";
const HOLD_ANNOUNCE_EVERY = 5; // Say the hold time every 5 seconds.

let currentSkillId = "push-up";
let exercise = getExercise(currentSkillId);
let tracker = createTracker(exercise);

let poseLandmarker;
let stream = null;
let running = false;
let animationId = 0;
let uiState = "idle"; // "idle", "running", "paused", "results" or "path"
let stateBeforePath = "idle";
let lastState = null;
let lastPartialAt = 0;
let lastAnnouncedHold = 0;

// Shows and hides parts of the page depending on the current state.
function setUiState(state) {
  uiState = state;
  trainingScreen.hidden = state === "results" || state === "path";
  resultsScreen.hidden = state !== "results";
  pathScreen.hidden = state !== "path";
  startButton.hidden = state !== "idle";
  pathButton.hidden = state !== "idle";
  pauseButton.hidden = state !== "running" && state !== "paused";
  finishButton.hidden = pauseButton.hidden;
  pauseButton.textContent = state === "paused" ? "Resume" : "Pause";
  cameraBox.hidden = state !== "running";
  statsBox.hidden = state === "idle";
}

// Browser storage can fail (private mode), so every access is wrapped.
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
    repsText.textContent = `Hold: ${seconds} s (best ${result.bestHoldSeconds} s)`;
    return;
  }

  if (result.event === "rep") {
    speak(String(result.reps), { priority: true });
  } else if (result.event === "partial") {
    lastPartialAt = Date.now();
    speak(exercise.rep.partialCue ?? "Use the full range.", { priority: true });
  }
  const depthHint = Date.now() - lastPartialAt < 3000 ? " - use the full range" : "";
  repsText.textContent = `Reps: ${result.reps}${depthHint}`;
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

    for (const landmarks of result.landmarks) {
      drawSkeleton(landmarks);

      const pose = buildPose(landmarks, canvas.width, canvas.height);
      angleText.textContent = `Tracking ${pose.side.name} side, elbow: ${Math.round(pose.m.elbow)}°`;

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
  setUiState("running");

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
    setUiState("idle");
    message.textContent = "Could not load the pose model.";
  }
}

// Pausing turns the camera off. The reps and statistics of the set are kept.
function pauseTraining() {
  stopAnalysis();
  stopCamera();
  window.speechSynthesis.cancel();
  message.textContent = "Paused. Tap Resume when you are ready.";
  setUiState("paused");
}

async function resumeTraining() {
  const cameraStarted = await startCamera();
  if (!cameraStarted) {
    return;
  }
  message.textContent = "";
  lastState = null;
  setUiState("running");
  startAnalysis();
}

// Ends the set: stops everything, turns the camera off, shows only the results.
function finishSet() {
  stopAnalysis();
  stopCamera();
  window.speechSynthesis.cancel();
  summaryErrors.replaceChildren();
  summaryProgress.textContent = "";
  summaryStreak.textContent = describeStreak(getStreak(loadProgress().practiceDays));

  if (!tracker.hasData()) {
    summaryReps.textContent = "No set recorded yet.";
    summaryScore.textContent = "Get into the starting position first, then finish your set.";
    setUiState("results");
    return;
  }

  const result = tracker.summary();
  const isHold = exercise.measure === "hold";
  summaryReps.textContent = isHold ? `Best hold: ${result.seconds} s` : `Reps: ${result.reps}`;
  summaryScore.textContent = `Form score: ${result.score}%`;

  if (result.errors.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No form issues found. Nice work!";
    summaryErrors.appendChild(item);
  } else {
    for (const error of result.errors) {
      const item = document.createElement("li");
      item.textContent = error;
      summaryErrors.appendChild(item);
    }
  }

  // Save the set to the user's progress
  const update = recordSet(loadProgress(), currentSkillId, result);
  const saved = saveProgress(update.progress);
  if (update.newlyCompleted) {
    summaryProgress.textContent = "Skill completed! Well done.";
  } else if (update.isPractice) {
    summaryProgress.textContent = "Practice counted for this week.";
  }
  if (!saved) {
    summaryProgress.textContent += " (Progress could not be saved in this browser.)";
  }
  summaryStreak.textContent = describeStreak(getStreak(update.progress.practiceDays));

  setUiState("results");
  const amount = isHold ? `Best hold ${result.seconds} seconds.` : `${result.reps} reps.`;
  const completedText = update.newlyCompleted ? " Skill completed. Well done." : "";
  speak(`Set finished. ${amount} Form score ${result.score} percent.${completedText}`, {
    priority: true,
  });
}

// Goes back to the start screen with a clean slate.
function startNewSet() {
  window.speechSynthesis.cancel();
  tracker = createTracker(exercise);
  lastState = null;
  lastPartialAt = 0;
  lastAnnouncedHold = 0;
  message.textContent = "";
  angleText.textContent = "";
  feedbackText.textContent = "";
  repsText.textContent = "";
  setUiState("idle");
}

// Shows the skill path. "Back" returns to the screen the user came from.
function showSkillPath() {
  stateBeforePath = uiState;
  const progress = loadProgress();
  pathStreak.textContent = describeStreak(getStreak(progress.practiceDays));
  renderSkillPath(pathLevels, progress, chooseSkill);
  setUiState("path");
  window.scrollTo(0, 0);
}

function closeSkillPath() {
  setUiState(stateBeforePath);
}

// Shows a hint with "Continue" and "Cancel". Resolves to true on "Continue".
function confirmHint(title, text) {
  return new Promise((resolve) => {
    hintDialog.addEventListener("close", () => resolve(hintDialog.returnValue === "continue"), {
      once: true,
    });
    hintTitle.textContent = title;
    hintText.textContent = text;
    hintDialog.returnValue = "";
    hintDialog.showModal();
  });
}

// Shows the chosen skill on the training screen.
function showCurrentSkill() {
  const skill = getSkill(currentSkillId);
  skillTitle.textContent = skill.name;
  skillCamera.textContent = `Camera: ${CAMERA_VIEWS[skill.camera]}`;
  skillCue.textContent = `Coach cue: “${skill.cue}”`;
}

// Free choice: any evaluable skill can be trained. Locked levels and
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

  currentSkillId = skill.id;
  exercise = getExercise(skill.id);
  showCurrentSkill();
  startNewSet();
  window.scrollTo(0, 0);
}

safetyLink.addEventListener("click", showSafetyNotice);
pathButton.addEventListener("click", showSkillPath);
resultsPathButton.addEventListener("click", showSkillPath);
pathBackButton.addEventListener("click", closeSkillPath);
startButton.addEventListener("click", startTraining);
pauseButton.addEventListener("click", () => {
  if (uiState === "paused") {
    resumeTraining();
  } else {
    pauseTraining();
  }
});
finishButton.addEventListener("click", finishSet);
newSetButton.addEventListener("click", startNewSet);

showCurrentSkill();
setUiState("idle");
