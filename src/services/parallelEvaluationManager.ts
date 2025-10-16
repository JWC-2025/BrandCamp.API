import { WebsiteData } from '../types/audit';
import { EvaluationResult } from '../types/evaluator';
import { logger } from '../utils/logger';

// Import evaluators
import { ValuePropositionEvaluator } from '../evaluators/valueProposition';
import { FeaturesAndBenefitsEvaluator } from '../evaluators/featuresAndBenefits';
import { CTAAnalysisEvaluator } from '../evaluators/ctaAnalysis';
import { TrustSignalsEvaluator } from '../evaluators/trustSignals';

export interface EvaluationResults {
  valueProposition: EvaluationResult | null;
  featuresAndBenefits: EvaluationResult | null;
  ctaAnalysis: EvaluationResult | null;
  trustSignals: EvaluationResult | null;
  successCount: number;
  failureCount: number;
  totalTime: number;
}

export interface EvaluationTask {
  name: string;
  evaluator: any;
  promise: Promise<EvaluationResult>;
}

/**
 * Manages parallel execution of multiple AI evaluators while handling failures gracefully
 */
export class ParallelEvaluationManager {
  private valuePropositionEvaluator: ValuePropositionEvaluator;
  private featuresAndBenefitsEvaluator: FeaturesAndBenefitsEvaluator;
  private ctaAnalysisEvaluator: CTAAnalysisEvaluator;
  private trustSignalsEvaluator: TrustSignalsEvaluator;

  constructor() {
    this.valuePropositionEvaluator = new ValuePropositionEvaluator();
    this.featuresAndBenefitsEvaluator = new FeaturesAndBenefitsEvaluator();
    this.ctaAnalysisEvaluator = new CTAAnalysisEvaluator();
    this.trustSignalsEvaluator = new TrustSignalsEvaluator();
  }

  /**
   * Run all evaluators in parallel and return results with fallbacks for failures
   */
  async evaluateInParallel(websiteData: WebsiteData): Promise<EvaluationResults> {
    const startTime = Date.now();
    
    logger.warn(`[PARALLEL_EVAL] Starting parallel evaluation for: ${websiteData.url}`);

    // Create evaluation tasks that will run concurrently
    const tasks: EvaluationTask[] = [
      {
        name: 'valueProposition',
        evaluator: this.valuePropositionEvaluator,
        promise: this.safeEvaluate('valueProposition', this.valuePropositionEvaluator, websiteData)
      },
      {
        name: 'featuresAndBenefits', 
        evaluator: this.featuresAndBenefitsEvaluator,
        promise: this.safeEvaluate('featuresAndBenefits', this.featuresAndBenefitsEvaluator, websiteData)
      },
      {
        name: 'ctaAnalysis',
        evaluator: this.ctaAnalysisEvaluator,
        promise: this.safeEvaluate('ctaAnalysis', this.ctaAnalysisEvaluator, websiteData)
      },
      {
        name: 'trustSignals',
        evaluator: this.trustSignalsEvaluator,
        promise: this.safeEvaluate('trustSignals', this.trustSignalsEvaluator, websiteData)
      }
    ];

    logger.info(`[PARALLEL_EVAL] Submitted ${tasks.length} evaluation tasks to AI queue`);

    // Execute all evaluations in parallel using Promise.allSettled
    const results = await Promise.allSettled(tasks.map(task => task.promise));
    
    const totalTime = Date.now() - startTime;
    let successCount = 0;
    let failureCount = 0;

    // Process results and create response object
    const evaluationResults: EvaluationResults = {
      valueProposition: null,
      featuresAndBenefits: null,
      ctaAnalysis: null,
      trustSignals: null,
      successCount: 0,
      failureCount: 0,
      totalTime
    };

    // Map results back to named properties
    results.forEach((result, index) => {
      const taskName = tasks[index].name;
      
      if (result.status === 'fulfilled' && result.value) {
        (evaluationResults as any)[taskName] = result.value;
        successCount++;
        logger.info(`[PARALLEL_EVAL] ${taskName} evaluation completed successfully`);
      } else {
        // Use fallback result for failed evaluations
        (evaluationResults as any)[taskName] = this.getFallbackResult(taskName);
        failureCount++;
        const error = result.status === 'rejected' ? result.reason : 'Unknown error';
        logger.warn(`[PARALLEL_EVAL] ${taskName} evaluation failed, using fallback`, { error: error.message });
      }
    });

    evaluationResults.successCount = successCount;
    evaluationResults.failureCount = failureCount;

    logger.warn(`[PARALLEL_EVAL] Parallel evaluation completed for: ${websiteData.url}`, {
      totalTimeMs: totalTime,
      successCount,
      failureCount,
      successRate: `${Math.round((successCount / tasks.length) * 100)}%`
    });

    return evaluationResults;
  }

  /**
   * Safely execute an evaluation with error handling
   */
  private async safeEvaluate(
    name: string, 
    evaluator: any, 
    websiteData: WebsiteData
  ): Promise<EvaluationResult> {
    try {
      logger.debug(`[PARALLEL_EVAL] Starting ${name} evaluation`);
      const result = await evaluator.evaluate(websiteData);
      logger.debug(`[PARALLEL_EVAL] ${name} evaluation completed`);
      return result;
    } catch (error) {
      logger.error(`[PARALLEL_EVAL] ${name} evaluation failed:`, error as Error);
      throw error;
    }
  }

  /**
   * Generate fallback results for failed evaluations
   */
  private getFallbackResult(evaluationType: string): EvaluationResult {
    const fallbackResults = {
      valueProposition: {
        score: 50,
        insights: ['Unable to analyze value proposition due to technical issues'],
        recommendations: ['Please retry the analysis or contact support']
      },
      featuresAndBenefits: {
        score: 50,
        insights: ['Unable to analyze features and benefits due to technical issues'],
        recommendations: ['Please retry the analysis or contact support']
      },
      ctaAnalysis: {
        score: 50,
        insights: ['Unable to analyze call-to-action elements due to technical issues'],
        recommendations: ['Please retry the analysis or contact support']
      },
      trustSignals: {
        score: 50,
        insights: ['Unable to analyze trust signals due to technical issues'],
        recommendations: ['Please retry the analysis or contact support']
      }
    };

    return fallbackResults[evaluationType as keyof typeof fallbackResults] || {
      score: 50,
      insights: ['Analysis unavailable due to technical issues'],
      recommendations: ['Please retry the analysis or contact support']
    };
  }

  /**
   * Get status of all evaluators (useful for monitoring)
   */
  getStatus() {
    return {
      evaluatorsLoaded: {
        valueProposition: !!this.valuePropositionEvaluator,
        featuresAndBenefits: !!this.featuresAndBenefitsEvaluator,
        ctaAnalysis: !!this.ctaAnalysisEvaluator,
        trustSignals: !!this.trustSignalsEvaluator
      }
    };
  }
}