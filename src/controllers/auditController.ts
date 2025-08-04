import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuditRequest, AuditResult } from '../types/audit';
import { WebsiteAnalyzer } from '../services/websiteAnalyzer';
import { ScoringEngine } from '../services/scoringEngine';
import { ReportGenerator } from '../services/reportGenerator';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

const websiteAnalyzer = new WebsiteAnalyzer();
const scoringEngine = new ScoringEngine();
const reportGenerator = new ReportGenerator();

export const createAudit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const auditRequest: AuditRequest = req.body;
    const auditId = uuidv4();

    logger.info(`Starting audit for URL: ${auditRequest.url} (ID: ${auditId})`);

    // Analyze website
    const websiteData = await websiteAnalyzer.analyze(auditRequest.url, auditRequest.includeScreenshot);

    // Generate scores using AI evaluation
    const scores = await scoringEngine.calculateScores(websiteData);

    // Generate insights and recommendations
    await reportGenerator.generateReport(websiteData, scores);

    const auditResult: AuditResult = {
      id: auditId,
      url: auditRequest.url,
      timestamp: new Date(),
      overallScore: scores.overall,
      scores: {
        valueProposition: scores.valueProposition.score,
        featuresAndBenefits: scores.featuresAndBenefits.score,
        ctaAnalysis: scores.ctaAnalysis.score,
        seoReadiness: scores.seoReadiness.score,
        trustSignals: scores.trustSignals.score,
      },
      insights: {
        valueProposition: scores.valueProposition.insights,
        featuresAndBenefits: scores.featuresAndBenefits.insights,
        ctaAnalysis: scores.ctaAnalysis.insights,
        seoReadiness: scores.seoReadiness.insights,
        trustSignals: scores.trustSignals.insights,
      },
      recommendations: {
        valueProposition: scores.valueProposition.recommendations,
        featuresAndBenefits: scores.featuresAndBenefits.recommendations,
        ctaAnalysis: scores.ctaAnalysis.recommendations,
        seoReadiness: scores.seoReadiness.recommendations,
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

    logger.info(`Audit completed for URL: ${auditRequest.url} (ID: ${auditId})`);

    res.status(200).json({
      success: true,
      data: auditResult,
    });
  } catch (error) {
    logger.error('Audit creation failed:', error as Error);
    next(error);
  }
};

export const getAuditById = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    req.params;

    // In a real application, you would fetch this from a database
    // For now, we'll return a placeholder response
    const appError: AppError = new Error('Audit retrieval not implemented yet');
    appError.statusCode = 501;
    appError.isOperational = true;
    throw appError;
  } catch (error) {
    next(error);
  }
};