export declare function upsertProgress(data: {
    batchId: number;
    stageId: number;
    operatorId: number;
    status?: string;
    notes?: string;
}): Promise<{
    stage: {
        id: number;
        name: string;
        code: string;
        description: string | null;
        stageOrder: number;
        isQcStage: boolean;
    };
    operator: {
        id: number;
        name: string;
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
}>;
export declare function listProgress(filters: {
    batchId?: number;
    stageId?: number;
    operatorId?: number;
    page?: number;
    pageSize?: number;
}): Promise<{
    items: ({
        batch: {
            product: {
                id: number;
                name: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                model: string;
                description: string | null;
            } | null;
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            productId: number | null;
            customerCode: string | null;
            packageType: string | null;
            batchType: string;
            trialContent: string | null;
            batchNo: string;
            quantity: number;
            priority: string;
            orderNo: string | null;
            customerDelivery: Date | null;
            productionDelivery: Date | null;
            notes: string | null;
            createdBy: number | null;
        };
        stage: {
            id: number;
            name: string;
            code: string;
            description: string | null;
            stageOrder: number;
            isQcStage: boolean;
        };
        operator: {
            id: number;
            name: string;
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
    total: number;
    page: number;
    pageSize: number;
}>;
export declare function getDashboardData(): Promise<{
    stats: {
        activeProductBatches: number;
        activeProductQuantity: number;
        totalTrialBatches: number;
    };
    recentActivity: ({
        batch: {
            product: {
                id: number;
                name: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                model: string;
                description: string | null;
            } | null;
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            productId: number | null;
            customerCode: string | null;
            packageType: string | null;
            batchType: string;
            trialContent: string | null;
            batchNo: string;
            quantity: number;
            priority: string;
            orderNo: string | null;
            customerDelivery: Date | null;
            productionDelivery: Date | null;
            notes: string | null;
            createdBy: number | null;
        };
        stage: {
            id: number;
            name: string;
            code: string;
            description: string | null;
            stageOrder: number;
            isQcStage: boolean;
        };
        operator: {
            id: number;
            name: string;
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
    activeBatchList: ({
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
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        productId: number | null;
        customerCode: string | null;
        packageType: string | null;
        batchType: string;
        trialContent: string | null;
        batchNo: string;
        quantity: number;
        priority: string;
        orderNo: string | null;
        customerDelivery: Date | null;
        productionDelivery: Date | null;
        notes: string | null;
        createdBy: number | null;
    })[];
    anomalies: {
        type: string;
        severity: string;
        batchId: number;
        batchNo: string;
        description: string;
        value: number;
        threshold: number;
    }[];
}>;
export declare function getStages(): Promise<{
    id: number;
    name: string;
    code: string;
    description: string | null;
    stageOrder: number;
    isQcStage: boolean;
}[]>;
export declare function getStageProducts(stageId: number): Promise<({
    batch: {
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
            name: string;
        } | null;
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        productId: number | null;
        customerCode: string | null;
        packageType: string | null;
        batchType: string;
        trialContent: string | null;
        batchNo: string;
        quantity: number;
        priority: string;
        orderNo: string | null;
        customerDelivery: Date | null;
        productionDelivery: Date | null;
        notes: string | null;
        createdBy: number | null;
    };
    stage: {
        id: number;
        name: string;
        code: string;
        description: string | null;
        stageOrder: number;
        isQcStage: boolean;
    };
    operator: {
        id: number;
        name: string;
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
})[]>;
//# sourceMappingURL=progress.d.ts.map