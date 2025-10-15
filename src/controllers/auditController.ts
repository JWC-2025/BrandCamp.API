import { Request, Response, NextFunction } from 'express';
import { AuditRequest, AuditSubmissionResponse, AuditStatusResponse, AuditJobData } from '../types/audit';
import { auditQueue } from '../config/queue';
import { AuditRepository } from '../repositories/auditRepository';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { extractWebsiteNameFromUrl } from '../utils/urlUtils';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

const auditRepository = new AuditRepository();

export const createAudit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();
  try {
    const auditRequest: AuditRequest = req.body;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    logger.info(`[AUDIT_REQUEST] New audit request received`, {
      url: auditRequest.url,
      format: auditRequest.format || 'json',
      includeScreenshot: auditRequest.includeScreenshot || false,
      clientIp,
      userAgent,
      timestamp: new Date().toISOString()
    });

    // Create audit record in database
    logger.debug(`[AUDIT_DB] Creating audit record in database for URL: ${auditRequest.url}`);
    const auditId = await auditRepository.create(auditRequest);
    logger.info(`[AUDIT_DB] Audit record created successfully with ID: ${auditId}`);

    // Queue the audit job for background processing
    const jobData: AuditJobData = {
      auditId,
      auditRequest,
    };

    logger.debug(`[AUDIT_QUEUE] Adding audit job to queue`, {
      auditId,
      url: auditRequest.url,
      attempts: 3,
      backoff: 'exponential'
    });

    await auditQueue.add('process-audit', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
    
    logger.info(`[AUDIT_QUEUE] Audit job queued successfully for ID: ${auditId}`);

    const processingTime = Date.now() - startTime;

    // Return immediate response
    const response: AuditSubmissionResponse = {
      success: true,
      auditId,
      status: 'pending',
      statusUrl: `${req.protocol}://${req.get('host')}/api/audit/${auditId}/status`,
      message: 'Audit request received and queued for processing',
    };

    logger.debug(`[AUDIT_RESPONSE] Sending response to client`, {
      auditId,
      statusCode: 202,
      responseTime: processingTime
    });

    res.status(202).json(response);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`[AUDIT_ERROR] Audit submission failed after ${processingTime}ms:`, error as Error);
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
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    logger.debug(`[AUDIT_STATUS] Status request received for audit ID: ${id} from ${clientIp}`);

    const auditRecord = await auditRepository.findById(id);
    
    if (!auditRecord) {
      logger.warn(`[AUDIT_STATUS] Audit not found for ID: ${id} requested by ${clientIp}`);
      const appError: AppError = new Error('Audit not found');
      appError.statusCode = 404;
      appError.isOperational = true;
      throw appError;
    }

    logger.info(`[AUDIT_STATUS] Retrieved audit status`, {
      auditId: id,
      status: auditRecord.status,
      url: auditRecord.url,
      hasDownload: !!auditRecord.blob_url,
      createdAt: auditRecord.created_at.toISOString(),
      clientIp
    });

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
    logger.error(`[AUDIT_STATUS_ERROR] Failed to get audit status for ID: ${req.params.id}:`, error as Error);
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
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    logger.debug(`[AUDIT_RESULT] Result request received for audit ID: ${id} from ${clientIp}`);

    const auditRecord = await auditRepository.findById(id);
    
    if (!auditRecord) {
      logger.warn(`[AUDIT_RESULT] Audit not found for ID: ${id} requested by ${clientIp}`);
      const appError: AppError = new Error('Audit not found');
      appError.statusCode = 404;
      appError.isOperational = true;
      throw appError;
    }

    if (auditRecord.status !== 'completed') {
      logger.warn(`[AUDIT_RESULT] Audit not completed for ID: ${id}, current status: ${auditRecord.status}`);
      const appError: AppError = new Error('Audit not yet completed');
      appError.statusCode = 409;
      appError.isOperational = true;
      throw appError;
    }

    logger.info(`[AUDIT_RESULT] Successfully retrieved audit result`, {
      auditId: id,
      url: auditRecord.url,
      status: auditRecord.status,
      hasResultData: !!auditRecord.result_data,
      clientIp,
      completedAt: auditRecord.completed_at?.toISOString()
    });

    res.status(200).json({
      success: true,
      data: auditRecord.result_data,
    });
  } catch (error) {
    logger.error(`[AUDIT_RESULT_ERROR] Failed to get audit result for ID: ${req.params.id}:`, error as Error);
    next(error);
  }
};

export const getAllAudits = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    logger.debug(`[AUDIT_LIST] Request received for all audits from ${clientIp}`, {
      limit,
      offset
    });

    const auditRecords = await auditRepository.findAll(limit, offset);

    logger.info(`[AUDIT_LIST] Successfully retrieved ${auditRecords.length} audit records`, {
      count: auditRecords.length,
      limit,
      offset,
      clientIp
    });

    res.status(200).json({
      success: true,
      data: auditRecords.map(record => ({
        auditId: record.id,
        url: record.url,
        websiteName: extractWebsiteNameFromUrl(record.url),
        status: record.status,
        score: record.score,
        format: record.format,
        includeScreenshot: record.include_screenshot,
        createdAt: record.created_at.toISOString(),
        updatedAt: record.updated_at.toISOString(),
        completedAt: record.completed_at?.toISOString() || null,
        downloadUrl: record.blob_url || null,
        error: record.error_message || null
      })),
      pagination: {
        limit,
        offset,
        total: auditRecords.length
      }
    });
  } catch (error) {
    logger.error(`[AUDIT_LIST_ERROR] Failed to get all audit records:`, error as Error);
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
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    logger.debug(`[AUDIT_DOWNLOAD] Download request received for audit ID: ${id} from ${clientIp}`);

    const auditRecord = await auditRepository.findById(id);
    
    if (!auditRecord) {
      logger.warn(`[AUDIT_DOWNLOAD] Audit not found for ID: ${id} requested by ${clientIp}`);
      const appError: AppError = new Error('Audit not found');
      appError.statusCode = 404;
      appError.isOperational = true;
      throw appError;
    }

    if (!auditRecord.blob_url) {
      logger.warn(`[AUDIT_DOWNLOAD] No download available for audit ID: ${id}, status: ${auditRecord.status}`);
      const appError: AppError = new Error('No download available for this audit');
      appError.statusCode = 404;
      appError.isOperational = true;
      throw appError;
    }

    logger.info(`[AUDIT_DOWNLOAD] Successfully provided download link`, {
      auditId: id,
      url: auditRecord.url,
      fileName: `audit-${auditRecord.id}.csv`,
      blobUrl: auditRecord.blob_url,
      clientIp
    });

    res.status(200).json({
      downloadUrl: auditRecord.blob_url,
      fileName: `audit-${auditRecord.id}.csv`,
    });
  } catch (error) {
    logger.error(`[AUDIT_DOWNLOAD_ERROR] Failed to get audit download for ID: ${req.params.id}:`, error as Error);
    next(error);
  }
};

export const createBulkAudit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();
  try {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    logger.info(`[BULK_AUDIT_REQUEST] New bulk audit request received`, {
      clientIp,
      userAgent,
      timestamp: new Date().toISOString()
    });

    if (!req.file) {
      logger.warn(`[BULK_AUDIT_ERROR] No CSV file uploaded`);
      const appError: AppError = new Error('CSV file is required');
      appError.statusCode = 400;
      appError.isOperational = true;
      throw appError;
    }

    // Parse CSV file
    const urls: string[] = [];
    const csvStream = Readable.from(req.file.buffer);
    
    await new Promise<void>((resolve, reject) => {
      csvStream
        .pipe(csvParser({ headers: false }))
        .on('data', (row: Record<string, string>) => {
          // Get the first column value (assumes URL is in first column)
          const url = Object.values(row)[0] as string;
          if (url && url.trim()) {
            const trimmedUrl = url.trim();
            // Basic URL validation
            if (trimmedUrl.match(/^https?:\/\/.+/)) {
              urls.push(trimmedUrl);
            } else {
              logger.warn(`[BULK_AUDIT] Invalid URL skipped: ${trimmedUrl}`);
            }
          }
        })
        .on('end', () => {
          logger.info(`[BULK_AUDIT] CSV parsing completed, found ${urls.length} valid URLs`);
          resolve();
        })
        .on('error', (error: Error) => {
          logger.error(`[BULK_AUDIT_ERROR] CSV parsing failed:`, error);
          reject(error);
        });
    });

    if (urls.length === 0) {
      logger.warn(`[BULK_AUDIT_ERROR] No valid URLs found in CSV file`);
      const appError: AppError = new Error('No valid URLs found in the CSV file');
      appError.statusCode = 400;
      appError.isOperational = true;
      throw appError;
    }

    // Create audit records for each URL
    const auditIds: string[] = [];
    
    for (const url of urls) {
      try {
        const auditRequest: AuditRequest = {
          url,
          format: 'json',
          includeScreenshot: false
        };

        // Create audit record in database with pending status
        const auditId = await auditRepository.create(auditRequest);
        auditIds.push(auditId);

        logger.debug(`[BULK_AUDIT] Created audit record for ${url} with ID: ${auditId}`);
      } catch (error) {
        logger.error(`[BULK_AUDIT_ERROR] Failed to create audit for URL ${url}:`, error as Error);
        // Continue with other URLs even if one fails
      }
    }

    // Queue jobs for all created audits (they will be processed sequentially by the worker)
    for (const auditId of auditIds) {
      try {
        const auditRecord = await auditRepository.findById(auditId);
        if (auditRecord) {
          const jobData: AuditJobData = {
            auditId,
            auditRequest: {
              url: auditRecord.url,
              format: auditRecord.format,
              includeScreenshot: auditRecord.include_screenshot
            },
          };

          await auditQueue.add('process-audit', jobData, {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          });

          logger.debug(`[BULK_AUDIT] Queued audit job for ID: ${auditId}`);
        }
      } catch (error) {
        logger.error(`[BULK_AUDIT_ERROR] Failed to queue audit ${auditId}:`, error as Error);
      }
    }
    
    logger.info(`[BULK_AUDIT] Successfully queued ${auditIds.length} audit jobs for sequential processing`);

    const processingTime = Date.now() - startTime;

    // Return response with all created audit IDs
    const response = {
      success: true,
      message: `Bulk audit request processed successfully. ${auditIds.length} audits created from ${urls.length} URLs.`,
      auditIds,
      totalUrls: urls.length,
      createdAudits: auditIds.length,
      statusUrls: auditIds.map(id => `${req.protocol}://${req.get('host')}/api/audit/${id}/status`)
    };

    logger.info(`[BULK_AUDIT] Bulk audit request completed`, {
      totalUrls: urls.length,
      createdAudits: auditIds.length,
      processingTime,
      clientIp
    });

    res.status(202).json(response);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`[BULK_AUDIT_ERROR] Bulk audit submission failed after ${processingTime}ms:`, error as Error);
    next(error);
  }
};