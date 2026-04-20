import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.js";
export declare function auditLog(action: string, entity: string): (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=audit.d.ts.map