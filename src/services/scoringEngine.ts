import { WebsiteData } from '../types/audit';
import { EvaluationResult } from '../types/evaluator';
import { EVALUATION_WEIGHTS } from '../utils/constants';
import { logger } from '../utils/logger';

// Import evaluators
import { ValuePropositionEvaluator } from '../evaluators/valueProposition';
import { FeaturesAndBenefitsEvaluator } from '../evaluators/featuresAndBenefits';
import { CTAAnalysisEvaluator } from '../evaluators/ctaAnalysis';
import { TrustSignalsEvaluator } from '../evaluators/trustSignals';

export interface ScoringResult {
  overall: number;
  valueProposition: EvaluationResult;
  featuresAndBenefits: EvaluationResult;
  ctaAnalysis: EvaluationResult;
  trustSignals: EvaluationResult;
}

export class ScoringEngine {
  // Individual evaluators
  private valuePropositionEvaluator: ValuePropositionEvaluator;
  private featuresAndBenefitsEvaluator: FeaturesAndBenefitsEvaluator;
  private ctaAnalysisEvaluator: CTAAnalysisEvaluator;
  private trustSignalsEvaluator: TrustSignalsEvaluator;

  constructor() {
    // Initialize evaluators
    this.valuePropositionEvaluator = new ValuePropositionEvaluator();
    this.featuresAndBenefitsEvaluator = new FeaturesAndBenefitsEvaluator();
    this.ctaAnalysisEvaluator = new CTAAnalysisEvaluator();
    this.trustSignalsEvaluator = new TrustSignalsEvaluator();
  }

  async calculateScores(websiteData: WebsiteData): Promise<ScoringResult> {
    try {
      logger.info(`Starting individual evaluator scoring for: ${websiteData.url}`);
      
      const [
        valueProposition,
        featuresAndBenefits,
        ctaAnalysis,
        trustSignals,
      ] = await Promise.all([
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

      logger.info(`Individual evaluator scoring completed for: ${websiteData.url} - Overall Score: ${overallScore}`);

      return {
        overall: overallScore,
        valueProposition,
        featuresAndBenefits,
        ctaAnalysis,
        trustSignals,
      };
    } catch (error) {
      logger.error('Scoring evaluation failed:', error as Error);
      throw error;
    }
  }


  private calculateOverallScore(scores: {
    valueProposition: number;
    featuresAndBenefits: number;
    ctaAnalysis: number;
    trustSignals: number;
  }): number {
    const weightedSum = 
      scores.valueProposition * EVALUATION_WEIGHTS.valueProposition +
      scores.featuresAndBenefits * EVALUATION_WEIGHTS.featuresAndBenefits +
      scores.ctaAnalysis * EVALUATION_WEIGHTS.ctaAnalysis +
      scores.trustSignals * EVALUATION_WEIGHTS.trustSignals;

    return Math.round(weightedSum);
  }
}