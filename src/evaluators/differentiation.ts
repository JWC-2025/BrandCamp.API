import { WebsiteData } from '../types/audit';
import { Evaluator, EvaluationResult } from '../types/evaluator';
import { ClaudeService } from '../services/aiService';

export class DifferentiationEvaluator implements Evaluator {
  name = 'Differentiation';
  private aiService: ClaudeService;

  constructor() {
    this.aiService = new ClaudeService();
  }

  async evaluate(websiteData: WebsiteData): Promise<EvaluationResult> {
    const prompt = `
Evaluate the DIFFERENTIATION of this website (Category 10, weighted 10%).

The core question: "Is it clear what makes this company meaningfully different from competitors or alternatives — and is that difference reinforced across the site?"

It's not enough to say "we're good" or "we're better." The site must articulate a specific, credible reason why this company is the right choice over direct competitors, indirect alternatives (DIY, workarounds), or the status quo. Differentiation should be relevant, credible, and consistently reinforced.

SCORING CRITERIA — assess against these key traits:
- Unique promise or angle: The company offers a meaningful benefit or POV that competitors don't claim
- Comparison language: Explicit or implied contrasts that help buyers understand the advantage (e.g., "Unlike legacy tools…", "The only platform that…")
- Positioning proof: Specific claims backed by testimonials, metrics, awards, or use cases — not just assertions
- Category framing: The company reframes the market or category to its advantage ("The first X built for Y")
- Consistency: The differentiating message is reinforced across homepage, product pages, about page, and content — not mentioned once and forgotten
- Clarity over cliché: Avoids meaningless filler like "best-in-class service," "scalable solutions," or "innovative approach" with no supporting specifics

QUESTIONS TO ANSWER WHEN SCORING:
- Can I articulate in one sentence what makes this company different from its competitors?
- Does the site explain WHY this company is a better choice than the alternatives?
- Is differentiation specific and backed by evidence — or just asserted without proof?
- Is the differentiating message present across multiple pages, or buried in one line on the about page?
- Does the copy avoid generic superlatives and instead make concrete, believable claims?
- Would a buyer who just visited a competitor's site understand why to choose this one instead?

COMMON ISSUES TO IDENTIFY:
- No differentiation stated anywhere — the site describes what they do but not why they're better
- Differentiation is generic ("we care more," "we're more experienced") with no supporting proof
- Claims like "industry-leading," "world-class," or "best-in-class" with nothing to back them up
- Differentiation mentioned once in the about page but absent from the homepage and product pages
- The company's unique angle exists but is buried — not surfaced in headlines or hero sections
- Positioning that's identical to every competitor in the space

Rate the differentiation on a scale of 0–100. Cite specific claims, positioning language, or comparison copy (or their absence) that influenced your score.
    `;

    const result = await this.aiService.analyzeWebsite(websiteData, this.name, prompt);

    return {
      score: result.score,
      insights: result.insights,
      recommendations: result.recommendations,
    };
  }
}
