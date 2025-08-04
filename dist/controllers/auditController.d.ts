import { Request, Response, NextFunction } from 'express';
export declare const createAudit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getAuditById: (req: Request, _res: Response, next: NextFunction) => Promise<void>;
