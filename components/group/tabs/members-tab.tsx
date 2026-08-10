import { Users, Mail } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import {
  GROUP_MEMBER_ROLE_LABELS,
  type GroupMemberRow,
} from "@/types/group-member";

export function MembersTab({ members }: { members: GroupMemberRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Members</h2>

      {members.length === 0 ? (
        <EmptyState icon={Users} title="No members yet" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <div
              key={member.profile.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
            >
              <div className="flex min-w-0 items-start gap-3">
                <Avatar name={member.profile.full_name} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">
                    {member.profile.full_name}
                  </span>
                  {member.profile.contact_email ? (
                    <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mail className="size-3 shrink-0" />
                      <span className="truncate">
                        {member.profile.contact_email}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/70">
                      No contact email shared
                    </span>
                  )}
                </div>
              </div>
              <Badge
                variant={member.role === "owner" ? "warning" : "muted"}
                className="shrink-0"
              >
                {GROUP_MEMBER_ROLE_LABELS[member.role]}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
