import { calculateAngle } from "./angles.js";

// MediaPipe landmark numbers (left side of the body)
const LEFT_SHOULDER = 11;
const LEFT_HIP = 23;
const LEFT_ANKLE = 27;

// Rule: shoulder, hip and ankle should form a straight line.
export function checkBodyLine(landmarks) {
  const angle = calculateAngle(
    landmarks[LEFT_SHOULDER],
    landmarks[LEFT_HIP],
    landmarks[LEFT_ANKLE]
  );
  return { angle, isStraight: angle >= 160 };
}