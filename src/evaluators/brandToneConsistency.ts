import { WebsiteData } from '../types/audit';
import { Evaluator, EvaluationResult } from '../types/evaluator';
import { ClaudeService } from '../services/aiService';

export class BrandToneConsistencyEvaluator implements Evaluator {
  name = 'Brand Tone Consistency';
  private aiService: ClaudeService;

  constructor() {
    this.aiService = new ClaudeService();
  }

  async evaluate(websiteData: WebsiteData): Promise<EvaluationResult> {
    const prompt = `
Evaluate the BRAND TONE CONSISTENCY of this website (Category 7, weighted 10%).

The core question: "Is the voice, language, and emotional tone of the site consistent — and does it reinforce the brand's identity and positioning?"

Tone is not just about style — it is a strategic asset that affects persuasion, clarity, and memorability. A consistent tone builds brand credibility and makes the experience feel intentional and polished across every page.

SCORING CRITERIA — assess against these key traits:
- Tone alignment with audience: The voice matches the expectations and emotional triggers of the target persona (e.g., enterprise calm vs. startup energy vs. friendly DTC)
- Consistent voice across pages: Pages sound like they were written by the same brand — not a patchwork of tones from different writers or time periods
- Strategic language use: Word choice reflects key themes, values, or positioning pillars consistently
- Polished & professional: Writing feels clear, intentional, and well-edited — no tone whiplash or sloppy phrasing
- Emotionally appropriate: Tone supports the buying context — warm, empowering, urgent, calm, authoritative, etc., as appropriate

QUESTIONS TO ANSWER WHEN SCORING:
- Does the homepage tone match the tone of the product pages, blog, and about page?
- Is the voice clearly defined — or does it feel generic and interchangeable with any competitor?
- Does the language feel appropriate for the audience (too formal, too casual, or just right)?
- Are there jarring shifts in tone between sections or pages?
- Does the tone reinforce what makes this brand distinctive — or is it tonally neutral and forgettable?
- Is the writing polished and intentional, or does it feel rushed, inconsistent, or unedited?

COMMON ISSUES TO IDENTIFY:
- Homepage is formal and corporate, but blog posts are casual and conversational — no coherent voice
- Generic B2B language ("solutions," "synergies," "leverage") with no distinct personality
- Tone that doesn't match the audience — overly technical for a non-technical buyer, or too casual for enterprise
- Emotional inconsistency — aggressive urgency in one section, passive and dry in another
- Writing that sounds like it was stitched together from multiple sources with no editorial alignment
- No distinctive voice — the brand sounds interchangeable with every competitor in the space

Rate the brand tone consistency on a scale of 0–100. Cite specific language examples, tone contrasts, or voice characteristics you observed across different parts of the site.
    `;

    const result = await this.aiService.analyzeWebsite(websiteData, this.name, prompt);

    return {
      score: result.score,
      insights: result.insights,
      recommendations: result.recommendations,
    };
  }
}
