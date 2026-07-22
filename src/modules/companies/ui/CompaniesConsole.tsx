"use client";

import { Button } from "@arco-design/web-react";
import { IconPlus } from "@arco-design/web-react/icon";
import type { Company } from "../contracts";
import { ScheduleDrawer } from "@/modules/schedules/ui/ScheduleDrawer";
import { useSchedulesController } from "@/modules/schedules/ui/useSchedulesController";
import { CompanyEditorDrawer } from "./CompanyEditorDrawer";
import { CompanyTable } from "./CompanyTable";
import { useCompaniesController } from "./useCompaniesController";
import styles from "./CompaniesConsole.module.css";

export function CompaniesConsole({ initialCompanies }: { initialCompanies: Company[] }) {
  const companies = useCompaniesController(initialCompanies);
  const schedules = useSchedulesController();

  return (
    <>
      <div className={styles.pageActions}>
        <Button type="primary" icon={<IconPlus />} onClick={companies.openCreate}>
          新增
        </Button>
      </div>

      <div className="work-surface">
        <CompanyTable
          companies={companies.companies}
          loading={companies.loading}
          orderingSaving={companies.orderingSaving}
          draggingCompanyId={companies.draggingCompanyId}
          syncingCompanyId={companies.syncingCompanyId}
          onSync={(company) => void companies.triggerSync(company)}
          onEdit={companies.openEdit}
          onSchedules={(company) => void schedules.open(company)}
          onDragStart={companies.handleDragStart}
          onDragEnd={companies.handleDragEnd}
          onDrop={companies.handleDrop}
        />
      </div>

      <CompanyEditorDrawer
        visible={companies.drawerVisible}
        editing={companies.editing}
        loading={companies.loading}
        form={companies.form}
        onSubmit={companies.submit}
        onCancel={companies.closeEditor}
      />

      <ScheduleDrawer
        company={schedules.company}
        schedules={schedules.schedules}
        visible={schedules.drawerVisible}
        editorVisible={schedules.editorVisible}
        editingSchedule={schedules.editingSchedule}
        loading={schedules.loading}
        form={schedules.form}
        onCreate={schedules.openCreate}
        onEdit={schedules.openEdit}
        onDelete={schedules.remove}
        onRefresh={() => schedules.load()}
        onSubmit={schedules.submit}
        onClose={schedules.close}
        onCloseEditor={schedules.closeEditor}
      />
    </>
  );
}
