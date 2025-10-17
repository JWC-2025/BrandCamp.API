import axios from 'axios';
import { JSDOM } from 'jsdom';
import { WebsiteData } from '../types/audit';
import { logger } from '../utils/logger';
import { DEFAULT_TIMEOUT, MAX_PAGE_SIZE, ERROR_MESSAGES } from '../utils/constants';


export class WebsiteAnalyzer {
  constructor() {
    // No AI service needed - using basic HTML parsing only
  }

  async analyze(url: string, includeScreenshot: boolean = false): Promise<WebsiteData> {
    try {
      logger.warn(`Starting basic website analysis for: ${url}`);
      
      // Get basic HTML content and metadata
      const websiteData = await this.getBasicWebsiteData(url);
      
      // Add screenshot placeholder if requested
      if (includeScreenshot) {
        websiteData.screenshot = Buffer.from('basic-analysis-placeholder', 'utf8');
      }
      
      logger.warn(`Basic website analysis completed for: ${url}`);
      return websiteData;
    } catch (error) {
      logger.error(`Website analysis failed for ${url}:`, error as Error);
      throw new Error(`${ERROR_MESSAGES.ANALYSIS_FAILED}: ${(error as Error).message}`);
    }
  }

  private async getBasicWebsiteData(url: string): Promise<WebsiteData> {
    const requestId = Math.random().toString(36).substring(2, 8);
    const startTime = Date.now();
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    
    logger.warn(`[WEBSITE_ANALYZER] Starting website data gathering`, {
      requestId,
      url,
      maxRetries: MAX_RETRIES,
      timeout: DEFAULT_TIMEOUT,
      maxPageSize: `${Math.round(MAX_PAGE_SIZE / 1024 / 1024)}MB`
    });
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const attemptStartTime = Date.now();
      try {
        logger.warn(`[WEBSITE_ANALYZER] Gathering website data (attempt ${attempt}/${MAX_RETRIES})`, {
          requestId,
          url,
          attempt,
          elapsedMs: Date.now() - startTime
        });
        
        // DNS resolution timing
        const dnsStartTime = Date.now();
        
        const response = await axios.get(url, {
          timeout: DEFAULT_TIMEOUT,
          maxContentLength: MAX_PAGE_SIZE,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BrandCampAuditBot/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          validateStatus: (status) => status >= 200 && status < 400,
          maxRedirects: 5,
        });

        const networkTime = Date.now() - dnsStartTime;
        const contentSize = typeof response.data === 'string' ? response.data.length : 0;
        
        logger.warn(`[WEBSITE_ANALYZER] HTTP request completed`, {
          requestId,
          url,
          attempt,
          networkTimeMs: networkTime,
          statusCode: response.status,
          contentLength: contentSize,
          contentSizeKB: Math.round(contentSize / 1024),
          headers: {
            contentType: response.headers['content-type'],
            contentEncoding: response.headers['content-encoding'],
            server: response.headers.server
          }
        });

        // JSDOM parsing timing
        const domStartTime = Date.now();
        const dom = new JSDOM(response.data, {
          // Optimize JSDOM for better performance
          resources: "usable",
          runScripts: "outside-only",
          pretendToBeVisual: false
        });
        const document = dom.window.document;
        const domParsingTime = Date.now() - domStartTime;

        logger.warn(`[WEBSITE_ANALYZER] DOM parsing completed`, {
          requestId,
          url,
          attempt,
          domParsingTimeMs: domParsingTime,
          documentSize: contentSize
        });

        // Metadata extraction timing
        const extractionStartTime = Date.now();
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
        
        const extractionTime = Date.now() - extractionStartTime;
        const totalTime = Date.now() - startTime;
        const attemptTime = Date.now() - attemptStartTime;

        logger.warn(`[WEBSITE_ANALYZER] Website data gathering completed successfully`, {
          requestId,
          url,
          attempt,
          timing: {
            networkMs: networkTime,
            domParsingMs: domParsingTime,
            extractionMs: extractionTime,
            attemptMs: attemptTime,
            totalMs: totalTime
          },
          metadata: {
            titleLength: websiteData.metadata.title.length,
            h1Count: websiteData.metadata.h1Tags.length,
            imageCount: websiteData.metadata.images.length,
            linkCount: websiteData.metadata.links.length,
            formCount: websiteData.metadata.forms
          },
          performance: {
            contentSizeKB: Math.round(contentSize / 1024),
            processingRate: Math.round(contentSize / totalTime * 1000), // bytes/sec
          }
        });
        
        return websiteData;
        
      } catch (error) {
        const attemptTime = Date.now() - attemptStartTime;
        const isLastAttempt = attempt === MAX_RETRIES;
        const errorMessage = (error as any).message || 'Unknown error';
        const errorCode = (error as any).code;
        const statusCode = (error as any).response?.status;
        
        logger.warn(`[WEBSITE_ANALYZER] Attempt ${attempt}/${MAX_RETRIES} failed for ${url}`, {
          requestId,
          url,
          attempt,
          error: errorMessage,
          code: errorCode,
          status: statusCode,
          attemptTimeMs: attemptTime,
          totalElapsedMs: Date.now() - startTime,
          isLastAttempt,
          timeout: DEFAULT_TIMEOUT
        });

        if (isLastAttempt) {
          // Provide more specific error messages
          if (errorCode === 'ECONNRESET' || errorCode === 'ECONNREFUSED') {
            logger.error(`Connection issue for ${url}: Network connection was reset or refused`);
            throw new Error(`${ERROR_MESSAGES.ANALYSIS_FAILED}: Connection to website failed - ${errorMessage}`);
          } else if (errorCode === 'ETIMEDOUT' || errorMessage.includes('timeout')) {
            logger.error(`Timeout issue for ${url}: Request exceeded timeout limit`);
            throw new Error(`${ERROR_MESSAGES.TIMEOUT}: Website took too long to respond - ${errorMessage}`);
          } else if (statusCode >= 400) {
            logger.error(`HTTP error for ${url}: Status ${statusCode}`);
            throw new Error(`${ERROR_MESSAGES.ANALYSIS_FAILED}: Website returned error status ${statusCode}`);
          } else {
            logger.error(`Failed to fetch basic website data for ${url}:`, error as Error);
            throw error;
          }
        } else {
          // Wait before retrying (exponential backoff)
          const delay = RETRY_DELAY * attempt;
          logger.warn(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // This should never be reached, but TypeScript requires it
    throw new Error(`${ERROR_MESSAGES.ANALYSIS_FAILED}: All retry attempts failed`);
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