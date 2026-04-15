// 优先级选项
export const PRIORITIES = [
  { label: "紧急", value: "urgent" },
  { label: "普通", value: "normal" },
];

// 角色标签
export const ROLE_LABELS: Record<string, string> = {
  admin: "管理员",
  worker: "作业员",
};

// 批次状态标签
export const STATUS_LABELS: Record<string, string> = {
  active: "正在加工",
  completed: "已完成",
  archived: "已归档",
};

// 批次状态颜色
export const STATUS_COLORS: Record<string, string> = {
  completed: "#07c160",
  active: "#0083ff",
  archived: "#999999",
};
