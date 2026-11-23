let lastSpokenAt = 0;
const COOLDOWN_MS = 4000;

// Speaks a short coaching cue. Returns true if the cue was spoken.
export function speak(text) {
  const now = Date.now();
  if (now - lastSpokenAt < COOLDOWN_MS) return false;
  if (window.speechSynthesis.speaking) return false;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);

  lastSpokenAt = now;
  return true;
}