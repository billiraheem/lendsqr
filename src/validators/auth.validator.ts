import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string()
    .email()                          // Must be a valid email format
    .required()
    .lowercase()                      // Normalize to lowercase
    .trim()                           // Remove leading/trailing whitespace
    .max(255)
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),

  first_name: Joi.string()
    .required()
    .trim()
    .min(2)                           // Names should be at least 2 characters
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)       // Only letters, spaces, hyphens, apostrophes
    .messages({
      'any.required': 'First name is required',
      'string.min': 'First name must be at least 2 characters',
      'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes',
    }),

  last_name: Joi.string()
    .required()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .messages({
      'any.required': 'Last name is required',
      'string.min': 'Last name must be at least 2 characters',
      'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes',
    }),

  password: Joi.string()
    .required()
    .min(8)                           // Minimum 8 characters — industry standard
    .max(128)                         // Max to prevent DOS via extremely long passwords
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
    .messages({
      'any.required': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
});
