export interface AuditRequest {
    url: string;
    includeScreenshot?: boolean;
    format?: string;
    customCriteria?: string[];
}
export interface AuditResult {
    id: string;
    url: string;
    timestamp: Date;
    overallScore: number;
    scores: {
        valueProposition: number;
        featuresAndBenefits: number;
        ctaAnalysis: number;
        trustSignals: number;
    };
    insights: {
        valueProposition: string[];
        featuresAndBenefits: string[];
        ctaAnalysis: string[];
        trustSignals: string[];
    };
    recommendations: {
        valueProposition: string[];
        featuresAndBenefits: string[];
        ctaAnalysis: string[];
        trustSignals: string[];
    };
    screenshot?: string | undefined;
    metadata: {
        analysisTime: number;
        version: string;
    };
}
export interface WebsiteData {
    url: string;
    html: string;
    metadata: {
        title: string;
        description: string;
        keywords: string[];
        h1Tags: string[];
        images: string[];
        links: string[];
        forms: number;
        loadTime: number;
    };
    screenshot?: Buffer;
    performance?: {
        coreWebVitals: {
            lcp: number;
            fid: number;
            cls: number;
        };
        loadingMetrics: {
            domContentLoaded: number;
            firstContentfulPaint: number;
            largestContentfulPaint: number;
        };
        networkMetrics: {
            requestCount: number;
            transferSize: number;
            resourceLoadTime: number;
        };
    };
    accessibility?: {
        score: number;
        issues: string[];
    };
    seo?: {
        structuredData: boolean;
        metaTagsComplete: boolean;
        headingStructure: boolean;
    };
}
