// Runs one exercise definition (see exercises.js) during a set:
// checks the position, counts reps or hold time, collects form statistics
// and builds the summary at the end.
import { createPhaseCounter, createRepCounter } from "./reps.js";

// How strict reps and holds are judged (see settings.js):
// easy   = reps may be a little less deep (10 degrees)
// normal = the rules as written in exercises.js
// strict = a rep only counts with good form for most of the rep,
//          and hold time only runs while the form is good
const EASY_DEPTH = 10;
const STRICT_GOOD_SHARE = 0.7;

// Makes the depth easier for "easy". `down` must stay below `start`.
export function adjustRep(rep, strictness) {
  if (!rep || rep.phases || strictness !== "easy") {
    return rep;
  }
  const down = rep.down ?? 90;
  const start = rep.start ?? 140;
  return { ...rep, down: Math.min(down + EASY_DEPTH, start - 5) };
}

const MAX_FRAME_GAP_MS = 250; // Longer gaps (lag, pause) do not count as hold time.
const ERROR_SHARE = 10; // Show an error in the summary if it happened in >= 10% of frames.

const NOT_VISIBLE = {
  state: "not_visible",
  text: "Move so your whole body is in the camera view.",
  spoken: "Please adjust the camera so I can see your whole body.",
};

// A message can be a plain string or { text, spoken }.
function toFeedback(state, message) {
  if (typeof message === "string") {
    return { state, text: message, spoken: message };
  }
  return { state, text: message.text, spoken: message.spoken ?? message.text };
}

export function createTracker(exercise, { strictness = "normal" } = {}) {
  const isHold = exercise.measure === "hold";
  const isStrict = strictness === "strict";
  const rep = adjustRep(exercise.rep ?? null, strictness);
  const counter = rep ? (rep.phases ? createPhaseCounter() : createRepCounter(rep)) : null;

  let frames = 0;
  let goodFrames = 0;
  let reps = 0;
  let partialReps = 0;
  let rejectedReps = 0; // strict: reps with poor form that did not count
  let repFrames = 0; // frames since the last rep
  let repGoodFrames = 0;
  let holdMs = 0;
  let bestHoldMs = 0;
  let lastTime = null;
  const failedFrames = {};

  function leavePosition() {
    lastTime = null;
    holdMs = 0;
  }

  return {
    // Call once per video frame. `now` is a time in milliseconds.
    update(pose, now) {
      if (!pose.visible && !exercise.ignoreVisibility) {
        leavePosition();
        return { ...NOT_VISIBLE, inPosition: false };
      }

      const position = exercise.position(pose);
      if (position !== true) {
        leavePosition();
        return { ...toFeedback(`position:${String(position.text ?? position)}`, position), inPosition: false };
      }

      frames += 1;

      let firstFailed = null;
      for (const check of exercise.checks) {
        if (!check.ok(pose)) {
          failedFrames[check.id] = (failedFrames[check.id] ?? 0) + 1;
          firstFailed = firstFailed ?? check;
        }
      }
      const goodForm = !firstFailed;
      if (goodForm) {
        goodFrames += 1;
      }

      if (isHold) {
        if (lastTime !== null && (goodForm || !isStrict)) {
          holdMs += Math.min(now - lastTime, MAX_FRAME_GAP_MS);
          bestHoldMs = Math.max(bestHoldMs, holdMs);
        }
        lastTime = now;
      }

      let event = null;
      if (counter) {
        repFrames += 1;
        if (goodForm) repGoodFrames += 1;
        const result = rep.phases
          ? counter.update(rep.phases.start(pose), rep.phases.end(pose))
          : counter.update(rep.metric(pose));
        event = result.event;
        if (event === "rep") {
          if (isStrict && repGoodFrames < repFrames * STRICT_GOOD_SHARE) {
            event = "rejected";
            rejectedReps += 1;
          } else {
            reps += 1;
          }
        }
        if (event === "partial") {
          partialReps += 1;
        }
        if (event) {
          repFrames = 0;
          repGoodFrames = 0;
        }
      }

      const feedback = firstFailed
        ? toFeedback(firstFailed.id, firstFailed.cue)
        : toFeedback("good", exercise.goodCue ?? "Good form. Keep going.");

      return {
        ...feedback,
        inPosition: true,
        event,
        reps,
        holdSeconds: Math.floor(holdMs / 1000),
        bestHoldSeconds: Math.floor(bestHoldMs / 1000),
      };
    },

    hasData() {
      return frames > 0;
    },

    summary() {
      const percent = (count) => (frames === 0 ? 0 : Math.round((count / frames) * 100));
      const errors = [];

      for (const check of exercise.checks) {
        const share = percent(failedFrames[check.id] ?? 0);
        if (share >= ERROR_SHARE) {
          errors.push(`${check.error} (${share}% of the set)`);
        }
      }
      if (partialReps > 0) {
        errors.push(`${partialReps} rep(s) did not reach the full range.`);
      }
      if (rejectedReps > 0) {
        errors.push(`${rejectedReps} rep(s) did not count because of the form (strict mode).`);
      }

      return {
        reps,
        seconds: Math.floor(bestHoldMs / 1000),
        score: percent(goodFrames),
        errors,
      };
    },
  };
}
