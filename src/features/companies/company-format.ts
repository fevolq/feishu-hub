export const formatTime = (value: string | null) => (value ? new Date(value).toLocaleString("zh-CN") : "-");

export const syncStatusColor = (status: string) => {
  if (status === "success") return "green";
  if (status === "failed") return "red";
  return "orange";
};

export const syncStatusText = (status: string) => {
  if (status === "success") return "成功";
  if (status === "failed") return "失败";
  if (status === "running") return "同步中";
  return status || "-";
};
