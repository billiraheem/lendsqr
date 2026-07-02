import { v4 as uuidv4 } from 'uuid';
import { AccountModel, TransactionModel } from '../models';
import {
  IAccountResponse,
  ITransactionResponse,
} from '../interfaces';
import {
  ApiError,
  logger,
  TRANSACTION_TYPE,
  TRANSACTION_STATUS,
} from '../utils';
import db from '../database/connection';

class AccountService {
  async getAccount(userId: number): Promise<IAccountResponse> {
    const account = await AccountModel.findByUserId(userId);

    if (!account) {
      throw ApiError.notFound('Account not found');
    }

    return this.formatAccountResponse(account);
  }
  async fundAccount(
    userId: number,
    amount: number
  ): Promise<ITransactionResponse> {
    const reference = uuidv4();

    const transaction = await db.transaction(async (trx) => {
      const account = await AccountModel.findByUserIdForUpdate(userId, trx);

      if (!account) {
        throw ApiError.notFound('Account not found');
      }

      const balanceBefore = Number(account.balance);
      const balanceAfter = Number((balanceBefore + amount).toFixed(2));

      await AccountModel.updateBalance(account.id, balanceAfter, trx);

      const transactionId = await TransactionModel.create(
        {
          reference,
          account_id: account.id,
          type: TRANSACTION_TYPE.FUNDING,
          amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          status: TRANSACTION_STATUS.COMPLETED,
          description: 'Account funding',
        },
        trx
      );

      return {
        id: transactionId,
        reference,
        type: TRANSACTION_TYPE.FUNDING,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        description: 'Account funding',
        status: TRANSACTION_STATUS.COMPLETED,
        created_at: new Date(),
      };
    });

    logger.info('Account funded successfully', {
      userId,
      amount,
      reference,
    });

    return transaction;
  }

  async withdraw(
    userId: number,
    amount: number
  ): Promise<ITransactionResponse> {
    const reference = uuidv4();

    const transaction = await db.transaction(async (trx) => {
      // Lock the account
      const account = await AccountModel.findByUserIdForUpdate(userId, trx);

      if (!account) {
        throw ApiError.notFound('Account not found');
      }

      const balanceBefore = Number(account.balance);

      // Check sufficient balance AFTER locking
      if (balanceBefore < amount) {
        throw ApiError.badRequest(
          `Insufficient balance. Available: ₦${balanceBefore.toFixed(2)}`
        );
      }

      const balanceAfter = Number((balanceBefore - amount).toFixed(2));

      // Update balance
      await AccountModel.updateBalance(account.id, balanceAfter, trx);

      // Create transaction record
      const transactionId = await TransactionModel.create(
        {
          reference,
          account_id: account.id,
          type: TRANSACTION_TYPE.WITHDRAWAL,
          amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          status: TRANSACTION_STATUS.COMPLETED,
          description: 'Account withdrawal',
        },
        trx
      );

      return {
        id: transactionId,
        reference,
        type: TRANSACTION_TYPE.WITHDRAWAL,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        description: 'Account withdrawal',
        status: TRANSACTION_STATUS.COMPLETED,
        created_at: new Date(),
      };
    });

    logger.info('Withdrawal completed', {
      userId,
      amount,
      reference,
    });

    return transaction;
  }

  async transfer(
    userId: number,
    recipientAccountNumber: string,
    amount: number,
    description?: string
  ): Promise<ITransactionResponse> {
    const reference = uuidv4();

    const transaction = await db.transaction(async (trx) => {
      const senderAccount = await AccountModel.findByUserIdForUpdate(userId, trx);
      if (!senderAccount) {
        throw ApiError.notFound('Your account was not found');
      }

      const recipientAccount = await AccountModel.findByAccountNumber(recipientAccountNumber);
      if (!recipientAccount) {
        throw ApiError.notFound('Recipient account not found');
      }

      if (senderAccount.id === recipientAccount.id) {
        throw ApiError.badRequest('Cannot transfer to your own account');
      }

      const recipientLocked = await AccountModel.findByIdForUpdate(
        recipientAccount.id,
        trx
      );

      if (!recipientLocked) {
        throw ApiError.notFound('Recipient account not found');
      }

      // Check sender has sufficient balance
      const senderBalanceBefore = Number(senderAccount.balance);
      if (senderBalanceBefore < amount) {
        throw ApiError.badRequest(
          `Insufficient balance. Available: ₦${senderBalanceBefore.toFixed(2)}`
        );
      }

      // Calculate new balances
      const senderBalanceAfter = Number((senderBalanceBefore - amount).toFixed(2));
      const recipientBalanceBefore = Number(recipientLocked.balance);
      const recipientBalanceAfter = Number((recipientBalanceBefore + amount).toFixed(2));

      // Update both balances
      await AccountModel.updateBalance(senderAccount.id, senderBalanceAfter, trx);
      await AccountModel.updateBalance(recipientLocked.id, recipientBalanceAfter, trx);

      // Create transaction record for sender (debit)
      const transferDescription = description || `Transfer to ${recipientAccountNumber}`;
      const senderTransactionId = await TransactionModel.create(
        {
          reference,
          account_id: senderAccount.id,
          type: TRANSACTION_TYPE.TRANSFER,
          amount,
          balance_before: senderBalanceBefore,
          balance_after: senderBalanceAfter,
          counterparty_account_id: recipientLocked.id,
          status: TRANSACTION_STATUS.COMPLETED,
          description: transferDescription,
          metadata: { direction: 'outgoing', recipient_account: recipientAccountNumber },
        },
        trx
      );

      // Create transaction record for receiver (credit)
      await TransactionModel.create(
        {
          reference: uuidv4(), // Different reference for the credit side
          account_id: recipientLocked.id,
          type: TRANSACTION_TYPE.TRANSFER,
          amount,
          balance_before: recipientBalanceBefore,
          balance_after: recipientBalanceAfter,
          counterparty_account_id: senderAccount.id,
          status: TRANSACTION_STATUS.COMPLETED,
          description: `Transfer from ${senderAccount.account_number}`,
          metadata: { direction: 'incoming', sender_account: senderAccount.account_number },
        },
        trx
      );

      return {
        id: senderTransactionId,
        reference,
        type: TRANSACTION_TYPE.TRANSFER,
        amount,
        balance_before: senderBalanceBefore,
        balance_after: senderBalanceAfter,
        description: transferDescription,
        status: TRANSACTION_STATUS.COMPLETED,
        created_at: new Date(),
      };
    });

    logger.info('Transfer completed', {
      userId,
      recipientAccount: recipientAccountNumber,
      amount,
      reference,
    });

    return transaction;
  }

  async getTransactionHistory(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    transactions: ITransactionResponse[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const account = await AccountModel.findByUserId(userId);

    if (!account) {
      throw ApiError.notFound('Account not found');
    }

    const offset = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      TransactionModel.findByAccountId(account.id, limit, offset),
      TransactionModel.countByAccountId(account.id),
    ]);

    return {
      transactions: transactions.map((txn) => ({
        id: txn.id,
        reference: txn.reference,
        type: txn.type,
        amount: Number(txn.amount),
        balance_before: Number(txn.balance_before),
        balance_after: Number(txn.balance_after),
        description: txn.description,
        status: txn.status,
        created_at: txn.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private formatAccountResponse(account: {
    id: number;
    account_number: string;
    balance: number;
    is_active: boolean;
    created_at: Date;
  }): IAccountResponse {
    return {
      id: account.id,
      account_number: account.account_number,
      balance: Number(account.balance),
      is_active: account.is_active,
      created_at: account.created_at,
    };
  }
}

export default new AccountService();
