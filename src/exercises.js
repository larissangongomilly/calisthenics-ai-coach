// Camera rules for each skill. The keys are the skill ids from skills.js.
// Based on docs/pushup-form.md and docs/technique-guide.md.
//
// Only the push-up rules are tested. All other rules are BETA: they follow
// the technique guide, but have not been tested with real people yet.
//
// Each exercise has:
// - measure:  "reps" or "hold"
// - position(pose): true when the user is in the skill position,
//                   otherwise a message (string or { text, spoken })
// - checks:   form rules, each with ok(pose), a short cue and an error text
// - rep:      for reps: { metric(pose), down, up, start } (an angle that gets
//             smaller in the hard part), or { phases: { start(pose), end(pose) } }
// - goodCue:  what the coach says when all checks pass
//
// Pose values (see pose.js): pose.side has joints in pixels (y grows downward),
// pose.m has angles in degrees. Tilt angles are 0 (horizontal) to 90 (vertical).
import { calculateAngle } from "./angles.js";
import { checkBodyLine, getPositionStatus } from "./rules.js";

// ---------- Small helpers ----------

// Hands below the shoulders (support on the floor, bars or parallettes)
const onHands = (p) => p.side.wrist.y > p.side.shoulder.y;
// Hands above the shoulders (hanging from a bar or rings)
const hanging = (p) => p.side.wrist.y < p.side.shoulder.y;
// Hands above the hips (levers below a bar)
const handsAboveHips = (p) => p.side.wrist.y < p.side.hip.y;
// Feet higher than the hands (feet are off the floor in hand balances)
const feetUp = (p) => p.side.ankle.y < p.side.wrist.y;
// Upside down: feet above hips above shoulders, hands on the floor
const upsideDown = (p) =>
  p.side.ankle.y < p.side.hip.y && p.side.hip.y < p.side.shoulder.y && onHands(p);
// Hips at least roughly as high as the shoulders (dragon flag on a bench)
const hipsOverShoulders = (p) => p.side.hip.y <= p.side.shoulder.y + 0.05 * p.height;

// Returns true if every condition holds, otherwise the setup message.
function inPosition(message, ...conditions) {
  return (p) => (conditions.every((condition) => condition(p)) ? true : message);
}

function check(id, ok, cue, error) {
  return { id, ok, cue, error };
}

const armsLong = (min = 155) =>
  check("arms", (p) => p.m.elbow >= min, "Keep your arms long.", "Arms bent");
const kneesStraight = (cue = "Straighten your knees.") =>
  check("knees", (p) => p.m.knee >= 160, cue, "Knees bent");
const straightLine = (cue, error = "Body line broke", min = 160) =>
  check("line", (p) => p.m.bodyLine >= min, cue, error);
const bodyLevel = (cue, max = 20) =>
  check("level", (p) => p.m.bodyTilt <= max, cue, "Body not level");
const trunkLevel = (cue, max = 20) =>
  check("trunk", (p) => p.m.trunkTilt <= max, cue, "Hips too low");

// ---------- Shared skill shapes ----------

function elbowLever(cue) {
  return {
    measure: "hold",
    position: inPosition(
      "Hands down, elbows into your belly, lean forward and lift your feet.",
      onHands,
      (p) => p.m.elbow >= 60 && p.m.elbow <= 130,
      feetUp,
      (p) => p.m.bodyTilt <= 35
    ),
    checks: [
      straightLine(cue, "Hips dropped", 155),
      bodyLevel("Keep your body level."),
    ],
    goodCue: "Good line. Keep your elbows close.",
  };
}

function handstandHold(cue, setup) {
  return {
    measure: "hold",
    position: inPosition(setup, upsideDown, (p) => p.m.elbow >= 140),
    checks: [
      straightLine(cue, "Banana shape (arched back)", 160),
      check("shoulders", (p) => p.m.shoulder >= 150, "Push tall through your shoulders.", "Shoulders not fully open"),
    ],
    goodCue: "Good line. Keep breathing.",
  };
}

function handstandPushUp(cue, setup) {
  return {
    measure: "reps",
    position: inPosition(setup, upsideDown),
    rep: { metric: (p) => p.m.elbow, down: 100, up: 155, start: 140, partialCue: "Lower a little further, with control." },
    checks: [straightLine(cue, "Arched back", 155)],
    goodCue: "Good control.",
  };
}

function frontLever(cue, setup, { tuck = false, openHip = false } = {}) {
  const conditions = [handsAboveHips, (p) => p.m.elbow >= 140];
  if (tuck) {
    conditions.push((p) => p.m.trunkTilt <= 35, (p) => p.m.knee <= (openHip ? 130 : 110));
    if (openHip) {
      conditions.push((p) => p.m.hip >= 100);
    }
  } else {
    conditions.push((p) => p.m.bodyTilt <= 35);
  }
  const checks = tuck
    ? [trunkLevel(cue), armsLong()]
    : [straightLine(cue, "Hips too low"), kneesStraight(), armsLong()];
  return {
    measure: "hold",
    position: inPosition(setup, ...conditions),
    checks,
    goodCue: "Good. Keep the bar pulled toward your hips.",
  };
}

function planche(cue, setup, { tuck = false, openHip = false, straightLegs = false } = {}) {
  const conditions = [onHands, (p) => p.m.elbow >= 145, feetUp];
  if (tuck) {
    conditions.push((p) => p.m.trunkTilt <= 40, (p) => p.m.knee <= (openHip ? 130 : 110));
    if (openHip) {
      conditions.push((p) => p.m.hip >= 100);
    }
  } else {
    conditions.push((p) => p.m.bodyTilt <= 35);
  }
  const checks = [check("arms", (p) => p.m.elbow >= 160, cue, "Arms bent")];
  if (tuck) {
    checks.push(trunkLevel("Bring your hips up to shoulder height.", 25));
  } else {
    checks.push(straightLine("Hips in line with your trunk.", "Hips out of line"), bodyLevel("Keep your body level."));
  }
  if (straightLegs) {
    checks.push(kneesStraight());
  }
  return {
    measure: "hold",
    position: inPosition(setup, ...conditions),
    checks,
    goodCue: "Good. Push the floor away.",
  };
}

function pullUp(setup) {
  return {
    measure: "reps",
    position: inPosition(setup, hanging),
    rep: { metric: (p) => p.m.elbow, down: 70, up: 150, start: 140, partialCue: "Pull a little higher." },
    checks: [straightLine("Pull with your elbows and keep your legs still.", "Legs swinging or kicking", 150)],
    goodCue: "Good pull.",
  };
}

function muscleUp(cue) {
  return {
    measure: "reps",
    position: () => true,
    rep: {
      phases: {
        start: (p) => hanging(p) && p.m.elbow >= 140,
        end: (p) => onHands(p) && p.m.elbow >= 150,
      },
    },
    checks: [straightLine(cue, "Big leg kick", 130)],
    goodCue: "Good. Finish with straight arms.",
  };
}

function dragonFlag(cue, { down = 20, extraChecks = [] } = {}) {
  return {
    measure: "reps",
    position: inPosition(
      "Lie on the bench, hold behind your head and lift your hips over your shoulders.",
      hipsOverShoulders
    ),
    rep: { metric: (p) => p.m.bodyTilt, down, up: 60, start: 55, partialCue: "Lower a little further, with control." },
    checks: [straightLine(cue, "Hips bent (body not straight)"), ...extraChecks],
    goodCue: "Good control.",
  };
}

function ringsHorizontal(cue) {
  return {
    measure: "hold",
    position: inPosition(
      "From support on the rings, move into a level body at ring height.",
      (p) => p.m.bodyTilt <= 30,
      (p) => p.m.elbowMin >= 140,
      (p) => Math.abs(p.side.wrist.y - p.side.hip.y) <= 0.15 * p.height
    ),
    checks: [
      straightLine(cue, "Hips out of line"),
      check("rings", (p) => p.m.wristLevelDiff <= 0.05, "Keep both rings at the same height.", "Rings uneven"),
    ],
    goodCue: "Good. Keep the rings steady.",
  };
}

// ---------- All skills ----------

export const EXERCISES = {
  // Level 1 – Basics (push-up: tested, everything else: beta)
  "push-up": {
    measure: "reps",
    position(p) {
      const status = getPositionStatus(p.raw, p.width, p.height);
      if (status === "not_ready") {
        return "Get into plank position, side on to the camera.";
      }
      if (status === "knees_bent") {
        return {
          text: "Knees down? This app counts full push-ups. Straighten your legs.",
          spoken: "Straighten your legs for a full push-up.",
        };
      }
      return true;
    },
    // Uses the 0..1 coordinates, like the original push-up rules.
    rep: {
      metric: (p) => calculateAngle(p.raw.shoulder, p.raw.elbow, p.raw.wrist),
      down: 90,
      up: 160,
      start: 140,
      partialCue: "Go a little lower.",
    },
    checks: [
      {
        id: "sagging",
        ok: (p) => checkBodyLine(p.raw).hipPosition !== "sagging",
        cue: { text: "Lift your hips a little.", spoken: "Gently lift your hips." },
        error: "Hips sagged",
      },
      {
        id: "high",
        ok: (p) => checkBodyLine(p.raw).hipPosition !== "high",
        cue: "Lower your hips a little.",
        error: "Hips were too high",
      },
    ],
    goodCue: { text: "Great body line!", spoken: "Great body line." },
  },

  "inverted-row": {
    measure: "reps",
    position: inPosition(
      "Lie under a low bar, side on to the camera, arms straight.",
      hanging,
      (p) => p.m.bodyTilt >= 5 && p.m.bodyTilt <= 60
    ),
    rep: { metric: (p) => p.m.elbow, down: 100, up: 150, start: 140, partialCue: "Pull your chest closer to the bar." },
    checks: [straightLine("Keep your hips level with your body.", "Hips dropped")],
    goodCue: "Good row.",
  },

  "hollow-body-hold": {
    measure: "hold",
    position: inPosition(
      "Lie on your back, side on to the camera, and lift your legs.",
      (p) => p.m.trunkTilt <= 40,
      (p) => p.side.ankle.y < p.side.hip.y && p.m.legTilt >= 5
    ),
    checks: [
      check("legs-low", (p) => p.m.legTilt >= 15, "Raise your legs a little.", "Legs too close to the floor"),
      kneesStraight("Straighten your legs if your lower back stays down."),
    ],
    goodCue: "Good. Keep your lower back on the floor.",
  },

  "crow-pose": {
    measure: "hold",
    position: inPosition(
      "Squat, place your hands, knees on your arms, and lift your feet.",
      onHands,
      feetUp,
      (p) => p.m.elbow < 165
    ),
    checks: [check("tuck", (p) => p.m.knee <= 110, "Keep your knees pulled in.", "Legs drifted away")],
    goodCue: "Good balance. Keep pressing into the floor.",
  },

  // Level 2 – First steps
  "elbow-lever-assisted": {
    measure: "hold",
    position: inPosition(
      "Hands down, elbows into your belly, legs stretched back.",
      onHands,
      (p) => p.m.elbow >= 60 && p.m.elbow <= 130,
      (p) => p.m.trunkTilt <= 40
    ),
    checks: [straightLine("Shift a little more weight onto your hands.", "Hips dropped", 150)],
    goodCue: "Good. Keep your elbows close.",
  },

  "hanging-knee-raise": {
    measure: "reps",
    position: inPosition("Hang from the bar with straight arms.", hanging, (p) => p.m.elbow >= 140),
    rep: { metric: (p) => p.m.hip, down: 100, up: 160, start: 145, partialCue: "Lift your knees higher." },
    checks: [armsLong(140)],
    goodCue: "Lift your knees without swinging.",
  },

  "tuck-l-sit": {
    measure: "hold",
    position: inPosition(
      "Support on straight arms and pull your knees to your chest.",
      onHands,
      (p) => p.m.elbow >= 145,
      (p) => p.m.hip <= 100,
      (p) => p.m.knee <= 110
    ),
    checks: [check("arms", (p) => p.m.elbow >= 160, "Push yourself higher out of the support.", "Sinking in the support")],
    goodCue: "Good. Keep pressing down.",
  },

  "pike-push-up": {
    measure: "reps",
    position: inPosition(
      "Hands down, hips high in an upside-down V.",
      onHands,
      (p) => p.side.hip.y < p.side.shoulder.y,
      (p) => p.m.hip <= 120
    ),
    rep: { metric: (p) => p.m.elbow, down: 100, up: 155, start: 140, partialCue: "Lower your head a little further." },
    checks: [check("hips", (p) => p.m.hip <= 120, "Keep your hips up while your head lowers.", "Hips dropped")],
    goodCue: "Good pike.",
  },

  "wall-handstand": handstandHold(
    "Push tall and bring your ribs over your pelvis.",
    "Walk up the wall into a handstand, side on to the camera."
  ),

  "frog-stand-straight": {
    measure: "hold",
    position: inPosition("Squat, hands down, knees on your arms, and lift your feet.", onHands, feetUp),
    checks: [check("arms", (p) => p.m.elbow >= 155, "Arms long, shift your weight forward slowly.", "Arms bent")],
    goodCue: "Good balance.",
  },

  "pull-up": pullUp("Hang from the bar with straight arms."),

  "bar-dip": {
    measure: "reps",
    position: inPosition("Support on the bars with straight arms.", onHands, (p) => p.m.trunkTilt >= 45),
    rep: { metric: (p) => p.m.elbow, down: 95, up: 155, start: 140, partialCue: "Go a little lower." },
    checks: [check("lean", (p) => p.m.trunkTilt >= 35, "Lower slowly, keep your legs still.", "Leaning too far forward")],
    goodCue: "Good dip.",
  },

  // Level 3 – First free skills
  "tuck-dragon-flag": {
    measure: "reps",
    position: inPosition(
      "Lie on the bench, hold behind your head and roll your hips over your shoulders.",
      hipsOverShoulders
    ),
    rep: { metric: (p) => p.m.trunkTilt, down: 35, up: 60, start: 55, partialCue: "Lower a little further, with control." },
    checks: [check("tuck", (p) => p.m.knee <= 110, "Keep your knees tucked and move your hips with them.", "Knees opened")],
    goodCue: "Good control.",
  },

  "tuck-back-lever": {
    measure: "hold",
    position: inPosition(
      "From the bar, rotate into a tuck with your body level.",
      handsAboveHips,
      (p) => p.m.trunkTilt <= 35,
      (p) => p.m.knee <= 110
    ),
    checks: [trunkLevel("Keep your knees tight and your body level."), armsLong(150)],
    goodCue: "Good. Keep your shoulders active.",
  },

  "elbow-lever": elbowLever("Stretch your legs back and bring your hips to chest height."),

  "l-sit": {
    measure: "hold",
    position: inPosition(
      "Support on straight arms and lift your legs in front of you.",
      onHands,
      (p) => p.m.elbow >= 145,
      (p) => p.m.hip <= 120,
      (p) => p.m.legTilt <= 35
    ),
    checks: [
      kneesStraight("Arms long, straighten your knees a little more."),
      check("legs-low", (p) => p.side.ankle.y <= p.side.hip.y || p.m.legTilt <= 15, "Lift your legs a little higher.", "Legs below horizontal"),
    ],
    goodCue: "Good. Press the bars down.",
  },

  "archer-push-up": {
    measure: "reps",
    position: inPosition("Get into a wide plank.", onHands, (p) => p.m.bodyTilt <= 40),
    rep: { metric: (p) => p.m.elbowMin, down: 90, up: 150, start: 140, partialCue: "Go a little lower toward your working hand." },
    checks: [straightLine("Chest to your working hand, hips parallel to the floor.", "Hips dropped", 155)],
    goodCue: "Good control.",
  },

  "free-handstand": handstandHold(
    "Push tall and bring your feet over your hips.",
    "Kick up into a handstand, side on to the camera."
  ),

  "tuck-front-lever": frontLever(
    "Arms long, lift your hips a little higher.",
    "Hang from the bar, tuck your knees and lift your body level.",
    { tuck: true }
  ),

  "pistol-squat": {
    measure: "reps",
    position: inPosition("Stand on one leg, side on to the camera.", (p) => p.m.trunkTilt >= 30),
    rep: { metric: (p) => p.m.kneeMin, down: 80, up: 160, start: 140, partialCue: "Go a little lower if you can control it." },
    checks: [check("free-leg", (p) => p.m.kneeMax >= 140, "Keep your free leg straight and forward.", "Free leg bent")],
    goodCue: "Heel down, knee toward your toes.",
  },

  // Level 4 – Advanced
  "one-leg-dragon-flag": {
    measure: "reps",
    position: inPosition(
      "Lie on the bench, hold behind your head, one knee tucked, one leg long.",
      hipsOverShoulders
    ),
    rep: { metric: (p) => p.m.trunkTilt, down: 25, up: 55, start: 50, partialCue: "Lower a little further, with control." },
    checks: [check("long-leg", (p) => p.m.kneeMax >= 155, "Keep your body and long leg in one line.", "Long leg bent")],
    goodCue: "Good control.",
  },

  "tuck-human-flag": {
    measure: "hold",
    position: inPosition(
      "Grip the pole, push with the bottom arm, pull with the top arm and tuck your knees.",
      (p) => p.m.trunkTilt <= 35,
      (p) => p.m.kneeMin <= 110
    ),
    checks: [trunkLevel("Push away with the bottom arm and lift your hips.")],
    goodCue: "Good. Keep pushing and pulling.",
  },

  "dragon-flag-negative": dragonFlag("Stop lowering before your hips give in."),

  "tuck-planche": planche(
    "Keep your knees free and push the floor away.",
    "Hands down, lean forward, tuck your knees and lift your feet.",
    { tuck: true }
  ),

  "adv-tuck-front-lever": frontLever(
    "Bring your knees a bit closer and keep your hips up.",
    "Hang from the bar in a tuck and open your hips a little.",
    { tuck: true, openHip: true }
  ),

  "wall-handstand-push-up": handstandPushUp(
    "Keep your ribs over your pelvis and lower slowly.",
    "Kick up into a handstand against the wall, side on to the camera."
  ),

  "dragon-flag": dragonFlag("Lift your hips and feet together.", { extraChecks: [kneesStraight()] }),

  "bar-muscle-up": muscleUp("Pull higher first, then both elbows over the bar together."),

  // Level 5 – Very advanced
  "one-arm-elbow-lever": elbowLever("Turn your pelvis back a little and stretch your legs back."),

  "v-sit": {
    measure: "hold",
    position: inPosition(
      "Support on straight arms and lift your straight legs above horizontal.",
      onHands,
      (p) => p.m.elbow >= 145,
      (p) => p.side.ankle.y < p.side.hip.y && p.m.legTilt >= 20
    ),
    checks: [kneesStraight("Press the bars down and keep your knees long."), armsLong()],
    goodCue: "Good compression.",
  },

  "adv-tuck-planche": planche(
    "Knees in a little and push the floor further away.",
    "Get into a tuck planche and open your hips a little.",
    { tuck: true, openHip: true }
  ),

  "straddle-front-lever": frontLever(
    "Straighten your knees, hips to shoulder height.",
    "Hang from the bar and lift your straddled legs level."
  ),

  "back-lever": frontLever(
    "Lift your waist and reach your legs back.",
    "From the bar, lower into a level body facing the floor."
  ),

  "ring-muscle-up": muscleUp("Rings close to your chest, both shoulders over the rings together."),

  "free-handstand-push-up": handstandPushUp(
    "Lower slowly and keep your legs above you.",
    "Kick up into a handstand, side on to the camera."
  ),

  "one-arm-push-up": {
    measure: "reps",
    position: inPosition(
      "Get into a plank with wide feet and one hand on the floor.",
      onHands,
      (p) => p.m.bodyTilt <= 35,
      (p) => p.m.knee >= 150
    ),
    rep: { metric: (p) => p.m.elbowMin, down: 90, up: 150, start: 140, partialCue: "Go a little lower." },
    checks: [straightLine("Keep both sides of your pelvis level.", "Hips dropped", 155)],
    goodCue: "Good control.",
  },

  // Level 6 – Expert
  "straddle-planche": planche(
    "Hips in line with your trunk, arms long.",
    "Lean forward on straight arms and lift your straddled legs level."
  ),

  "human-flag": {
    measure: "hold",
    position: inPosition(
      "Grip the pole and lift your body sideways.",
      (p) => p.m.trunkTilt <= 35,
      (p) => p.m.elbowMin >= 130
    ),
    checks: [
      straightLine("Legs together, hips up.", "Hips out of line"),
      bodyLevel("Push further away with the bottom arm and lift your legs."),
    ],
    goodCue: "Good flag.",
  },

  "front-lever": frontLever(
    "Lift your hips and straighten your knees.",
    "Hang from the bar and lift your body level."
  ),

  "press-to-handstand": {
    measure: "reps",
    position: () => true,
    rep: {
      phases: {
        start: (p) => onHands(p) && p.side.ankle.y > p.side.hip.y,
        end: upsideDown,
      },
    },
    checks: [check("arms", (p) => p.m.elbow >= 150, "Hips over your hands, then lift your legs.", "Arms bent")],
    goodCue: "Good press.",
  },

  "one-arm-handstand": handstandHold(
    "Push the supporting shoulder up and keep your hips over your hand.",
    "Get into a straddle handstand, then shift onto one hand."
  ),

  "one-arm-pull-up": pullUp("Hang from the bar with one straight arm."),

  hefesto: {
    measure: "reps",
    position: () => true,
    rep: {
      phases: {
        start: (p) => hanging(p) && p.m.elbow >= 140,
        end: (p) => onHands(p) && p.m.elbow >= 140,
      },
    },
    checks: [],
    goodCue: "Pull without a jerk and keep your hips close to the bar.",
  },

  // Level 7 – Elite
  "full-planche": planche(
    "Body level, arms long, push the floor away.",
    "Lean forward on straight arms and lift your closed legs level.",
    { straightLegs: true }
  ),

  "iron-cross": {
    measure: "hold",
    position: inPosition(
      "From support on the rings, lower your straight arms out to the sides. Face the camera.",
      (p) => p.m.leftArmTilt <= 25 && p.m.rightArmTilt <= 25,
      (p) => p.m.trunkTilt >= 60
    ),
    checks: [
      check("level", (p) => p.m.wristLevelDiff <= 0.05, "Keep both arms at the same height.", "Arms uneven"),
      check("arms", (p) => p.m.elbowMin >= 160, "Keep your arms straight.", "Arms bent"),
    ],
    goodCue: "Good. Keep the rings still.",
  },

  "planche-push-up": {
    measure: "reps",
    position: inPosition(
      "Get into a full planche, side on to the camera.",
      onHands,
      feetUp,
      (p) => p.m.bodyTilt <= 30
    ),
    rep: { metric: (p) => p.m.elbow, down: 100, up: 155, start: 145, partialCue: "Lower a little further, with control." },
    checks: [straightLine("Move your chest and hips together, straighten your arms at the top.", "Hips out of line")],
    goodCue: "Good control.",
  },

  "one-arm-front-lever": frontLever(
    "Keep your pelvis at shoulder height and your working arm long.",
    "Hang from the bar with one arm and lift your body level."
  ),

  "one-arm-muscle-up": muscleUp("Move through the transition calmly."),

  manna: {
    measure: "hold",
    position: inPosition(
      "Support on straight arms and lift your legs high over your body.",
      onHands,
      (p) => p.m.elbow >= 145,
      (p) => p.m.hip <= 70,
      (p) => p.side.ankle.y < p.side.shoulder.y
    ),
    checks: [kneesStraight("Knees long, lift your pelvis with control."), armsLong()],
    goodCue: "Good compression.",
  },

  maltese: ringsHorizontal("Hips in line and both rings at the same height."),

  victorian: ringsHorizontal("Lift your hips, legs together, rings steady."),
};

export function getExercise(id) {
  return EXERCISES[id] ?? null;
}
