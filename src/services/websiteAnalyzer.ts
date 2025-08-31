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
    
    try {
      logger.info(`gathering website data..`);
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
      logger.info(`finished gathering website data..`);
      return websiteData;
    } catch (error) {
      logger.error(`Failed to fetch basic website data for ${url}:`, error as Error);
      throw error;
    }
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