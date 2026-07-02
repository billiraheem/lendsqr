import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '../utils';

export function validate(
  schema: Joi.ObjectSchema,
  property: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,     // Return ALL errors, not just the first one
      stripUnknown: true,    // Remove fields that aren't in the schema
      errors: {
        wrap: {
          label: '',          // Don't wrap field names in quotes
        },
      },
    });

    if (error) {
      // Combine all validation errors into a single message
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join('; ');

      throw ApiError.badRequest(errorMessage);
    }

    req[property] = value;

    next();
  };
}
