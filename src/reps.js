// Counts reps from one angle (for example the elbow angle).
// A full rep goes below `down` and back above `up`.
// If the user comes back up without going low enough, it is a "partial" rep.
// Default values are the push-up rules: below 90 degrees and back above 160.
export function createRepCounter({ down = 90, up = 160, start = 140 } = {}) {
  let phase = "up";
  let count = 0;
  let lowest = 180;

  return {
    update(angle) {
      let event = null;

      if (phase === "up") {
        if (angle < start) {
          phase = "moving";
          lowest = angle;
        }
      } else {
        lowest = Math.min(lowest, angle);
        if (angle > up) {
          phase = "up";
          if (lowest < down) {
            count += 1;
            event = "rep";
          } else {
            event = "partial";
          }
        }
      }

      return { count, event };
    },
  };
}

// Counts reps that move from one position to another,
// for example from the hang to the support (muscle-up).
// update(isStart, isEnd): a rep counts when the user reaches the end
// position after being in the start position.
export function createPhaseCounter() {
  let phase = null;
  let count = 0;

  return {
    update(isStart, isEnd) {
      let event = null;
      if (isStart) {
        phase = "start";
      } else if (isEnd && phase === "start") {
        phase = "end";
        count += 1;
        event = "rep";
      }
      return { count, event };
    },
  };
}
