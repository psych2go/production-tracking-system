export interface User {
  id: number;
  wwUserId: string;
  name: string;
  department: string | null;
  role: "admin" | "worker";
  avatarUrl: string | null;
  isActive: boolean;
}

export interface Product {
  id: number;
  model: string;
  name: string | null;
  description: string | null;
  isActive: boolean;
}

export interface Batch {
  id: number;
  batchNo: string;
  batchType: "product" | "trial";
  productId: number | null;
  quantity: number;
  quantityDetail: string | null;
  customerCode: string | null;
  orderNo: string | null;
  packageType: string | null;
  customerDelivery: string | null;
  productionDelivery: string | null;
  trialContent: string | null;
  status: "active" | "completed" | "archived";
  priority: "normal" | "urgent";
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  product?: Product | null;
  creator?: { id: number; name: string };
  progressRecords?: ProgressRecord[];
}

export interface ProcessStage {
  id: number;
  code: string;
  name: string;
  stageOrder: number;
  isQcStage: boolean;
  description: string | null;
}

export interface ProgressRecord {
  id: number;
  batchId: number;
  stageId: number;
  operatorId: number;
  status: "completed" | "in_progress";
  notes: string | null;
  createdAt: string;
  stage?: ProcessStage;
  batch?: Batch;
  operator?: { id: number; name: string };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardData {
  stats: {
    activeProductBatches: number;
    activeProductQuantity: number;
    totalTrialBatches: number;
  };
  recentActivity: ProgressRecord[];
  activeBatchList: Batch[];
  anomalies?: AnomalyItem[];
}

export interface ProcessDurationData {
  stageName: string;
  avgMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  recordCount: number;
}

export interface ProductionTrendData {
  period: string;
  batchCount: number;
  totalQuantity: number;
}

export interface AnomalyItem {
  type: string;
  severity: string;
  batchId: number;
  batchNo: string;
  description: string;
  value: number;
  threshold: number;
}

export interface AuditLog {
  id: number;
  userId: number;
  action: string;
  entity: string;
  entityId: number | null;
  detail: string | null;
  ip: string | null;
  createdAt: string;
  user?: { id: number; name: string; role: string };
}

export interface PackageType {
  id: number;
  name: string;
  category: string;
  sortOrder: number;
}

export interface CustomerCode {
  id: number;
  code: string;
}

export interface ScheduleItem {
  orderNum: number;
  batchId: number;
  batch: Batch;
}
