import { Request, Response, NextFunction } from "express";
export declare function rateLimit(options: {
    windowMs: number;
    max: number;
}): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=rateLimit.d.ts.map