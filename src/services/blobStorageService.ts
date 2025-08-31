import { put, del } from '@vercel/blob';
import { logger } from '../utils/logger';

export class BlobStorageService {
  private token: string;

  constructor() {
    this.token = process.env.BLOB_READ_WRITE_TOKEN as string;
    
    if (!this.token) {
      throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required');
    }
  }

  async uploadCSVFile(
    fileName: string,
    csvContent: string,
    auditId: string
  ): Promise<string> {
    try {
      logger.info(`Uploading CSV file to Vercel Blob: ${fileName} for audit: ${auditId}`);

      const blob = await put(fileName, csvContent, {
        access: 'public',
        contentType: 'text/csv',
        addRandomSuffix: true,
        token: this.token,
      });

      logger.info(`CSV file uploaded successfully. Public URL: ${blob.url}`);
      return blob.url;
    } catch (error) {
      logger.error('Failed to upload CSV to Vercel Blob:', error as Error);
      throw new Error(`Vercel Blob upload failed: ${error}`);
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      await del(fileName, {
        token: this.token,
      });
      logger.info(`File deleted from Vercel Blob: ${fileName}`);
    } catch (error) {
      logger.error('Failed to delete file from Vercel Blob:', error as Error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const testFileName = `test-connection-${Date.now()}.txt`;
      await put(testFileName, 'test content', {
        access: 'public',
        token: this.token,
      });
      
      // Clean up test file
      await del(testFileName, {
        token: this.token,
      });
      
      logger.info('Vercel Blob connection test successful');
      return true;
    } catch (error) {
      logger.error('Vercel Blob connection test failed:', error as Error);
      return false;
    }
  }
}