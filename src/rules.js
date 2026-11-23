import { calculateAngle } from "./angles.js";

// MediaPipe landmark numbers for each side of the body
const SIDES = {
  left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 },
  right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 },
};

const MIN_VISIBILITY = 0.5;
const SWITCH_MARGIN = 0.15;
const MIN_KNEE_ANGLE = 150;

let currentSide = "left";

function isVisible(point) {
  return point.visibility === undefined || point.visibility >= MIN_VISIBILITY;
}

function averageVisibility(landmarks, ids) {
  const values = Object.values(ids).map((id) => landmarks[id].visibility ?? 0);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Picks the body side that the camera sees better. Only switches when the
// other side is clearly better, so it does not flicker.
export function getBodySide(landmarks) {
  const leftScore = averageVisibility(landmarks, SIDES.left);
  const rightScore = averageVisibility(landmarks, SIDES.right);

  if (currentSide === "left" && rightScore > leftScore + SWITCH_MARGIN) {
    currentSide = "right";
  } else if (currentSide === "right" && leftScore > rightScore + SWITCH_MARGIN) {
    currentSide = "left";
  }

  const ids = SIDES[currentSide];
  return {
    name: currentSide,
    shoulder: landmarks[ids.shoulder],
    elbow: landmarks[ids.elbow],
    wrist: landmarks[ids.wrist],
    hip: landmarks[ids.hip],
    knee: landmarks[ids.knee],
    ankle: landmarks[ids.ankle],
  };
}

// Angle (0 to 90 degrees) between the line a-b and the horizontal.
function angleToHorizontal(a, b) {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

// Checks the position for a full push-up. `side` must be in pixels:
// angles from MediaPipe's 0..1 coordinates are distorted when the video is
// not square (for example a phone in portrait mode).
// "not_ready"  = not in plank position (or body not fully visible)
// "knees_bent" = in plank, but legs are bent (knee push-up)
// "ready"      = full plank with straight legs
export function getPositionStatus(side) {
  const { shoulder, elbow, wrist, hip, knee, ankle } = side;

  if (![shoulder, wrist, hip, knee, ankle].every(isVisible)) {
    return "not_ready";
  }

  const bodyTilt = angleToHorizontal(shoulder, ankle);
  const armTilt = angleToHorizontal(shoulder, wrist);
  // At the bottom of a deep push-up the shoulders come close to the hands,
  // so the arm line is only checked while the arms are (almost) straight.
  const armsBent = elbow && calculateAngle(shoulder, elbow, wrist) < 140;

  const bodyIsHorizontal = bodyTilt <= 30;
  const armsAreVertical = wrist.y > shoulder.y && (armsBent || armTilt >= 45);

  if (!bodyIsHorizontal || !armsAreVertical) {
    return "not_ready";
  }

  const kneeAngle = calculateAngle(hip, knee, ankle);
  if (kneeAngle < MIN_KNEE_ANGLE) {
    return "knees_bent";
  }

  return "ready";
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
export function checkBodyLine(side) {
  const { shoulder, hip, ankle } = side;

  const angle = calculateAngle(shoulder, hip, ankle);
  const isStraight = angle >= 160;
  const hipPosition = isStraight ? "ok" : getHipPosition(shoulder, hip, ankle);

  return { angle, isStraight, hipPosition };
}
