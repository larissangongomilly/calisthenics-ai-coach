// Weekly streak: the number of weeks in a row with at least one practice.
// A week runs Monday to Sunday (Europe/Berlin). See docs/skill-path.md.
import { toBerlinDay } from "./progress.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// Turns "YYYY-MM-DD" into a week number. Week numbers go up by 1 every Monday.
// The date string is already a Berlin calendar day, so plain UTC math is safe here.
function weekNumber(day) {
  const daysSince1970 = Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS);
  // 1 January 1970 was a Thursday. Shifting by 3 days makes weeks start on Monday.
  return Math.floor((daysSince1970 + 3) / 7);
}

// practiceDays: list of "YYYY-MM-DD" (Berlin days with a practice).
// Returns { weeks, practicedThisWeek }.
export function getStreak(practiceDays, now = new Date()) {
  const practicedWeeks = new Set(practiceDays.map(weekNumber));
  const thisWeek = weekNumber(toBerlinDay(now));
  const practicedThisWeek = practicedWeeks.has(thisWeek);

  // The running week does not break the streak yet, so start counting
  // from last week if there was no practice this week so far.
  let week = practicedThisWeek ? thisWeek : thisWeek - 1;
  let weeks = 0;
  while (practicedWeeks.has(week)) {
    weeks += 1;
    week -= 1;
  }

  return { weeks, practicedThisWeek };
}

export function describeStreak({ weeks, practicedThisWeek }) {
  if (weeks === 0) {
    return "Weekly streak: 0 weeks. Practice once this week to start one.";
  }
  const unit = weeks === 1 ? "week" : "weeks";
  const note = practicedThisWeek ? "" : " Practice this week to keep it.";
  return `Weekly streak: ${weeks} ${unit}.${note}`;
}
