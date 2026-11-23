// Skill path configuration.
// Preliminary, not reviewed by calisthenics experts. See docs/skill-path.md.
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
function skill(id, name, level, track, measure, extra = {}) {
  return {
    id,
    name,
    level,
    track,
    measure,
    evaluable: false,
    milestones: [],
    ...extra,
  };
}

export const SKILLS = [
  // Level 1 – Basics
  skill("push-up", "Classic push-up", 1, "A", "reps", {
    evaluable: true,
    milestones: [
      "Lower once with control",
      "First clean rep",
      "Five clean reps in a row",
    ],
  }),
  skill("inverted-row", "Inverted row", 1, "A", "reps"),
  skill("hollow-body-hold", "Hollow body hold", 1, "A", "hold"),
  skill("crow-pose", "Crow pose / frog stand (bent arms)", 1, "B", "hold", {
    milestones: [
      "Lift one foot briefly",
      "Lift both feet briefly",
      "Hold for 5 seconds",
    ],
  }),

  // Level 2 – First steps
  skill("elbow-lever-assisted", "Elbow lever with foot assist", 2, "A", "hold"),
  skill("hanging-knee-raise", "Hanging knee raise", 2, "A", "reps"),
  skill("tuck-l-sit", "Tuck L-sit", 2, "B", "hold"),
  skill("pike-push-up", "Pike push-up", 2, "B", "reps"),
  skill("wall-handstand", "Wall handstand", 2, "B", "hold"),
  skill("frog-stand-straight", "Frog stand (straight arms)", 2, "C", "hold"),
  skill("pull-up", "Pull-up", 2, "C", "reps"),
  skill("bar-dip", "Bar dip", 2, "C", "reps"),

  // Level 3 – First free skills
  skill("tuck-dragon-flag", "Tuck dragon flag", 3, "A", "reps"),
  skill("tuck-back-lever", "Tuck back lever", 3, "A", "hold"),
  skill("elbow-lever", "Free elbow lever", 3, "B", "hold", {
    milestones: [
      "Both feet free briefly",
      "Hold for 3 seconds",
      "Hold for 5 seconds with straight legs",
    ],
  }),
  skill("l-sit", "L-sit", 3, "B", "hold"),
  skill("archer-push-up", "Archer push-up", 3, "B", "reps"),
  skill("free-handstand", "Free handstand", 3, "C", "hold"),
  skill("tuck-front-lever", "Tuck front lever", 3, "C", "hold"),
  skill("pistol-squat", "Pistol squat", 3, "C", "reps"),

  // Level 4 – Advanced
  skill("one-leg-dragon-flag", "One-leg dragon flag", 4, "A", "reps"),
  skill("tuck-human-flag", "Tuck human flag", 4, "A", "hold"),
  skill("dragon-flag-negative", "Straight dragon flag negative", 4, "B", "reps"),
  skill("tuck-planche", "Tuck planche", 4, "B", "hold"),
  skill("adv-tuck-front-lever", "Advanced tuck front lever", 4, "B", "hold"),
  skill("wall-handstand-push-up", "Wall handstand push-up", 4, "B", "reps"),
  skill("dragon-flag", "Full dragon flag", 4, "C", "reps", {
    milestones: [
      "Lower a bit with a straight body",
      "Lower over the full range with control",
      "First full rep",
    ],
  }),
  skill("bar-muscle-up", "Bar muscle-up", 4, "C", "reps"),

  // Level 5 – Very advanced
  skill("one-arm-elbow-lever", "One-arm elbow lever", 5, "A", "hold"),
  skill("v-sit", "V-sit", 5, "A", "hold"),
  skill("adv-tuck-planche", "Advanced tuck planche", 5, "B", "hold"),
  skill("straddle-front-lever", "Straddle front lever", 5, "B", "hold"),
  skill("back-lever", "Full back lever", 5, "B", "hold"),
  skill("ring-muscle-up", "Strict ring muscle-up", 5, "C", "reps"),
  skill("free-handstand-push-up", "Free handstand push-up", 5, "C", "reps"),
  skill("one-arm-push-up", "One-arm push-up", 5, "C", "reps"),

  // Level 6 – Expert
  skill("straddle-planche", "Straddle planche", 6, "A", "hold"),
  skill("human-flag", "Full human flag", 6, "A", "hold"),
  skill("front-lever", "Full front lever", 6, "B", "hold"),
  skill("press-to-handstand", "Press to handstand", 6, "B", "reps"),
  skill("one-arm-handstand", "One-arm handstand", 6, "C", "hold"),
  skill("one-arm-pull-up", "One-arm pull-up", 6, "C", "reps"),
  skill("hefesto", "Hefesto", 6, "C", "reps"),

  // Level 7 – Elite
  skill("full-planche", "Full planche", 7, "A", "hold"),
  skill("iron-cross", "Iron cross", 7, "A", "hold"),
  skill("planche-push-up", "Full planche push-up", 7, "B", "reps"),
  skill("one-arm-front-lever", "One-arm front lever", 7, "B", "hold"),
  skill("manna", "Manna", 7, "C", "hold"),
  skill("maltese", "Maltese", 7, "C", "hold"),
  skill("victorian", "Victorian", 7, "C", "hold"),
];

export function getSkill(id) {
  return SKILLS.find((s) => s.id === id) ?? null;
}

export function getSkillsForLevel(level) {
  return SKILLS.filter((s) => s.level === level);
}
