import { WebsiteData } from '../types/audit';
export declare class WebsiteAnalyzer {
    constructor();
    analyze(url: string, includeScreenshot?: boolean): Promise<WebsiteData>;
    private getBasicWebsiteData;
    private extractKeywords;
    private extractH1Tags;
    private extractImages;
    private extractLinks;
}
