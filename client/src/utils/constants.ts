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

// 生产任务状态标签
export const STATUS_LABELS: Record<string, string> = {
  pending_card: "待制卡",
  pending: "待投产",
  active: "加工中",
  completed: "已完成",
  archived: "已归档",
  cancelled: "已取消",
};

// 生产任务状态颜色
export const STATUS_COLORS: Record<string, string> = {
  pending_card: "#d97706",
  pending: "#087f8c",
  active: "#0083ff",
  completed: "#27865f",
  archived: "#7d898b",
  cancelled: "#c9483f",
};

// 客户类型
export const CUSTOMER_TYPES = [
  { label: "所内", value: "internal" },
  { label: "所外", value: "external" },
];

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  internal: "所内",
  external: "所外",
};
