import Bull, { Job } from 'bull';
import { AuditJobData, AuditResult } from '../types/audit';
import { WebsiteAnalyzer } from '../services/websiteAnalyzer';
import { ScoringEngine } from '../services/scoringEngine';
import { ReportGenerator } from '../services/reportGenerator';
import { BlobStorageService } from '../services/blobStorageService';
import { AuditRepository } from '../repositories/auditRepository';
import { CSVConverter } from '../utils/csvConverter';
import { logger } from '../utils/logger';
import { QueuedClaudeService } from '../services/aiService';

const websiteAnalyzer = new WebsiteAnalyzer();
const scoringEngine = new ScoringEngine();
const reportGenerator = new ReportGenerator();
const blobStorageService = new BlobStorageService();
const auditRepository = new AuditRepository();


export const processAudit = async (job: Job<AuditJobData>): Promise<void> => {
  const { auditId, auditRequest } = job.data;
  const processingStartTime = Date.now();
  
  try {
    logger.warn(`[AUDIT_WORKER_START] Starting audit processing`, {
      auditId,
      url: auditRequest.url,
      format: auditRequest.format || 'json',
      includeScreenshot: auditRequest.includeScreenshot || false,
      jobId: job.id,
      timestamp: new Date().toISOString()
    });
    
   // Update status to processing
    logger.warn(`[AUDIT_WORKER_DB] Updating audit status to processing for ID: ${auditId}`);
    await auditRepository.updateStatus(auditId, 'processing');

    // Analyze website
    logger.warn(`[AUDIT_WORKER_ANALYZE] Starting website analysis`, {
      auditId,
      url: auditRequest.url,
      includeScreenshot: auditRequest.includeScreenshot
    });
    const analysisStartTime = Date.now();
    const websiteData = await websiteAnalyzer.analyze(
      auditRequest.url, 
      auditRequest.includeScreenshot
    );
    const analysisTime = Date.now() - analysisStartTime;
    logger.warn(`[AUDIT_WORKER_ANALYZE_COMPLETE] Website analysis completed`, {
      auditId,
      url: auditRequest.url,
      analysisTimeMs: analysisTime,
      hasScreenshot: !!websiteData.screenshot,
      pageTitle: websiteData.metadata.title
    });
    await job.progress(40);

    // Generate scores using AI evaluation
    logger.warn(`[AUDIT_WORKER_SCORING] Starting AI scoring analysis`, {
      auditId,
      url: auditRequest.url
    });
    const scoringStartTime = Date.now();
    const scores = await scoringEngine.calculateScores(websiteData);
    const scoringTime = Date.now() - scoringStartTime;
    
    // Log queue status for monitoring
    const queueStatus = QueuedClaudeService.getQueueStatus();
    logger.warn(`[AUDIT_WORKER_SCORING_COMPLETE] AI scoring completed`, {
      auditId,
      overallScore: scores.overall,
      scoringTimeMs: scoringTime,
      scores: {
        valueProposition: scores.valueProposition.score,
        featuresAndBenefits: scores.featuresAndBenefits.score,
        ctaAnalysis: scores.ctaAnalysis.score,
        trustSignals: scores.trustSignals.score
      },
      aiQueueStatus: queueStatus
    });
    await job.progress(70);

    // Generate insights and recommendations  
    logger.warn(`[AUDIT_WORKER_REPORT] Generating audit report`, {
      auditId,
      url: auditRequest.url
    });
    const reportStartTime = Date.now();
    await reportGenerator.generateReport(websiteData, scores);
    const reportTime = Date.now() - reportStartTime;
    logger.debug(`[AUDIT_WORKER_REPORT_COMPLETE] Report generation completed in ${reportTime}ms`);
    await job.progress(85);

    // Create audit result
    const auditResult: AuditResult = {
      id: auditId,
      url: auditRequest.url,
      timestamp: new Date(),
      overallScore: scores.overall,
      scores: {
        valueProposition: scores.valueProposition.score,
        featuresAndBenefits: scores.featuresAndBenefits.score,
        ctaAnalysis: scores.ctaAnalysis.score,
        trustSignals: scores.trustSignals.score,
      },
      insights: {
        valueProposition: scores.valueProposition.insights,
        featuresAndBenefits: scores.featuresAndBenefits.insights,
        ctaAnalysis: scores.ctaAnalysis.insights,
        trustSignals: scores.trustSignals.insights,
      },
      recommendations: {
        valueProposition: scores.valueProposition.recommendations,
        featuresAndBenefits: scores.featuresAndBenefits.recommendations,
        ctaAnalysis: scores.ctaAnalysis.recommendations,
        trustSignals: scores.trustSignals.recommendations,
      },
      screenshot: auditRequest.includeScreenshot
        ? websiteData.screenshot?.toString('base64')
        : undefined,
      metadata: {
        analysisTime: Date.now() - new Date().getTime(),
        version: process.env.npm_package_version || '1.0.0',
      },
    };

    // Generate and upload CSV if format is CSV
    let blobUrl: string | undefined;
    if (auditRequest.format === 'csv') {
      logger.warn(`[AUDIT_WORKER_CSV] Generating CSV and uploading to blob storage`, {
        auditId,
        fileName: `audit-${auditId}-${Date.now()}.csv`
      });
      
      const csvStartTime = Date.now();
      const csvData = CSVConverter.convertAuditResultToCSV(auditResult);
      const fileName = `audit-${auditId}-${Date.now()}.csv`;
      
      blobUrl = await blobStorageService.uploadCSVFile(
        fileName,
        csvData,
        auditId
      );
      
      const csvTime = Date.now() - csvStartTime;
      logger.warn(`[AUDIT_WORKER_CSV_COMPLETE] CSV generation and upload completed`, {
        auditId,
        fileName,
        blobUrl,
        csvTimeMs: csvTime,
        csvSizeBytes: csvData.length
      });
    }

    await job.progress(95);

    // Update database with results
    logger.warn(`[AUDIT_WORKER_DB_UPDATE] Updating database with audit results`, {
      auditId,
      hasBlobUrl: !!blobUrl
    });
    await auditRepository.updateWithResult(auditId, auditResult, blobUrl);
    
    await job.progress(100);
    
    const totalProcessingTime = Date.now() - processingStartTime;
    logger.warn(`[AUDIT_WORKER_SUCCESS] Audit processing completed successfully`, {
      auditId,
      url: auditRequest.url,
      overallScore: auditResult.overallScore,
      totalProcessingTimeMs: totalProcessingTime,
      jobId: job.id,
      completedAt: new Date().toISOString()
    });


  } catch (error) {
    const totalProcessingTime = Date.now() - processingStartTime;
    logger.error(`[AUDIT_WORKER_ERROR] Audit processing failed`, error as Error, {
      auditId,
      url: auditRequest.url,
      totalProcessingTimeMs: totalProcessingTime,
      jobId: job.id
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    await auditRepository.markAsFailed(auditId, errorMessage);
    
    
    throw error;
  }
};

const cleanupStaleAudits = async (): Promise<void> => {
  try {
    logger.info('[AUDIT_WORKER_CLEANUP] Checking for stale processing audits...');
    const failedCount = await auditRepository.failStaleProcessingAudits(30); // 30 minutes timeout
    if (failedCount > 0) {
      logger.warn(`[AUDIT_WORKER_CLEANUP] Failed ${failedCount} stale processing audits (timeout)`);
    } else {
      logger.debug('[AUDIT_WORKER_CLEANUP] No stale processing audits found');
    }
  } catch (error) {
    logger.error('[AUDIT_WORKER_CLEANUP] Error during stale audit cleanup:', error as Error);
  }
};

export const setupAuditWorker = async (queue: Bull.Queue): Promise<void> => {
  // Clean up any stale processing audits on startup
  await cleanupStaleAudits();
  
  // Process audits one at a time to ensure sequential processing
  queue.process('process-audit', 1, processAudit);
  
  // Set up periodic cleanup every 10 minutes
  setInterval(cleanupStaleAudits, 10 * 60 * 1000);
  
  logger.info('Audit worker setup completed with sequential processing (concurrency: 1) and stale audit cleanup');
};