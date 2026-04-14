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

    logger.warn(`[FIRECRAWL] Submitting async scrape job for: ${url}`);

    const submitResponse = await fetch('https://api.firecrawl.dev/v2/batch/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls: [url],
        formats: ['branding', 'markdown'],
      }),
    });

    if (!submitResponse.ok) {
      throw new Error(`Firecrawl API error: ${submitResponse.status} ${submitResponse.statusText}`);
    }

    const submitResult = await submitResponse.json();

    if (!submitResult.success || !submitResult.id) {
      throw new Error(`Firecrawl job submission failed: ${JSON.stringify(submitResult)}`);
    }

    const jobId = submitResult.id;
    logger.warn(`[FIRECRAWL] Job submitted, polling for results. Job ID: ${jobId}`);

    const pollInterval = 5000;
    const maxAttempts = 24; // 24 * 5s = 120 seconds max

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const pollResponse = await fetch(`https://api.firecrawl.dev/v2/batch/scrape/${jobId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      if (!pollResponse.ok) {
        throw new Error(`Firecrawl poll error: ${pollResponse.status} ${pollResponse.statusText}`);
      }

      const pollResult = await pollResponse.json();

      if (pollResult.status === 'failed') {
        throw new Error(`Firecrawl job failed: ${JSON.stringify(pollResult)}`);
      }

      if (pollResult.status === 'completed' && pollResult.data?.length > 0) {
        const { branding, markdown, metadata } = pollResult.data[0];

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
      }

      logger.warn(`[FIRECRAWL] Job ${jobId} status: ${pollResult.status}, attempt ${attempt + 1}/${maxAttempts}`);
    }

    throw new Error('Firecrawl job timed out after 120 seconds of polling');
  }
}
