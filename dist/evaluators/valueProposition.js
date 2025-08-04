"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValuePropositionEvaluator = void 0;
const aiService_1 = require("../services/aiService");
const environment_1 = require("../config/environment");
class ValuePropositionEvaluator {
    constructor() {
        this.name = 'Value Proposition';
        this.aiService = environment_1.config.ai.anthropicApiKey
            ? new aiService_1.ClaudeService(environment_1.config.ai.anthropicApiKey)
            : new aiService_1.MockAIService();
    }
    async evaluate(websiteData) {
        const prompt = `
Analyze the value proposition of this website. Consider the following criteria:

1. Clarity of the main value proposition
2. Uniqueness and differentiation from competitors
3. Relevance to target audience
4. Prominence and placement on the page
5. Supporting evidence and proof points

Focus on:
- How clearly the website communicates what they do
- What makes them different/better than alternatives
- Whether the value is immediately apparent to visitors
- The strength of the headline and supporting copy
- Overall messaging effectiveness

Rate the value proposition strength on a scale of 0-100.
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
exports.ValuePropositionEvaluator = ValuePropositionEvaluator;
//# sourceMappingURL=valueProposition.js.map