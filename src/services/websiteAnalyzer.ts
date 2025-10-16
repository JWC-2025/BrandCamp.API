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
    const startTime = Date.now();
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    const TOTAL_TIMEOUT = DEFAULT_TIMEOUT + 30000; // Add 30s buffer to default timeout

    // Wrap entire method in timeout to prevent hanging
    return Promise.race([
      this.getBasicWebsiteDataInternal(url, startTime, MAX_RETRIES, RETRY_DELAY),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`${ERROR_MESSAGES.TIMEOUT}: Total operation timeout exceeded after ${TOTAL_TIMEOUT}ms`));
        }, TOTAL_TIMEOUT);
      })
    ]);
  }

  private async getBasicWebsiteDataInternal(url: string, startTime: number, MAX_RETRIES: number, RETRY_DELAY: number): Promise<WebsiteData> {
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      // Create abort controller for this attempt
      const abortController = new AbortController();
      const attemptTimeout = setTimeout(() => {
        abortController.abort();
        logger.warn(`[WEBSITE_ANALYZER] Aborting request for ${url} on attempt ${attempt} due to timeout`);
      }, DEFAULT_TIMEOUT);

      try {
        logger.warn(`gathering website data (attempt ${attempt}/${MAX_RETRIES})..`);
        
        const response = await axios.get(url, {
          signal: abortController.signal,
          timeout: DEFAULT_TIMEOUT - 1000, // Leave buffer for abort controller
          maxContentLength: MAX_PAGE_SIZE,
          maxBodyLength: MAX_PAGE_SIZE,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BrandCampAuditBot/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'close', // Prevent keep-alive issues
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          validateStatus: (status) => status >= 200 && status < 400,
          maxRedirects: 3, // Reduce redirect limit
          // Additional timeout configurations
          httpAgent: false, // Disable HTTP keep-alive
          httpsAgent: false, // Disable HTTPS keep-alive
          decompress: true
        });

        // Clear the timeout since request succeeded
        clearTimeout(attemptTimeout);

        // Add timeout for JSDOM processing as well
        const domProcessingTimeout = setTimeout(() => {
          throw new Error('DOM processing timeout');
        }, 10000); // 10 second limit for DOM processing

        let document: Document;
        try {
          // Truncate response data if too large for JSDOM processing
          let htmlData = response.data;
          if (typeof htmlData === 'string' && htmlData.length > 1000000) { // 1MB limit for DOM processing
            logger.warn(`[WEBSITE_ANALYZER] Truncating large HTML response for ${url} (${htmlData.length} chars)`);
            htmlData = htmlData.substring(0, 1000000) + '<!-- Content truncated for processing -->';
          }

          const dom = new JSDOM(htmlData, {
            // Limit JSDOM processing
            resources: "usable",
            runScripts: "outside-only", // Don't run scripts
            pretendToBeVisual: false,
            storageQuota: 10000000 // 10MB limit
          });
          document = dom.window.document;
          clearTimeout(domProcessingTimeout);
        } catch (domError) {
          clearTimeout(domProcessingTimeout);
          logger.error(`[WEBSITE_ANALYZER] DOM processing failed for ${url}:`, domError as Error);
          throw new Error(`DOM processing failed: ${domError}`);
        }

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
        
        logger.warn(`finished gathering website data successfully on attempt ${attempt}`);
        return websiteData;
        
      } catch (error) {
        // Always clear the timeout on error
        clearTimeout(attemptTimeout);
        
        const isLastAttempt = attempt === MAX_RETRIES;
        const errorMessage = (error as any).message || 'Unknown error';
        const errorCode = (error as any).code;
        const statusCode = (error as any).response?.status;
        const isAborted = abortController.signal.aborted;
        
        logger.warn(`Attempt ${attempt}/${MAX_RETRIES} failed for ${url}:`, {
          error: errorMessage,
          code: errorCode,
          status: statusCode,
          isAborted,
          isLastAttempt
        });

        if (isLastAttempt) {
          // Provide more specific error messages
          if (isAborted || errorCode === 'ETIMEDOUT' || errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
            logger.error(`Timeout issue for ${url}: Request exceeded timeout limit or was aborted`);
            throw new Error(`${ERROR_MESSAGES.TIMEOUT}: Website took too long to respond - ${errorMessage}`);
          } else if (errorCode === 'ECONNRESET' || errorCode === 'ECONNREFUSED') {
            logger.error(`Connection issue for ${url}: Network connection was reset or refused`);
            throw new Error(`${ERROR_MESSAGES.ANALYSIS_FAILED}: Connection to website failed - ${errorMessage}`);
          } else if (errorMessage.includes('DOM processing')) {
            logger.error(`DOM processing issue for ${url}: HTML parsing failed or took too long`);
            throw new Error(`${ERROR_MESSAGES.ANALYSIS_FAILED}: Website content processing failed - ${errorMessage}`);
          } else if (statusCode >= 400) {
            logger.error(`HTTP error for ${url}: Status ${statusCode}`);
            throw new Error(`${ERROR_MESSAGES.ANALYSIS_FAILED}: Website returned error status ${statusCode}`);
          } else {
            logger.error(`Failed to fetch basic website data for ${url}:`, error as Error);
            throw error;
          }
        } else {
          // Wait before retrying (exponential backoff)
          const delay = RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff: 1s, 2s, 4s
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