"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CTAAnalysisEvaluator = void 0;
const aiService_1 = require("../services/aiService");
const environment_1 = require("../config/environment");
class CTAAnalysisEvaluator {
    constructor() {
        this.name = 'Call-to-Action Analysis';
        this.aiService = environment_1.config.ai.anthropicApiKey
            ? new aiService_1.ClaudeService(environment_1.config.ai.anthropicApiKey)
            : new aiService_1.MockAIService();
    }
    async evaluate(websiteData) {
        const prompt = `
Analyze the call-to-action (CTA) elements on this website. Consider:

1. Presence and visibility of primary CTAs
2. Clarity and action-oriented language
3. Strategic placement throughout the page
4. Visual design and contrast
5. Logical flow toward conversion

Focus on:
- How many CTAs are present and their prominence
- Whether CTA text is compelling and clear
- Button design, colors, and visual hierarchy
- Placement in relation to value propositions
- Overall conversion optimization
- Forms and lead capture mechanisms

Rate the CTA effectiveness on a scale of 0-100.
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
exports.CTAAnalysisEvaluator = CTAAnalysisEvaluator;
//# sourceMappingURL=ctaAnalysis.js.map