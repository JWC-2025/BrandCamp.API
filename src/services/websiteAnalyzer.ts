import axios from 'axios';
import * as cheerio from 'cheerio';
import { WebsiteData } from '../types/audit';
import { logger } from '../utils/logger';
import { ERROR_MESSAGES } from '../utils/constants';

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
      try {
        logger.warn(`making axois request to get website data...`);
        const response = await axios.get(url, {
          timeout: 15000,
          maxContentLength: 5 * 1024 * 1024,
          responseType: 'text',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BrandCampAuditBot/1.0)',
            'Accept': 'text/html',
            'Accept-Encoding': 'gzip, deflate, br',
          },
          validateStatus: (status) => status >= 200 && status < 400,
          maxRedirects: 3,
        });

        logger.warn(`loading website data into cheerio...`);
        // Use Cheerio instead of JSDOM - NO DOM PARSING
        const $ = cheerio.load(response.data);

        const websiteData: WebsiteData = {
          url,
          html: response.data,
          metadata: {
            title: $('title').text().trim(),
            description: $('meta[name="description"]').attr('content')?.trim() || '',
            keywords: this.extractKeywordsCheerio($),
            h1Tags: $('h1').map((_, el) => $(el).text().trim()).get(),
            images: $('img').map((_, el) => $(el).attr('src')).get().filter(Boolean),
            links: $('a').map((_, el) => $(el).attr('href')).get().filter(Boolean),
            forms: $('form').length,
            loadTime: Date.now() - startTime,
          },
        };
        
        return websiteData;
        
      } catch (error) {
        throw new Error(`Failed to fetch website: ${(error as any).message}`);
      }
  }

  private extractKeywordsCheerio($: cheerio.Root): string[] {
    const keywords = $('meta[name="keywords"]').attr('content');
    return keywords ? keywords.split(',').map(k => k.trim()) : [];
  }
}