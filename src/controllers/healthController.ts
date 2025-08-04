import { Request, Response } from 'express';
import { API_VERSION } from '../utils/constants';

export const getHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: API_VERSION,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
};

export const getStatus = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: {
      service: 'Agency Audit API',
      status: 'operational',
      version: API_VERSION,
      endpoints: {
        health: '/api/health',
        audit: '/api/audit',
      },
    },
  });
};