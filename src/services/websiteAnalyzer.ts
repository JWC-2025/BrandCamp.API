import { WebsiteData, BrandingProfile } from '../types/audit';
import { logger } from '../utils/logger';
import { ERROR_MESSAGES } from '../utils/constants';

export class WebsiteAnalyzer {
  async analyze(url: string): Promise<WebsiteData> {
    try {
      logger.warn(`Starting Firecrawl brand analysis for: ${url}`);
      return await this.fetchBrandingData(url);
    } catch (error) {
      logger.error(`Website analysis failed for ${url}:`, error as Error);
      throw new Error(`${ERROR_MESSAGES.ANALYSIS_FAILED}: ${(error as Error).message}`);
    }
  }

  private async fetchBrandingData(url: string): Promise<WebsiteData> {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY is not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      logger.warn(`[FIRECRAWL] Fetching branding data for: ${url}`);

      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['branding', 'markdown'],
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(`Firecrawl returned unsuccessful response: ${JSON.stringify(result)}`);
      }

      const { branding, markdown, metadata } = result.data;

      logger.warn(`[FIRECRAWL] Successfully retrieved branding data for: ${url}`, {
        hasColors: !!branding?.colors,
        hasFonts: !!branding?.fonts,
        hasPersonality: !!branding?.personality,
        markdownLength: markdown?.length || 0,
      });

      return {
        url,
        html: markdown || '',
        branding: branding as BrandingProfile,
        metadata: {
          title: metadata?.title || '',
          description: metadata?.description || '',
          keywords: metadata?.keywords ? metadata.keywords.split(',').map((k: string) => k.trim()) : [],
          h1Tags: [],
          images: [],
          links: [],
          forms: 0,
          loadTime: 0,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Firecrawl request timed out after 30 seconds');
      }

      throw error;
    }
  }
}
