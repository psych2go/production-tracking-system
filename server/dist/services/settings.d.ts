export declare function createStage(data: {
    code: string;
    name: string;
    stageOrder: number;
    isQcStage?: boolean;
    description?: string;
}): Promise<{
    id: number;
    name: string;
    code: string;
    description: string | null;
    stageOrder: number;
    isQcStage: boolean;
}>;
export declare function updateStage(id: number, data: {
    name?: string;
    stageOrder?: number;
    isQcStage?: boolean;
    description?: string;
}): Promise<{
    id: number;
    name: string;
    code: string;
    description: string | null;
    stageOrder: number;
    isQcStage: boolean;
}>;
export declare function deleteStage(id: number): Promise<{
    id: number;
    name: string;
    code: string;
    description: string | null;
    stageOrder: number;
    isQcStage: boolean;
}>;
export declare function listPackageTypes(): Promise<{
    id: number;
    name: string;
    createdAt: Date;
    category: string;
    sortOrder: number;
}[]>;
export declare function createPackageType(data: {
    name: string;
    category?: string;
    sortOrder?: number;
}): Promise<{
    id: number;
    name: string;
    createdAt: Date;
    category: string;
    sortOrder: number;
}>;
export declare function deletePackageType(id: number): Promise<{
    id: number;
    name: string;
    createdAt: Date;
    category: string;
    sortOrder: number;
}>;
//# sourceMappingURL=settings.d.ts.map