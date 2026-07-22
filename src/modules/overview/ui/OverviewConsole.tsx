"use client";

import { UserDetailModal } from "@/modules/organization/ui/UserDetailModal";
import type { CompanyOverviewCard } from "../contracts";
import { OverviewCards } from "./OverviewCards";
import { RecentUsersDialog } from "./RecentUsersDialog";
import { useOverviewController } from "./useOverviewController";

export function OverviewConsole({
  companies,
  since
}: {
  companies: CompanyOverviewCard[];
  since: string;
}) {
  const controller = useOverviewController(since);

  return (
    <>
      <OverviewCards companies={companies} onOpenRecentUsers={controller.openRecentUsers} />
      <RecentUsersDialog
        dialog={controller.dialog}
        users={controller.recentUsers}
        pagination={controller.pagination}
        loading={controller.loading}
        onClose={controller.closeRecentUsers}
        onSelectUser={controller.setSelectedUser}
        onPageChange={(page) => {
          if (controller.dialog) void controller.loadRecentUsers(controller.dialog, page);
        }}
      />
      <UserDetailModal
        companyId={controller.dialog?.companyId}
        user={controller.selectedUser}
        onClose={() => controller.setSelectedUser(null)}
      />
    </>
  );
}
