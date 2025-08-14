"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditById = exports.createAudit = void 0;
const uuid_1 = require("uuid");
const websiteAnalyzer_1 = require("../services/websiteAnalyzer");
const scoringEngine_1 = require("../services/scoringEngine");
const reportGenerator_1 = require("../services/reportGenerator");
const logger_1 = require("../utils/logger");
const csvConverter_1 = require("../utils/csvConverter");
const websiteAnalyzer = new websiteAnalyzer_1.WebsiteAnalyzer();
const scoringEngine = new scoringEngine_1.ScoringEngine();
const reportGenerator = new reportGenerator_1.ReportGenerator();
const createAudit = async (req, res, next) => {
    try {
        const auditRequest = req.body;
        const auditId = (0, uuid_1.v4)();
        logger_1.logger.info(`Starting audit for URL: ${auditRequest.url} (ID: ${auditId})`);
        const websiteData = await websiteAnalyzer.analyze(auditRequest.url, auditRequest.includeScreenshot);
        const scores = await scoringEngine.calculateScores(websiteData);
        await reportGenerator.generateReport(websiteData, scores);
        const auditResult = {
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
        logger_1.logger.info(`Audit completed for URL: ${auditRequest.url} (ID: ${auditId})`);
        const acceptHeader = req.headers.accept;
        logger_1.logger.info(`${auditRequest}`);
        if (auditRequest.format === 'csv' || acceptHeader?.includes('text/csv')) {
            logger_1.logger.info(`creating csv file for audit result...`);
            const csvData = csvConverter_1.CSVConverter.convertAuditResultToCSV(auditResult);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="audit-${auditId}.csv"`);
            res.status(200).send(csvData);
        }
        else {
            res.status(200).json({
                success: true,
                data: auditResult,
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Audit creation failed:', error);
        next(error);
    }
};
exports.createAudit = createAudit;
const getAuditById = async (req, _res, next) => {
    try {
        req.params;
        const appError = new Error('Audit retrieval not implemented yet');
        appError.statusCode = 501;
        appError.isOperational = true;
        throw appError;
    }
    catch (error) {
        next(error);
    }
};
exports.getAuditById = getAuditById;
//# sourceMappingURL=auditController.js.map