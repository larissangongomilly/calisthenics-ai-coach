import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

const startButton = document.querySelector("#start-button");
const message = document.querySelector("#message");
const video = document.querySelector("#camera");
const canvas = document.querySelector("#overlay");
const ctx = canvas.getContext("2d");

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
      for (const point of landmarks) {
        ctx.beginPath();
        ctx.arc(point.x * canvas.width, point.y * canvas.height, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "#c6f432";
        ctx.fill();
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