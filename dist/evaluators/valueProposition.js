"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValuePropositionEvaluator = void 0;
const aiService_1 = require("../services/aiService");
const environment_1 = require("../config/environment");
const promptTemplates_1 = require("../services/promptTemplates");
class ValuePropositionEvaluator {
    constructor() {
        this.name = 'Value Proposition';
        this.aiService = environment_1.config.ai.anthropicApiKey
            ? new aiService_1.ClaudeService(environment_1.config.ai.anthropicApiKey)
            : new aiService_1.MockAIService();
    }
    async evaluate(websiteData) {
        const industry = (0, promptTemplates_1.detectIndustry)(websiteData);
        const industryGuidance = (0, promptTemplates_1.getIndustryPrompt)(industry, 'valueProposition');
        const enhancedPrompt = `
Analyze the value proposition of this website with industry-specific context.

CORE VALUE PROPOSITION CRITERIA:
1. Clarity of the main value proposition
2. Uniqueness and differentiation from competitors  
3. Relevance to target audience
4. Prominence and placement on the page
5. Supporting evidence and proof points

ANALYSIS FOCUS AREAS:
- How clearly the website communicates what they do
- What makes them different/better than alternatives
- Whether the value is immediately apparent to visitors
- The strength of the headline and supporting copy
- Overall messaging effectiveness
- Industry-specific value communication standards

${industryGuidance ? `
INDUSTRY-SPECIFIC CONSIDERATIONS (${industry}):
${industryGuidance}

Apply these industry standards when evaluating the value proposition.
` : ''}

DETAILED EVALUATION REQUIREMENTS:
- Assess value proposition against industry benchmarks
- Consider target audience expectations for this business type
- Evaluate competitive differentiation within the industry context
- Analyze messaging hierarchy and information architecture
- Review proof points and credibility indicators specific to this industry

Rate the value proposition strength on a scale of 0-100, considering both general best practices and industry-specific requirements.
    `;
        const result = this.aiService instanceof aiService_1.ClaudeService && websiteData.screenshot
            ? await this.aiService.analyzeWithScreenshot(websiteData, this.name, enhancedPrompt)
            : await this.aiService.analyzeWebsite(websiteData, this.name, enhancedPrompt);
        return {
            score: result.score,
            insights: result.insights,
            recommendations: result.recommendations,
        };
    }
}
exports.ValuePropositionEvaluator = ValuePropositionEvaluator;
//# sourceMappingURL=valueProposition.js.map