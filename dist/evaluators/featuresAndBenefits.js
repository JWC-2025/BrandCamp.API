"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeaturesAndBenefitsEvaluator = void 0;
const aiService_1 = require("../services/aiService");
const environment_1 = require("../config/environment");
class FeaturesAndBenefitsEvaluator {
    constructor() {
        this.name = 'Features and Benefits';
        this.aiService = environment_1.config.ai.anthropicApiKey
            ? new aiService_1.ClaudeService(environment_1.config.ai.anthropicApiKey)
            : new aiService_1.MockAIService();
    }
    async evaluate(websiteData) {
        const prompt = `
Analyze how well this website presents its features and benefits. Consider:

1. Clear presentation of key features
2. Translation of features into customer benefits
3. Organization and readability of feature/benefit content
4. Use of supporting visuals or examples
5. Logical flow and hierarchy of information

Focus on:
- Whether features are clearly explained
- How well features are connected to customer value/benefits
- Visual presentation and scannability
- Completeness of information
- Persuasiveness of benefit messaging

Rate the features and benefits presentation on a scale of 0-100.
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
exports.FeaturesAndBenefitsEvaluator = FeaturesAndBenefitsEvaluator;
//# sourceMappingURL=featuresAndBenefits.js.map