import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { calculateAngle } from "./angles.js";
import { checkBodyLine, getBodySide, isInPlankPosition } from "./rules.js";
import { createRepCounter } from "./reps.js";
import { speak } from "./voice.js";

const startButton = document.querySelector("#start-button");
const message = document.querySelector("#message");
const video = document.querySelector("#camera");
const canvas = document.querySelector("#overlay");
const ctx = canvas.getContext("2d");
const angleText = document.querySelector("#angle");
const feedbackText = document.querySelector("#feedback");
const repsText = document.querySelector("#reps");
const safetyDialog = document.querySelector("#safety-dialog");
const safetyLink = document.querySelector("#safety-link");

const SAFETY_KEY = "safetyNoticeHidden";

let poseLandmarker;
let lastState = null;
let lastPartialAt = 0;
const repCounter = createRepCounter();

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

      // Only judge form and count reps when the user is in plank position
      if (!isInPlankPosition(side, canvas.width, canvas.height)) {
        giveFeedback(
          "not_ready",
          "Get into plank position, side on to the camera.",
          "Get into plank position, side on to the camera."
        );
      } else {
        // Count reps and check depth
        const reps = repCounter.update(elbowAngle);
        if (reps.event === "rep") {
          speak(String(reps.count), { priority: true });
        } else if (reps.event === "partial") {
          lastPartialAt = Date.now();
          speak("Go a little lower.", { priority: true });
        }
        const depthHint = Date.now() - lastPartialAt < 3000 ? " - go a little lower" : "";
        repsText.textContent = `Reps: ${reps.count}${depthHint}`;

        // Check the body line
        const bodyLine = checkBodyLine(side);
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
  requestAnimationFrame(detectPose);
}

safetyLink.addEventListener("click", showSafetyNotice);

startButton.addEventListener("click", async () => {
  // Show the safety notice first, unless the user chose to hide it
  if (!isSafetyHidden()) {
    const accepted = await showSafetyNotice();
    if (!accepted) {
      return;
    }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    video.srcObject = stream;
  } catch (error) {
    message.textContent = "Could not access the camera. Please allow camera access.";
    return;
  }

  try {
    message.textContent = "Loading your coach...";
    await loadPoseModel();
    message.textContent = "Your coach is ready.";
    detectPose();
  } catch (error) {
    console.error(error);
    message.textContent = "Could not load the pose model.";
  }
});