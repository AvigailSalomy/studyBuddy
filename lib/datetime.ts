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
