"use client";

// The only piece of the Meetings feature rendered client-side rather
// than in the Server Component -- a meeting's date/time needs to
// display in each individual viewer's own browser timezone, not the
// server's (everything else about a meeting has no such requirement
// and stays server-rendered, same as Materials/Tasks).
//
// suppressHydrationWarning, not a useEffect+useState placeholder: this
// is React's own recommended pattern for content that's expected to
// legitimately differ between the server-rendered HTML and the
// client's render (locale/timezone-formatted values being the
// canonical example) -- React keeps the client-computed text after
// hydration rather than reverting to the server's version, which is
// exactly what's needed here, with less code and no effect involved.
export function MeetingTimeDisplay({ meetingTime }: { meetingTime: string }) {
  // Locale pinned to "en-GB" for the same display convention as every
  // other date in the app -- but timeZone is deliberately left
  // unspecified, still defaulting to the runtime's own local zone. That
  // asymmetry is intentional, not an oversight: the whole point of this
  // component is to show each viewer's own local time (approved
  // separately), so server and client are *expected* to render
  // different text here -- suppressHydrationWarning above already
  // covers that, and pinning timeZone would defeat the feature.
  const formatted = new Date(meetingTime).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return <span suppressHydrationWarning>{formatted}</span>;
}
