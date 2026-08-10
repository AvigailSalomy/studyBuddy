export type ChatMessageRow = {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  sender: { id: string; full_name: string } | null;
};

// Row shape returned by the unread_chat_summary() RPC -- one row per
// group with unread messages, already carrying the latest unread
// message's content/sender for the Dashboard's preview, computed
// server-side in a single windowed query (see the migration).
export type UnreadGroupSummary = {
  group_id: string;
  group_name: string;
  unread_count: number;
  latest_message_id: string;
  latest_message_content: string;
  latest_message_created_at: string;
  latest_sender_id: string;
  latest_sender_name: string;
};
