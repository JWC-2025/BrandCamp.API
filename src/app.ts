import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import { errorHandler } from './middleware/errorHandler';
import auditRoutes from './routes/audit';
import healthRoutes from './routes/health';
import swaggerSpecs from './config/swagger';

dotenv.config();

const app = express();

// Trust proxy for Vercel and other reverse proxies
app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(morgan('combined'));
// Timeout middleware for serverless functions
app.use((_req, res, next) => {
  // Set timeout to 25 seconds (less than Vercel's 30s limit)
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({ 
        error: 'Request timeout',
        message: 'The request took too long to process' 
      });
    }
  }, 25000);
  
  // Clear timeout when response is finished
  res.on('finish', () => clearTimeout(timeout));
  res.on('close', () => clearTimeout(timeout));
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

// Root route
app.get('/', (_req, res) => {
  res.json({
    name: 'Agency Audit API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      audit: '/api/audit',
      docs: '/api-docs'
    }
  });
});

app.use('/api/health', healthRoutes);
app.use('/api/audit', auditRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

app.use(errorHandler);

export default app;