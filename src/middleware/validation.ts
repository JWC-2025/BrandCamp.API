import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './errorHandler';

export const validateAuditRequest = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const schema = Joi.object({
    url: Joi.string()
      .uri({ scheme: ['http', 'https'] })
      .required()
      .messages({
        'string.uri': 'URL must be a valid HTTP or HTTPS URL',
        'any.required': 'URL is required',
      }),
    includeScreenshot: Joi.boolean().optional().default(false),
    format: Joi.string().optional(),
    customCriteria: Joi.array().items(Joi.string()).optional(),
  });

  const { error, value } = schema.validate(req.body);

  if (error) {
    const appError: AppError = new Error(error.details[0].message);
    appError.statusCode = 400;
    appError.isOperational = true;
    return next(appError);
  }

  req.body = value;
  next();
};