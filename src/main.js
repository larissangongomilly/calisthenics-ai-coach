import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

const startButton = document.querySelector("#start-button");
const message = document.querySelector("#message");
const video = document.querySelector("#camera");

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
  } catch (error) {
    console.error(error);
    message.textContent = "Could not load the pose model.";
  }
});