export declare function listBatches(filters: {
    status?: string;
    productId?: number;
    keyword?: string;
    customerCode?: string;
    packageType?: string;
    batchType?: string;
    page?: number;
    pageSize?: number;
}): Promise<{
    items: ({
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
        quantityDetail: string | null;
        notes: string | null;
        createdBy: number | null;
    })[];
    total: number;
    page: number;
    pageSize: number;
}>;
export declare function getBatchDetail(id: number): Promise<({
    progressRecords: ({
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
    quantityDetail: string | null;
    notes: string | null;
    createdBy: number | null;
}) | null>;
export declare function createBatch(data: {
    batchType?: string;
    batchNo?: string;
    productModel?: string;
    quantity?: number;
    quantityDetail?: string;
    packageType?: string;
    customerCode?: string;
    orderNo?: string;
    customerDelivery?: string;
    productionDelivery?: string;
    priority?: string;
    trialContent?: string;
    notes?: string;
    createdBy?: number;
}): Promise<{
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
    quantityDetail: string | null;
    notes: string | null;
    createdBy: number | null;
}>;
export declare function deleteBatch(id: number): Promise<{
    id: number;
}>;
export declare function updateBatch(id: number, data: {
    status?: string;
    priority?: string;
    batchNo?: string;
    productModel?: string;
    quantity?: number;
    quantityDetail?: string;
    trialContent?: string;
    customerCode?: string | null;
    orderNo?: string | null;
    packageType?: string | null;
    customerDelivery?: string | null;
    productionDelivery?: string | null;
    notes?: string;
}): Promise<{
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
    quantityDetail: string | null;
    notes: string | null;
    createdBy: number | null;
}>;
//# sourceMappingURL=batch.d.ts.map