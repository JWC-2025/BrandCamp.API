# OpenAI Integration Guide

## Overview
The BrandCamp API has been upgraded to use OpenAI's GPT-4o-mini model for website analysis with full Playwright MCP screenshot integration.

## Features

### 🤖 OpenAI Service
- **GPT-4o-mini model** for faster, cost-effective analysis
- **Multimodal analysis** with screenshot support
- **Enhanced prompts** including performance metrics, SEO data, and accessibility scores
- **Automatic fallback** to MockAI service when no API key is provided

### 🖼️ Screenshot Analysis
- Screenshots captured via Playwright MCP
- Visual analysis combined with HTML/metadata analysis
- Enhanced insights from actual rendered content

### 📊 Enhanced Data Analysis
The AI now receives comprehensive data including:
- **Performance Metrics**: Core Web Vitals (LCP, FID, CLS), loading times, network data
- **SEO Analysis**: Structured data, meta tags, heading structure
- **Accessibility Scores**: Automated accessibility issue detection
- **Real Browser Data**: Live DOM analysis via Playwright

## Configuration

### Environment Variables
Create a `.env` file based on `.env.example`:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration  
PORT=3000
NODE_ENV=development
```

### Service Selection
The system automatically chooses the appropriate AI service:
- **With OPENAI_API_KEY**: Uses OpenAIService with GPT-4o-mini
- **Without API key**: Falls back to MockAIService for development

## Usage

### Basic Analysis
```typescript
import { OpenAIService } from './services/aiService';

const aiService = new OpenAIService();
const result = await aiService.analyzeWebsite(websiteData, 'Value Proposition', prompt);
```

### Screenshot Analysis
```typescript
// If websiteData contains a screenshot, analysis will be multimodal
const result = await aiService.analyzeWithScreenshot(websiteData, 'CTA Analysis', prompt);
```

## API Response Structure
```json
{
  "score": 85,
  "insights": [
    "Strong value proposition clearly communicated",
    "Good use of visual hierarchy",
    "Loading performance could be optimized"
  ],
  "recommendations": [
    "Consider adding social proof elements",
    "Optimize images for faster loading",
    "Add structured data for better SEO"
  ]
}
```

## Benefits

1. **More Accurate Analysis**: Real browser rendering + AI vision
2. **Performance Insights**: Core Web Vitals and loading metrics included
3. **Visual Analysis**: Screenshots provide layout and design insights
4. **Cost Effective**: GPT-4o-mini provides excellent quality at lower cost
5. **Graceful Degradation**: Falls back to mock service without API key

## Implementation Complete ✅

All evaluators now support:
- ✅ OpenAI GPT-4o-mini integration
- ✅ Screenshot-based visual analysis  
- ✅ Enhanced performance data prompts
- ✅ Automatic service selection
- ✅ Error handling and fallbacks