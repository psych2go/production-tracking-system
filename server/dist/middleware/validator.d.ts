import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
export declare function validate(schema: ZodSchema): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validator.d.ts.map