// Guided setup: talks the user into the starting position step by step,
// before the normal form feedback starts.
//
// steps: [{ say, check?(pose), wait? }]
// - Steps with `check` move on when the camera sees the check pass
//   for a short moment (so a single wrong frame does not count).
// - Steps without `check` (things the camera cannot see) move on after `wait` ms.
const DEFAULT_WAIT_MS = 6000;
const CHECK_HOLD_MS = 500;

const NOT_VISIBLE_TEXT = "Move so your whole body is in the camera view.";
const DONE_TEXT = "You're in position. Let's go.";

export function createGuide(steps) {
  let index = 0;
  let stepStartedAt = null;
  let checkSince = null;
  let announced = -1;

  function moveOn(now) {
    index += 1;
    stepStartedAt = now;
    checkSince = null;
  }

  return {
    get total() {
      return steps.length;
    },

    // Call once per frame. Returns what to show and say.
    // isNew is true when the text should be spoken (a new step started).
    update(pose, now) {
      if (index >= steps.length) {
        return { done: true, text: DONE_TEXT, spoken: DONE_TEXT, isNew: false, step: steps.length };
      }

      if (stepStartedAt === null) {
        stepStartedAt = now;
      }

      const step = steps[index];

      if (step.check) {
        if (pose.visible && step.check(pose)) {
          checkSince = checkSince ?? now;
          if (now - checkSince >= CHECK_HOLD_MS) {
            moveOn(now);
          }
        } else {
          checkSince = null;
        }
      } else if (now - stepStartedAt >= (step.wait ?? DEFAULT_WAIT_MS)) {
        moveOn(now);
      }

      if (index >= steps.length) {
        return { done: true, text: DONE_TEXT, spoken: DONE_TEXT, isNew: true, step: steps.length };
      }

      const current = steps[index];
      const isNew = announced !== index;
      announced = index;

      // A check step cannot pass while the body is not visible: say why.
      const hint = current.check && !pose.visible ? ` ${NOT_VISIBLE_TEXT}` : "";

      return {
        done: false,
        text: current.say + hint,
        spoken: current.say,
        isNew,
        step: index + 1,
      };
    },
  };
}
