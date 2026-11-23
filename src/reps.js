const DOWN_ANGLE = 90;
const UP_ANGLE = 160;
const START_ANGLE = 140;

// Counts push-up reps from the elbow angle.
// A full rep goes below 90 degrees and back above 160.
// If the user comes back up without going low enough, it is a "partial" rep.
export function createRepCounter() {
  let phase = "up";
  let count = 0;
  let lowest = 180;

  return {
    update(elbowAngle) {
      let event = null;

      if (phase === "up") {
        if (elbowAngle < START_ANGLE) {
          phase = "moving";
          lowest = elbowAngle;
        }
      } else {
        lowest = Math.min(lowest, elbowAngle);
        if (elbowAngle > UP_ANGLE) {
          phase = "up";
          if (lowest < DOWN_ANGLE) {
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