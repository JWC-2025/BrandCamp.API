import Bull, { Job } from 'bull';
import { AuditJobData, AuditResult } from '../types/audit';
import { WebsiteAnalyzer } from '../services/websiteAnalyzer';
import { ScoringEngine } from '../services/scoringEngine';
import { ReportGenerator } from '../services/reportGenerator';
import { BlobStorageService } from '../services/blobStorageService';
import { AuditRepository } from '../repositories/auditRepository';
import { CSVConverter } from '../utils/csvConverter';
import { logger } from '../utils/logger';

const websiteAnalyzer = new WebsiteAnalyzer();
const scoringEngine = new ScoringEngine();
const reportGenerator = new ReportGenerator();
const blobStorageService = new BlobStorageService();
const auditRepository = new AuditRepository();

export const processAudit = async (job: Job<AuditJobData>): Promise<void> => {
  const { auditId, auditRequest } = job.data;
  
  try {
    logger.info(`Starting audit processing for ID: ${auditId}`);
    
    // Update status to processing
    await auditRepository.updateStatus(auditId, 'processing');
    await job.progress(10);

    // Analyze website
    logger.info(`Analyzing website: ${auditRequest.url}`);
    const websiteData = await websiteAnalyzer.analyze(
      auditRequest.url, 
      auditRequest.includeScreenshot
    );
    await job.progress(40);

    // Generate scores using AI evaluation
    logger.info(`Calculating scores for audit: ${auditId}`);
    const scores = await scoringEngine.calculateScores(websiteData);
    await job.progress(70);

    // Generate insights and recommendations  
    logger.info(`Generating report for audit: ${auditId}`);
    await reportGenerator.generateReport(websiteData, scores);
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
      logger.info(`Generating CSV and uploading to Vercel Blob for audit: ${auditId}`);
      
      const csvData = CSVConverter.convertAuditResultToCSV(auditResult);
      const fileName = `audit-${auditId}-${Date.now()}.csv`;
      
      blobUrl = await blobStorageService.uploadCSVFile(
        fileName,
        csvData,
        auditId
      );
    }

    await job.progress(95);

    // Update database with results
    await auditRepository.updateWithResult(auditId, auditResult, blobUrl);
    
    await job.progress(100);
    logger.info(`Audit processing completed successfully for ID: ${auditId}`);

  } catch (error) {
    logger.error(`Audit processing failed for ID: ${auditId}:`, error as Error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    await auditRepository.markAsFailed(auditId, errorMessage);
    
    throw error;
  }
};

export const setupAuditWorker = (queue: Bull.Queue): void => {
  queue.process('process-audit', 5, processAudit);
  
  logger.info('Audit worker setup completed');
};