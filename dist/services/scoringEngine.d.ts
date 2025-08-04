import { WebsiteData } from '../types/audit';
import { EvaluationResult } from '../types/evaluator';
export interface ScoringResult {
    overall: number;
    valueProposition: EvaluationResult;
    featuresAndBenefits: EvaluationResult;
    ctaAnalysis: EvaluationResult;
    seoReadiness: EvaluationResult;
    trustSignals: EvaluationResult;
}
export declare class ScoringEngine {
    private valuePropositionEvaluator;
    private featuresAndBenefitsEvaluator;
    private ctaAnalysisEvaluator;
    private seoReadinessEvaluator;
    private trustSignalsEvaluator;
    constructor();
    calculateScores(websiteData: WebsiteData): Promise<ScoringResult>;
    private calculateOverallScore;
}
