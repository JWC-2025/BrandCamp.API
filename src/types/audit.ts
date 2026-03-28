export interface AuditRequest {
  url: string;
  includeScreenshot?: boolean;
  format?:string;
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

export interface AuditSubmissionResponse {
  success: boolean;
  auditId: string;
  status: 'pending';
  statusUrl: string;
  message: string;
}

export interface AuditStatusResponse {
  auditId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  url: string;
  downloadUrl?: string | undefined;
  createdAt: string;
  completedAt?: string | undefined;
  error?: string | undefined;
  progress?: {
    step: string;
    percentage: number;
  };
}

export interface AuditJobData {
  auditId: string;
  auditRequest: AuditRequest;
}

export interface BrandingProfile {
  colorScheme?: 'light' | 'dark';
  logo?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    [key: string]: string | undefined;
  };
  fonts?: string[];
  typography?: {
    fontFamilies?: string[];
    sizes?: Record<string, string>;
    weights?: Record<string, string>;
    lineHeights?: Record<string, string>;
  };
  spacing?: {
    baseUnit?: string;
    borderRadius?: string;
    padding?: Record<string, string>;
    margins?: Record<string, string>;
  };
  components?: {
    buttons?: Record<string, string>;
    inputs?: Record<string, string>;
  };
  icons?: Record<string, string>;
  images?: {
    logo?: string;
    favicon?: string;
    ogImage?: string;
  };
  animations?: Record<string, string>;
  layout?: Record<string, string>;
  personality?: {
    tone?: string;
    energy?: string;
    targetAudience?: string[];
    [key: string]: string | string[] | undefined;
  };
}

export interface WebsiteData {
  url: string;
  html: string;
  branding?: BrandingProfile;
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

export interface FetchOptions {
  timeout?: number;
  maxContentLength?: number;
  userAgent?: string;
}

export interface ProcessedHTML {
  content: string;
  tokenEstimate: number;
  metadata: {
    title: string;
    description: string;
    url: string;
  };
}