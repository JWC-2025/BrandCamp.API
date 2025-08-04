"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEOReadinessEvaluator = void 0;
const aiService_1 = require("../services/aiService");
const environment_1 = require("../config/environment");
class SEOReadinessEvaluator {
    constructor() {
        this.name = 'SEO Readiness';
        this.aiService = environment_1.config.ai.anthropicApiKey
            ? new aiService_1.ClaudeService(environment_1.config.ai.anthropicApiKey)
            : new aiService_1.MockAIService();
    }
    async evaluate(websiteData) {
        const prompt = `
Analyze the SEO readiness of this website. Consider:

1. Title tag optimization and relevance
2. Meta description quality and length
3. Header tag structure (H1, H2, etc.)
4. Content quality and keyword usage
5. Technical SEO elements

Focus on:
- Title tag effectiveness (length, keywords, uniqueness)
- Meta description compelling nature and call-to-action
- Proper header hierarchy and keyword usage
- Content readability and structure
- Image alt attributes and optimization
- Overall on-page SEO best practices

Rate the SEO readiness on a scale of 0-100.

Available data:
- Title: ${websiteData.metadata.title}
- Meta Description: ${websiteData.metadata.description}
- H1 Tags: ${websiteData.metadata.h1Tags.join(', ')}
- Keywords: ${websiteData.metadata.keywords.join(', ')}
- Number of Images: ${websiteData.metadata.images.length}
    `;
        const result = this.aiService instanceof aiService_1.ClaudeService && websiteData.screenshot
            ? await this.aiService.analyzeWithScreenshot(websiteData, this.name, prompt)
            : await this.aiService.analyzeWebsite(websiteData, this.name, prompt);
        return {
            score: result.score,
            insights: result.insights,
            recommendations: result.recommendations,
        };
    }
}
exports.SEOReadinessEvaluator = SEOReadinessEvaluator;
//# sourceMappingURL=seoReadiness.js.map