import { WebsiteData } from '../types/audit';
import { EvaluationResult } from '../types/evaluator';
import { EVALUATION_WEIGHTS } from '../utils/constants';
import { logger } from '../utils/logger';
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
  private valuePropositionEvaluator: ValuePropositionEvaluator;
  private featuresAndBenefitsEvaluator: FeaturesAndBenefitsEvaluator;
  private ctaAnalysisEvaluator: CTAAnalysisEvaluator;
  private trustSignalsEvaluator: TrustSignalsEvaluator;
  private readonly DELAY_BETWEEN_EVALUATIONS = 60000; // 60 seconds

  constructor() {
    this.valuePropositionEvaluator = new ValuePropositionEvaluator();
    this.featuresAndBenefitsEvaluator = new FeaturesAndBenefitsEvaluator();
    this.ctaAnalysisEvaluator = new CTAAnalysisEvaluator();
    this.trustSignalsEvaluator = new TrustSignalsEvaluator();
  }

  async calculateScores(websiteData: WebsiteData): Promise<ScoringResult> {
    const startTime = Date.now();

    try {
      logger.warn(`Starting sequential evaluator scoring for: ${websiteData.url}`);

      // Execute all evaluators sequentially with 60-second delays between each
      const valueProposition = await this.safeEvaluate(
        'valueProposition',
        this.valuePropositionEvaluator,
        websiteData
      );

      await this.delay(this.DELAY_BETWEEN_EVALUATIONS);
      logger.info(`[SCORING_ENGINE] Waited 60s before next evaluation`);

      const featuresAndBenefits = await this.safeEvaluate(
        'featuresAndBenefits',
        this.featuresAndBenefitsEvaluator,
        websiteData
      );

      await this.delay(this.DELAY_BETWEEN_EVALUATIONS);
      logger.info(`[SCORING_ENGINE] Waited 60s before next evaluation`);

      const ctaAnalysis = await this.safeEvaluate(
        'ctaAnalysis',
        this.ctaAnalysisEvaluator,
        websiteData
      );

      await this.delay(this.DELAY_BETWEEN_EVALUATIONS);
      logger.info(`[SCORING_ENGINE] Waited 60s before next evaluation`);

      const trustSignals = await this.safeEvaluate(
        'trustSignals',
        this.trustSignalsEvaluator,
        websiteData
      );

      const overallScore = this.calculateOverallScore({
        valueProposition: valueProposition.score,
        featuresAndBenefits: featuresAndBenefits.score,
        ctaAnalysis: ctaAnalysis.score,
        trustSignals: trustSignals.score,
      });

      const totalTime = Date.now() - startTime;
      logger.warn(`Sequential evaluator scoring completed for: ${websiteData.url}`, {
        overallScore,
        totalTimeMs: totalTime,
        totalTimeMinutes: Math.round(totalTime / 60000)
      });

      return {
        overall: overallScore,
        valueProposition,
        featuresAndBenefits,
        ctaAnalysis,
        trustSignals,
      };
    } catch (error) {
      logger.error('Sequential scoring evaluation failed:', error as Error);
      throw error;
    }
  }

  /**
   * Safely execute an evaluation with error handling and fallback
   */
  private async safeEvaluate(
    name: string,
    evaluator: any,
    websiteData: WebsiteData
  ): Promise<EvaluationResult> {
    try {
      logger.warn(`[SCORING_ENGINE] Starting ${name} evaluation`);
      const result = await evaluator.evaluate(websiteData);
      logger.warn(`[SCORING_ENGINE] ${name} evaluation completed successfully`);
      return result;
    } catch (error) {
      logger.error(`[SCORING_ENGINE] ${name} evaluation failed, using fallback:`, error as Error);
      return this.getFallbackResult(name);
    }
  }

  /**
   * Delay utility function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

  private getFallbackResult(evaluationType: string): EvaluationResult {
    const fallbackResults = {
      valueProposition: {
        score: 50,
        insights: ['Value proposition analysis temporarily unavailable'],
        recommendations: ['Please retry the analysis']
      },
      featuresAndBenefits: {
        score: 50,
        insights: ['Features and benefits analysis temporarily unavailable'],
        recommendations: ['Please retry the analysis']
      },
      ctaAnalysis: {
        score: 50,
        insights: ['Call-to-action analysis temporarily unavailable'],
        recommendations: ['Please retry the analysis']
      },
      trustSignals: {
        score: 50,
        insights: ['Trust signals analysis temporarily unavailable'],
        recommendations: ['Please retry the analysis']
      }
    };

    return fallbackResults[evaluationType as keyof typeof fallbackResults] || {
      score: 50,
      insights: ['Analysis temporarily unavailable'],
      recommendations: ['Please retry the analysis']
    };
  }
}