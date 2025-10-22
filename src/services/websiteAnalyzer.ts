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
      // Check content size and type before downloading
      logger.warn(`checking content size and type for: ${url}`);
      const headResponse = await axios.head(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        validateStatus: (status) => status >= 200 && status < 400,
        maxRedirects: 5,
      });

      const contentLength = headResponse.headers['content-length'];
      const contentType = headResponse.headers['content-type'] || '';
      const maxSize = 5 * 1024 * 1024; // 5MB limit

      // Skip video content
      if (contentType.includes('video/')) {
        throw new Error('Video content is not supported for analysis');
      }

      // Check content size
      if (contentLength && parseInt(contentLength) > maxSize) {
        throw new Error(`Content too large: ${Math.round(parseInt(contentLength) / 1024 / 1024)}MB exceeds 5MB limit`);
      }

      logger.warn(`making axios request to get website data...`);
      const response = await axios.get(url, {
        timeout: 30000, // Increased timeout to 30 seconds
        maxContentLength: maxSize, // 5MB limit
        maxBodyLength: maxSize, // Also limit request body
        responseType: 'text',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        validateStatus: (status) => status >= 200 && status < 400,
        maxRedirects: 5,
      });

      logger.warn(`axios request completed. Status: ${response.status}, Content-Length: ${response.headers['content-length'] || 'unknown'}`);
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