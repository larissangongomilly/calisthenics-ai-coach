const startButton = document.querySelector("#start-button");
const message = document.querySelector("#message");
const video = document.querySelector("#camera");

startButton.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    video.srcObject = stream;
    message.textContent = "Camera is on.";
  } catch (error) {
    message.textContent = "Could not access the camera. Please allow camera access.";
  }
});