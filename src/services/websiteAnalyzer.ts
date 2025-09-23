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
      logger.info(`Starting basic website analysis for: ${url}`);
      
      // Get basic HTML content and metadata
      const websiteData = await this.getBasicWebsiteData(url);
      
      // Add screenshot placeholder if requested
      if (includeScreenshot) {
        websiteData.screenshot = Buffer.from('basic-analysis-placeholder', 'utf8');
      }
      
      logger.info(`Basic website analysis completed for: ${url}`);
      return websiteData;
    } catch (error) {
      logger.error(`Website analysis failed for ${url}:`, error as Error);
      throw new Error(`${ERROR_MESSAGES.ANALYSIS_FAILED}: ${(error as Error).message}`);
    }
  }

  private async getBasicWebsiteData(url: string): Promise<WebsiteData> {
    const startTime = Date.now();
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(`gathering website data (attempt ${attempt}/${MAX_RETRIES})..`);
        
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
        
        logger.info(`finished gathering website data successfully on attempt ${attempt}`);
        return websiteData;
        
      } catch (error) {
        const isLastAttempt = attempt === MAX_RETRIES;
        const errorMessage = (error as any).message || 'Unknown error';
        const errorCode = (error as any).code;
        const statusCode = (error as any).response?.status;
        
        logger.warn(`Attempt ${attempt}/${MAX_RETRIES} failed for ${url}:`, {
          error: errorMessage,
          code: errorCode,
          status: statusCode,
          isLastAttempt
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
          logger.info(`Retrying in ${delay}ms...`);
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