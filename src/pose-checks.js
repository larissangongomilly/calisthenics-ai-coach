// Simple checks on a pose (see pose.js), used by the camera rules and the
// guided setups. Joints are in pixels and y grows downward.

// Hands below the shoulders (support on the floor, bars or parallettes)
export const onHands = (p) => p.side.wrist.y > p.side.shoulder.y;
// Hands above the shoulders (hanging from a bar or rings)
export const hanging = (p) => p.side.wrist.y < p.side.shoulder.y;
// Hands above the hips (levers below a bar)
export const handsAboveHips = (p) => p.side.wrist.y < p.side.hip.y;
// Feet higher than the hands (feet are off the floor in hand balances)
export const feetUp = (p) => p.side.ankle.y < p.side.wrist.y;
// Upside down: feet above hips above shoulders, hands on the floor
export const upsideDown = (p) =>
  p.side.ankle.y < p.side.hip.y && p.side.hip.y < p.side.shoulder.y && onHands(p);
// Hips at least roughly as high as the shoulders (dragon flag on a bench)
export const hipsOverShoulders = (p) => p.side.hip.y <= p.side.shoulder.y + 0.05 * p.height;
// Lying (or sitting back) with the trunk close to level
export const trunkFlat = (p) => p.m.trunkTilt <= 35;
// Standing tall with straight legs
export const standing = (p) => p.m.trunkTilt >= 60 && p.m.knee >= 160;
// One foot clearly higher than the other
export const oneFootUp = (p) => Math.abs(p.left.ankle.y - p.right.ankle.y) > 0.05 * p.height;
