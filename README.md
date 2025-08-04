# Agency Audit API

A REST API that utilizes AI to evaluate websites across multiple criteria and generates comprehensive reports for marketing agencies.

## Features

- 🔍 **Comprehensive Website Analysis**: Evaluates websites across 5 key criteria
- 🤖 **AI-Powered Insights**: Uses AI to provide detailed analysis and recommendations
- 📊 **Scoring System**: Weighted scoring system with overall performance metrics
- 🛡️ **Security & Rate Limiting**: Built-in security measures and rate limiting
- 📈 **Marketing Focus**: Specifically designed for marketing agency needs
- 🚀 **TypeScript**: Full TypeScript support for type safety

## Evaluation Criteria

1. **Value Proposition** (25% weight)
   - Clarity and uniqueness of value proposition
   - Prominence and messaging effectiveness

2. **Features & Benefits** (20% weight)
   - Clear presentation of features
   - Translation to customer benefits

3. **Call-to-Action Analysis** (20% weight)
   - CTA visibility and placement
   - Conversion optimization

4. **SEO Readiness** (20% weight)
   - Meta tags and title optimization
   - Content structure and keywords

5. **Trust Signals** (15% weight)
   - Social proof and testimonials
   - Security indicators and credibility

## Project Structure

```
agency-audit-api/
├── src/
│   ├── controllers/          # Request handlers
│   ├── services/            # Business logic services
│   ├── evaluators/          # AI-powered evaluation modules
│   ├── middleware/          # Express middleware
│   ├── routes/             # API route definitions
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── config/             # Configuration files
│   ├── app.ts              # Express app setup
│   └── server.ts           # Server entry point
├── tests/                  # Test files
├── dist/                   # Compiled JavaScript (generated)
└── ...config files
```

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and setup**:
   ```bash
   cd agency-audit-api
   npm install
   ```

2. **Environment Configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Development**:
   ```bash
   npm run dev
   ```

4. **Production Build**:
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Server
PORT=3000
NODE_ENV=development

# AI Service (choose one)
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4

# Security
JWT_SECRET=your_jwt_secret_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUDIT_RATE_LIMIT_MAX=10
```

## API Endpoints

### Health Check
```
GET /api/health
GET /api/health/status
```

### Website Audit
```
POST /api/audit
```

**Request Body:**
```json
{
  "url": "https://example.com",
  "includeScreenshot": false,
  "customCriteria": ["optional", "custom", "criteria"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "url": "https://example.com",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "overallScore": 85,
    "scores": {
      "valueProposition": 90,
      "featuresAndBenefits": 75,
      "ctaAnalysis": 85,
      "seoReadiness": 80,
      "trustSignals": 95
    },
    "insights": {
      "valueProposition": ["Clear messaging", "..."],
      "featuresAndBenefits": ["Well organized", "..."],
      // ... other criteria
    },
    "recommendations": {
      "valueProposition": ["Improve headline", "..."],
      // ... other criteria  
    },
    "metadata": {
      "analysisTime": 2500,
      "version": "1.0.0"
    }
  }
}
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Clean build directory

## AI Integration

The system is designed to work with multiple AI providers:

- **OpenAI GPT-4** (recommended)
- **Anthropic Claude** (alternative)
- **Mock AI Service** (for development/testing)

Set the `AI_PROVIDER` environment variable to choose your provider.

## Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Audit Endpoint**: 10 audits per hour per IP

## Security Features

- Helmet.js for security headers
- CORS configuration
- Request validation with Joi
- Rate limiting
- Input sanitization
- Error handling middleware

## Development

### Code Quality
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Strict TypeScript configuration

### Testing
```bash
npm test
```

### Contributing
1. Follow the existing code style
2. Add tests for new features
3. Update documentation as needed
4. Run `npm run lint` and `npm run type-check` before committing

## Deployment

1. Build the project: `npm run build`
2. Set production environment variables
3. Start the server: `npm start`

## License

ISC License

## Support

For issues and feature requests, please create an issue in the project repository.