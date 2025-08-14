"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringEngine = void 0;
const constants_1 = require("../utils/constants");
const logger_1 = require("../utils/logger");
const valueProposition_1 = require("../evaluators/valueProposition");
const featuresAndBenefits_1 = require("../evaluators/featuresAndBenefits");
const ctaAnalysis_1 = require("../evaluators/ctaAnalysis");
const trustSignals_1 = require("../evaluators/trustSignals");
class ScoringEngine {
    constructor() {
        this.valuePropositionEvaluator = new valueProposition_1.ValuePropositionEvaluator();
        this.featuresAndBenefitsEvaluator = new featuresAndBenefits_1.FeaturesAndBenefitsEvaluator();
        this.ctaAnalysisEvaluator = new ctaAnalysis_1.CTAAnalysisEvaluator();
        this.trustSignalsEvaluator = new trustSignals_1.TrustSignalsEvaluator();
    }
    async calculateScores(websiteData) {
        try {
            logger_1.logger.info(`Starting individual evaluator scoring for: ${websiteData.url}`);
            const [valueProposition, featuresAndBenefits, ctaAnalysis, trustSignals,] = await Promise.all([
                this.valuePropositionEvaluator.evaluate(websiteData),
                this.featuresAndBenefitsEvaluator.evaluate(websiteData),
                this.ctaAnalysisEvaluator.evaluate(websiteData),
                this.trustSignalsEvaluator.evaluate(websiteData),
            ]);
            const overallScore = this.calculateOverallScore({
                valueProposition: valueProposition.score,
                featuresAndBenefits: featuresAndBenefits.score,
                ctaAnalysis: ctaAnalysis.score,
                trustSignals: trustSignals.score,
            });
            logger_1.logger.info(`Individual evaluator scoring completed for: ${websiteData.url} - Overall Score: ${overallScore}`);
            return {
                overall: overallScore,
                valueProposition,
                featuresAndBenefits,
                ctaAnalysis,
                trustSignals,
            };
        }
        catch (error) {
            logger_1.logger.error('Scoring evaluation failed:', error);
            throw error;
        }
    }
    calculateOverallScore(scores) {
        const weightedSum = scores.valueProposition * constants_1.EVALUATION_WEIGHTS.valueProposition +
            scores.featuresAndBenefits * constants_1.EVALUATION_WEIGHTS.featuresAndBenefits +
            scores.ctaAnalysis * constants_1.EVALUATION_WEIGHTS.ctaAnalysis +
            scores.trustSignals * constants_1.EVALUATION_WEIGHTS.trustSignals;
        return Math.round(weightedSum);
    }
}
exports.ScoringEngine = ScoringEngine;
//# sourceMappingURL=scoringEngine.js.map