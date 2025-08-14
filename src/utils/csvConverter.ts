import { AuditResult } from '../types/audit';

export class CSVConverter {
  static convertAuditResultToCSV(auditResult: AuditResult): string {
    const headers = [
      'ID',
      'URL',
      'Timestamp',
      'Overall Score',
      'Value Proposition Score',
      'Features and Benefits Score',
      'CTA Analysis Score',
      'Trust Signals Score',
      'Value Proposition Insights',
      'Features and Benefits Insights',
      'CTA Analysis Insights',
      'Trust Signals Insights',
      'Value Proposition Recommendations',
      'Features and Benefits Recommendations',
      'CTA Analysis Recommendations',
      'Trust Signals Recommendations',
      'Analysis Time (ms)',
      'Version'
    ];

    const row = [
      auditResult.id,
      auditResult.url,
      auditResult.timestamp.toISOString(),
      auditResult.overallScore.toString(),
      auditResult.scores.valueProposition.toString(),
      auditResult.scores.featuresAndBenefits.toString(),
      auditResult.scores.ctaAnalysis.toString(),
      auditResult.scores.trustSignals.toString(),
      this.arrayToString(auditResult.insights.valueProposition),
      this.arrayToString(auditResult.insights.featuresAndBenefits),
      this.arrayToString(auditResult.insights.ctaAnalysis),
      this.arrayToString(auditResult.insights.trustSignals),
      this.arrayToString(auditResult.recommendations.valueProposition),
      this.arrayToString(auditResult.recommendations.featuresAndBenefits),
      this.arrayToString(auditResult.recommendations.ctaAnalysis),
      this.arrayToString(auditResult.recommendations.trustSignals),
      auditResult.metadata.analysisTime.toString(),
      auditResult.metadata.version
    ];

    return [headers.join(','), row.map(field => this.escapeCSVField(field)).join(',')].join('\n');
  }

  private static arrayToString(arr: string[]): string {
    return arr.join(';\n');
  }

  private static escapeCSVField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
}