import { Request, Response, NextFunction } from 'express';
import { AuditRequest, AuditSubmissionResponse, AuditStatusResponse, AuditJobData } from '../types/audit';
import { auditQueue } from '../config/queue';
import { AuditRepository } from '../repositories/auditRepository';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

const auditRepository = new AuditRepository();

export const createAudit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const auditRequest: AuditRequest = req.body;

    logger.info(`Received audit request for URL: ${auditRequest.url}`);

    // Create audit record in database
    const auditId = await auditRepository.create(auditRequest);

    // Queue the audit job for background processing
    const jobData: AuditJobData = {
      auditId,
      auditRequest,
    };

    await auditQueue.add('process-audit', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    logger.info(`Audit job queued successfully for ID: ${auditId}`);

    // Return immediate response
    const response: AuditSubmissionResponse = {
      success: true,
      auditId,
      status: 'pending',
      statusUrl: `${req.protocol}://${req.get('host')}/api/audit/${auditId}/status`,
      message: 'Audit request received and queued for processing',
    };

    res.status(202).json(response);
  } catch (error) {
    logger.error('Audit submission failed:', error as Error);
    next(error);
  }
};

export const getAuditStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const auditRecord = await auditRepository.findById(id);
    
    if (!auditRecord) {
      const appError: AppError = new Error('Audit not found');
      appError.statusCode = 404;
      appError.isOperational = true;
      throw appError;
    }

    const response: AuditStatusResponse = {
      auditId: auditRecord.id,
      status: auditRecord.status,
      url: auditRecord.url,
      downloadUrl: auditRecord.blob_url || undefined,
      createdAt: auditRecord.created_at.toISOString(),
      completedAt: auditRecord.completed_at?.toISOString() || undefined,
      error: auditRecord.error_message || undefined,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to get audit status:', error as Error);
    next(error);
  }
};

export const getAuditResult = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const auditRecord = await auditRepository.findById(id);
    
    if (!auditRecord) {
      const appError: AppError = new Error('Audit not found');
      appError.statusCode = 404;
      appError.isOperational = true;
      throw appError;
    }

    if (auditRecord.status !== 'completed') {
      const appError: AppError = new Error('Audit not yet completed');
      appError.statusCode = 409;
      appError.isOperational = true;
      throw appError;
    }

    res.status(200).json({
      success: true,
      data: auditRecord.result_data,
    });
  } catch (error) {
    logger.error('Failed to get audit result:', error as Error);
    next(error);
  }
};

export const getAuditDownload = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const auditRecord = await auditRepository.findById(id);
    
    if (!auditRecord) {
      const appError: AppError = new Error('Audit not found');
      appError.statusCode = 404;
      appError.isOperational = true;
      throw appError;
    }

    if (!auditRecord.blob_url) {
      const appError: AppError = new Error('No download available for this audit');
      appError.statusCode = 404;
      appError.isOperational = true;
      throw appError;
    }

    res.status(200).json({
      downloadUrl: auditRecord.blob_url,
      fileName: `audit-${auditRecord.id}.csv`,
    });
  } catch (error) {
    logger.error('Failed to get audit download:', error as Error);
    next(error);
  }
};