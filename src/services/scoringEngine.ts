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
      
      // Execute evaluators sequentially with delays to avoid rate limits
      logger.info('Running Value Proposition evaluation...');
      const valueProposition = await this.valuePropositionEvaluator.evaluate(websiteData);
      await this.delay(12000); // 12 second delay for 5 req/min limit
      
      logger.info('Running Features & Benefits evaluation...');
      const featuresAndBenefits = await this.featuresAndBenefitsEvaluator.evaluate(websiteData);
      await this.delay(12000);
      
      logger.info('Running CTA Analysis evaluation...');
      const ctaAnalysis = await this.ctaAnalysisEvaluator.evaluate(websiteData);
      await this.delay(12000);
      
      logger.info('Running Trust Signals evaluation...');
      const trustSignals = await this.trustSignalsEvaluator.evaluate(websiteData);

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

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}