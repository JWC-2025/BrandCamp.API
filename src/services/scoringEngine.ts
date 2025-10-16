import { WebsiteData } from '../types/audit';
import { EvaluationResult } from '../types/evaluator';
import { EVALUATION_WEIGHTS } from '../utils/constants';
import { logger } from '../utils/logger';
import { ParallelEvaluationManager } from './parallelEvaluationManager';

export interface ScoringResult {
  overall: number;
  valueProposition: EvaluationResult;
  featuresAndBenefits: EvaluationResult;
  ctaAnalysis: EvaluationResult;
  trustSignals: EvaluationResult;
}

export class ScoringEngine {
  private parallelEvaluationManager: ParallelEvaluationManager;

  constructor() {
    this.parallelEvaluationManager = new ParallelEvaluationManager();
  }

  async calculateScores(websiteData: WebsiteData): Promise<ScoringResult> {
    try {
      logger.warn(`Starting parallel evaluator scoring for: ${websiteData.url}`);
      
      // Execute all evaluators in parallel using the new parallel evaluation manager
      const evaluationResults = await this.parallelEvaluationManager.evaluateInParallel(websiteData);
      
      // Extract non-null results or use fallback values
      const valueProposition = evaluationResults.valueProposition || this.getFallbackResult('valueProposition');
      const featuresAndBenefits = evaluationResults.featuresAndBenefits || this.getFallbackResult('featuresAndBenefits');
      const ctaAnalysis = evaluationResults.ctaAnalysis || this.getFallbackResult('ctaAnalysis');
      const trustSignals = evaluationResults.trustSignals || this.getFallbackResult('trustSignals');

      const overallScore = this.calculateOverallScore({
        valueProposition: valueProposition.score,
        featuresAndBenefits: featuresAndBenefits.score,
        ctaAnalysis: ctaAnalysis.score,
        trustSignals: trustSignals.score,
      });

      logger.warn(`Parallel evaluator scoring completed for: ${websiteData.url}`, {
        overallScore,
        totalTimeMs: evaluationResults.totalTime,
        successfulEvaluations: evaluationResults.successCount,
        failedEvaluations: evaluationResults.failureCount
      });

      return {
        overall: overallScore,
        valueProposition,
        featuresAndBenefits,
        ctaAnalysis,
        trustSignals,
      };
    } catch (error) {
      logger.error('Parallel scoring evaluation failed:', error as Error);
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