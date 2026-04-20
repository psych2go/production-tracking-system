export declare function listAuditLogs(filters: {
    userId?: number;
    action?: string;
    entity?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
}): Promise<{
    items: ({
        user: {
            id: number;
            name: string;
            role: string;
        };
    } & {
        id: number;
        createdAt: Date;
        action: string;
        entity: string;
        entityId: number | null;
        detail: string | null;
        ip: string | null;
        userId: number;
    })[];
    total: number;
    page: number;
    pageSize: number;
}>;
//# sourceMappingURL=audit.d.ts.map