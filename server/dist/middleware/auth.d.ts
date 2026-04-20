import { Request, Response, NextFunction } from "express";
export interface AuthRequest extends Request {
    user?: {
        id: number;
        wwUserId: string;
        name: string;
        role: string;
    };
}
export declare function authGuard(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function roleGuard(...roles: string[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map