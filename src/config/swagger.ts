import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Marketing Agency Audit API',
      version: '1.0.0',
      description: 'Marketing Agency Website Audit Platform API - Evaluates websites across multiple criteria using AI and generates reports for marketing agencies',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' ? 'https://your-api-domain.com' : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
            },
            status: {
              type: 'number',
            },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'OK',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            uptime: {
              type: 'number',
              description: 'Server uptime in seconds',
            },
          },
        },
        AuditRequest: {
          type: 'object',
          required: ['url'],
          properties: {
            url: {
              type: 'string',
              format: 'uri',
              description: 'The URL of the website to audit',
              example: 'https://example.com',
            },
            includeScreenshot: {
              type: 'boolean',
              description: 'Whether to include a screenshot in the audit',
              default: false,
            },
            customCriteria: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Custom criteria to include in the audit',
            },
          },
        },
        AuditResult: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the audit',
            },
            url: {
              type: 'string',
              description: 'The audited website URL',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'When the audit was performed',
            },
            overallScore: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Overall audit score (0-100)',
            },
            scores: {
              type: 'object',
              properties: {
                valueProposition: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                },
                featuresAndBenefits: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                },
                ctaAnalysis: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                },
                seoReadiness: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                },
                trustSignals: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                },
              },
            },
            insights: {
              type: 'object',
              properties: {
                valueProposition: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
                featuresAndBenefits: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
                ctaAnalysis: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
                seoReadiness: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
                trustSignals: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              },
            },
            recommendations: {
              type: 'object',
              properties: {
                valueProposition: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
                featuresAndBenefits: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
                ctaAnalysis: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
                seoReadiness: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
                trustSignals: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              },
            },
            screenshot: {
              type: 'string',
              description: 'Base64 encoded screenshot (if requested)',
            },
            metadata: {
              type: 'object',
              properties: {
                analysisTime: {
                  type: 'number',
                  description: 'Time taken to analyze in milliseconds',
                },
                version: {
                  type: 'string',
                  description: 'API version used for analysis',
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const specs = swaggerJSDoc(options);

export default specs;