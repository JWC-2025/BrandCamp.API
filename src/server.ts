import app from './app';
import { connectDatabase } from './config/database';
import { runMigrations } from './utils/migrations';
import { setupAuditWorker } from './workers/auditWorker';
import { auditQueue, closeQueue } from './config/queue';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    
    // Run database migrations
    await runMigrations();
    
    // Setup queue worker
    await setupAuditWorker(auditQueue);
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await closeQueue();
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error as Error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Failed to start server:', error as Error);
    process.exit(1);
  }
}

// For local development
if (process.env.NODE_ENV !== 'production') {
  startServer();
}

// For Vercel serverless deployment
export default app;