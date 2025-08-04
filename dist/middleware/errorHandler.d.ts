import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}
export declare const errorHandler: (error: AppError, _req: Request, res: Response, _next: NextFunction) => void;
