export type GroupMemberRow = {
  role: "owner" | "member";
  profile: {
    id: string;
    full_name: string;
    contact_email: string | null;
  };
};

export const GROUP_MEMBER_ROLE_LABELS: Record<GroupMemberRow["role"], string> = {
  owner: "Owner",
  member: "Member",
};
