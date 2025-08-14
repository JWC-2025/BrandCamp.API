"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGenerator = void 0;
const constants_1 = require("../utils/constants");
const logger_1 = require("../utils/logger");
class ReportGenerator {
    async generateReport(websiteData, scores) {
        try {
            logger_1.logger.info(`Generating report for: ${websiteData.url}`);
            const summary = this.generateSummary(websiteData.url, scores.overall);
            const strengths = this.identifyStrengths(scores);
            const improvements = this.identifyImprovements(scores);
            const priority = this.determinePriority(scores.overall);
            logger_1.logger.info(`Report generation completed for: ${websiteData.url}`);
            return {
                summary,
                strengths,
                improvements,
                priority,
            };
        }
        catch (error) {
            logger_1.logger.error('Report generation failed:', error);
            throw error;
        }
    }
    generateSummary(url, overallScore) {
        const domain = new URL(url).hostname;
        if (overallScore >= constants_1.SCORE_THRESHOLDS.excellent) {
            return `${domain} demonstrates exceptional marketing effectiveness with a score of ${overallScore}/100. The website showcases strong fundamentals across all evaluated criteria.`;
        }
        else if (overallScore >= constants_1.SCORE_THRESHOLDS.good) {
            return `${domain} shows good marketing potential with a score of ${overallScore}/100. There are solid foundations in place with room for strategic improvements.`;
        }
        else if (overallScore >= constants_1.SCORE_THRESHOLDS.average) {
            return `${domain} has average marketing effectiveness with a score of ${overallScore}/100. Several areas need attention to improve conversion potential.`;
        }
        else {
            return `${domain} requires significant marketing improvements with a score of ${overallScore}/100. Multiple critical areas need immediate attention to enhance effectiveness.`;
        }
    }
    identifyStrengths(scores) {
        const strengths = [];
        if (scores.valueProposition.score >= constants_1.SCORE_THRESHOLDS.good) {
            strengths.push('Strong value proposition clarity');
        }
        if (scores.featuresAndBenefits.score >= constants_1.SCORE_THRESHOLDS.good) {
            strengths.push('Well-presented features and benefits');
        }
        if (scores.ctaAnalysis.score >= constants_1.SCORE_THRESHOLDS.good) {
            strengths.push('Effective call-to-action implementation');
        }
        if (scores.trustSignals.score >= constants_1.SCORE_THRESHOLDS.good) {
            strengths.push('Strong trust and credibility signals');
        }
        return strengths.length > 0 ? strengths : ['Basic website structure in place'];
    }
    identifyImprovements(scores) {
        const improvements = [];
        if (scores.valueProposition.score < constants_1.SCORE_THRESHOLDS.good) {
            improvements.push('Clarify and strengthen value proposition messaging');
        }
        if (scores.featuresAndBenefits.score < constants_1.SCORE_THRESHOLDS.good) {
            improvements.push('Better highlight product/service features and benefits');
        }
        if (scores.ctaAnalysis.score < constants_1.SCORE_THRESHOLDS.good) {
            improvements.push('Optimize call-to-action placement and messaging');
        }
        if (scores.trustSignals.score < constants_1.SCORE_THRESHOLDS.good) {
            improvements.push('Add more trust signals and credibility indicators');
        }
        return improvements;
    }
    determinePriority(overallScore) {
        if (overallScore < constants_1.SCORE_THRESHOLDS.poor) {
            return 'high';
        }
        else if (overallScore < constants_1.SCORE_THRESHOLDS.good) {
            return 'medium';
        }
        else {
            return 'low';
        }
    }
}
exports.ReportGenerator = ReportGenerator;
//# sourceMappingURL=reportGenerator.js.map