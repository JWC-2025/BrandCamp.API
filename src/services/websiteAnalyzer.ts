import puppeteer, { Browser, Page } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
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
      // Use serverless-optimized Chrome for Vercel
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (isProduction) {
        // Serverless environment (Vercel)
        this.browser = await puppeteer.launch({
          args: chromium.args,
          defaultViewport: { width: 1920, height: 1080 },
          executablePath: await chromium.executablePath(),
          headless: true,
        });
      } else {
        // Local development - try to use local Chrome
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        });
      }
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
          this.getWebsiteDataWithPuppeteer(url, startTime),
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

  private async getWebsiteDataWithPuppeteer(url: string, startTime: number): Promise<WebsiteData> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    // Set user agent and viewport
    await page.setUserAgent('Mozilla/5.0 (compatible; BrandCampAuditBot/1.0)');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Cache-Control': 'no-cache'
    });
    
    try {
      // Set timeout
      page.setDefaultTimeout(DEFAULT_TIMEOUT - 5000);
      
      // Navigate to the page
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: DEFAULT_TIMEOUT - 5000
      });
      
      if (!response) {
        throw new Error('No response received from server');
      }
      
      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }
      
      // Extract metadata efficiently
      const [title, description, keywords, h1Tags, images, links, formCount] = await Promise.all([
        page.title().catch(() => ''),
        page.$eval('meta[name="description"]', el => el.getAttribute('content')).catch(() => ''),
        this.extractKeywordsPuppeteer(page),
        this.extractH1TagsPuppeteer(page),
        this.extractImagesPuppeteer(page),
        this.extractLinksPuppeteer(page),
        page.$$('form').then(forms => forms.length).catch(() => 0)
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
      await page.close();
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



  private async extractKeywordsPuppeteer(page: Page): Promise<string[]> {
    try {
      const content = await page.$eval('meta[name="keywords"]', el => el.getAttribute('content')).catch(() => null);
      return content ? content.split(',').map(keyword => keyword.trim()) : [];
    } catch {
      return [];
    }
  }

  private async extractH1TagsPuppeteer(page: Page): Promise<string[]> {
    try {
      return await page.$$eval('h1', h1s => h1s.map(h1 => h1.textContent || '').filter(text => text.length > 0));
    } catch {
      return [];
    }
  }

  private async extractImagesPuppeteer(page: Page): Promise<string[]> {
    try {
      const srcs = await page.$$eval('img', imgs => 
        imgs.map(img => img.getAttribute('src') || '').filter(src => src.length > 0)
      );
      return srcs.slice(0, 50); // Limit to 50 images
    } catch {
      return [];
    }
  }

  private async extractLinksPuppeteer(page: Page): Promise<string[]> {
    try {
      const hrefs = await page.$$eval('a[href]', links => 
        links.map(link => link.getAttribute('href') || '').filter(href => href.length > 0)
      );
      return hrefs.slice(0, 100); // Limit to 100 links
    } catch {
      return [];
    }
  }
}