import { api } from "./index";
import type { User, Product, Batch, ProcessStage, ProgressRecord, PaginatedResult, DashboardData, ProcessDurationData, ProductionTrendData, AnomalyItem, AuditLog } from "../types";

// Auth
export const authApi = {
  devLogin: () => api.post<{ token: string; user: User }>("/api/auth/dev-login"),
  wwCallback: (code: string) => api.post<{ token: string; user: User }>("/api/auth/ww/callback", { code }),
  getMe: () => api.get<User>("/api/auth/me"),
};

// Users
export const userApi = {
  list: (params?: { keyword?: string; role?: string; page?: number }) => {
    const query = new URLSearchParams();
    if (params?.keyword) query.set("keyword", params.keyword);
    if (params?.role) query.set("role", params.role);
    if (params?.page) query.set("page", String(params.page));
    return api.get<PaginatedResult<User>>(`/api/users?${query.toString()}`);
  },
  update: (id: number, data: { role?: string; department?: string; isActive?: boolean }) =>
    api.put<User>(`/api/users/${id}`, data),
  deactivate: (id: number) => api.delete(`/api/users/${id}`),
};

// Products
export const productApi = {
  list: (page = 1) => api.get<PaginatedResult<Product>>(`/api/products?page=${page}`),
  create: (data: { model: string; name?: string; description?: string }) => api.post<Product>("/api/products", data),
  update: (id: number, data: Partial<Product>) => api.put<Product>(`/api/products/${id}`, data),
  delete: (id: number) => api.delete(`/api/products/${id}`),
};

// Batches
export const batchApi = {
  list: (params?: { status?: string; productId?: number; keyword?: string; page?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.productId) query.set("productId", String(params.productId));
    if (params?.keyword) query.set("keyword", params.keyword);
    if (params?.page) query.set("page", String(params.page));
    return api.get<PaginatedResult<Batch>>(`/api/batches?${query.toString()}`);
  },
  get: (id: number) => api.get<Batch>(`/api/batches/${id}`),
  create: (data: { batchNo: string; productId: number; quantity: number; priority?: string; notes?: string }) =>
    api.post<Batch>("/api/batches", data),
  update: (id: number, data: { status?: string; priority?: string; notes?: string }) =>
    api.put<Batch>(`/api/batches/${id}`, data),
};

// Progress
export const progressApi = {
  dashboard: () => api.get<DashboardData>("/api/progress/dashboard"),
  stages: () => api.get<ProcessStage[]>("/api/progress/stages"),
  stageProducts: (stageId: number) => api.get<ProgressRecord[]>(`/api/progress/stages/${stageId}/products`),
  list: (params?: { batchId?: number; stageId?: number; page?: number }) => {
    const query = new URLSearchParams();
    if (params?.batchId) query.set("batchId", String(params.batchId));
    if (params?.stageId) query.set("stageId", String(params.stageId));
    if (params?.page) query.set("page", String(params.page));
    return api.get<PaginatedResult<ProgressRecord>>(`/api/progress?${query.toString()}`);
  },
  create: (data: {
    batchId: number;
    stageId: number;
    inputQuantity?: number;
    outputQuantity?: number;
    defectQuantity?: number;
    defectType?: string;
    defectNotes?: string;
    status?: string;
    notes?: string;
  }) => api.post<ProgressRecord>("/api/progress", data),
};

// Statistics
export const statsApi = {
  durations: (params?: { stageId?: number; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.stageId) query.set("stageId", String(params.stageId));
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);
    return api.get<ProcessDurationData[]>(`/api/statistics/durations?${query.toString()}`);
  },
  production: (params?: { groupBy?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.groupBy) query.set("groupBy", params.groupBy);
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);
    return api.get<ProductionTrendData[]>(`/api/statistics/production?${query.toString()}`);
  },
  anomalies: () => api.get<AnomalyItem[]>("/api/statistics/anomalies"),
  exportExcel: (type: string, params?: { startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    query.set("type", type);
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);
    return `/api/statistics/export/excel?${query.toString()}`;
  },
};

// Settings
export const settingsApi = {
  stages: () => api.get<ProcessStage[]>("/api/settings/stages"),
  createStage: (data: { code: string; name: string; stageOrder: number; isQcStage?: boolean; description?: string }) =>
    api.post<ProcessStage>("/api/settings/stages", data),
  updateStage: (id: number, data: { name?: string; stageOrder?: number; isQcStage?: boolean; description?: string | null }) =>
    api.put<ProcessStage>(`/api/settings/stages/${id}`, data),
  deleteStage: (id: number) => api.delete(`/api/settings/stages/${id}`),
};

// Audit
export const auditApi = {
  logs: (params?: { userId?: number; action?: string; entity?: string; startDate?: string; endDate?: string; page?: number }) => {
    const query = new URLSearchParams();
    if (params?.userId) query.set("userId", String(params.userId));
    if (params?.action) query.set("action", params.action);
    if (params?.entity) query.set("entity", params.entity);
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);
    if (params?.page) query.set("page", String(params.page));
    return api.get<PaginatedResult<AuditLog>>(`/api/audit/logs?${query.toString()}`);
  },
};
