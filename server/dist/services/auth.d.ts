export declare function generateToken(user: {
    id: number;
    wwUserId: string;
    name: string;
    role: string;
}): string;
export declare function handleWwCallback(code: string): Promise<{
    token: string;
    user: {
        id: number;
        wwUserId: string;
        name: string;
        department: string | null;
        role: string;
        avatarUrl: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    };
}>;
export declare function getMe(userId: number): Promise<{
    id: number;
    wwUserId: string;
    name: string;
    department: string | null;
    role: string;
    avatarUrl: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
} | null>;
//# sourceMappingURL=auth.d.ts.map