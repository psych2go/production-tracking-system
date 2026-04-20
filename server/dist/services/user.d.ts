export declare function listUsers(filters: {
    keyword?: string;
    role?: string;
    page?: number;
    pageSize?: number;
}): Promise<{
    items: {
        id: number;
        wwUserId: string;
        name: string;
        department: string | null;
        role: string;
        avatarUrl: string | null;
        isActive: boolean;
        createdAt: Date;
    }[];
    total: number;
    page: number;
    pageSize: number;
}>;
export declare function updateUser(id: number, data: {
    role?: string;
    department?: string;
    isActive?: boolean;
}): Promise<{
    id: number;
    wwUserId: string;
    name: string;
    department: string | null;
    role: string;
    avatarUrl: string | null;
    isActive: boolean;
}>;
export declare function deactivateUser(id: number): Promise<{
    id: number;
    name: string;
    isActive: boolean;
}>;
//# sourceMappingURL=user.d.ts.map