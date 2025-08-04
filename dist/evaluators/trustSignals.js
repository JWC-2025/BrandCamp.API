"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustSignalsEvaluator = void 0;
const aiService_1 = require("../services/aiService");
const environment_1 = require("../config/environment");
class TrustSignalsEvaluator {
    constructor() {
        this.name = 'Trust Signals';
        this.aiService = environment_1.config.ai.anthropicApiKey
            ? new aiService_1.ClaudeService(environment_1.config.ai.anthropicApiKey)
            : new aiService_1.MockAIService();
    }
    async evaluate(websiteData) {
        const prompt = `
Analyze the trust signals and credibility indicators on this website. Consider:

1. Social proof elements (testimonials, reviews, case studies)
2. Security and privacy indicators
3. Professional design and branding
4. Contact information and transparency
5. Awards, certifications, or badges

Focus on:
- Customer testimonials and success stories
- Security badges and SSL indicators
- Professional appearance and design quality
- Clear contact information and company details
- Industry certifications or awards
- Privacy policy and terms of service
- Social media presence indicators
- Trust badges and security certifications

Rate the trust signals effectiveness on a scale of 0-100.
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
exports.TrustSignalsEvaluator = TrustSignalsEvaluator;
//# sourceMappingURL=trustSignals.js.map