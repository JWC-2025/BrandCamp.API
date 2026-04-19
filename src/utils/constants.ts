export const API_VERSION = '1.0.0';

export const EVALUATION_WEIGHTS = {
  valueProposition: 0.15,        // V2 Cat 1: 15%
  featuresAndBenefits: 0.10,     // V2 Cat 2: 10%
  ctaAnalysis: 0.10,             // V2 Cat 3: 10%
  navigationIA: 0.05,            // V2 Cat 4:  5%
  contentMarketFit: 0.10,        // V2 Cat 5: 10%
  contentStrategy: 0.10,         // V2 Cat 6: 10%
  brandToneConsistency: 0.10,    // V2 Cat 7: 10%
  trustSignals: 0.10,            // V2 Cat 8: 10%
  audienceClarity: 0.10,         // V2 Cat 9: 10%
  differentiation: 0.10,         // V2 Cat 10: 10%
} as const;

export const SCORE_THRESHOLDS = {
  excellent: 90,
  good: 75,
  average: 60,
  poor: 40,
} as const;

export const DEFAULT_TIMEOUT = 30000; // Reduced from 60s to 30s

export const MAX_PAGE_SIZE = 5 * 1024 * 1024; // 5MB

export const ALLOWED_DOMAINS = [
  'http',
  'https',
] as const;

export const ERROR_MESSAGES = {
  INVALID_URL: 'Invalid URL provided',
  TIMEOUT: 'Request timeout exceeded',
  PAGE_TOO_LARGE: 'Page size exceeds maximum allowed size',
  ANALYSIS_FAILED: 'Website analysis failed',
  AI_SERVICE_ERROR: 'AI service unavailable',
} as const;