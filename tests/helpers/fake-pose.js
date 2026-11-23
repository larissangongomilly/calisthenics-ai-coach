// Helpers that build fake MediaPipe landmarks, so the camera rules can be
// tested without a camera. Coordinates are in MediaPipe's 0..1 space.
import { buildPose } from "../../src/pose.js";

export const WIDTH = 640;
export const HEIGHT = 480;

const IDS = {
  shoulder: [11, 12],
  elbow: [13, 14],
  wrist: [15, 16],
  hip: [23, 24],
  knee: [25, 26],
  ankle: [27, 28],
};

// points: { shoulder, elbow, wrist, hip, knee, ankle } as { x, y }.
// The left side is well visible, the right side copies it (less visible).
export function fakeLandmarks(points) {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.1 }));
  for (const [joint, [left, right]] of Object.entries(IDS)) {
    const p = points[joint];
    landmarks[left] = { x: p.x, y: p.y, visibility: 0.9 };
    const q = points.right?.[joint] ?? p;
    landmarks[right] = { x: q.x, y: q.y, visibility: 0.6 };
  }
  return landmarks;
}

export function pose(points, size = { width: WIDTH, height: HEIGHT }) {
  return buildPose(fakeLandmarks(points), size.width, size.height);
}

// Side-view plank with a given elbow angle (in pixels, like the camera sees it).
// hipOffset > 0 lets the hips sag, < 0 lifts them. kneeBent puts the knees on
// the floor. size picks the video size, for example a phone in portrait mode.
export function plank(elbowDeg, hipOffset = 0, kneeBent = false, size = { width: WIDTH, height: HEIGHT }) {
  // Build the pose in pixels of a square, then map it to 0..1 for this video size.
  const unit = Math.min(size.width, size.height);
  const at = (x, y) => ({ x: (x * unit) / size.width, y: (y * unit) / size.height });
  const armLength = 0.13;
  const wrist = { x: 0.2, y: 0.9 };
  const d = 2 * armLength * Math.sin((elbowDeg * Math.PI) / 360);
  const shoulder = { x: 0.2, y: wrist.y - d };
  const elbow = { x: 0.2 - Math.sqrt(Math.max(armLength ** 2 - (d / 2) ** 2, 0)), y: wrist.y - d / 2 };
  const ankle = { x: 0.9, y: 0.86 };
  const hip = { x: 0.55, y: shoulder.y + (ankle.y - shoulder.y) * 0.5 + hipOffset };
  const knee = kneeBent ? { x: 0.72, y: 0.98 } : { x: 0.725, y: (hip.y + ankle.y) / 2 };
  const points = { shoulder, elbow, wrist, hip, knee, ankle };
  return Object.fromEntries(Object.entries(points).map(([joint, p]) => [joint, at(p.x, p.y)]));
}

// Lying on the back with legs lifted by legDeg degrees (hollow body hold).
export function hollow(legDeg, kneeBent = false) {
  const hip = { x: 0.5, y: 0.8 };
  const shoulder = { x: 0.25, y: 0.76 };
  const rad = (legDeg * Math.PI) / 180;
  const ankle = { x: hip.x + 0.3 * Math.cos(rad) * (HEIGHT / WIDTH), y: hip.y - 0.3 * Math.sin(rad) };
  const knee = kneeBent
    ? { x: hip.x + 0.05, y: hip.y - 0.25 }
    : { x: (hip.x + ankle.x) / 2, y: (hip.y + ankle.y) / 2 };
  return { shoulder, elbow: { x: 0.3, y: 0.7 }, wrist: { x: 0.35, y: 0.65 }, hip, knee, ankle };
}

// Straight handstand; bananaX pushes the hips out of line.
export function handstand(bananaX = 0) {
  return {
    wrist: { x: 0.5, y: 0.9 },
    elbow: { x: 0.5, y: 0.8 },
    shoulder: { x: 0.5, y: 0.7 },
    hip: { x: 0.5 + bananaX, y: 0.45 },
    knee: { x: 0.5 + bananaX / 2, y: 0.3 },
    ankle: { x: 0.5, y: 0.15 },
  };
}

export const HANG = {
  wrist: { x: 0.5, y: 0.1 },
  elbow: { x: 0.5, y: 0.2 },
  shoulder: { x: 0.5, y: 0.3 },
  hip: { x: 0.5, y: 0.6 },
  knee: { x: 0.5, y: 0.75 },
  ankle: { x: 0.5, y: 0.9 },
};

export const SUPPORT = {
  wrist: { x: 0.5, y: 0.5 },
  elbow: { x: 0.5, y: 0.4 },
  shoulder: { x: 0.5, y: 0.3 },
  hip: { x: 0.5, y: 0.6 },
  knee: { x: 0.5, y: 0.75 },
  ankle: { x: 0.5, y: 0.9 },
};

// Hanging from a bar with a given elbow angle (pull-up).
export function pullUp(elbowDeg) {
  const armLength = 0.12;
  const d = 2 * armLength * Math.sin((elbowDeg * Math.PI) / 360);
  const wrist = { x: 0.5, y: 0.1 };
  const shoulder = { x: 0.5, y: 0.1 + d };
  return {
    wrist,
    shoulder,
    elbow: { x: 0.5 + Math.sqrt(Math.max(armLength ** 2 - (d / 2) ** 2, 0)) * 0.75, y: 0.1 + d / 2 },
    hip: { x: 0.5, y: shoulder.y + 0.3 },
    knee: { x: 0.5, y: shoulder.y + 0.45 },
    ankle: { x: 0.5, y: shoulder.y + 0.6 },
  };
}

// In-memory replacement for localStorage.
export function memoryStorage(entries = []) {
  const map = new Map(entries);
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, String(value)),
  };
}
