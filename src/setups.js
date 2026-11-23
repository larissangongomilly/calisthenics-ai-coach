// Guided setups: step-by-step voice instructions that bring the user into
// the starting position of a skill (see guide.js). Level 1 has its own
// setups in exercises.js; this file adds them for every other skill.
//
// Rules for every setup:
// - The first step places the camera (or, for coach skills, asks for a coach).
// - Steps the camera can check use `check`; things it cannot see use `wait`.
// - The last check step uses the skill's own position rule (`inPosition`), so
//   the guide ends exactly when the camera rules see the user in position.
//
// All setups are BETA like the camera rules: not tested with real people yet.
import { getSkill } from "./skills.js";
import {
  feetUp,
  hanging,
  hipsOverShoulders,
  onHands,
  oneFootUp,
  standing,
  trunkFlat,
  upsideDown,
} from "./pose-checks.js";

const CAMERA_PLACES = {
  side: "to your side",
  "angled-side": "to your side, turned a little toward your front",
  "angled-front": "in front of you, a little to the side",
  front: "in front of you",
  "side+front": "to your side",
};

function cameraStep(id) {
  const place = CAMERA_PLACES[getSkill(id).camera] ?? "to your side";
  return { say: `Place your phone ${place}, so it sees you from head to feet.`, check: (p) => p.visible };
}

const COACH_STEP = {
  say: "Only train this with your coach. They spot you the whole time. Stop if anything hurts.",
  wait: 6000,
};

const say = (text, wait = 5000) => ({ say: text, wait });
const when = (text, check) => ({ say: text, check });
const all = (...checks) => (p) => checks.every((c) => c(p));
const straightArms = (min = 150) => (p) => p.m.elbow >= min;
const bothArmsStraight = (min = 150) => (p) => p.m.elbowMin >= min;
const kneesTucked = (p) => p.m.knee <= 110;
const elbowsIntoBelly = (p) => p.m.elbow >= 60 && p.m.elbow <= 130;

// Step lists that several skills share. `inPos(id)` is the position rule of a skill.
const steps = {
  hangStraight: (grip) => [
    when(grip, hanging),
    when("Hang with straight arms. Pull your shoulders down, away from your ears.", all(hanging, straightArms())),
  ],
  support: (where) => [
    when(where, onHands),
    when("Straighten your arms and push your shoulders down.", all(onHands, straightArms(145))),
  ],
  bench: [
    when("Lie on your back on a bench and hold it firmly behind your head.", trunkFlat),
  ],
  elbowsIn: [
    when("Kneel and place your hands on the floor, fingers pointing to the side or back.", onHands),
    when("Bend your elbows and press them firmly into your belly.", all(onHands, elbowsIntoBelly)),
  ],
  wallKickUp: [
    when("Stand with your back to the wall. Place your hands on the floor, a hand's length from the wall.", onHands),
    when("Kick up one leg after the other until your heels touch the wall.", upsideDown),
  ],
  freeKickUp: [
    say("Make sure you have space in front of you. If you tip over, turn one hand and step out or roll.", 6000),
    when("Place your hands on the floor, shoulder-width apart, fingers spread.", onHands),
    when("Kick up with one leg and bring the other leg after it.", upsideDown),
  ],
  plancheLean: [
    when("Place your hands on the floor or on parallettes, fingers turned slightly outward.", onHands),
    when("Lock your arms and lean your shoulders forward, past your hands.", all(onHands, straightArms(145))),
    say("Round your upper back and push the floor away."),
  ],
  pole: [
    say("Grip the pole: top hand above your head, bottom hand about shoulder-width lower.", 6000),
    say("Lock your bottom arm. Push with it and pull with your top arm."),
  ],
};

// id → function(inPos) returning the steps after the camera step.
const SETUPS = {
  // Level 2
  "elbow-lever-assisted": (inPos) => [
    ...steps.elbowsIn,
    when("Lean forward until your elbows carry your hips. Keep your toes on the floor for support.", inPos),
  ],
  "hanging-knee-raise": (inPos) => [
    when("Jump up and grab the bar, hands shoulder-width apart.", hanging),
    when("Hang with straight arms and pull your shoulders slightly down.", inPos),
    say("Keep your legs still. No swinging.", 4000),
  ],
  "tuck-l-sit": (inPos) => [
    ...steps.support("Sit between parallettes or on the floor and place your hands next to your hips."),
    when("Pull your knees to your chest and lift your hips and feet off the floor.", inPos),
  ],
  "pike-push-up": (inPos) => [
    when("Start in a plank, hands shoulder-width apart.", all(onHands, (p) => p.m.bodyTilt <= 40)),
    when("Walk your feet toward your hands and push your hips up into an upside-down V.", inPos),
    say("Look between your hands. Your head lowers to a spot in front of them."),
  ],
  "wall-handstand": (inPos) => [
    ...steps.wallKickUp,
    when("Straighten your arms and push tall through your shoulders.", inPos),
  ],
  "frog-stand-straight": (inPos) => [
    when("Squat and place your hands on the floor, shoulder-width apart, fingers spread.", onHands),
    when("Keep your arms straight and rest your knees on the outside of your upper arms.", all(onHands, kneesTucked)),
    say("Lean forward slowly until your feet feel light."),
    when("Lift both feet off the floor.", inPos),
  ],
  "pull-up": (inPos) => [
    ...steps.hangStraight("Grab the bar a little wider than your shoulders, palms facing away."),
    when("Tense your belly and keep your legs together.", inPos),
    say("Pull your shoulders down first, then pull your chest to the bar.", 4000),
  ],
  "bar-dip": (inPos) => [
    when("Grip the dip bars and jump up into support.", inPos),
    when("Lock your arms and push your shoulders down, away from your ears.", all(inPos, straightArms())),
    say("Keep your legs together and still.", 4000),
  ],

  // Level 3
  "tuck-dragon-flag": (inPos) => [
    ...steps.bench,
    when("Tuck your knees to your chest.", all(trunkFlat, kneesTucked)),
    when("Roll up onto your upper back until your hips are over your shoulders.", inPos),
    say("Keep your knees tucked and lower slowly, hips and knees together.", 4000),
  ],
  "tuck-back-lever": (inPos) => [
    ...steps.hangStraight("Grip the bar shoulder-width apart, palms facing away."),
    say("Tuck your knees and roll backward between your arms. Only go as far as your shoulders feel good.", 7000),
    when("Lower slowly until your back is level, knees tight to your chest.", inPos),
  ],
  "elbow-lever": (inPos) => [
    ...steps.elbowsIn,
    say("Lean forward until your body rests on your elbows."),
    when("Stretch your legs back and lift your feet off the floor.", inPos),
  ],
  "l-sit": (inPos) => [
    ...steps.support("Place your hands next to your hips, on parallettes or the floor."),
    when("Lift your hips, then raise your straight legs in front of you.", inPos),
  ],
  "archer-push-up": (inPos) => [
    when("Get into a plank with your hands much wider than your shoulders.", inPos),
    say("Turn the fingers of your straight arm a little outward."),
    say("Pick your working side. You lower toward that hand while the other arm stays straight.", 4000),
  ],
  "free-handstand": (inPos) => [
    ...steps.freeKickUp,
    when("Stack your hips over your shoulders and push tall.", inPos),
  ],
  "tuck-front-lever": (inPos) => [
    ...steps.hangStraight("Grip the bar shoulder-width apart, palms facing away."),
    say("Keep your arms straight and pull the bar toward your hips."),
    when("Tuck your knees to your chest and lift until your back is level.", inPos),
  ],
  "pistol-squat": (inPos) => [
    when("Stand tall, side on to the camera.", standing),
    when("Shift your weight onto one leg and lift the other leg straight in front of you.", all(inPos, oneFootUp)),
    say("Reach your arms forward for balance. Keep your heel on the floor.", 4000),
  ],

  // Level 4
  "one-leg-dragon-flag": (inPos) => [
    ...steps.bench,
    when("Tuck one knee to your chest and keep the other leg long.", all(trunkFlat, (p) => p.m.kneeMin <= 110 && p.m.kneeMax >= 150)),
    when("Roll up onto your upper back until your hips are over your shoulders.", inPos),
    say("Lower slowly, your body and long leg in one line.", 4000),
  ],
  "tuck-human-flag": (inPos) => [
    ...steps.pole,
    when("Jump up, tuck your knees and lift your hips until your body is sideways.", inPos),
  ],
  "dragon-flag-negative": (inPos) => [
    ...steps.bench,
    when("Lift your straight legs and roll onto your upper back until your hips are over your shoulders.", inPos),
    say("Squeeze your glutes and lower slowly as one straight line. Stop before your hips bend.", 4000),
  ],
  "tuck-planche": (inPos) => [
    ...steps.plancheLean,
    when("Tuck your knees to your chest and lift your feet off the floor.", inPos),
  ],
  "adv-tuck-front-lever": (inPos, positionOf) => [
    ...steps.hangStraight("Grip the bar shoulder-width apart, palms facing away."),
    when("Lift into your tuck front lever.", positionOf("tuck-front-lever")),
    when("Now open your hips: push your knees away from your chest until your back is flat.", inPos),
  ],
  "wall-handstand-push-up": (inPos) => [
    ...steps.wallKickUp,
    when("Straighten your arms and stack your ribs over your pelvis.", all(inPos, straightArms())),
    say("Lower your head slowly toward the floor, elbows pointing back, not out.", 4000),
  ],
  "dragon-flag": (inPos) => [
    ...steps.bench,
    when("Lift your straight legs and roll onto your upper back until your hips are over your shoulders.", inPos),
    say("Squeeze your glutes. Lower your hips and feet together, as one straight line.", 4000),
  ],
  "bar-muscle-up": () => [
    when("Grip the bar a little wider than your shoulders. A false grip helps.", hanging),
    when("Hang with straight arms and tense your whole body.", all(hanging, straightArms(140))),
    say("Pull hard to your lower chest, then lean over the bar and push up.", 4000),
  ],

  // Level 5
  "one-arm-elbow-lever": (inPos) => [
    when("Kneel and place one hand on the floor, fingers pointing to the side.", onHands),
    when("Bend that elbow and press it into the side of your belly, next to your hip.", all(onHands, elbowsIntoBelly)),
    say("Lean onto the elbow and turn your pelvis back a little."),
    when("Stretch your legs back and lift your feet. Keep your free hand close to the floor.", inPos),
  ],
  "v-sit": (inPos, positionOf) => [
    ...steps.support("Place your hands next to your hips, on parallettes or the floor."),
    when("Lift into an L-sit first.", positionOf("l-sit")),
    when("Push your shoulders down hard, lean back a little and lift your legs higher.", inPos),
  ],
  "adv-tuck-planche": (inPos, positionOf) => [
    ...steps.plancheLean,
    when("Lift into your tuck planche.", positionOf("tuck-planche")),
    when("Now open your hips: push your knees back until your back is flat.", inPos),
  ],
  "straddle-front-lever": (inPos, positionOf) => [
    ...steps.hangStraight("Grip the bar shoulder-width apart, palms facing away."),
    when("Lift into your tuck front lever.", positionOf("tuck-front-lever")),
    when("Open your legs wide into a straddle and straighten them, hips at shoulder height.", inPos),
  ],
  "back-lever": (inPos, positionOf) => [
    ...steps.hangStraight("Grip the bar shoulder-width apart, palms facing away."),
    say("Tuck your knees and roll backward between your arms.", 6000),
    when("Lower into your tuck back lever.", positionOf("tuck-back-lever")),
    when("Slowly straighten your body, facing the floor.", inPos),
  ],
  "ring-muscle-up": () => [
    when("Grip the rings with a false grip: your wrists over the rings.", hanging),
    when("Hang with straight arms and the rings close to your body.", all(hanging, straightArms(140))),
    say("Pull the rings to your chest, then bring both shoulders over the rings together.", 4000),
  ],
  "free-handstand-push-up": (inPos) => [
    ...steps.freeKickUp,
    when("Find your balance with straight arms.", all(inPos, straightArms())),
    say("Lower slowly and keep your legs above you.", 4000),
  ],
  "one-arm-push-up": (inPos) => [
    when("Get into a plank with your feet wide apart.", all(onHands, (p) => p.m.bodyTilt <= 35, (p) => p.m.knee >= 150)),
    say("Place your working hand under your chest and put the other hand behind your back.", 6000),
    when("Keep both sides of your pelvis level.", inPos),
  ],

  // Level 6
  "straddle-planche": (inPos, positionOf) => [
    ...steps.plancheLean,
    when("Lift into your tuck planche.", positionOf("tuck-planche")),
    when("Open your legs wide and straighten them back, body level.", inPos),
  ],
  "human-flag": (inPos, positionOf) => [
    ...steps.pole,
    when("Jump up into your tuck flag.", positionOf("tuck-human-flag")),
    when("Extend your legs until your body forms one line.", inPos),
  ],
  "front-lever": (inPos, positionOf) => [
    ...steps.hangStraight("Grip the bar shoulder-width apart, palms facing away."),
    when("Lift into your tuck front lever.", positionOf("tuck-front-lever")),
    when("Straighten your legs and lift your hips until your body is level.", inPos),
  ],
  "press-to-handstand": () => [
    when("Stand in a wide straddle and place your hands on the floor in front of you.", all(onHands, (p) => p.side.ankle.y > p.side.hip.y)),
    when("Lean your shoulders forward over your hands, arms straight.", all(onHands, straightArms())),
    say("Bring your hips over your shoulders before your feet leave the floor.", 4000),
  ],
  "one-arm-handstand": (inPos) => [
    ...steps.freeKickUp,
    when("Find your balance in a straight handstand.", inPos),
    say("Open your legs into a straddle."),
    say("Shift your weight slowly onto one hand. Keep your hips over that hand.", 4000),
  ],
  "one-arm-pull-up": (inPos) => [
    when("Grab the bar with one hand, palm facing you or away.", hanging),
    when("Hang with a straight arm. Pull that shoulder down and tense your body.", all(inPos, straightArms())),
    say("Pull without twisting. Keep your free hand off the bar.", 4000),
  ],
  hefesto: () => [
    when("Hang from the bar the way your coach showed you.", hanging),
    when("Straight arms, body tense, hips close to the bar.", all(hanging, straightArms(140))),
    say("Pull without a jerk. Stop if your elbows or shoulders hurt.", 4000),
  ],

  // Level 7
  "full-planche": (inPos, positionOf) => [
    ...steps.plancheLean,
    when("Lift into your straddle planche.", positionOf("straddle-planche")),
    when("Close your legs slowly and keep your body level.", inPos),
  ],
  "iron-cross": (inPos) => [
    when("Get into support on the rings, facing the camera.", all(onHands, bothArmsStraight())),
    say("Lock your elbows and turn the rings slightly out."),
    when("Lower your arms slowly out to the sides, only as far as you control it.", inPos),
  ],
  "planche-push-up": (inPos, positionOf) => [
    ...steps.plancheLean,
    when("Lift into your planche.", all(onHands, feetUp, straightArms(155), positionOf("full-planche"))),
    when("Hold the body line. Lower with chest and hips together.", inPos),
  ],
  "one-arm-front-lever": (inPos, positionOf) => [
    ...steps.hangStraight("Grip the bar shoulder-width apart, palms facing away."),
    when("Lift into your front lever with both hands.", positionOf("front-lever")),
    when("Let go with one hand slowly. Keep your pelvis at shoulder height.", inPos),
  ],
  "one-arm-muscle-up": () => [
    when("Grip the bar with one hand, the way your coach showed you.", hanging),
    when("Hang with a straight arm and tense your body.", all(hanging, straightArms(140))),
    say("Move through the transition calmly.", 4000),
  ],
  manna: (inPos, positionOf) => [
    ...steps.support("Place your hands behind your hips, on parallettes or the floor, fingers pointing back."),
    when("Lift into an L-sit.", positionOf("l-sit")),
    when("Push your shoulders forward and up, and lift your legs high over your body.", inPos),
  ],
  maltese: (inPos) => [
    when("Get into support on the rings, side on to the camera.", all(onHands, bothArmsStraight())),
    say("Turn the rings out and lean forward, like a planche."),
    when("Spread your arms wide and lower your body to ring height.", inPos),
  ],
  victorian: (inPos) => [
    when("Hang from the rings with straight arms.", all(hanging, bothArmsStraight())),
    say("Rotate backward into a back lever on the rings, with your coach's help.", 7000),
    when("Lift your body up to ring height, facing up, legs together.", inPos),
  ],
};

// Coach skills start with the coach step instead of the camera step.
const COACH_FIRST = new Set(["hefesto", "iron-cross", "one-arm-muscle-up", "maltese", "victorian"]);

// Adds a `setup` to every exercise that has none yet.
export function addSetups(exercises) {
  const positionOf = (id) => (p) => exercises[id].position(p) === true;
  for (const [id, build] of Object.entries(SETUPS)) {
    const exercise = exercises[id];
    if (!exercise || exercise.setup) continue;
    const intro = COACH_FIRST.has(id) ? [COACH_STEP, cameraStep(id)] : [cameraStep(id)];
    exercise.setup = [...intro, ...build(positionOf(id), positionOf)];
  }
}
