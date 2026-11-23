# Skill Path, Progress and Streak Rules

> **Preliminary, not reviewed by calisthenics experts.**
> The levels, order and criteria below are a first draft. They will change after feedback from coaches and testers.

The skill path gives users a clear order from easy to hard skills. Harder skills unlock step by step, so beginners do not try advanced skills too early.

## Structure
- **Levels:** 7 levels, from *Basics* to *Elite*.
- **Tracks inside a level:**
  - **A – Entry:** first skills of the level.
  - **B – Build-up:** skills that build strength for the milestone.
  - **C – Milestone:** the key skills that close the level.
- **Evaluable:** Every skill has camera rules (`src/exercises.js`). Only the **push-up** rules are tested. All other skills are marked **"Beta"**: their rules follow `docs/technique-guide.md` but are not tested with real people yet.
- **Coach required:** Hefesto, iron cross, one-arm muscle-up, maltese and victorian show a coach-and-equipment warning before every start.

## Levels

| Level | A – Entry | B – Build-up | C – Milestone |
|-------|-----------|--------------|---------------|
| 1 Basics | Classic push-up, Inverted row, Hollow body hold | Crow pose / frog stand (bent arms) | – |
| 2 First steps | Elbow lever with foot assist, Hanging knee raise | Tuck L-sit, Pike push-up, Wall handstand | Frog stand (straight arms), Pull-up, Bar dip |
| 3 First free skills | Tuck dragon flag, Tuck back lever | Free elbow lever, L-sit, Archer push-up | Free handstand, Tuck front lever, Pistol squat |
| 4 Advanced | One-leg dragon flag, Tuck human flag | Straight dragon flag negative, Tuck planche, Advanced tuck front lever, Wall handstand push-up | Full dragon flag, Bar muscle-up |
| 5 Very advanced | One-arm elbow lever, V-sit | Advanced tuck planche, Straddle front lever, Full back lever | Strict ring muscle-up, Free handstand push-up, One-arm push-up |
| 6 Expert | Straddle planche, Full human flag | Full front lever, Press to handstand | One-arm handstand, One-arm pull-up, Hefesto |
| 7 Elite | Full planche, Iron cross | Full planche push-up, One-arm front lever, One-arm muscle-up | Manna, Maltese, Victorian |

**Option:** Add *Knee push-up* as its own early skill in level 1. Knee push-ups are currently ignored by the push-up counter.

## Milestones
Each skill card shows small steps toward the skill. For now, milestones only use what the camera can measure: **reps** and **seconds held**.

| Skill | Milestones |
|-------|-----------|
| Classic push-up (1A) | Lower once with control → first clean rep → five clean reps in a row |
| Crow pose / frog stand (1B) | Lift one foot briefly → lift both feet briefly → hold 5 s |
| Free elbow lever (3B) | Both feet free briefly → hold 3 s → hold 5 s with straight legs |
| Full dragon flag (4C) | Lower a bit with a straight body → lower over the full range with control → first full rep |

Milestones for the other skills will be added together with their camera rules.

## Rules
All numbers live in one config file (`src/skills.js`), so they can be changed in one place.

### Clean rep
A rep that the coach counts as complete, in a valid position (plank, not on the knees), without a partial-rep warning.

### Goal per skill
Every skill has its own goal, matched to its difficulty: **clean reps in one set** (reps skills) or **seconds held** (hold skills). The goals are estimates and live in `GOALS` in `src/skills.js`. Two-sided skills (archer push-up, pistol squat, one-arm push-up) count both sides together.

| Level | Reps | Hold |
|-------|------|------|
| 1 | Push-up 5 · Inverted row 8 | Hollow body 30 s · Crow 10 s |
| 2 | Knee raise 8 · Pike push-up 5 · Pull-up 5 · Bar dip 5 | Elbow lever with foot assist 15 s · Tuck L-sit 15 s · Wall handstand 30 s · Frog stand (straight arms) 10 s |
| 3 | Tuck dragon flag 5 · Archer push-up 6 · Pistol squat 6 | Tuck back lever 10 s · Free elbow lever 10 s · L-sit 10 s · Free handstand 10 s · Tuck front lever 10 s |
| 4 | One-leg dragon flag 3 · Dragon flag negative 3 · Wall HSPU 3 · Full dragon flag 3 · Bar muscle-up 1 | Tuck human flag 5 s · Tuck planche 10 s · Advanced tuck front lever 10 s |
| 5 | Ring muscle-up 1 · Free HSPU 1 · One-arm push-up 2 | One-arm elbow lever 5 s · V-sit 5 s · Advanced tuck planche 8 s · Straddle front lever 5 s · Back lever 5 s |
| 6 | Press to handstand 1 · One-arm pull-up 1 · Hefesto 1 | Straddle planche 5 s · Human flag 5 s · Front lever 5 s · One-arm handstand 3 s |
| 7 | Planche push-up 1 · One-arm muscle-up 1 | Full planche 3 s · Iron cross 2 s · One-arm front lever 3 s · Manna 3 s · Maltese 2 s · Victorian 2 s |

### Goal reached (one set)
- At least the skill's goal in **one set** (for holds: the longest unbroken hold), and
- a **form score of at least 80 %**.

### Practice (counts for the streak)
- A set counts as practice when it reaches **at least half of the goal** (rounded up, at least 1 rep or 1 second).
- Example: push-up goal 5 → 3 reps count; hollow body goal 30 s → 15 s count.
- This way hard skills with short goals (for example a 3 s planche) can count too.

### Skill completed
- The goal was reached on **2 different days** (Berlin calendar days).
- Why two days: the beta camera rules can be wrong, and one lucky set should not be enough. Reaching it twice shows the skill is really there.
- A completed skill stays completed. Better results are saved as a new best.
- Skills completed with an earlier rule stay completed.

### Progress per skill
Each skill sheet shows the goal, on how many days it was reached, best reps or hold, best form score, the notes of the last set and the last sets. The last 20 sets per skill are kept.

### Level completed
- A level is completed when **all skills of the level** are completed.
- Completing a level unlocks the next level.
- Level 1 is always unlocked.

### Free choice
- Users can follow the path in the app's order (easy → hard) or pick any skill freely.
- If a skill belongs to a level that is not unlocked yet, the app shows a **safety hint** before starting (for example: "This skill is usually trained after level X. Make sure you have the basics first."). The user can still continue.
- Freely chosen skills count for the streak and for level progress in the same way.

## Weekly streak
- A week runs **Monday to Sunday**, in the **Europe/Berlin** time zone.
- A week counts if it has **at least one practice** (see above).
- The streak is the number of counted weeks in a row.
- The current week does not break the streak while it is still running. The streak only resets to 0 after a **full week without practice** has ended.
- **Streak freeze:** planned for later.

## Progress storage
- Progress is saved in the browser (`localStorage`). There is no login yet.
- Saved per skill: date completed, best reps or seconds, best form score.
- Saved for the streak: the weeks with practice.
- If the saved data is missing or broken, the app starts with empty progress instead of crashing.
- **Limitation:** Progress is lost if the user clears the browser data or switches device or browser. Accounts with cloud progress may come later.

## Open questions
- Completion rule for hold skills.
- Whether every skill of a level is required, or only the milestone (C) skills.
- Review of order and criteria by a calisthenics coach.
