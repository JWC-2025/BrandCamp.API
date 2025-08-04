import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  ai: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  api: {
    defaultTimeout: parseInt(process.env.DEFAULT_TIMEOUT || '30000', 10),
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '5242880', 10),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};

export default config;