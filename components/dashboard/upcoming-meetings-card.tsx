import Link from "next/link";
import { Calendar, Clock, MapPin, Link as LinkIcon, ExternalLink } from "lucide-react";
import { MeetingDateBadge } from "@/components/meeting-date-badge";
import { MeetingTimeDisplay } from "@/components/meeting-time-display";
import { EmptyState } from "@/components/empty-state";
import { SectionShell } from "@/components/dashboard/section-shell";
import { isHttpUrl } from "@/lib/format";
import type { DashboardMeetingRow } from "@/types/dashboard";

// Title links to that meeting's group (Meetings tab); the location/link
// itself is a separate sibling <a> for online meetings rather than
// nesting an anchor inside the title's Link, which would be invalid
// HTML. Date/time display reuses MeetingDateBadge/MeetingTimeDisplay
// as-is -- same viewer-local convention as the rest of the Meetings
// feature, no new formatting logic.
export function UpcomingMeetingsCard({
  meetings,
}: {
  meetings: DashboardMeetingRow[];
}) {
  return (
    <SectionShell title="Upcoming Meetings" icon={Calendar}>
      {meetings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No upcoming meetings"
          description="Meetings scheduled across your groups will show up here."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="flex items-start gap-3 rounded-xl border border-border/70 p-3"
            >
              <MeetingDateBadge meetingTime={meeting.meeting_time} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Link
                  href={`/groups/${meeting.group.id}?tab=meetings`}
                  className="truncate text-sm font-medium underline-offset-2 hover:underline"
                >
                  {meeting.title}
                </Link>
                <span className="truncate text-xs text-muted-foreground">
                  {meeting.group.name}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5" />
                  <MeetingTimeDisplay meetingTime={meeting.meeting_time} />
                </span>
                {meeting.location_or_link &&
                  (isHttpUrl(meeting.location_or_link) ? (
                    <a
                      href={meeting.location_or_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-fit items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                    >
                      <LinkIcon className="size-3.5" />
                      Join meeting
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" />
                      {meeting.location_or_link}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
