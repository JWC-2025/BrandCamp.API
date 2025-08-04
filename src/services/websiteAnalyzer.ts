import axios from 'axios';
import { JSDOM } from 'jsdom';
import { WebsiteData } from '../types/audit';
import { logger } from '../utils/logger';
import { DEFAULT_TIMEOUT, MAX_PAGE_SIZE, ERROR_MESSAGES } from '../utils/constants';
import { ClaudeService, MockAIService } from './aiService';
import { config } from '../config/environment';


export class WebsiteAnalyzer {
  private aiService: ClaudeService | MockAIService;

  constructor() {
    // Use Claude service if API key is available, otherwise mock service
    this.aiService = config.ai.anthropicApiKey 
      ? new ClaudeService(config.ai.anthropicApiKey)
      : new MockAIService();
  }

  async analyze(url: string, includeScreenshot: boolean = false): Promise<WebsiteData> {
    try {
      logger.info(`Starting AI-powered website analysis for: ${url}`);
      
      // First get basic HTML content using traditional methods
      const basicData = await this.getBasicWebsiteData(url);
      
      // Then enhance with AI analysis
      const enhancedData = await this.enhanceWithAI(basicData, includeScreenshot);
      
      logger.info(`AI-powered website analysis completed for: ${url}`);
      return enhancedData;
    } catch (error) {
      logger.error(`Website analysis failed for ${url}:`, error as Error);
      throw new Error(`${ERROR_MESSAGES.ANALYSIS_FAILED}: ${(error as Error).message}`);
    }
  }

  private async getBasicWebsiteData(url: string): Promise<WebsiteData> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(url, {
        timeout: DEFAULT_TIMEOUT,
        maxContentLength: MAX_PAGE_SIZE,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BrandCampAuditBot/1.0)',
        },
      });

      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      const websiteData: WebsiteData = {
        url,
        html: response.data,
        metadata: {
          title: document.querySelector('title')?.textContent || '',
          description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
          keywords: this.extractKeywords(document),
          h1Tags: this.extractH1Tags(document),
          images: this.extractImages(document),
          links: this.extractLinks(document),
          forms: document.querySelectorAll('form').length,
          loadTime: Date.now() - startTime,
        },
      };

      return websiteData;
    } catch (error) {
      logger.error(`Failed to fetch basic website data for ${url}:`, error as Error);
      throw error;
    }
  }

  private async enhanceWithAI(basicData: WebsiteData, includeScreenshot: boolean): Promise<WebsiteData> {
    try {
      // Use AI to analyze and enhance the website data
      const enhancedData = { ...basicData };
      
      // AI-powered SEO analysis
      enhancedData.seo = await this.analyzeSEOWithAI(basicData);
      
      // AI-powered accessibility analysis
      enhancedData.accessibility = await this.analyzeAccessibilityWithAI(basicData);
      
      // AI-powered performance estimation
      enhancedData.performance = await this.estimatePerformanceWithAI(basicData);
      
      // Generate screenshot placeholder if requested
      if (includeScreenshot) {
        enhancedData.screenshot = Buffer.from('ai-analysis-placeholder', 'utf8');
      }
      
      return enhancedData;
    } catch (error) {
      logger.error('AI enhancement failed, returning basic data:', error as Error);
      return basicData;
    }
  }

  private async analyzeSEOWithAI(websiteData: WebsiteData): Promise<{
    structuredData: boolean;
    metaTagsComplete: boolean;
    headingStructure: boolean;
  }> {
    try {
      const prompt = `
Analyze the SEO elements of this website and return a JSON response:

URL: ${websiteData.url}
Title: ${websiteData.metadata.title}
Description: ${websiteData.metadata.description}
H1 Tags: ${websiteData.metadata.h1Tags.join(', ')}
Keywords: ${websiteData.metadata.keywords.join(', ')}

HTML Preview: ${websiteData.html.substring(0, 3000)}...

Please analyze and return only this JSON format:
{
  "structuredData": true/false,
  "metaTagsComplete": true/false,
  "headingStructure": true/false
}

Check for:
- Structured data (JSON-LD, schema.org)
- Complete meta tags (title, description)
- Proper heading structure (H1 present)
`;

      const result = await this.aiService.analyzeWebsite(websiteData, 'SEO Analysis', prompt);
      
      // Parse the result and extract SEO data
      const seoData = this.parseSEOFromAI(result.insights);
      return seoData;
    } catch (error) {
      logger.error('AI SEO analysis failed:', error as Error);
      return this.analyzeSEOFallback(websiteData);
    }
  }

  private async analyzeAccessibilityWithAI(websiteData: WebsiteData): Promise<{
    score: number;
    issues: string[];
  }> {
    try {
      const prompt = `
Analyze the accessibility of this website HTML and return insights:

URL: ${websiteData.url}
Images: ${websiteData.metadata.images.length} images found
Forms: ${websiteData.metadata.forms} forms found

HTML Preview: ${websiteData.html.substring(0, 3000)}...

Check for accessibility issues like:
- Images without alt text
- Forms without labels
- Missing ARIA attributes
- Color contrast issues
- Keyboard navigation support

Provide a score (0-100) and list of specific issues found.
`;

      const result = await this.aiService.analyzeWebsite(websiteData, 'Accessibility Analysis', prompt);
      
      return {
        score: result.score,
        issues: result.insights,
      };
    } catch (error) {
      logger.error('AI accessibility analysis failed:', error as Error);
      return this.analyzeAccessibilityFallback(websiteData);
    }
  }

  private async estimatePerformanceWithAI(websiteData: WebsiteData): Promise<{
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
  }> {
    try {
      const prompt = `
Estimate the performance characteristics of this website:

URL: ${websiteData.url}
Images: ${websiteData.metadata.images.length}
Links: ${websiteData.metadata.links.length}
HTML Size: ${websiteData.html.length} characters
Load Time: ${websiteData.metadata.loadTime}ms

Based on the HTML content and metadata, estimate reasonable performance metrics.
Provide realistic estimates for Core Web Vitals and loading metrics.
`;

      // Get AI analysis for context (could be used for more sophisticated estimation)
      await this.aiService.analyzeWebsite(websiteData, 'Performance Estimation', prompt);
      
      // Return estimated performance metrics based on heuristics
      return {
        coreWebVitals: {
          lcp: Math.min(3000, 1500 + websiteData.metadata.images.length * 100), // Estimate based on images
          fid: 50,
          cls: 0.1,
        },
        loadingMetrics: {
          domContentLoaded: websiteData.metadata.loadTime,
          firstContentfulPaint: websiteData.metadata.loadTime + 200,
          largestContentfulPaint: websiteData.metadata.loadTime + 500,
        },
        networkMetrics: {
          requestCount: 10 + websiteData.metadata.images.length + websiteData.metadata.links.length / 10,
          transferSize: Math.max(500000, websiteData.html.length * 2),
          resourceLoadTime: websiteData.metadata.loadTime,
        },
      };
    } catch (error) {
      logger.error('AI performance estimation failed:', error as Error);
      return this.getDefaultPerformanceMetrics(websiteData);
    }
  }

  private parseSEOFromAI(insights: string[]): {
    structuredData: boolean;
    metaTagsComplete: boolean;
    headingStructure: boolean;
  } {
    // Try to extract SEO data from AI insights
    const insightsText = insights.join(' ').toLowerCase();
    
    return {
      structuredData: insightsText.includes('structured data') || insightsText.includes('schema'),
      metaTagsComplete: insightsText.includes('meta tags') && !insightsText.includes('missing'),
      headingStructure: insightsText.includes('h1') || insightsText.includes('heading'),
    };
  }

  private analyzeSEOFallback(websiteData: WebsiteData): {
    structuredData: boolean;
    metaTagsComplete: boolean;
    headingStructure: boolean;
  } {
    const dom = new JSDOM(websiteData.html);
    const document = dom.window.document;
    
    return {
      structuredData: !!document.querySelector('script[type="application/ld+json"]'),
      metaTagsComplete: !!(websiteData.metadata.title && websiteData.metadata.description),
      headingStructure: websiteData.metadata.h1Tags.length > 0,
    };
  }

  private analyzeAccessibilityFallback(websiteData: WebsiteData): {
    score: number;
    issues: string[];
  } {
    const dom = new JSDOM(websiteData.html);
    const document = dom.window.document;
    const issues: string[] = [];
    let score = 100;

    const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
    if (imagesWithoutAlt.length > 0) {
      issues.push(`${imagesWithoutAlt.length} images missing alt text`);
      score -= 10;
    }

    const linksWithoutText = document.querySelectorAll('a:not([aria-label]):empty');
    if (linksWithoutText.length > 0) {
      issues.push(`${linksWithoutText.length} links without descriptive text`);
      score -= 5;
    }

    return {
      score: Math.max(0, score),
      issues,
    };
  }

  private getDefaultPerformanceMetrics(websiteData: WebsiteData): {
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
  } {
    return {
      coreWebVitals: {
        lcp: 2500,
        fid: 50,
        cls: 0.1,
      },
      loadingMetrics: {
        domContentLoaded: websiteData.metadata.loadTime,
        firstContentfulPaint: websiteData.metadata.loadTime + 200,
        largestContentfulPaint: websiteData.metadata.loadTime + 500,
      },
      networkMetrics: {
        requestCount: 15,
        transferSize: 1000000,
        resourceLoadTime: websiteData.metadata.loadTime,
      },
    };
  }


  private extractKeywords(document: Document): string[] {
    const keywordsElement = document.querySelector('meta[name="keywords"]');
    if (!keywordsElement) return [];
    
    const content = keywordsElement.getAttribute('content');
    return content ? content.split(',').map(keyword => keyword.trim()) : [];
  }

  private extractH1Tags(document: Document): string[] {
    const h1Elements = document.querySelectorAll('h1');
    return Array.from(h1Elements).map(h1 => h1.textContent || '').filter(text => text.length > 0);
  }

  private extractImages(document: Document): string[] {
    const imgElements = document.querySelectorAll('img');
    return Array.from(imgElements)
      .map(img => img.getAttribute('src') || '')
      .filter(src => src.length > 0);
  }

  private extractLinks(document: Document): string[] {
    const linkElements = document.querySelectorAll('a[href]');
    return Array.from(linkElements)
      .map(link => link.getAttribute('href') || '')
      .filter(href => href.length > 0);
  }
}