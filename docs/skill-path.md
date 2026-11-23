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
- **Evaluable:** Only skills with their own camera rules are analyzed. Today this is the **push-up** only. All other skills show **"Coming soon"**.

## Levels

| Level | A – Entry | B – Build-up | C – Milestone |
|-------|-----------|--------------|---------------|
| 1 Basics | Classic push-up, Inverted row, Hollow body hold | Crow pose / frog stand (bent arms) | – |
| 2 First steps | Elbow lever with foot assist, Hanging knee raise | Tuck L-sit, Pike push-up, Wall handstand | Frog stand (straight arms), Pull-up, Bar dip |
| 3 First free skills | Tuck dragon flag, Tuck back lever | Free elbow lever, L-sit, Archer push-up | Free handstand, Tuck front lever, Pistol squat |
| 4 Advanced | One-leg dragon flag, Tuck human flag | Straight dragon flag negative, Tuck planche, Advanced tuck front lever, Wall handstand push-up | Full dragon flag, Bar muscle-up |
| 5 Very advanced | One-arm elbow lever, V-sit | Advanced tuck planche, Straddle front lever, Full back lever | Strict ring muscle-up, Free handstand push-up, One-arm push-up |
| 6 Expert | Straddle planche, Full human flag | Full front lever, Press to handstand | One-arm handstand, One-arm pull-up, Hefesto |
| 7 Elite | Full planche, Iron cross | Full planche push-up, One-arm front lever | Manna, Maltese, Victorian |

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

### Practice (counts for the streak)
- At least **3 clean reps**, or
- at least **20 seconds** of holding a hold skill.

Only evaluable skills can count as practice, because the app cannot check anything else.

### Skill completed
- **5 clean reps in one set** with a **form score of at least 80 %**.
- Hold skills: rule still open (proposal: hold for 10 s with a form score of at least 80 %).
- A completed skill stays completed. Better results are saved as a new best.

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
