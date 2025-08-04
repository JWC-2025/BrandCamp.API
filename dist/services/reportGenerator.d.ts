import { WebsiteData } from '../types/audit';
import { ScoringResult } from './scoringEngine';
export interface GeneratedReport {
    summary: string;
    strengths: string[];
    improvements: string[];
    priority: 'high' | 'medium' | 'low';
}
export declare class ReportGenerator {
    generateReport(websiteData: WebsiteData, scores: ScoringResult): Promise<GeneratedReport>;
    private generateSummary;
    private identifyStrengths;
    private identifyImprovements;
    private determinePriority;
}
