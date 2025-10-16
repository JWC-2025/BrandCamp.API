import { chromium, Browser, Page } from 'playwright';
import { WebsiteData } from '../types/audit';
import { logger } from '../utils/logger';
import { DEFAULT_TIMEOUT, ERROR_MESSAGES } from '../utils/constants';


export class WebsiteAnalyzer {
  private browser: Browser | null = null;

  constructor() {
    // Initialize browser instance lazily
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async analyze(url: string, includeScreenshot: boolean = false): Promise<WebsiteData> {
    try {
      logger.warn(`Starting Playwright website analysis for: ${url}`);
      
      // Get website data using Playwright
      const websiteData = await this.getBasicWebsiteData(url);
      
      // Add screenshot placeholder if requested
      if (includeScreenshot) {
        websiteData.screenshot = Buffer.from('playwright-analysis-placeholder', 'utf8');
      }
      
      logger.warn(`Playwright website analysis completed for: ${url}`);
      return websiteData;
    } catch (error) {
      logger.error(`Website analysis failed for ${url}:`, error as Error);
      throw new Error(`${ERROR_MESSAGES.ANALYSIS_FAILED}: ${(error as Error).message}`);
    } finally {
      // Clean up browser resources if needed
      // Note: We don't close the browser here to allow reuse
    }
  }

  private async getBasicWebsiteData(url: string): Promise<WebsiteData> {
    const startTime = Date.now();
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.warn(`Gathering website data with Playwright (attempt ${attempt}/${MAX_RETRIES})...`);
        
        const result = await Promise.race([
          this.getWebsiteDataWithPlaywright(url, startTime),
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error(`${ERROR_MESSAGES.TIMEOUT}: Operation timeout exceeded`));
            }, DEFAULT_TIMEOUT);
          })
        ]);
        
        logger.warn(`Successfully gathered website data on attempt ${attempt}`);
        return result;
        
      } catch (error) {
        const isLastAttempt = attempt === MAX_RETRIES;
        const errorMessage = (error as Error).message;
        
        logger.warn(`Attempt ${attempt}/${MAX_RETRIES} failed for ${url}: ${errorMessage}`);
        
        if (isLastAttempt) {
          if (errorMessage.includes('timeout') || errorMessage.includes('Navigation timeout')) {
            throw new Error(`${ERROR_MESSAGES.TIMEOUT}: Website took too long to respond`);
          }
          throw new Error(`${ERROR_MESSAGES.ANALYSIS_FAILED}: ${errorMessage}`);
        }
        
        // Exponential backoff
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
        logger.warn(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error(`${ERROR_MESSAGES.ANALYSIS_FAILED}: All retry attempts failed`);
  }

  private async getWebsiteDataWithPlaywright(url: string, startTime: number): Promise<WebsiteData> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (compatible; BrandCampAuditBot/1.0)',
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache'
      }
    });
    
    const page = await context.newPage();
    
    try {
      // Set timeout and navigation options
      page.setDefaultTimeout(DEFAULT_TIMEOUT - 5000);
      
      // Navigate with stream processing for large pages
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: DEFAULT_TIMEOUT - 5000
      });
      
      if (!response || !response.ok()) {
        throw new Error(`HTTP ${response?.status()}: ${response?.statusText()}`);
      }
      
      // Extract metadata efficiently without full HTML
      const [title, description, keywords, h1Tags, images, links, formCount] = await Promise.all([
        page.title().catch(() => ''),
        page.getAttribute('meta[name="description"]', 'content').catch(() => ''),
        this.extractKeywordsPlaywright(page),
        this.extractH1TagsPlaywright(page),
        this.extractImagesPlaywright(page),
        this.extractLinksPlaywright(page),
        page.locator('form').count().catch(() => 0)
      ]);
      
      // Get HTML content with size limit
      const htmlContent = await this.getHtmlContentWithLimit(page);
      
      const websiteData: WebsiteData = {
        url,
        html: htmlContent,
        metadata: {
          title,
          description: description || '',
          keywords,
          h1Tags,
          images,
          links,
          forms: formCount,
          loadTime: Date.now() - startTime,
        },
      };
      
      return websiteData;
      
    } finally {
      await context.close();
    }
  }
  
  private async getHtmlContentWithLimit(page: Page): Promise<string> {
    const MAX_HTML_SIZE = 1000000; // 1MB limit
    
    try {
      // Stream-based content processing for large pages
      const contentStream = await this.getContentAsStream(page);
      let content = '';
      let totalSize = 0;
      
      for await (const chunk of contentStream) {
        if (totalSize + chunk.length > MAX_HTML_SIZE) {
          // Truncate at the limit
          const remainingSize = MAX_HTML_SIZE - totalSize;
          content += chunk.substring(0, remainingSize);
          content += '<!-- Content truncated for processing -->';
          logger.warn(`HTML content truncated at ${MAX_HTML_SIZE} characters`);
          break;
        }
        content += chunk;
        totalSize += chunk.length;
      }
      
      return content;
    } catch (error) {
      logger.error('Failed to get HTML content:', error as Error);
      // Fallback to regular content method
      try {
        const fallbackContent = await page.content();
        if (fallbackContent.length > MAX_HTML_SIZE) {
          return fallbackContent.substring(0, MAX_HTML_SIZE) + '<!-- Content truncated -->';
        }
        return fallbackContent;
      } catch {
        return '';
      }
    }
  }
  
  private async getContentAsStream(page: Page): Promise<AsyncIterable<string>> {
    const CHUNK_SIZE = 64 * 1024; // 64KB chunks
    
    return {
      async *[Symbol.asyncIterator]() {
        try {
          const content = await page.content();
          
          // Split content into chunks for stream processing
          for (let i = 0; i < content.length; i += CHUNK_SIZE) {
            yield content.substring(i, i + CHUNK_SIZE);
          }
        } catch (error) {
          logger.error('Error in content stream:', error as Error);
          return;
        }
      }
    };
  }



  private async extractKeywordsPlaywright(page: Page): Promise<string[]> {
    try {
      const content = await page.getAttribute('meta[name="keywords"]', 'content');
      return content ? content.split(',').map(keyword => keyword.trim()) : [];
    } catch {
      return [];
    }
  }

  private async extractH1TagsPlaywright(page: Page): Promise<string[]> {
    try {
      return await page.locator('h1').allTextContents();
    } catch {
      return [];
    }
  }

  private async extractImagesPlaywright(page: Page): Promise<string[]> {
    try {
      const images = await page.locator('img').all();
      const srcs = await Promise.all(
        images.map(async img => {
          try {
            return await img.getAttribute('src') || '';
          } catch {
            return '';
          }
        })
      );
      return srcs.filter(src => src.length > 0).slice(0, 50); // Limit to 50 images
    } catch {
      return [];
    }
  }

  private async extractLinksPlaywright(page: Page): Promise<string[]> {
    try {
      const links = await page.locator('a[href]').all();
      const hrefs = await Promise.all(
        links.map(async link => {
          try {
            return await link.getAttribute('href') || '';
          } catch {
            return '';
          }
        })
      );
      return hrefs.filter(href => href.length > 0).slice(0, 100); // Limit to 100 links
    } catch {
      return [];
    }
  }
}