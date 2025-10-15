import { db } from '../config/database';
import { AuditRequest, AuditResult } from '../types/audit';
import { logger } from '../utils/logger';

export interface AuditRecord {
  id: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  include_screenshot: boolean;
  format: string;
  blob_url?: string;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  error_message?: string;
  request_data?: AuditRequest;
  result_data?: AuditResult;
  score?: number;
}

export class AuditRepository {
  constructor(private sql = db) {}

  async create(auditRequest: AuditRequest): Promise<string> {
    try {
      const result = await this.sql`
        INSERT INTO audit_requests (url, include_screenshot, format, request_data)
        VALUES (${auditRequest.url}, ${auditRequest.includeScreenshot || false}, ${auditRequest.format || 'json'}, ${JSON.stringify(auditRequest)})
        RETURNING id
      `;
      
      const auditId = result[0].id;
      
      logger.info(`Created audit request with ID: ${auditId}`);
      return auditId;
    } catch (error) {
      logger.error('Error creating audit request:', error as Error);
      throw error;
    }
  }

  async findById(id: string): Promise<AuditRecord | null> {
    try {
      const result = await this.sql`
        SELECT * FROM audit_requests WHERE id = ${id}
      `;
      
      if (result.length === 0) {
        return null;
      }

      return this.mapRowToRecord(result[0]);
    } catch (error) {
      logger.error('Error finding audit request by ID:', error as Error);
      throw error;
    }
  }

  async updateStatus(id: string, status: AuditRecord['status'], errorMessage?: string): Promise<void> {
    try {
      await this.sql`
        UPDATE audit_requests 
        SET status = ${status}, error_message = ${errorMessage || null}, updated_at = NOW()
        WHERE id = ${id}
      `;
      logger.info(`Updated audit ${id} status to: ${status}`);
    } catch (error) {
      logger.error('Error updating audit status:', error as Error);
      throw error;
    }
  }

  async updateWithResult(
    id: string, 
    result: AuditResult, 
    blobUrl?: string
  ): Promise<void> {
    try {
      await this.sql`
        UPDATE audit_requests 
        SET 
          status = 'completed',
          result_data = ${JSON.stringify(result)},
          blob_url = ${blobUrl || null},
          score = ${result.overallScore},
          completed_at = NOW(),
          updated_at = NOW()
        WHERE id = ${id}
      `;
      
      logger.info(`Updated audit ${id} with result and blob URL`);
    } catch (error) {
      logger.error('Error updating audit with result:', error as Error);
      throw error;
    }
  }

  async markAsFailed(id: string, errorMessage: string): Promise<void> {
    try {
      await this.sql`
        UPDATE audit_requests 
        SET 
          status = 'failed',
          error_message = ${errorMessage},
          updated_at = NOW()
        WHERE id = ${id}
      `;
      logger.info(`Marked audit ${id} as failed: ${errorMessage}`);
    } catch (error) {
      logger.error('Error marking audit as failed:', error as Error);
      throw error;
    }
  }

  async findPendingAudits(limit: number = 10): Promise<AuditRecord[]> {
    try {
      const result = await this.sql`
        SELECT * FROM audit_requests 
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT ${limit}
      `;
      
      return result.map(row => this.mapRowToRecord(row));
    } catch (error) {
      logger.error('Error finding pending audits:', error as Error);
      throw error;
    }
  }

  async findAll(limit: number = 100, offset: number = 0): Promise<AuditRecord[]> {
    try {
      const result = await this.sql`
        SELECT * FROM audit_requests 
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
      
      return result.map(row => this.mapRowToRecord(row));
    } catch (error) {
      logger.error('Error finding all audit records:', error as Error);
      throw error;
    }
  }

  async getAuditStats(): Promise<{ pending: number; processing: number; completed: number; failed: number }> {
    try {
      const result = await this.sql`
        SELECT 
          status,
          COUNT(*) as count
        FROM audit_requests 
        GROUP BY status
      `;
      
      const stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
      result.forEach((row: any) => {
        stats[row.status as keyof typeof stats] = parseInt(row.count);
      });
      
      return stats;
    } catch (error) {
      logger.error('Error getting audit stats:', error as Error);
      throw error;
    }
  }

  async hasProcessingAudits(): Promise<boolean> {
    try {
      const result = await this.sql`
        SELECT COUNT(*) as count
        FROM audit_requests 
        WHERE status = 'processing'
        LIMIT 1
      `;
      
      const count = parseInt(result[0].count);
      logger.debug(`Found ${count} processing audits`);
      return count > 0;
    } catch (error) {
      logger.error('Error checking for processing audits:', error as Error);
      throw error;
    }
  }

  async findStaleProcessingAudits(maxAgeMinutes: number = 30): Promise<AuditRecord[]> {
    try {
      const result = await this.sql`
        SELECT * FROM audit_requests 
        WHERE status = 'processing' 
          AND updated_at < NOW() - INTERVAL '${maxAgeMinutes} minutes'
        ORDER BY updated_at ASC
      `;
      
      return result.map(row => this.mapRowToRecord(row));
    } catch (error) {
      logger.error('Error finding stale processing audits:', error as Error);
      throw error;
    }
  }

  async failStaleProcessingAudits(maxAgeMinutes: number = 30): Promise<number> {
    try {
      const result = await this.sql`
        UPDATE audit_requests 
        SET 
          status = 'failed',
          error_message = 'Audit timed out - processing took longer than ${maxAgeMinutes} minutes',
          updated_at = NOW()
        WHERE status = 'processing' 
          AND updated_at < NOW() - INTERVAL '${maxAgeMinutes} minutes'
        RETURNING id
      `;
      
      const count = result.length;
      if (count > 0) {
        logger.warn(`Failed ${count} stale processing audits (timeout after ${maxAgeMinutes} minutes)`);
      }
      return count;
    } catch (error) {
      logger.error('Error failing stale processing audits:', error as Error);
      throw error;
    }
  }

  async resetAllProcessingAudits(): Promise<number> {
    try {
      const result = await this.sql`
        UPDATE audit_requests 
        SET 
          status = 'pending',
          error_message = 'Reset from processing state (manual cleanup)',
          updated_at = NOW()
        WHERE status = 'processing'
        RETURNING id
      `;
      
      const count = result.length;
      if (count > 0) {
        logger.warn(`Manually reset ${count} processing audits back to pending status`);
      }
      return count;
    } catch (error) {
      logger.error('Error resetting all processing audits:', error as Error);
      throw error;
    }
  }

  private mapRowToRecord(row: any): AuditRecord {
    return {
      id: row.id,
      url: row.url,
      status: row.status,
      include_screenshot: row.include_screenshot,
      format: row.format,
      blob_url: row.blob_url,
      created_at: row.created_at,
      updated_at: row.updated_at,
      completed_at: row.completed_at,
      error_message: row.error_message,
      request_data: row.request_data,
      result_data: row.result_data,
      score: row.score,
    };
  }
}