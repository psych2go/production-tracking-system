export declare function getProcessDurations(filters: {
    stageId?: number;
    startDate?: string;
    endDate?: string;
}): Promise<{
    stageName: string;
    avgMinutes: number;
    minMinutes: number;
    maxMinutes: number;
    recordCount: number;
}[]>;
export declare function getProductionTrend(filters: {
    groupBy: string;
    startDate?: string;
    endDate?: string;
}): Promise<{
    period: string;
    batchCount: number;
    totalQuantity: number;
}[]>;
export declare function getAnomalies(): Promise<{
    type: string;
    severity: string;
    batchId: number;
    batchNo: string;
    description: string;
    value: number;
    threshold: number;
}[]>;
export declare function getGroupedStatistics(filters: {
    groupBy: string;
    startDate?: string;
    endDate?: string;
}): Promise<{
    group: string;
    batchCount: number;
    totalQuantity: number;
}[]>;
export declare function exportExcel(filters: {
    type: string;
    startDate?: string;
    endDate?: string;
}): Promise<Buffer<ArrayBufferLike>>;
//# sourceMappingURL=statistics.d.ts.map