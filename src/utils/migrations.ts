import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../config/database';
import { logger } from './logger';

export const runMigrations = async (): Promise<void> => {
  try {
    logger.info('Running database migrations...');
    
    const migrations = [
      '001_create_audit_requests.sql',
      '002_update_google_drive_to_blob_url.sql',
      '003_add_score_column.sql'
    ];
    
    for (const migration of migrations) {
      const migrationPath = join(process.cwd(), 'src/migrations/', migration);
      const migrationSQL = readFileSync(migrationPath, 'utf-8');
      
      logger.info(`Running migration: ${migration}`);
      await db.unsafe(migrationSQL);
    }
    
    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error as Error);
    throw error;
  }
};