// Outline figures that show the pose of each skill, with its equipment.
// Drawn as SVG from joint points (viewBox 0..100), so they stay sharp and
// can be colored per state. Approved designs, see docs/skill-path.md.
import { LEVELS, getSkill } from "./skills.js";

// Equipment, head [x, y], then body lines as flat [x1, y1, x2, y2, ...] lists.
// The first line is the main body (feet -> knees -> hips -> shoulders).
// Lines that start at the shoulder are arms.
const POSES = {
  "push-up": ["floor", [80, 53], [16, 80, 31, 73, 46, 66, 70, 58], [70, 58, 72, 70, 74, 82]],
  "inverted-row": ["lowbar", [71, 49], [14, 80, 28, 72, 44, 63, 62, 54], [62, 54, 62, 46, 66, 40]],
  "hollow-body-hold": ["floor", [22, 65], [84, 58, 68, 66, 52, 74, 32, 68], [32, 68, 25, 55, 17, 43]],
  "crow-pose": ["floor", [73, 62], [38, 64, 56, 64, 44, 44, 64, 56], [64, 56, 60, 70, 58, 82]],
  "elbow-lever-assisted": ["floor", [71, 61], [12, 80, 26, 73, 40, 66, 62, 62], [62, 62, 50, 66, 50, 82]],
  "hanging-knee-raise": ["bar12", [56, 27], [66, 80, 66, 62, 50, 62, 50, 34], [50, 34, 50, 24, 50, 12]],
  "tuck-l-sit": ["par", [48, 34], [62, 74, 62, 58, 46, 72, 46, 44], [46, 44, 49, 57, 50, 70]],
  "pike-push-up": ["floor", [63, 62], [16, 82, 28, 58, 40, 34, 56, 58], [56, 58, 60, 70, 64, 82]],
  "wall-handstand": ["wall", [64, 70], [43, 10, 47, 24, 52, 38, 57, 62], [57, 62, 58, 74, 59, 86]],
  "frog-stand-straight": ["floor", [66, 62], [38, 66, 58, 64, 38, 48, 56, 58], [56, 58, 55, 71, 54, 84]],
  // Seen from behind: both hands on the bar, head between the arms.
  "pull-up": ["bar12", [50, 25], [41, 92, 44, 75, 50, 58, 50, 36], [50, 58, 56, 75, 59, 92], [40, 36, 60, 36], [40, 36, 35, 24, 30, 12], [60, 36, 65, 24, 70, 12]],
  "bar-dip": ["dip", [54, 18], [36, 78, 46, 70, 50, 56, 52, 28], [52, 28, 52, 39, 52, 50]],
  "tuck-dragon-flag": ["bench", [14, 66], [56, 46, 46, 30, 32, 42, 22, 64], [22, 64, 14, 58, 8, 70]],
  "tuck-back-lever": ["bar12", [30, 40], [66, 48, 54, 48, 62, 36, 40, 36], [40, 36, 45, 24, 50, 12]],
  "elbow-lever": ["floor", [72, 58], [10, 60, 26, 61, 42, 62, 62, 60], [62, 60, 50, 64, 50, 82]],
  "l-sit": ["par", [49, 34], [86, 72, 66, 72, 46, 72, 47, 44], [47, 44, 49, 57, 50, 70]],
  "archer-push-up": ["floor", [78, 63], [16, 80, 31, 75, 46, 70, 68, 68], [68, 68, 62, 74, 64, 82], [68, 68, 80, 75, 92, 82]],
  "free-handstand": ["floor", [57, 70], [50, 8, 50, 22, 50, 38, 50, 62], [50, 62, 50, 74, 50, 86]],
  "tuck-front-lever": ["bar12", [30, 33], [64, 24, 52, 24, 62, 36, 40, 36], [40, 36, 45, 24, 50, 12]],
  "pistol-squat": ["floor", [56, 31], [46, 84, 58, 72, 40, 64, 52, 40], [40, 64, 62, 62, 84, 60], [52, 40, 66, 42, 80, 42]],
  "one-leg-dragon-flag": ["bench", [14, 66], [58, 14, 49, 27, 40, 40, 22, 64], [40, 40, 54, 40, 54, 52], [22, 64, 14, 58, 8, 70]],
  "tuck-human-flag": ["pole", [42, 33], [72, 40, 64, 32, 56, 44, 34, 42], [34, 42, 27, 35, 20, 28], [34, 42, 27, 50, 20, 58]],
  "dragon-flag-negative": ["bench", [14, 66], [80, 34, 62, 42, 44, 50, 22, 64], [22, 64, 14, 58, 8, 70]],
  "tuck-planche": ["floor", [62, 56], [26, 72, 42, 70, 32, 58, 52, 58], [52, 58, 49, 71, 46, 84]],
  "adv-tuck-front-lever": ["bar12", [28, 33], [80, 30, 66, 22, 60, 36, 38, 36], [38, 36, 44, 24, 50, 12]],
  "wall-handstand-push-up": ["wall", [66, 80], [43, 18, 46, 34, 50, 50, 56, 72], [56, 72, 47, 79, 58, 86]],
  "dragon-flag": ["bench", [14, 66], [78, 20, 60, 34, 42, 48, 22, 64], [22, 64, 14, 58, 8, 70]],
  "bar-muscle-up": ["bar40", [56, 12], [44, 80, 46, 62, 48, 46, 52, 22], [52, 22, 51, 31, 50, 40]],
  "one-arm-elbow-lever": ["floor", [72, 58], [10, 60, 26, 61, 42, 62, 62, 60], [62, 60, 50, 64, 50, 82], [62, 60, 72, 50, 82, 44]],
  "v-sit": ["par", [31, 34], [74, 30, 61, 51, 46, 72, 36, 44], [36, 44, 41, 57, 44, 70]],
  "adv-tuck-planche": ["floor", [64, 56], [14, 60, 26, 70, 34, 58, 54, 58], [54, 58, 51, 71, 48, 84]],
  "straddle-front-lever": ["bar12", [28, 33], [60, 36, 40, 36], [60, 36, 76, 31, 92, 28], [60, 36, 76, 41, 92, 44], [40, 36, 45, 24, 50, 12]],
  "back-lever": ["bar12", [30, 40], [92, 36, 78, 36, 62, 36, 40, 36], [40, 36, 45, 24, 50, 12]],
  "ring-muscle-up": ["rings40", [56, 12], [44, 80, 46, 62, 48, 46, 52, 22], [52, 22, 51, 31, 50, 40]],
  "free-handstand-push-up": ["floor", [66, 80], [52, 16, 52, 32, 52, 48, 56, 72], [56, 72, 47, 79, 58, 86]],
  "one-arm-push-up": ["floor", [80, 53], [16, 80, 31, 73, 46, 66, 70, 58], [70, 58, 72, 70, 74, 82], [70, 58, 60, 62, 52, 60]],
  "straddle-planche": ["floor", [66, 56], [34, 56, 56, 58], [34, 56, 20, 51, 6, 48], [34, 56, 20, 61, 6, 64], [56, 58, 53, 71, 50, 84]],
  "human-flag": ["pole", [40, 32], [92, 44, 76, 44, 58, 44, 34, 42], [34, 42, 27, 35, 20, 28], [34, 42, 27, 50, 20, 58]],
  "front-lever": ["bar12", [30, 33], [92, 36, 78, 36, 62, 36, 40, 36], [40, 36, 45, 24, 50, 12]],
  "press-to-handstand": ["floor", [57, 68], [48, 36, 50, 60], [48, 36, 31, 41, 14, 48], [48, 36, 65, 41, 82, 48], [50, 60, 50, 72, 50, 84]],
  "one-arm-handstand": ["floor", [44, 70], [50, 40, 50, 62], [50, 40, 41, 24, 33, 10], [50, 40, 59, 24, 67, 10], [50, 62, 50, 74, 50, 86], [50, 62, 62, 66, 72, 70]],
  "one-arm-pull-up": ["bar12", [55, 16], [48, 82, 50, 68, 50, 54, 50, 30], [50, 30, 42, 22, 50, 12], [50, 30, 58, 42, 60, 54]],
  hefesto: ["bar40", [52, 14], [86, 52, 70, 50, 54, 48, 50, 26], [50, 26, 46, 33, 46, 40]],
  "full-planche": ["floor", [66, 56], [6, 56, 20, 56, 34, 56, 56, 58], [56, 58, 53, 71, 50, 84]],
  "iron-cross": ["cross", [50, 26], [50, 94, 50, 80, 50, 64, 50, 38], [50, 38, 32, 38, 16, 38], [50, 38, 68, 38, 84, 38]],
  "planche-push-up": ["floor", [68, 68], [8, 68, 22, 68, 36, 68, 58, 70], [58, 70, 48, 76, 54, 84]],
  "one-arm-front-lever": ["bar12", [30, 33], [92, 36, 78, 36, 62, 36, 40, 36], [40, 36, 45, 24, 50, 12], [40, 36, 52, 42, 62, 42]],
  "one-arm-muscle-up": ["bar40", [56, 12], [44, 80, 46, 62, 48, 46, 52, 22], [52, 22, 51, 31, 50, 40], [52, 22, 64, 27, 72, 34]],
  manna: ["par", [22, 60], [26, 30, 38, 48, 50, 68, 30, 54], [30, 54, 44, 62, 58, 70]],
  maltese: ["rings54", [20, 52], [92, 50, 76, 50, 60, 50, 30, 50], [30, 50, 41, 52, 52, 54]],
  victorian: ["rings44", [20, 48], [92, 50, 76, 50, 60, 50, 30, 50], [30, 50, 41, 47, 52, 44]],
};

// Poses where the knee rests outside on the arm: the leg is drawn in front.
const LEG_IN_FRONT = new Set(["crow-pose", "frog-stand-straight"]);

const LINE = "#4b5263";
const GEAR = "#8b93a3";
const DIM = "#3a3f4a";
const HATCH = "#2f343e";

// ---------- Colors ----------

// Skills use the color of their level (see LEVELS in skills.js):
// bright for the next skill, dark for completed skills.
export function getSkillColors(skillId) {
  const level = LEVELS.find((l) => l.level === getSkill(skillId)?.level) ?? LEVELS[0];
  return { bright: level.color, done: level.dark };
}

export const STATE_COLORS = { open: "#9aa3b2", locked: "#3a3f4a" };

// ---------- Equipment ----------

function line(x1, y1, x2, y2, color, width) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
}

function floor(y = 90) {
  let s = line(2, y, 98, y, LINE, 3);
  for (let x = 8; x < 98; x += 8) {
    s += line(x, y + 2, x - 4, y + 7, HATCH, 1.5);
  }
  return s;
}

function frame(y) {
  return line(16, 3, 16, 97, DIM, 2) + line(84, 3, 84, 97, DIM, 2) + line(16, y, 84, y, GEAR, 4);
}

function ring(x, y) {
  return line(x, 2, x, y - 5, "#5c6473", 1.5) + `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${GEAR}" stroke-width="2.5"/>`;
}

function drawEquipment(type) {
  switch (type) {
    case "floor":
      return floor();
    case "bar12":
      return frame(12);
    case "bar40":
      return frame(40);
    case "lowbar":
      return floor() + line(56, 40, 94, 40, GEAR, 4) + line(90, 40, 90, 90, DIM, 2.5);
    case "dip":
      return floor() + line(30, 50, 74, 50, GEAR, 4) + line(34, 50, 26, 90, GEAR, 2.5) + line(70, 50, 78, 90, GEAR, 2.5);
    case "par":
      return floor() + `<path d="M34 90 L37 75 L63 75 L66 90" fill="none" stroke="${GEAR}" stroke-width="2.5" stroke-linejoin="round"/>`;
    case "bench":
      return floor() + line(4, 76, 66, 76, GEAR, 5) + line(10, 76, 10, 90, GEAR, 2.5) + line(60, 76, 60, 90, GEAR, 2.5);
    case "wall": {
      let s = floor() + line(38, 2, 38, 90, LINE, 4);
      for (let y = 6; y < 90; y += 8) {
        s += line(36, y, 31, y + 5, HATCH, 1.5);
      }
      return s;
    }
    case "pole":
      return floor(96) + line(20, 2, 20, 96, GEAR, 4);
    case "rings40":
      return ring(50, 40);
    case "rings44":
      return ring(50, 44);
    case "rings54":
      return ring(50, 54);
    case "cross":
      return ring(16, 38) + ring(84, 38);
    default:
      return "";
  }
}

// ---------- Body ----------

function points(list) {
  const pairs = [];
  for (let i = 0; i < list.length; i += 2) {
    pairs.push(`${list[i]},${list[i + 1]}`);
  }
  return pairs.join(" ");
}

function polyline(list, width, color) {
  return `<polyline points="${points(list)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// Draws lines (and an optional head) as one outlined shape: a thick colored
// stroke with a thinner background-colored stroke on top.
function outlined(lines, head, color, background) {
  const outer =
    lines.map((l) => polyline(l, 13, color)).join("") +
    (head ? `<circle cx="${head[0]}" cy="${head[1]}" r="8.5" fill="${color}"/>` : "");
  const inner =
    lines.map((l) => polyline(l, 8, background)).join("") +
    (head ? `<circle cx="${head[0]}" cy="${head[1]}" r="6" fill="${background}"/>` : "");
  return outer + inner;
}

// Returns the SVG markup for a skill's figure.
// color: outline color. background: the color behind the figure.
export function renderFigure(skillId, color, background) {
  const pose = POSES[skillId];
  if (!pose) {
    return "";
  }
  const [equipment, head, ...lines] = pose;
  let body;

  if (LEG_IN_FRONT.has(skillId)) {
    // Arms first, then the body on top, so the knee sits in front of the arm.
    const main = lines[0];
    const sx = main[main.length - 2];
    const sy = main[main.length - 1];
    const isArm = (l) => l[0] === sx && l[1] === sy;
    const arms = lines.slice(1).filter(isArm);
    const others = lines.slice(1).filter((l) => !isArm(l));
    body = arms.map((a) => outlined([a], null, color, background)).join("") + outlined([main, ...others], head, color, background);
  } else {
    body = outlined(lines, head, color, background);
  }

  return `<svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">${drawEquipment(equipment)}${body}</svg>`;
}

export function hasFigure(skillId) {
  return Boolean(POSES[skillId]);
}
