export const BCRYPT_SALT_ROUNDS = 12;

export const TRANSACTION_TYPE = {
  FUNDING: 'funding',
  TRANSFER: 'transfer',
  WITHDRAWAL: 'withdrawal',
} as const;

export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REVERSED: 'reversed',
} as const;

export const TABLE_NAMES = {
  USERS: 'users',
  ACCOUNTS: 'accounts',
  TRANSACTIONS: 'transactions',
} as const;


export const TRANSACTION_LIMITS = {
  MIN_AMOUNT: 1.00,
  MAX_AMOUNT: 10000000.00,
} as const;
