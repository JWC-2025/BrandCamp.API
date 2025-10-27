import { WebsiteData, FetchOptions, ProcessedHTML } from '../types/audit';
import { logger } from '../utils/logger';
import { ERROR_MESSAGES } from '../utils/constants';
import * as cheerio from 'cheerio';

export class WebsiteAnalyzer {
  constructor() {
    // Website data will be fetched directly by Claude during analysis
  }

  async analyze(url: string): Promise<WebsiteData> {
    try {
      logger.warn(`Starting Claude-based website analysis for: ${url}`);
      
      // Create basic website data structure for Claude to populate
      const websiteData = this.createBasicWebsiteData(url);
      
      logger.warn(`Website data structure created for Claude analysis: ${url}`);
      return websiteData;
    } catch (error) {
      logger.error(`Website analysis setup failed for ${url}:`, error as Error);
      throw new Error(`${ERROR_MESSAGES.ANALYSIS_FAILED}: ${(error as Error).message}`);
    }
  }

  private async createBasicWebsiteData(url: string): Promise<WebsiteData> {

    var processedHTML = await this.fetchHTMLForAnalysis(url);
    // Create a minimal WebsiteData structure that Claude will populate during analysis
    const websiteData: WebsiteData = {
      url,
      html: processedHTML.content, // Will be fetched by Claude
      metadata: {
        title: processedHTML.metadata.title,
        description: processedHTML.metadata.title,
        keywords: [],
        h1Tags: [],
        images: [],
        links: [],
        forms: 0,
        loadTime: 0,
      },
    };
    
    return websiteData;
  }

  private async fetchHTMLForAnalysis(
    url: string,
    options: FetchOptions = {}
  ): Promise<ProcessedHTML> {
    const {
      timeout = 10000,
      maxContentLength = 200000, // ~50k tokens
      userAgent = 'Mozilla/5.0 (compatible; CTAAnalyzer/1.0)'
    } = options;

    try {
      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Process the HTML
      const processed = this.processHTML(html, url, maxContentLength);

      return processed;

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw new Error(`Failed to fetch ${url}: ${error.message}`);
      }
      throw error;
    }
  }

  private processHTML(html: string, url: string, maxLength: number): ProcessedHTML {
    const $ = cheerio.load(html);

    // Extract metadata
    const title = $('title').text() || $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[name="description"]').attr('content') || 
                      $('meta[property="og:description"]').attr('content') || '';

    // Remove unnecessary elements
    $('script').remove();
    $('style').remove();
    $('noscript').remove();
    $('svg').remove();
    $('iframe').remove();
    $('meta').remove();
    $('link').remove();
    $('comment').remove();

    // Extract CTAs and important elements with context
    const ctaElements: string[] = [];
    
    // Buttons
    $('button, a.button, .btn, [role="button"]').each((_, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      const href = $elem.attr('href') || '';
      const classes = $elem.attr('class') || '';
      const ariaLabel = $elem.attr('aria-label') || '';
      
      if (text || ariaLabel) {
        ctaElements.push(
          `<cta type="button" class="${classes}" href="${href}" aria-label="${ariaLabel}">${text}</cta>`
        );
      }
    });

    // Links that might be CTAs
    $('a').each((_, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      const href = $elem.attr('href') || '';
      const classes = $elem.attr('class') || '';
      
      // Only include if it looks like a CTA (has certain keywords or classes)
      const ctaKeywords = /sign.?up|get.?started|try|buy|download|subscribe|join|register|learn.?more|contact|demo/i;
      if (text && (ctaKeywords.test(text) || ctaKeywords.test(classes))) {
        ctaElements.push(
          `<cta type="link" class="${classes}" href="${href}">${text}</cta>`
        );
      }
    });

    // Forms
    $('form').each((_, elem) => {
      const $elem = $(elem);
      const action = $elem.attr('action') || '';
      const method = $elem.attr('method') || 'get';
      const inputs = $elem.find('input, textarea, select').length;
      const submitText = $elem.find('[type="submit"], button[type="submit"]').text().trim();
      
      ctaElements.push(
        `<form action="${action}" method="${method}" inputs="${inputs}" submit="${submitText}"></form>`
      );
    });

    // Get main content
    const mainContent = 
      $('main').html() || 
      $('[role="main"]').html() || 
      $('body').html() || 
      '';

    // Clean up whitespace
    const cleanContent = mainContent
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();

    // Combine CTAs with cleaned content
    const ctaSection = ctaElements.length > 0 
      ? `\n\n<!-- EXTRACTED CTAs -->\n${ctaElements.join('\n')}\n<!-- END CTAs -->\n\n`
      : '';

    let finalContent = ctaSection + cleanContent;

    // Truncate if too long
    if (finalContent.length > maxLength) {
      finalContent = finalContent.substring(0, maxLength) + '\n\n<!-- Content truncated -->';
    }

    // Estimate tokens (rough: 1 token ≈ 4 characters)
    const tokenEstimate = Math.ceil(finalContent.length / 4);

    return {
      content: finalContent,
      tokenEstimate,
      metadata: {
        title,
        description,
        url,
      },
    };
  }
}