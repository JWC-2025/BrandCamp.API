"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsiteAnalyzer = void 0;
const axios_1 = __importDefault(require("axios"));
const jsdom_1 = require("jsdom");
const logger_1 = require("../utils/logger");
const constants_1 = require("../utils/constants");
const aiService_1 = require("./aiService");
const environment_1 = require("../config/environment");
class WebsiteAnalyzer {
    constructor() {
        this.aiService = environment_1.config.ai.anthropicApiKey
            ? new aiService_1.ClaudeService(environment_1.config.ai.anthropicApiKey)
            : new aiService_1.MockAIService();
    }
    async analyze(url, includeScreenshot = false) {
        try {
            logger_1.logger.info(`Starting AI-powered website analysis for: ${url}`);
            const basicData = await this.getBasicWebsiteData(url);
            const enhancedData = await this.enhanceWithAI(basicData, includeScreenshot);
            logger_1.logger.info(`AI-powered website analysis completed for: ${url}`);
            return enhancedData;
        }
        catch (error) {
            logger_1.logger.error(`Website analysis failed for ${url}:`, error);
            throw new Error(`${constants_1.ERROR_MESSAGES.ANALYSIS_FAILED}: ${error.message}`);
        }
    }
    async getBasicWebsiteData(url) {
        const startTime = Date.now();
        try {
            const response = await axios_1.default.get(url, {
                timeout: constants_1.DEFAULT_TIMEOUT,
                maxContentLength: constants_1.MAX_PAGE_SIZE,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; BrandCampAuditBot/1.0)',
                },
            });
            const dom = new jsdom_1.JSDOM(response.data);
            const document = dom.window.document;
            const websiteData = {
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
            return websiteData;
        }
        catch (error) {
            logger_1.logger.error(`Failed to fetch basic website data for ${url}:`, error);
            throw error;
        }
    }
    async enhanceWithAI(basicData, includeScreenshot) {
        try {
            const enhancedData = { ...basicData };
            enhancedData.seo = await this.analyzeSEOWithAI(basicData);
            enhancedData.accessibility = await this.analyzeAccessibilityWithAI(basicData);
            enhancedData.performance = await this.estimatePerformanceWithAI(basicData);
            if (includeScreenshot) {
                enhancedData.screenshot = Buffer.from('ai-analysis-placeholder', 'utf8');
            }
            return enhancedData;
        }
        catch (error) {
            logger_1.logger.error('AI enhancement failed, returning basic data:', error);
            return basicData;
        }
    }
    async analyzeSEOWithAI(websiteData) {
        try {
            const prompt = `
Analyze the SEO elements of this website and return a JSON response:

URL: ${websiteData.url}
Title: ${websiteData.metadata.title}
Description: ${websiteData.metadata.description}
H1 Tags: ${websiteData.metadata.h1Tags.join(', ')}
Keywords: ${websiteData.metadata.keywords.join(', ')}

HTML Preview: ${websiteData.html.substring(0, 3000)}...

Please analyze and return only this JSON format:
{
  "structuredData": true/false,
  "metaTagsComplete": true/false,
  "headingStructure": true/false
}

Check for:
- Structured data (JSON-LD, schema.org)
- Complete meta tags (title, description)
- Proper heading structure (H1 present)
`;
            const result = await this.aiService.analyzeWebsite(websiteData, 'SEO Analysis', prompt);
            const seoData = this.parseSEOFromAI(result.insights);
            return seoData;
        }
        catch (error) {
            logger_1.logger.error('AI SEO analysis failed:', error);
            return this.analyzeSEOFallback(websiteData);
        }
    }
    async analyzeAccessibilityWithAI(websiteData) {
        try {
            const prompt = `
Analyze the accessibility of this website HTML and return insights:

URL: ${websiteData.url}
Images: ${websiteData.metadata.images.length} images found
Forms: ${websiteData.metadata.forms} forms found

HTML Preview: ${websiteData.html.substring(0, 3000)}...

Check for accessibility issues like:
- Images without alt text
- Forms without labels
- Missing ARIA attributes
- Color contrast issues
- Keyboard navigation support

Provide a score (0-100) and list of specific issues found.
`;
            const result = await this.aiService.analyzeWebsite(websiteData, 'Accessibility Analysis', prompt);
            return {
                score: result.score,
                issues: result.insights,
            };
        }
        catch (error) {
            logger_1.logger.error('AI accessibility analysis failed:', error);
            return this.analyzeAccessibilityFallback(websiteData);
        }
    }
    async estimatePerformanceWithAI(websiteData) {
        try {
            const prompt = `
Estimate the performance characteristics of this website:

URL: ${websiteData.url}
Images: ${websiteData.metadata.images.length}
Links: ${websiteData.metadata.links.length}
HTML Size: ${websiteData.html.length} characters
Load Time: ${websiteData.metadata.loadTime}ms

Based on the HTML content and metadata, estimate reasonable performance metrics.
Provide realistic estimates for Core Web Vitals and loading metrics.
`;
            await this.aiService.analyzeWebsite(websiteData, 'Performance Estimation', prompt);
            return {
                coreWebVitals: {
                    lcp: Math.min(3000, 1500 + websiteData.metadata.images.length * 100),
                    fid: 50,
                    cls: 0.1,
                },
                loadingMetrics: {
                    domContentLoaded: websiteData.metadata.loadTime,
                    firstContentfulPaint: websiteData.metadata.loadTime + 200,
                    largestContentfulPaint: websiteData.metadata.loadTime + 500,
                },
                networkMetrics: {
                    requestCount: 10 + websiteData.metadata.images.length + websiteData.metadata.links.length / 10,
                    transferSize: Math.max(500000, websiteData.html.length * 2),
                    resourceLoadTime: websiteData.metadata.loadTime,
                },
            };
        }
        catch (error) {
            logger_1.logger.error('AI performance estimation failed:', error);
            return this.getDefaultPerformanceMetrics(websiteData);
        }
    }
    parseSEOFromAI(insights) {
        const insightsText = insights.join(' ').toLowerCase();
        return {
            structuredData: insightsText.includes('structured data') || insightsText.includes('schema'),
            metaTagsComplete: insightsText.includes('meta tags') && !insightsText.includes('missing'),
            headingStructure: insightsText.includes('h1') || insightsText.includes('heading'),
        };
    }
    analyzeSEOFallback(websiteData) {
        const dom = new jsdom_1.JSDOM(websiteData.html);
        const document = dom.window.document;
        return {
            structuredData: !!document.querySelector('script[type="application/ld+json"]'),
            metaTagsComplete: !!(websiteData.metadata.title && websiteData.metadata.description),
            headingStructure: websiteData.metadata.h1Tags.length > 0,
        };
    }
    analyzeAccessibilityFallback(websiteData) {
        const dom = new jsdom_1.JSDOM(websiteData.html);
        const document = dom.window.document;
        const issues = [];
        let score = 100;
        const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
        if (imagesWithoutAlt.length > 0) {
            issues.push(`${imagesWithoutAlt.length} images missing alt text`);
            score -= 10;
        }
        const linksWithoutText = document.querySelectorAll('a:not([aria-label]):empty');
        if (linksWithoutText.length > 0) {
            issues.push(`${linksWithoutText.length} links without descriptive text`);
            score -= 5;
        }
        return {
            score: Math.max(0, score),
            issues,
        };
    }
    getDefaultPerformanceMetrics(websiteData) {
        return {
            coreWebVitals: {
                lcp: 2500,
                fid: 50,
                cls: 0.1,
            },
            loadingMetrics: {
                domContentLoaded: websiteData.metadata.loadTime,
                firstContentfulPaint: websiteData.metadata.loadTime + 200,
                largestContentfulPaint: websiteData.metadata.loadTime + 500,
            },
            networkMetrics: {
                requestCount: 15,
                transferSize: 1000000,
                resourceLoadTime: websiteData.metadata.loadTime,
            },
        };
    }
    extractKeywords(document) {
        const keywordsElement = document.querySelector('meta[name="keywords"]');
        if (!keywordsElement)
            return [];
        const content = keywordsElement.getAttribute('content');
        return content ? content.split(',').map(keyword => keyword.trim()) : [];
    }
    extractH1Tags(document) {
        const h1Elements = document.querySelectorAll('h1');
        return Array.from(h1Elements).map(h1 => h1.textContent || '').filter(text => text.length > 0);
    }
    extractImages(document) {
        const imgElements = document.querySelectorAll('img');
        return Array.from(imgElements)
            .map(img => img.getAttribute('src') || '')
            .filter(src => src.length > 0);
    }
    extractLinks(document) {
        const linkElements = document.querySelectorAll('a[href]');
        return Array.from(linkElements)
            .map(link => link.getAttribute('href') || '')
            .filter(href => href.length > 0);
    }
}
exports.WebsiteAnalyzer = WebsiteAnalyzer;
//# sourceMappingURL=websiteAnalyzer.js.map