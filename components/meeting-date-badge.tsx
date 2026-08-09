"use client";

// Shared by the Overview tab's "Upcoming meeting" card and
// MeetingListItem -- both show the same compact day/month date block.
// Deliberately viewer-local (no timeZone pin), same convention as
// MeetingTimeDisplay; suppressHydrationWarning for the same reason that
// component needs it (server/client locale render the same way here,
// but a different local timezone near midnight could otherwise produce
// a different calendar day between SSR and hydration).
export function MeetingDateBadge({ meetingTime }: { meetingTime: string }) {
  const date = new Date(meetingTime);
  const day = date.toLocaleDateString("en-GB", { day: "2-digit" });
  const month = date
    .toLocaleDateString("en-GB", { month: "short" })
    .toUpperCase();

  return (
    <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
      <span
        className="text-[10px] font-semibold tracking-wide uppercase"
        suppressHydrationWarning
      >
        {month}
      </span>
      <span className="text-lg leading-none font-bold" suppressHydrationWarning>
        {day}
      </span>
    </div>
  );
}
