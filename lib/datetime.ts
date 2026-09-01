// Shared by meeting creation and meeting editing -- both convert
// between a browser <input type="datetime-local"> value and an
// absolute UTC instant, in opposite directions.

// datetime-local gives a timezone-less local string (e.g.
// "2026-08-15T18:00"). new Date(...) on a string in that exact form is
// specified to parse as *local* time (per the ES spec), so this
// correctly reflects what the user picked on their own clock --
// .toISOString() then converts that to an absolute UTC instant before
// it ever reaches the server. Doing this conversion server-side instead
// would silently use the server's timezone, not the user's.
export function localDateTimeToUtcIso(localValue: string): string | null {
  const parsed = new Date(localValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

// A meeting's scheduled time must be in the future -- but that's
// checked server-side (parseMeetingDetails, actions/meetings.ts) at
// whatever moment the request actually gets processed, not the moment
// the user picked the time in the form. Real submission latency (typing
// the rest of the form, the network round trip) commonly eats 30-90+
// seconds, so a strict `meetingTime > now` check at validation time
// intermittently rejected times picked only 1-2 minutes ahead, even
// though they were genuinely in the future the instant the user chose
// them -- a race, not a timezone bug (both sides compare as UTC epoch
// ms). This grace period absorbs that realistic latency without
// weakening the actual rule: a time that's truly in the past (an hour
// ago, yesterday) is still rejected regardless of the buffer.
export const MEETING_TIME_SUBMISSION_GRACE_MS = 2 * 60 * 1000;

export function isMeetingTimeInFuture(
  meetingTimeIso: string,
  now: number = Date.now(),
): boolean {
  return new Date(meetingTimeIso).getTime() > now - MEETING_TIME_SUBMISSION_GRACE_MS;
}

// "Upcoming meetings" lists (the group page's Meetings tab, the
// Dashboard home's Upcoming Meetings card) filter with
// `gt("meeting_time", cutoff)`. That query re-runs fresh on every page
// load/revalidation, using whatever "now" is at THAT moment -- not the
// "now" from when the meeting was created. Without the same grace
// buffer used above, a meeting created near the edge of the submission
// window (accepted by isMeetingTimeInFuture precisely because of that
// buffer) could see its meeting_time slip into the past by the time the
// page re-renders, and silently disappear from "upcoming" the instant
// after it was successfully created. Using the same cutoff here keeps
// creation and display consistent with each other.
export function upcomingMeetingsCutoffIso(now: number = Date.now()): string {
  return new Date(now - MEETING_TIME_SUBMISSION_GRACE_MS).toISOString();
}

// Inverse, for pre-filling a datetime-local input from an already-
// stored UTC instant: formats it back into *this browser's* own local
// wall-clock time, in the exact "YYYY-MM-DDTHH:mm" shape datetime-local
// inputs expect. Uses Date's local getters (getFullYear/getMonth/
// getDate/getHours/getMinutes), not the getUTC* variants -- that's what
// makes this show the same local time MeetingTimeDisplay already shows
// elsewhere on the page, not the raw UTC clock time.
export function utcIsoToLocalDateTimeInputValue(utcIso: string): string {
  const date = new Date(utcIso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
