import { WebsiteData } from '../types/audit';
import { EvaluationResult } from '../types/evaluator';
import { EVALUATION_WEIGHTS } from '../utils/constants';
import { logger } from '../utils/logger';
import { ValuePropositionEvaluator } from '../evaluators/valueProposition';
import { FeaturesAndBenefitsEvaluator } from '../evaluators/featuresAndBenefits';
import { CTAAnalysisEvaluator } from '../evaluators/ctaAnalysis';
import { NavigationIAEvaluator } from '../evaluators/navigationIA';
import { ContentMarketFitEvaluator } from '../evaluators/contentMarketFit';
import { ContentStrategyEvaluator } from '../evaluators/contentStrategy';
import { BrandToneConsistencyEvaluator } from '../evaluators/brandToneConsistency';
import { TrustSignalsEvaluator } from '../evaluators/trustSignals';
import { AudienceClarityEvaluator } from '../evaluators/audienceClarity';
import { DifferentiationEvaluator } from '../evaluators/differentiation';

export interface ScoringResult {
  overall: number;
  valueProposition: EvaluationResult;
  featuresAndBenefits: EvaluationResult;
  ctaAnalysis: EvaluationResult;
  navigationIA: EvaluationResult;
  contentMarketFit: EvaluationResult;
  contentStrategy: EvaluationResult;
  brandToneConsistency: EvaluationResult;
  trustSignals: EvaluationResult;
  audienceClarity: EvaluationResult;
  differentiation: EvaluationResult;
}

export class ScoringEngine {
  private valuePropositionEvaluator: ValuePropositionEvaluator;
  private featuresAndBenefitsEvaluator: FeaturesAndBenefitsEvaluator;
  private ctaAnalysisEvaluator: CTAAnalysisEvaluator;
  private navigationIAEvaluator: NavigationIAEvaluator;
  private contentMarketFitEvaluator: ContentMarketFitEvaluator;
  private contentStrategyEvaluator: ContentStrategyEvaluator;
  private brandToneConsistencyEvaluator: BrandToneConsistencyEvaluator;
  private trustSignalsEvaluator: TrustSignalsEvaluator;
  private audienceClarityEvaluator: AudienceClarityEvaluator;
  private differentiationEvaluator: DifferentiationEvaluator;
  private readonly DELAY_BETWEEN_EVALUATIONS = 5000; // 5 seconds
  private readonly useParallelEvaluations: boolean;

  constructor(useParallelEvaluations: boolean = true) {
    this.valuePropositionEvaluator = new ValuePropositionEvaluator();
    this.featuresAndBenefitsEvaluator = new FeaturesAndBenefitsEvaluator();
    this.ctaAnalysisEvaluator = new CTAAnalysisEvaluator();
    this.navigationIAEvaluator = new NavigationIAEvaluator();
    this.contentMarketFitEvaluator = new ContentMarketFitEvaluator();
    this.contentStrategyEvaluator = new ContentStrategyEvaluator();
    this.brandToneConsistencyEvaluator = new BrandToneConsistencyEvaluator();
    this.trustSignalsEvaluator = new TrustSignalsEvaluator();
    this.audienceClarityEvaluator = new AudienceClarityEvaluator();
    this.differentiationEvaluator = new DifferentiationEvaluator();
    this.useParallelEvaluations = useParallelEvaluations;
  }

  async calculateScores(websiteData: WebsiteData): Promise<ScoringResult> {
    if (this.useParallelEvaluations) {
      return this.calculateScoresParallel(websiteData);
    } else {
      return this.calculateScoresSequential(websiteData);
    }
  }

  /**
   * Run all evaluations in parallel for faster processing.
   * The AI request queue will handle rate limiting automatically.
   */
  private async calculateScoresParallel(websiteData: WebsiteData): Promise<ScoringResult> {
    const startTime = Date.now();

    try {
      logger.warn(`Starting parallel evaluator scoring for: ${websiteData.url}`);

      // Execute all evaluators in parallel
      const [
        valueProposition, featuresAndBenefits, ctaAnalysis,
        navigationIA, contentMarketFit, contentStrategy,
        brandToneConsistency, trustSignals, audienceClarity, differentiation
      ] = await Promise.all([
        this.safeEvaluate('valueProposition', this.valuePropositionEvaluator, websiteData),
        this.safeEvaluate('featuresAndBenefits', this.featuresAndBenefitsEvaluator, websiteData),
        this.safeEvaluate('ctaAnalysis', this.ctaAnalysisEvaluator, websiteData),
        this.safeEvaluate('navigationIA', this.navigationIAEvaluator, websiteData),
        this.safeEvaluate('contentMarketFit', this.contentMarketFitEvaluator, websiteData),
        this.safeEvaluate('contentStrategy', this.contentStrategyEvaluator, websiteData),
        this.safeEvaluate('brandToneConsistency', this.brandToneConsistencyEvaluator, websiteData),
        this.safeEvaluate('trustSignals', this.trustSignalsEvaluator, websiteData),
        this.safeEvaluate('audienceClarity', this.audienceClarityEvaluator, websiteData),
        this.safeEvaluate('differentiation', this.differentiationEvaluator, websiteData),
      ]);

      const overallScore = this.calculateOverallScore({
        valueProposition: valueProposition.score,
        featuresAndBenefits: featuresAndBenefits.score,
        ctaAnalysis: ctaAnalysis.score,
        navigationIA: navigationIA.score,
        contentMarketFit: contentMarketFit.score,
        contentStrategy: contentStrategy.score,
        brandToneConsistency: brandToneConsistency.score,
        trustSignals: trustSignals.score,
        audienceClarity: audienceClarity.score,
        differentiation: differentiation.score,
      });

      const totalTime = Date.now() - startTime;
      logger.warn(`Parallel evaluator scoring completed for: ${websiteData.url}`, {
        overallScore,
        totalTimeMs: totalTime,
        totalTimeMinutes: Math.round(totalTime / 60000)
      });

      return {
        overall: overallScore,
        valueProposition,
        featuresAndBenefits,
        ctaAnalysis,
        navigationIA,
        contentMarketFit,
        contentStrategy,
        brandToneConsistency,
        trustSignals,
        audienceClarity,
        differentiation,
      };
    } catch (error) {
      logger.error('Parallel scoring evaluation failed:', error as Error);
      throw error;
    }
  }

  /**
   * Run evaluations sequentially with delays (legacy mode).
   * Use this if parallel execution causes issues.
   */
  private async calculateScoresSequential(websiteData: WebsiteData): Promise<ScoringResult> {
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
      logger.info(`[SCORING_ENGINE] Waited ${this.DELAY_BETWEEN_EVALUATIONS / 1000}s before next evaluation`);

      const featuresAndBenefits = await this.safeEvaluate(
        'featuresAndBenefits',
        this.featuresAndBenefitsEvaluator,
        websiteData
      );

      await this.delay(this.DELAY_BETWEEN_EVALUATIONS);
      logger.info(`[SCORING_ENGINE] Waited ${this.DELAY_BETWEEN_EVALUATIONS / 1000}s before next evaluation`);

      const ctaAnalysis = await this.safeEvaluate(
        'ctaAnalysis',
        this.ctaAnalysisEvaluator,
        websiteData
      );

      await this.delay(this.DELAY_BETWEEN_EVALUATIONS);
      logger.info(`[SCORING_ENGINE] Waited ${this.DELAY_BETWEEN_EVALUATIONS / 1000}s before next evaluation`);

      const navigationIA = await this.safeEvaluate(
        'navigationIA',
        this.navigationIAEvaluator,
        websiteData
      );

      await this.delay(this.DELAY_BETWEEN_EVALUATIONS);
      logger.info(`[SCORING_ENGINE] Waited ${this.DELAY_BETWEEN_EVALUATIONS / 1000}s before next evaluation`);

      const contentMarketFit = await this.safeEvaluate(
        'contentMarketFit',
        this.contentMarketFitEvaluator,
        websiteData
      );

      await this.delay(this.DELAY_BETWEEN_EVALUATIONS);
      logger.info(`[SCORING_ENGINE] Waited ${this.DELAY_BETWEEN_EVALUATIONS / 1000}s before next evaluation`);

      const contentStrategy = await this.safeEvaluate(
        'contentStrategy',
        this.contentStrategyEvaluator,
        websiteData
      );

      await this.delay(this.DELAY_BETWEEN_EVALUATIONS);
      logger.info(`[SCORING_ENGINE] Waited ${this.DELAY_BETWEEN_EVALUATIONS / 1000}s before next evaluation`);

      const brandToneConsistency = await this.safeEvaluate(
        'brandToneConsistency',
        this.brandToneConsistencyEvaluator,
        websiteData
      );

      await this.delay(this.DELAY_BETWEEN_EVALUATIONS);
      logger.info(`[SCORING_ENGINE] Waited ${this.DELAY_BETWEEN_EVALUATIONS / 1000}s before next evaluation`);

      const trustSignals = await this.safeEvaluate(
        'trustSignals',
        this.trustSignalsEvaluator,
        websiteData
      );

      await this.delay(this.DELAY_BETWEEN_EVALUATIONS);
      logger.info(`[SCORING_ENGINE] Waited ${this.DELAY_BETWEEN_EVALUATIONS / 1000}s before next evaluation`);

      const audienceClarity = await this.safeEvaluate(
        'audienceClarity',
        this.audienceClarityEvaluator,
        websiteData
      );

      await this.delay(this.DELAY_BETWEEN_EVALUATIONS);
      logger.info(`[SCORING_ENGINE] Waited ${this.DELAY_BETWEEN_EVALUATIONS / 1000}s before next evaluation`);

      const differentiation = await this.safeEvaluate(
        'differentiation',
        this.differentiationEvaluator,
        websiteData
      );

      const overallScore = this.calculateOverallScore({
        valueProposition: valueProposition.score,
        featuresAndBenefits: featuresAndBenefits.score,
        ctaAnalysis: ctaAnalysis.score,
        navigationIA: navigationIA.score,
        contentMarketFit: contentMarketFit.score,
        contentStrategy: contentStrategy.score,
        brandToneConsistency: brandToneConsistency.score,
        trustSignals: trustSignals.score,
        audienceClarity: audienceClarity.score,
        differentiation: differentiation.score,
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
        navigationIA,
        contentMarketFit,
        contentStrategy,
        brandToneConsistency,
        trustSignals,
        audienceClarity,
        differentiation,
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
    navigationIA: number;
    contentMarketFit: number;
    contentStrategy: number;
    brandToneConsistency: number;
    trustSignals: number;
    audienceClarity: number;
    differentiation: number;
  }): number {
    const weightedSum =
      scores.valueProposition * EVALUATION_WEIGHTS.valueProposition +
      scores.featuresAndBenefits * EVALUATION_WEIGHTS.featuresAndBenefits +
      scores.ctaAnalysis * EVALUATION_WEIGHTS.ctaAnalysis +
      scores.navigationIA * EVALUATION_WEIGHTS.navigationIA +
      scores.contentMarketFit * EVALUATION_WEIGHTS.contentMarketFit +
      scores.contentStrategy * EVALUATION_WEIGHTS.contentStrategy +
      scores.brandToneConsistency * EVALUATION_WEIGHTS.brandToneConsistency +
      scores.trustSignals * EVALUATION_WEIGHTS.trustSignals +
      scores.audienceClarity * EVALUATION_WEIGHTS.audienceClarity +
      scores.differentiation * EVALUATION_WEIGHTS.differentiation;

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
      navigationIA: {
        score: 50,
        insights: ['Navigation & information architecture analysis temporarily unavailable'],
        recommendations: ['Please retry the analysis']
      },
      contentMarketFit: {
        score: 50,
        insights: ['Content-market fit analysis temporarily unavailable'],
        recommendations: ['Please retry the analysis']
      },
      contentStrategy: {
        score: 50,
        insights: ['Content strategy analysis temporarily unavailable'],
        recommendations: ['Please retry the analysis']
      },
      brandToneConsistency: {
        score: 50,
        insights: ['Brand tone consistency analysis temporarily unavailable'],
        recommendations: ['Please retry the analysis']
      },
      trustSignals: {
        score: 50,
        insights: ['Trust signals analysis temporarily unavailable'],
        recommendations: ['Please retry the analysis']
      },
      audienceClarity: {
        score: 50,
        insights: ['Audience clarity analysis temporarily unavailable'],
        recommendations: ['Please retry the analysis']
      },
      differentiation: {
        score: 50,
        insights: ['Differentiation analysis temporarily unavailable'],
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