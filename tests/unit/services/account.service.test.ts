// Mock dependencies before importing
jest.mock('../../../src/database/connection', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn(),
  },
}));

jest.mock('../../../src/models/account.model', () => ({
  __esModule: true,
  default: {
    findByUserId: jest.fn(),
    findByUserIdForUpdate: jest.fn(),
    findByAccountNumber: jest.fn(),
    findByIdForUpdate: jest.fn(),
    updateBalance: jest.fn(),
  },
}));

jest.mock('../../../src/models/transaction.model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findByAccountId: jest.fn(),
    countByAccountId: jest.fn(),
  },
}));

jest.mock('../../../src/config/environment', () => ({
  config: {
    nodeEnv: 'test',
    port: 3000,
    isProduction: false,
    db: {
      host: 'localhost',
      port: 3306,
      name: 'test_db',
      user: 'test_user',
      password: 'test_pass',
    },
    jwt: {
      secret: 'test-secret-key-at-least-32-characters-long!',
      expiresIn: '1h',
    },
    adjutor: {
      baseUrl: 'https://adjutor.test.com/v2',
      apiKey: 'test-api-key',
    },
    rateLimit: {
      windowMs: 900000,
      maxRequests: 100,
    },
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import AccountService from '../../../src/services/account.service';
import AccountModel from '../../../src/models/account.model';
import TransactionModel from '../../../src/models/transaction.model';
import db from '../../../src/database/connection';
import { ApiError } from '../../../src/utils/ApiError';

describe('AccountService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAccount = {
    id: 1,
    user_id: 1,
    account_number: '2012345678',
    balance: 1000.00,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  describe('getAccount', () => {
    it('should return account details for a valid user', async () => {
      (AccountModel.findByUserId as jest.Mock).mockResolvedValue(mockAccount);

      const result = await AccountService.getAccount(1);

      expect(result).toHaveProperty('account_number', '2012345678');
      expect(result).toHaveProperty('balance', 1000.00);
      expect(result).not.toHaveProperty('user_id'); // Internal field not exposed
    });

    it('should throw 404 if account not found', async () => {
      (AccountModel.findByUserId as jest.Mock).mockResolvedValue(undefined);

      await expect(AccountService.getAccount(999)).rejects.toThrow('Account not found');
    });
  });

  describe('fundAccount', () => {
    it('should successfully fund an account', async () => {
      const mockTrx = jest.fn();
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        (AccountModel.findByUserIdForUpdate as jest.Mock).mockResolvedValue({
          ...mockAccount,
          balance: 500.00,
        });
        (AccountModel.updateBalance as jest.Mock).mockResolvedValue(undefined);
        (TransactionModel.create as jest.Mock).mockResolvedValue(1);
        return callback(mockTrx);
      });

      const result = await AccountService.fundAccount(1, 200.00);

      expect(result.type).toBe('funding');
      expect(result.amount).toBe(200.00);
      expect(result.balance_before).toBe(500.00);
      expect(result.balance_after).toBe(700.00);
      expect(result.status).toBe('completed');
    });

    it('should throw 404 if account not found during funding', async () => {
      const mockTrx = jest.fn();
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        (AccountModel.findByUserIdForUpdate as jest.Mock).mockResolvedValue(undefined);
        return callback(mockTrx);
      });

      await expect(AccountService.fundAccount(999, 200.00)).rejects.toThrow('Account not found');
    });

    it('should calculate balance correctly with decimal amounts', async () => {
      const mockTrx = jest.fn();
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        (AccountModel.findByUserIdForUpdate as jest.Mock).mockResolvedValue({
          ...mockAccount,
          balance: 100.50,
        });
        (AccountModel.updateBalance as jest.Mock).mockResolvedValue(undefined);
        (TransactionModel.create as jest.Mock).mockResolvedValue(1);
        return callback(mockTrx);
      });

      const result = await AccountService.fundAccount(1, 50.75);

      expect(result.balance_after).toBe(151.25);
    });
  });

  describe('withdraw', () => {
    it('should successfully withdraw when balance is sufficient', async () => {
      const mockTrx = jest.fn();
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        (AccountModel.findByUserIdForUpdate as jest.Mock).mockResolvedValue({
          ...mockAccount,
          balance: 1000.00,
        });
        (AccountModel.updateBalance as jest.Mock).mockResolvedValue(undefined);
        (TransactionModel.create as jest.Mock).mockResolvedValue(1);
        return callback(mockTrx);
      });

      const result = await AccountService.withdraw(1, 500.00);

      expect(result.type).toBe('withdrawal');
      expect(result.amount).toBe(500.00);
      expect(result.balance_before).toBe(1000.00);
      expect(result.balance_after).toBe(500.00);
    });

    it('should allow withdrawal of exact balance', async () => {
      const mockTrx = jest.fn();
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        (AccountModel.findByUserIdForUpdate as jest.Mock).mockResolvedValue({
          ...mockAccount,
          balance: 500.00,
        });
        (AccountModel.updateBalance as jest.Mock).mockResolvedValue(undefined);
        (TransactionModel.create as jest.Mock).mockResolvedValue(1);
        return callback(mockTrx);
      });

      const result = await AccountService.withdraw(1, 500.00);

      expect(result.balance_after).toBe(0.00);
    });

    it('should reject withdrawal when balance is insufficient', async () => {
      const mockTrx = jest.fn();
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        (AccountModel.findByUserIdForUpdate as jest.Mock).mockResolvedValue({
          ...mockAccount,
          balance: 100.00,
        });
        return callback(mockTrx);
      });

      await expect(AccountService.withdraw(1, 500.00)).rejects.toThrow('Insufficient balance');
    });

    it('should throw 404 if account not found during withdrawal', async () => {
      const mockTrx = jest.fn();
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        (AccountModel.findByUserIdForUpdate as jest.Mock).mockResolvedValue(undefined);
        return callback(mockTrx);
      });

      await expect(AccountService.withdraw(999, 100.00)).rejects.toThrow('Account not found');
    });
  });

  describe('transfer', () => {
    const recipientAccount = {
      id: 2,
      user_id: 2,
      account_number: '2098765432',
      balance: 500.00,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should successfully transfer between accounts', async () => {
      const mockTrx = jest.fn();
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        (AccountModel.findByUserIdForUpdate as jest.Mock).mockResolvedValue({
          ...mockAccount,
          balance: 1000.00,
        });
        (AccountModel.findByAccountNumber as jest.Mock).mockResolvedValue(recipientAccount);
        (AccountModel.findByIdForUpdate as jest.Mock).mockResolvedValue({
          ...recipientAccount,
          balance: 500.00,
        });
        (AccountModel.updateBalance as jest.Mock).mockResolvedValue(undefined);
        (TransactionModel.create as jest.Mock).mockResolvedValue(1);
        return callback(mockTrx);
      });

      const result = await AccountService.transfer(
        1,
        '2098765432',
        300.00,
        'Test transfer'
      );

      expect(result.type).toBe('transfer');
      expect(result.amount).toBe(300.00);
      expect(result.balance_before).toBe(1000.00);
      expect(result.balance_after).toBe(700.00);
      expect(result.status).toBe('completed');
    });

    it('should create TWO transaction records for a transfer', async () => {
      const mockTrx = jest.fn();
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        (AccountModel.findByUserIdForUpdate as jest.Mock).mockResolvedValue({
          ...mockAccount,
          balance: 1000.00,
        });
        (AccountModel.findByAccountNumber as jest.Mock).mockResolvedValue(recipientAccount);
        (AccountModel.findByIdForUpdate as jest.Mock).mockResolvedValue({
          ...recipientAccount,
          balance: 500.00,
        });
        (AccountModel.updateBalance as jest.Mock).mockResolvedValue(undefined);
        (TransactionModel.create as jest.Mock).mockResolvedValue(1);
        return callback(mockTrx);
      });

      await AccountService.transfer(1, '2098765432', 300.00);

      // Should create 2 records: one debit, one credit
      expect(TransactionModel.create).toHaveBeenCalledTimes(2);
    });

    it('should reject transfer to self', async () => {
      const mockTrx = jest.fn();
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        (AccountModel.findByUserIdForUpdate as jest.Mock).mockResolvedValue(mockAccount);
        (AccountModel.findByAccountNumber as jest.Mock).mockResolvedValue(mockAccount); // Same account!
        return callback(mockTrx);
      });

      await expect(
        AccountService.transfer(1, '2012345678', 100.00)
      ).rejects.toThrow('Cannot transfer to your own account');
    });

    it('should reject transfer when balance is insufficient', async () => {
      const mockTrx = jest.fn();
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        (AccountModel.findByUserIdForUpdate as jest.Mock).mockResolvedValue({
          ...mockAccount,
          balance: 50.00,
        });
        (AccountModel.findByAccountNumber as jest.Mock).mockResolvedValue(recipientAccount);
        (AccountModel.findByIdForUpdate as jest.Mock).mockResolvedValue(recipientAccount);
        return callback(mockTrx);
      });

      await expect(
        AccountService.transfer(1, '2098765432', 500.00)
      ).rejects.toThrow('Insufficient balance');
    });

    it('should reject transfer to non-existent recipient', async () => {
      const mockTrx = jest.fn();
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        (AccountModel.findByUserIdForUpdate as jest.Mock).mockResolvedValue(mockAccount);
        (AccountModel.findByAccountNumber as jest.Mock).mockResolvedValue(undefined);
        return callback(mockTrx);
      });

      await expect(
        AccountService.transfer(1, '9999999999', 100.00)
      ).rejects.toThrow('Recipient account not found');
    });
  });

  describe('getTransactionHistory', () => {
    it('should return paginated transaction history', async () => {
      (AccountModel.findByUserId as jest.Mock).mockResolvedValue(mockAccount);

      const mockTransactions = [
        {
          id: 1,
          reference: 'ref-1',
          type: 'funding',
          amount: 500,
          balance_before: 0,
          balance_after: 500,
          description: 'Funding',
          status: 'completed',
          created_at: new Date(),
        },
      ];

      (TransactionModel.findByAccountId as jest.Mock).mockResolvedValue(mockTransactions);
      (TransactionModel.countByAccountId as jest.Mock).mockResolvedValue(1);

      const result = await AccountService.getTransactionHistory(1, 1, 20);

      expect(result.transactions).toHaveLength(1);
      expect(result.pagination).toHaveProperty('page', 1);
      expect(result.pagination).toHaveProperty('total', 1);
      expect(result.pagination).toHaveProperty('totalPages', 1);
    });

    it('should throw 404 if account not found', async () => {
      (AccountModel.findByUserId as jest.Mock).mockResolvedValue(undefined);

      await expect(
        AccountService.getTransactionHistory(999, 1, 20)
      ).rejects.toThrow('Account not found');
    });
  });
});
