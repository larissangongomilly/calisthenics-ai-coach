// Camera rules for each skill. The keys are the skill ids from skills.js.
// Based on docs/pushup-form.md and docs/technique-guide.md.
//
// Each exercise has:
// - measure:  "reps" or "hold"
// - position(pose): true when the user is in the skill position,
//                   otherwise a message (string or { text, spoken })
// - checks:   form rules, each with ok(pose), a short cue and an error text
// - rep:      for reps: { metric(pose), down, up, start } (angle that gets
//             smaller in the hard part), or { phases: { start(pose), end(pose) } }
import { calculateAngle } from "./angles.js";
import { checkBodyLine, getPositionStatus } from "./rules.js";

export const EXERCISES = {
  "push-up": {
    measure: "reps",
    position(p) {
      const status = getPositionStatus(p.raw, p.width, p.height);
      if (status === "not_ready") {
        return "Get into plank position, side on to the camera.";
      }
      if (status === "knees_bent") {
        return {
          text: "Knees down? This app counts full push-ups. Straighten your legs.",
          spoken: "Straighten your legs for a full push-up.",
        };
      }
      return true;
    },
    // Uses the 0..1 coordinates, like the original push-up rules.
    rep: {
      metric: (p) => calculateAngle(p.raw.shoulder, p.raw.elbow, p.raw.wrist),
      down: 90,
      up: 160,
      start: 140,
      partialCue: "Go a little lower.",
    },
    checks: [
      {
        id: "sagging",
        ok: (p) => checkBodyLine(p.raw).hipPosition !== "sagging",
        cue: { text: "Lift your hips a little.", spoken: "Gently lift your hips." },
        error: "Hips sagged",
      },
      {
        id: "high",
        ok: (p) => checkBodyLine(p.raw).hipPosition !== "high",
        cue: "Lower your hips a little.",
        error: "Hips were too high",
      },
    ],
    goodCue: { text: "Great body line!", spoken: "Great body line." },
  },
};

export function getExercise(id) {
  return EXERCISES[id] ?? null;
}
