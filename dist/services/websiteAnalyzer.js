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
class WebsiteAnalyzer {
    constructor() {
    }
    async analyze(url, includeScreenshot = false) {
        try {
            logger_1.logger.info(`Starting basic website analysis for: ${url}`);
            const websiteData = await this.getBasicWebsiteData(url);
            if (includeScreenshot) {
                websiteData.screenshot = Buffer.from('basic-analysis-placeholder', 'utf8');
            }
            logger_1.logger.info(`Basic website analysis completed for: ${url}`);
            return websiteData;
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