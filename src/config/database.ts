import postgres from 'postgres';
import { logger } from '../utils/logger';

const connectionString = 'postgres://neondb_owner:npg_AduEhQ1tP3Vf@ep-noisy-truth-ad1v4yop-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

if (!connectionString) {
  logger.error('DATABASE_URL environment variable is not set');
  throw new Error('DATABASE_URL is required');
}

//logger.info('Using database connection string:', connectionString.replace(/:([^:@]{8})[^:@]*@/, ':$1****@'));

const sql = postgres(connectionString, {
  prepare: false,
  ssl: { rejectUnauthorized: false },
  connect_timeout: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 30
});

export const db = sql;

export const connectDatabase = async (): Promise<void> => {
  try {
    logger.info('Attempting database connection...');
    await sql`SELECT 1`;
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error('Database connection failed');
   // logger.error('CONNECTION_STRING:', connectionString?.replace(/:([^:@]{8})[^:@]*@/, ':$1****@') || 'not set');
    logger.error('Error message:', (error as any).message);
    logger.error('Error code:', (error as any).code);
    logger.error('Error detail:', (error as any).detail);
    logger.error('Full error:', error as Error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await sql.end();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error as Error);
  }
};