export declare const API_VERSION = "1.0.0";
export declare const EVALUATION_WEIGHTS: {
    readonly valueProposition: 0.35;
    readonly featuresAndBenefits: 0.3;
    readonly ctaAnalysis: 0.25;
    readonly trustSignals: 0.1;
};
export declare const SCORE_THRESHOLDS: {
    readonly excellent: 90;
    readonly good: 75;
    readonly average: 60;
    readonly poor: 40;
};
export declare const DEFAULT_TIMEOUT = 30000;
export declare const MAX_PAGE_SIZE: number;
export declare const ALLOWED_DOMAINS: readonly ["http", "https"];
export declare const ERROR_MESSAGES: {
    readonly INVALID_URL: "Invalid URL provided";
    readonly TIMEOUT: "Request timeout exceeded";
    readonly PAGE_TOO_LARGE: "Page size exceeds maximum allowed size";
    readonly ANALYSIS_FAILED: "Website analysis failed";
    readonly AI_SERVICE_ERROR: "AI service unavailable";
};
