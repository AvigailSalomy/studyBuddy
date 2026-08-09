export type MeetingRow = {
  id: string;
  title: string;
  meeting_time: string;
  location_or_link: string | null;
  created_by: string;
  creator: { id: string; full_name: string } | null;
};
