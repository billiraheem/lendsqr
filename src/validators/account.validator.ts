import Joi from 'joi';
import { TRANSACTION_LIMITS } from '../utils';

export const fundAccountSchema = Joi.object({
  amount: Joi.number()
    .required()
    .positive()
    .precision(2)
    .min(TRANSACTION_LIMITS.MIN_AMOUNT)
    .max(TRANSACTION_LIMITS.MAX_AMOUNT)
    .messages({
      'any.required': 'Amount is required',
      'number.positive': 'Amount must be greater than zero',
      'number.min': `Minimum amount is ₦${TRANSACTION_LIMITS.MIN_AMOUNT}`,
      'number.max': `Maximum amount is ₦${TRANSACTION_LIMITS.MAX_AMOUNT.toLocaleString()}`,
    }),
});

export const withdrawSchema = Joi.object({
  amount: Joi.number()
    .required()
    .positive()
    .precision(2)
    .min(TRANSACTION_LIMITS.MIN_AMOUNT)
    .max(TRANSACTION_LIMITS.MAX_AMOUNT)
    .messages({
      'any.required': 'Amount is required',
      'number.positive': 'Amount must be greater than zero',
      'number.min': `Minimum withdrawal is ₦${TRANSACTION_LIMITS.MIN_AMOUNT}`,
      'number.max': `Maximum withdrawal is ₦${TRANSACTION_LIMITS.MAX_AMOUNT.toLocaleString()}`,
    }),
});

export const transferSchema = Joi.object({
  recipient_account_number: Joi.string()
    .required()
    .trim()
    .pattern(/^\d{10}$/)
    .messages({
      'any.required': 'Recipient account number is required',
      'string.pattern.base': 'Recipient account number must be exactly 10 digits',
    }),

  amount: Joi.number()
    .required()
    .positive()
    .precision(2)
    .min(TRANSACTION_LIMITS.MIN_AMOUNT)
    .max(TRANSACTION_LIMITS.MAX_AMOUNT)
    .messages({
      'any.required': 'Amount is required',
      'number.positive': 'Amount must be greater than zero',
      'number.min': `Minimum transfer is ₦${TRANSACTION_LIMITS.MIN_AMOUNT}`,
      'number.max': `Maximum transfer is ₦${TRANSACTION_LIMITS.MAX_AMOUNT.toLocaleString()}`,
    }),

  description: Joi.string()
    .optional()
    .trim()
    .max(255)
    .messages({
      'string.max': 'Description must not exceed 255 characters',
    }),
});
