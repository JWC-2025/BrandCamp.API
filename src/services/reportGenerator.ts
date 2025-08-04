import { WebsiteData } from '../types/audit';
import { ScoringResult } from './scoringEngine';
import { SCORE_THRESHOLDS } from '../utils/constants';
import { logger } from '../utils/logger';

export interface GeneratedReport {
  summary: string;
  strengths: string[];
  improvements: string[];
  priority: 'high' | 'medium' | 'low';
}

export class ReportGenerator {
  async generateReport(websiteData: WebsiteData, scores: ScoringResult): Promise<GeneratedReport> {
    try {
      logger.info(`Generating report for: ${websiteData.url}`);

      const summary = this.generateSummary(websiteData.url, scores.overall);
      const strengths = this.identifyStrengths(scores);
      const improvements = this.identifyImprovements(scores);
      const priority = this.determinePriority(scores.overall);

      logger.info(`Report generation completed for: ${websiteData.url}`);

      return {
        summary,
        strengths,
        improvements,
        priority,
      };
    } catch (error) {
      logger.error('Report generation failed:', error as Error);
      throw error;
    }
  }

  private generateSummary(url: string, overallScore: number): string {
    const domain = new URL(url).hostname;
    
    if (overallScore >= SCORE_THRESHOLDS.excellent) {
      return `${domain} demonstrates exceptional marketing effectiveness with a score of ${overallScore}/100. The website showcases strong fundamentals across all evaluated criteria.`;
    } else if (overallScore >= SCORE_THRESHOLDS.good) {
      return `${domain} shows good marketing potential with a score of ${overallScore}/100. There are solid foundations in place with room for strategic improvements.`;
    } else if (overallScore >= SCORE_THRESHOLDS.average) {
      return `${domain} has average marketing effectiveness with a score of ${overallScore}/100. Several areas need attention to improve conversion potential.`;
    } else {
      return `${domain} requires significant marketing improvements with a score of ${overallScore}/100. Multiple critical areas need immediate attention to enhance effectiveness.`;
    }
  }

  private identifyStrengths(scores: ScoringResult): string[] {
    const strengths: string[] = [];

    if (scores.valueProposition.score >= SCORE_THRESHOLDS.good) {
      strengths.push('Strong value proposition clarity');
    }
    if (scores.featuresAndBenefits.score >= SCORE_THRESHOLDS.good) {
      strengths.push('Well-presented features and benefits');
    }
    if (scores.ctaAnalysis.score >= SCORE_THRESHOLDS.good) {
      strengths.push('Effective call-to-action implementation');
    }
    if (scores.seoReadiness.score >= SCORE_THRESHOLDS.good) {
      strengths.push('Good SEO optimization');
    }
    if (scores.trustSignals.score >= SCORE_THRESHOLDS.good) {
      strengths.push('Strong trust and credibility signals');
    }

    return strengths.length > 0 ? strengths : ['Basic website structure in place'];
  }

  private identifyImprovements(scores: ScoringResult): string[] {
    const improvements: string[] = [];

    if (scores.valueProposition.score < SCORE_THRESHOLDS.good) {
      improvements.push('Clarify and strengthen value proposition messaging');
    }
    if (scores.featuresAndBenefits.score < SCORE_THRESHOLDS.good) {
      improvements.push('Better highlight product/service features and benefits');
    }
    if (scores.ctaAnalysis.score < SCORE_THRESHOLDS.good) {
      improvements.push('Optimize call-to-action placement and messaging');
    }
    if (scores.seoReadiness.score < SCORE_THRESHOLDS.good) {
      improvements.push('Improve SEO optimization and meta data');
    }
    if (scores.trustSignals.score < SCORE_THRESHOLDS.good) {
      improvements.push('Add more trust signals and credibility indicators');
    }

    return improvements;
  }

  private determinePriority(overallScore: number): 'high' | 'medium' | 'low' {
    if (overallScore < SCORE_THRESHOLDS.poor) {
      return 'high';
    } else if (overallScore < SCORE_THRESHOLDS.good) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}