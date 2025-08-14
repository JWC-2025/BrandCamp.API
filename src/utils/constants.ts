export const API_VERSION = '1.0.0';

export const EVALUATION_WEIGHTS = {
  valueProposition: 0.35,
  featuresAndBenefits: 0.30,
  ctaAnalysis: 0.25,
  trustSignals: 0.10,
} as const;

export const SCORE_THRESHOLDS = {
  excellent: 90,
  good: 75,
  average: 60,
  poor: 40,
} as const;

export const DEFAULT_TIMEOUT = 30000;

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