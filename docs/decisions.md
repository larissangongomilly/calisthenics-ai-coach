# Product Decisions

Key decisions made before building. They keep the project focused and explain the "why" behind the code.

## Product
- **Idea:** An AI coach that watches calisthenics form through the camera and gives live feedback.
- **Goal:** Portfolio project first, real product later.
- **Audience:** All levels, with a beginner-friendly skill path.
- **Language:** English first, German later.
- **Price:** Free at first.

## Skills
- **First skill:** Push-up.
- **Later:** Frog stand, L-sit, elbow lever, plank.
- **Metrics:** Reps, hold time, form score, list of errors.

## Camera and feedback
- **Camera:** Side view first. Front view later to check elbows. The coach can ask the user to switch views.
- **Feedback:** Spoken voice plus visual cues.
- **Voice:** Browser speech synthesis first.
- **Tone:** Warm, encouraging, respectful. No slang.

## Technology
- **Platform:** Web app (PWA), installable on phones. Store apps may follow.
- **Pose detection:** MediaPipe Pose in the browser.
- **Error detection:** Angle and line rules.
- **AI:** An LLM explains why a skill fails, using numbers only, never video.
- **Processing:** Mixed. Live analysis on the device, explanations via AI.
- **Hosting:** Vercel.
- **Data:** No login at first. Progress stored locally.

## Safety
- Injury notice, shown once and always reachable in settings.
- Warm-up tip and a clear "stop if it hurts" rule.

## Project
- **Repository:** Public, no license.
- **Testers:** University friends.
- **Time budget:** 3 to 5 hours per week.
- **Motivation:** A skill path that unlocks harder skills step by step.