export declare function listProducts(page?: number, pageSize?: number): Promise<{
    items: {
        id: number;
        name: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        model: string;
        description: string | null;
    }[];
    total: number;
    page: number;
    pageSize: number;
}>;
export declare function createProduct(data: {
    model: string;
    name?: string;
    description?: string;
}): Promise<{
    id: number;
    name: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    model: string;
    description: string | null;
}>;
export declare function updateProduct(id: number, data: {
    model?: string;
    name?: string;
    description?: string;
}): Promise<{
    id: number;
    name: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    model: string;
    description: string | null;
}>;
export declare function deleteProduct(id: number): Promise<{
    id: number;
    name: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    model: string;
    description: string | null;
}>;
//# sourceMappingURL=product.d.ts.map