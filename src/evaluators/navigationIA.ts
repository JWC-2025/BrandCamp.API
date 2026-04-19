import { WebsiteData } from '../types/audit';
import { Evaluator, EvaluationResult } from '../types/evaluator';
import { ClaudeService } from '../services/aiService';

export class NavigationIAEvaluator implements Evaluator {
  name = 'Navigation & Information Architecture';
  private aiService: ClaudeService;

  constructor() {
    this.aiService = new ClaudeService();
  }

  async evaluate(websiteData: WebsiteData): Promise<EvaluationResult> {
    const prompt = `
Evaluate the NAVIGATION & INFORMATION ARCHITECTURE of this website (Category 4, weighted 5%).

This category assesses whether the site is logically structured, easy to navigate, and supports a smooth user journey — covering both the top-level navigation (menus, structure) and the on-page experience (how content is grouped, linked, and presented).

Core questions:
- Can a first-time visitor find what they're looking for quickly?
- Does the site feel organized, intuitive, and skimmable?
- Does the structure support exploration that leads to trust and conversion?

SCORING CRITERIA — assess against these key traits:
- Logical menu structure: Menu categories reflect how users think (e.g., Products, Solutions, Resources — not internal jargon like "Our Journey")
- Clear page hierarchy: It's clear where the user is in the site (home → solution → use case)
- Descriptive labels: Menu items and headings use plain, user-friendly language
- Consistent layouts: Similar page types follow consistent templates, avoiding cognitive friction
- Internal linking: Pages link to other relevant pages, guiding users deeper into the site
- Accessible menus: Navigation is reachable from anywhere on the page, especially on mobile

QUESTIONS TO ANSWER WHEN SCORING:
- Is the main navigation immediately visible and clearly organized?
- Are menu labels intuitive to a first-time visitor, or do they use internal/vague naming?
- Can users tell what the company offers from the nav structure alone?
- Is there a clear visual hierarchy on each page (headers, sections, logical flow)?
- Are there in-page links or "next step" prompts that guide exploration?
- Does the page feel skimmable, or is content dumped in walls of text?

COMMON ISSUES TO IDENTIFY:
- Navigation labels that require insider knowledge to understand
- No clear hierarchy — everything feels equally weighted
- Pages that dead-end with no next step or internal link
- Mobile navigation that's broken, hidden, or hard to use
- Too many nav items creating decision paralysis (more than 7 top-level items)
- Poor heading structure — hard to skim or understand page organization

Rate the navigation and information architecture on a scale of 0–100. Cite specific menu labels, page structure observations, or UX patterns you observed.
    `;

    const result = await this.aiService.analyzeWebsite(websiteData, this.name, prompt);

    return {
      score: result.score,
      insights: result.insights,
      recommendations: result.recommendations,
    };
  }
}
