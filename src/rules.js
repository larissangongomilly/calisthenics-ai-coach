import { calculateAngle } from "./angles.js";

// MediaPipe landmark numbers (left side of the body)
const LEFT_SHOULDER = 11;
const LEFT_WRIST = 15;
const LEFT_HIP = 23;
const LEFT_ANKLE = 27;

const MIN_VISIBILITY = 0.5;

function isVisible(point) {
  return point.visibility === undefined || point.visibility >= MIN_VISIBILITY;
}

// Angle (0 to 90 degrees) between the line a-b and the horizontal, in pixels.
function angleToHorizontal(a, b, width, height) {
  const dx = Math.abs(b.x - a.x) * width;
  const dy = Math.abs(b.y - a.y) * height;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

// Position check: body roughly horizontal, arms roughly vertical (plank / push-up).
export function isInPlankPosition(landmarks, width, height) {
  const shoulder = landmarks[LEFT_SHOULDER];
  const wrist = landmarks[LEFT_WRIST];
  const hip = landmarks[LEFT_HIP];
  const ankle = landmarks[LEFT_ANKLE];

  if (![shoulder, wrist, hip, ankle].every(isVisible)) {
    return false;
  }

  const bodyTilt = angleToHorizontal(shoulder, ankle, width, height);
  const armTilt = angleToHorizontal(shoulder, wrist, width, height);

  const bodyIsHorizontal = bodyTilt <= 30;
  const armsAreVertical = armTilt >= 45 && wrist.y > shoulder.y;

  return bodyIsHorizontal && armsAreVertical;
}

// Tells whether the hip is below ("sagging") or above ("high") the
// straight line from shoulder to ankle. Image y grows downward.
function getHipPosition(shoulder, hip, ankle) {
  const run = ankle.x - shoulder.x;
  if (run === 0) {
    return "high";
  }
  const t = (hip.x - shoulder.x) / run;
  const lineY = shoulder.y + t * (ankle.y - shoulder.y);
  return hip.y > lineY ? "sagging" : "high";
}

// Rule: shoulder, hip and ankle should form a straight line.
export function checkBodyLine(landmarks) {
  const shoulder = landmarks[LEFT_SHOULDER];
  const hip = landmarks[LEFT_HIP];
  const ankle = landmarks[LEFT_ANKLE];

  const angle = calculateAngle(shoulder, hip, ankle);
  const isStraight = angle >= 160;
  const hipPosition = isStraight ? "ok" : getHipPosition(shoulder, hip, ankle);

  return { angle, isStraight, hipPosition };
}