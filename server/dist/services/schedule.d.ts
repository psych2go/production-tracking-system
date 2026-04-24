/**
 * Get the schedule queue for a specific stage.
 * Shows batches whose latest completed stage is this stage (i.e. currently "at" this station).
 * Auto-syncs the ScheduleOrder table (insert missing, remove stale).
 */
export declare function getScheduleQueue(stageId: number): Promise<{
    orderNum: number;
    batchId: number;
    batch: {
        progressRecords: ({
            stage: {
                id: number;
                name: string;
                code: string;
                description: string | null;
                stageOrder: number;
                isQcStage: boolean;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            notes: string | null;
            batchId: number;
            stageId: number;
            operatorId: number;
            inputQuantity: number | null;
            outputQuantity: number | null;
            defectQuantity: number;
            defectType: string | null;
            defectNotes: string | null;
        })[];
        product: {
            id: number;
            name: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            model: string;
            description: string | null;
        } | null;
        creator: {
            id: number;
            name: string;
        } | null;
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        productId: number | null;
        packageType: string | null;
        customerCode: string | null;
        batchType: string;
        trialContent: string | null;
        batchNo: string;
        quantity: number;
        priority: string;
        orderNo: string | null;
        customerDelivery: Date | null;
        productionDelivery: Date | null;
        quantityDetail: string | null;
        notes: string | null;
        createdBy: number | null;
    };
}[]>;
/**
 * Get batch counts for all stages in a single call.
 * Returns { stageId: count } for stages that have batches waiting.
 */
export declare function getScheduleCounts(): Promise<Record<number, number>>;
/**
 * Reorder a batch in the schedule queue (move up or down).
 * Only accessible by admin.
 */
export declare function reorderSchedule(stageId: number, batchId: number, direction: "up" | "down"): Promise<void>;
//# sourceMappingURL=schedule.d.ts.map