import { WebsiteData } from '../types/audit';
export declare class WebsiteAnalyzer {
    private aiService;
    constructor();
    analyze(url: string, includeScreenshot?: boolean): Promise<WebsiteData>;
    private getBasicWebsiteData;
    private enhanceWithAI;
    private analyzeSEOWithAI;
    private analyzeAccessibilityWithAI;
    private estimatePerformanceWithAI;
    private parseSEOFromAI;
    private analyzeSEOFallback;
    private analyzeAccessibilityFallback;
    private getDefaultPerformanceMetrics;
    private extractKeywords;
    private extractH1Tags;
    private extractImages;
    private extractLinks;
}
