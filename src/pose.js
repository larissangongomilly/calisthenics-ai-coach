// Turns MediaPipe landmarks into joint positions (in pixels) and angles,
// so every exercise can use the same numbers.
import { calculateAngle } from "./angles.js";
import { getBodySide } from "./rules.js";

const SIDES = {
  left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 },
  right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 },
};

const MIN_VISIBILITY = 0.5;

// Angle (0 to 90 degrees) between the line a-b and the horizontal.
export function tilt(a, b) {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function toPixels(point, width, height) {
  return { x: point.x * width, y: point.y * height, visibility: point.visibility };
}

function getSidePoints(landmarks, name, width, height) {
  const points = { name };
  for (const [joint, id] of Object.entries(SIDES[name])) {
    points[joint] = toPixels(landmarks[id], width, height);
  }
  return points;
}

function isVisible(points) {
  return ["shoulder", "elbow", "wrist", "hip", "knee", "ankle"].every(
    (joint) => (points[joint].visibility ?? 1) >= MIN_VISIBILITY
  );
}

// Returns the pose for one video frame.
// side:  the body side the camera sees best (pixels)
// left / right: both sides (pixels), for front views and one-sided skills
// raw:   the best side in MediaPipe's 0..1 coordinates (used by the push-up rules)
// m:     angles in degrees
export function buildPose(landmarks, width, height) {
  const raw = getBodySide(landmarks);
  const left = getSidePoints(landmarks, "left", width, height);
  const right = getSidePoints(landmarks, "right", width, height);
  const side = raw.name === "left" ? left : right;
  const { shoulder, elbow, wrist, hip, knee, ankle } = side;

  const m = {
    elbow: calculateAngle(shoulder, elbow, wrist),
    shoulder: calculateAngle(hip, shoulder, elbow),
    hip: calculateAngle(shoulder, hip, knee),
    knee: calculateAngle(hip, knee, ankle),
    bodyLine: calculateAngle(shoulder, hip, ankle),
    trunkTilt: tilt(shoulder, hip),
    bodyTilt: tilt(shoulder, ankle),
    legTilt: tilt(hip, ankle),
    elbowMin: Math.min(
      calculateAngle(left.shoulder, left.elbow, left.wrist),
      calculateAngle(right.shoulder, right.elbow, right.wrist)
    ),
    kneeMin: Math.min(
      calculateAngle(left.hip, left.knee, left.ankle),
      calculateAngle(right.hip, right.knee, right.ankle)
    ),
    kneeMax: Math.max(
      calculateAngle(left.hip, left.knee, left.ankle),
      calculateAngle(right.hip, right.knee, right.ankle)
    ),
    leftArmTilt: tilt(left.shoulder, left.wrist),
    rightArmTilt: tilt(right.shoulder, right.wrist),
    // Height difference of both wrists, as a share of the image height
    wristLevelDiff: Math.abs(left.wrist.y - right.wrist.y) / height,
  };

  return { side, left, right, raw, m, width, height, visible: isVisible(side) };
}
