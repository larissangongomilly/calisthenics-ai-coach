let lastSpokenAt = 0;
const COOLDOWN_MS = 4000;

let enabled = true;

// Applies the voice settings (see settings.js).
export function setVoiceOptions(options) {
  enabled = options.voice;
  if (!enabled) {
    window.speechSynthesis?.cancel();
  }
}

// Speaks a short coaching cue. Returns true if the cue was handled.
// When the voice is off, nothing is spoken but the cue counts as handled,
// so the app does not try to repeat it.
// Priority cues (like rep counts) interrupt the current speech and skip the pause.
export function speak(text, { priority = false } = {}) {
  if (!enabled || !window.speechSynthesis) {
    return true;
  }

  const now = Date.now();

  if (priority) {
    window.speechSynthesis.cancel();
  } else {
    if (now - lastSpokenAt < COOLDOWN_MS) return false;
    if (window.speechSynthesis.speaking) return false;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.95;
  // No volume here: the phone's own volume buttons decide.
  window.speechSynthesis.speak(utterance);

  lastSpokenAt = now;
  return true;
}
