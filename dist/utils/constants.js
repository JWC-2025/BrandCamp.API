"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_MESSAGES = exports.ALLOWED_DOMAINS = exports.MAX_PAGE_SIZE = exports.DEFAULT_TIMEOUT = exports.SCORE_THRESHOLDS = exports.EVALUATION_WEIGHTS = exports.API_VERSION = void 0;
exports.API_VERSION = '1.0.0';
exports.EVALUATION_WEIGHTS = {
    valueProposition: 0.35,
    featuresAndBenefits: 0.30,
    ctaAnalysis: 0.25,
    trustSignals: 0.10,
};
exports.SCORE_THRESHOLDS = {
    excellent: 90,
    good: 75,
    average: 60,
    poor: 40,
};
exports.DEFAULT_TIMEOUT = 30000;
exports.MAX_PAGE_SIZE = 5 * 1024 * 1024;
exports.ALLOWED_DOMAINS = [
    'http',
    'https',
];
exports.ERROR_MESSAGES = {
    INVALID_URL: 'Invalid URL provided',
    TIMEOUT: 'Request timeout exceeded',
    PAGE_TOO_LARGE: 'Page size exceeds maximum allowed size',
    ANALYSIS_FAILED: 'Website analysis failed',
    AI_SERVICE_ERROR: 'AI service unavailable',
};
//# sourceMappingURL=constants.js.map