const DOWN_ANGLE = 90;
const UP_ANGLE = 160;

// Counts push-up reps from the elbow angle: down (below 90) then up (above 160).
export function createRepCounter() {
  let phase = "up";
  let count = 0;

  return {
    update(elbowAngle) {
      if (phase === "up" && elbowAngle < DOWN_ANGLE) {
        phase = "down";
      } else if (phase === "down" && elbowAngle > UP_ANGLE) {
        phase = "up";
        count += 1;
      }
      return { count, phase };
    },
  };
}