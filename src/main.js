import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { calculateAngle } from "./angles.js";
import { checkBodyLine, getBodySide, getPositionStatus } from "./rules.js";
import { createRepCounter } from "./reps.js";
import { createSession } from "./session.js";
import { loadProgress, recordSet, saveProgress } from "./progress.js";
import { describeStreak, getStreak } from "./streak.js";
import { speak } from "./voice.js";

const trainingScreen = document.querySelector("#training-screen");
const resultsScreen = document.querySelector("#results-screen");
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

const SAFETY_KEY = "safetyNoticeHidden";
const CURRENT_SKILL = "push-up"; // Only the push-up is evaluable for now.

let poseLandmarker;
let stream = null;
let running = false;
let animationId = 0;
let uiState = "idle"; // "idle", "running", "paused" or "results"
let lastState = null;
let lastPartialAt = 0;
let repCounter = createRepCounter();
let session = createSession();

// Shows and hides parts of the page depending on the current state.
function setUiState(state) {
  uiState = state;
  trainingScreen.hidden = state === "results";
  resultsScreen.hidden = state !== "results";
  startButton.hidden = state !== "idle";
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

      // Pick the body side the camera sees best
      const side = getBodySide(landmarks);

      // Show the live elbow angle of that side
      const elbowAngle = calculateAngle(side.shoulder, side.elbow, side.wrist);
      angleText.textContent = `Tracking ${side.name} side, elbow: ${Math.round(elbowAngle)}°`;

      // Only judge form and count reps in a full plank position
      const status = getPositionStatus(side, canvas.width, canvas.height);

      if (status === "not_ready") {
        giveFeedback(
          "not_ready",
          "Get into plank position, side on to the camera.",
          "Get into plank position, side on to the camera."
        );
      } else if (status === "knees_bent") {
        giveFeedback(
          "knees_bent",
          "Knees down? This app counts full push-ups. Straighten your legs.",
          "Straighten your legs for a full push-up."
        );
      } else {
        // Count reps and check depth
        const reps = repCounter.update(elbowAngle);
        if (reps.event === "rep") {
          session.recordRep();
          speak(String(reps.count), { priority: true });
        } else if (reps.event === "partial") {
          session.recordPartialRep();
          lastPartialAt = Date.now();
          speak("Go a little lower.", { priority: true });
        }
        const depthHint = Date.now() - lastPartialAt < 3000 ? " - go a little lower" : "";
        repsText.textContent = `Reps: ${reps.count}${depthHint}`;

        // Check the body line and record it for the summary
        const bodyLine = checkBodyLine(side);
        session.recordFrame(bodyLine);
        const degrees = Math.round(bodyLine.angle);

        if (bodyLine.isStraight) {
          giveFeedback("straight", `Great body line! (${degrees}°)`, "Great body line.");
        } else if (bodyLine.hipPosition === "sagging") {
          giveFeedback(
            "sagging",
            `Lift your hips a little (${degrees}°)`,
            "Gently lift your hips."
          );
        } else {
          giveFeedback(
            "high",
            `Lower your hips a little (${degrees}°)`,
            "Lower your hips a little."
          );
        }
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

  if (!session.hasData()) {
    summaryReps.textContent = "No set recorded yet.";
    summaryScore.textContent = "Get into plank position first, then finish your set.";
    setUiState("results");
    return;
  }

  const result = session.summary();
  summaryReps.textContent = `Reps: ${result.reps}`;
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
  const update = recordSet(loadProgress(), CURRENT_SKILL, result);
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
  const completedText = update.newlyCompleted ? " Skill completed. Well done." : "";
  speak(
    `Set finished. ${result.reps} reps. Form score ${result.score} percent.${completedText}`,
    { priority: true }
  );
}

// Goes back to the start screen with a clean slate.
function startNewSet() {
  window.speechSynthesis.cancel();
  session = createSession();
  repCounter = createRepCounter();
  lastState = null;
  lastPartialAt = 0;
  message.textContent = "";
  angleText.textContent = "";
  feedbackText.textContent = "";
  repsText.textContent = "";
  setUiState("idle");
}

safetyLink.addEventListener("click", showSafetyNotice);
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

setUiState("idle");
