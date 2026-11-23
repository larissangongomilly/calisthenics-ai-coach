import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { calculateAngle } from "./angles.js";
import { checkBodyLine } from "./rules.js";

const startButton = document.querySelector("#start-button");
const message = document.querySelector("#message");
const video = document.querySelector("#camera");
const canvas = document.querySelector("#overlay");
const ctx = canvas.getContext("2d");
const angleText = document.querySelector("#angle");
const feedbackText = document.querySelector("#feedback");

let poseLandmarker;

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

      // Show the live angle of the left elbow
      const elbowAngle = calculateAngle(landmarks[11], landmarks[13], landmarks[15]);
      angleText.textContent = `Left elbow: ${Math.round(elbowAngle)}°`;

      // Check the body line rule and show feedback
      const bodyLine = checkBodyLine(landmarks);
      if (bodyLine.isStraight) {
        feedbackText.textContent = `Great body line! (${Math.round(bodyLine.angle)}°)`;
      } else {
        feedbackText.textContent = `Keep your body in one line (${Math.round(bodyLine.angle)}°)`;
      }
    }
  }
  requestAnimationFrame(detectPose);
}

startButton.addEventListener("click", async () => {
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