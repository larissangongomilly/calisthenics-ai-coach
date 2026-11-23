// Collects statistics during one set and builds the summary at the end.
export function createSession() {
  let frames = 0;
  let straightFrames = 0;
  let saggingFrames = 0;
  let highFrames = 0;
  let reps = 0;
  let partialReps = 0;

  return {
    // Call once per video frame while the user is in plank position.
    recordFrame(bodyLine) {
      frames += 1;
      if (bodyLine.isStraight) {
        straightFrames += 1;
      } else if (bodyLine.hipPosition === "sagging") {
        saggingFrames += 1;
      } else {
        highFrames += 1;
      }
    },

    recordRep() {
      reps += 1;
    },

    recordPartialRep() {
      partialReps += 1;
    },

    hasData() {
      return frames > 0;
    },

    summary() {
      const percent = (count) => Math.round((count / frames) * 100);
      const errors = [];

      if (percent(saggingFrames) >= 10) {
        errors.push(`Hips sagged for ${percent(saggingFrames)}% of the set.`);
      }
      if (percent(highFrames) >= 10) {
        errors.push(`Hips were too high for ${percent(highFrames)}% of the set.`);
      }
      if (partialReps > 0) {
        errors.push(`${partialReps} rep(s) were not deep enough.`);
      }

      return { reps, score: percent(straightFrames), errors };
    },
  };
}