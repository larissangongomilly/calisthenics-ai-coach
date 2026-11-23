// Skill path configuration.
// Preliminary, not reviewed by calisthenics experts.
// See docs/skill-path.md (rules) and docs/technique-guide.md (technique per skill).
// All rules and numbers live here, so they can be changed in one place.

export const RULES = {
  // Counts as practice for the weekly streak.
  practice: { minCleanReps: 3, minHoldSeconds: 20 },
  // A skill is completed with this many clean reps in one set and this form score.
  skillCompleted: { minCleanReps: 5, minFormScore: 80 },
  // Proposal only (open question): completion rule for hold skills.
  holdCompleted: { minHoldSeconds: 10, minFormScore: 80 },
  // Level 1 is always unlocked. A level unlocks when the one before it is completed.
  firstUnlockedLevel: 1,
};

export const TRACKS = {
  A: "Entry",
  B: "Build-up",
  C: "Milestone",
};

// How the user should film themselves (see docs/technique-guide.md).
export const CAMERA_VIEWS = {
  side: "Film from the side",
  "angled-side": "Film from the side, turned slightly toward the camera",
  "angled-front": "Film from the front, turned slightly to the side",
  front: "Film from the front",
  "side+front": "Needs a side view and a front view",
};

export const LEVELS = [
  { level: 1, name: "Basics" },
  { level: 2, name: "First steps" },
  { level: 3, name: "First free skills" },
  { level: 4, name: "Advanced" },
  { level: 5, name: "Very advanced" },
  { level: 6, name: "Expert" },
  { level: 7, name: "Elite" },
];

// Small helper to keep the list below short and readable.
// measure: "reps" for dynamic skills, "hold" for static skills.
// camera: key of CAMERA_VIEWS. cue: the main live feedback sentence.
// coachRequired: never train alone, needs a coach and proper equipment.
function skill(id, name, level, track, measure, camera, cue, extra = {}) {
  return {
    id,
    name,
    level,
    track,
    measure,
    camera,
    cue,
    evaluable: false,
    coachRequired: false,
    milestones: [],
    ...extra,
  };
}

const COACH = { coachRequired: true };

export const SKILLS = [
  // Level 1 – Basics
  skill("push-up", "Classic push-up", 1, "A", "reps", "side",
    "Lower your chest and hips together.", {
      evaluable: true,
      milestones: ["Lower once with control", "First clean rep", "Five clean reps in a row"],
    }),
  skill("inverted-row", "Inverted row", 1, "A", "reps", "side",
    "Keep your hips level with your body."),
  skill("hollow-body-hold", "Hollow body hold", 1, "A", "hold", "side",
    "Raise your legs a little."),
  skill("crow-pose", "Crow pose / frog stand (bent arms)", 1, "B", "hold", "side",
    "Lift one foot first.", {
      milestones: ["Lift one foot briefly", "Lift both feet briefly", "Hold for 5 seconds"],
    }),

  // Level 2 – First steps
  skill("elbow-lever-assisted", "Elbow lever with foot assist", 2, "A", "hold", "side",
    "Shift a little more weight onto your hands."),
  skill("hanging-knee-raise", "Hanging knee raise", 2, "A", "reps", "side",
    "Lift your knees without swinging."),
  skill("tuck-l-sit", "Tuck L-sit", 2, "B", "hold", "side",
    "Push yourself higher out of the support."),
  skill("pike-push-up", "Pike push-up", 2, "B", "reps", "side",
    "Keep your hips up while your head lowers."),
  skill("wall-handstand", "Wall handstand", 2, "B", "hold", "side",
    "Push tall and bring your ribs over your pelvis."),
  skill("frog-stand-straight", "Frog stand (straight arms)", 2, "C", "hold", "angled-side",
    "Arms long, shift your weight forward slowly."),
  skill("pull-up", "Pull-up", 2, "C", "reps", "angled-side",
    "Pull with your elbows and keep your legs still."),
  skill("bar-dip", "Bar dip", 2, "C", "reps", "side",
    "Lower slowly, keep your legs still."),

  // Level 3 – First free skills
  skill("tuck-dragon-flag", "Tuck dragon flag", 3, "A", "reps", "side",
    "Keep your knees tucked and move your hips with them."),
  skill("tuck-back-lever", "Tuck back lever", 3, "A", "hold", "side",
    "Keep your knees tight and your body level."),
  skill("elbow-lever", "Free elbow lever", 3, "B", "hold", "side",
    "Stretch your legs back and bring your hips to chest height.", {
      milestones: [
        "Both feet free briefly",
        "Hold for 3 seconds",
        "Hold for 5 seconds with straight legs",
      ],
    }),
  skill("l-sit", "L-sit", 3, "B", "hold", "side",
    "Arms long, straighten your knees a little more."),
  skill("archer-push-up", "Archer push-up", 3, "B", "reps", "angled-front",
    "Chest to your working hand, hips parallel to the floor."),
  skill("free-handstand", "Free handstand", 3, "C", "hold", "side",
    "Push tall and bring your feet over your hips."),
  skill("tuck-front-lever", "Tuck front lever", 3, "C", "hold", "side",
    "Arms long, lift your hips a little higher."),
  skill("pistol-squat", "Pistol squat", 3, "C", "reps", "angled-front",
    "Heel down, knee toward your toes."),

  // Level 4 – Advanced
  skill("one-leg-dragon-flag", "One-leg dragon flag", 4, "A", "reps", "side",
    "Keep your body and long leg in one line."),
  skill("tuck-human-flag", "Tuck human flag", 4, "A", "hold", "front",
    "Push away with the bottom arm and lift your hips."),
  skill("dragon-flag-negative", "Straight dragon flag negative", 4, "B", "reps", "side",
    "Stop lowering before your hips give in."),
  skill("tuck-planche", "Tuck planche", 4, "B", "hold", "side",
    "Keep your knees free and push the floor away."),
  skill("adv-tuck-front-lever", "Advanced tuck front lever", 4, "B", "hold", "side",
    "Bring your knees a bit closer and keep your hips up."),
  skill("wall-handstand-push-up", "Wall handstand push-up", 4, "B", "reps", "side",
    "Keep your ribs over your pelvis and lower slowly."),
  skill("dragon-flag", "Full dragon flag", 4, "C", "reps", "side",
    "Lift your hips and feet together.", {
      milestones: [
        "Lower a bit with a straight body",
        "Lower over the full range with control",
        "First full rep",
      ],
    }),
  skill("bar-muscle-up", "Bar muscle-up", 4, "C", "reps", "angled-front",
    "Pull higher first, then both elbows over the bar together."),

  // Level 5 – Very advanced
  skill("one-arm-elbow-lever", "One-arm elbow lever", 5, "A", "hold", "angled-side",
    "Turn your pelvis back a little and stretch your legs back."),
  skill("v-sit", "V-sit", 5, "A", "hold", "side",
    "Press the bars down and keep your knees long."),
  skill("adv-tuck-planche", "Advanced tuck planche", 5, "B", "hold", "side",
    "Knees in a little and push the floor further away."),
  skill("straddle-front-lever", "Straddle front lever", 5, "B", "hold", "side+front",
    "Straighten your knees, hips to shoulder height."),
  skill("back-lever", "Full back lever", 5, "B", "hold", "side",
    "Lift your waist and reach your legs back."),
  skill("ring-muscle-up", "Strict ring muscle-up", 5, "C", "reps", "angled-front",
    "Rings close to your chest, both shoulders over the rings together."),
  skill("free-handstand-push-up", "Free handstand push-up", 5, "C", "reps", "side",
    "Lower slowly and keep your legs above you."),
  skill("one-arm-push-up", "One-arm push-up", 5, "C", "reps", "angled-front",
    "Keep both sides of your pelvis level."),

  // Level 6 – Expert
  skill("straddle-planche", "Straddle planche", 6, "A", "hold", "side",
    "Hips in line with your trunk, arms long."),
  skill("human-flag", "Full human flag", 6, "A", "hold", "front",
    "Legs together, hips up, push further away with the bottom arm."),
  skill("front-lever", "Full front lever", 6, "B", "hold", "side",
    "Lift your hips and straighten your knees."),
  skill("press-to-handstand", "Press to handstand", 6, "B", "reps", "side",
    "Hips over your hands, then lift your legs."),
  skill("one-arm-handstand", "One-arm handstand", 6, "C", "hold", "side+front",
    "Push the supporting shoulder up and keep your hips over your hand."),
  skill("one-arm-pull-up", "One-arm pull-up", 6, "C", "reps", "angled-front",
    "Pull your elbow down to your side and keep your legs still."),
  skill("hefesto", "Hefesto", 6, "C", "reps", "side",
    "Pull without a jerk and keep your hips close to the bar.", COACH),

  // Level 7 – Elite
  skill("full-planche", "Full planche", 7, "A", "hold", "side",
    "Body level, arms long, push the floor away."),
  skill("iron-cross", "Iron cross", 7, "A", "hold", "front",
    "Keep both arms at the same height.", COACH),
  skill("planche-push-up", "Full planche push-up", 7, "B", "reps", "side",
    "Move your chest and hips together, straighten your arms at the top."),
  skill("one-arm-front-lever", "One-arm front lever", 7, "B", "hold", "side+front",
    "Keep your pelvis at shoulder height and your working arm long."),
  skill("one-arm-muscle-up", "One-arm muscle-up", 7, "B", "reps", "angled-front",
    "Move through the transition calmly.", COACH),
  skill("manna", "Manna", 7, "C", "hold", "side",
    "Knees long, lift your pelvis with control."),
  skill("maltese", "Maltese", 7, "C", "hold", "side+front",
    "Hips in line and both rings at the same height.", COACH),
  skill("victorian", "Victorian", 7, "C", "hold", "side+front",
    "Lift your hips, legs together, rings steady.", COACH),
];

export function getSkill(id) {
  return SKILLS.find((s) => s.id === id) ?? null;
}

export function getSkillsForLevel(level) {
  return SKILLS.filter((s) => s.level === level);
}
