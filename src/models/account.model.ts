import { Knex } from 'knex';
import db from '../database/connection';
import { IAccount } from '../interfaces';
import { TABLE_NAMES } from '../utils';

class AccountModel {
  private table = TABLE_NAMES.ACCOUNTS;

  async create(
    accountData: {
      user_id: number;
      account_number: string;
    },
    trx: Knex.Transaction
  ): Promise<number> {
    const [id] = await trx(this.table).insert({
      ...accountData,
      balance: 0.00,
    });
    return id;
  }

  async findByUserId(userId: number): Promise<IAccount | undefined> {
    return db(this.table)
      .where({ user_id: userId, is_active: true })
      .first();
  }

  async findByAccountNumber(accountNumber: string): Promise<IAccount | undefined> {
    return db(this.table)
      .where({ account_number: accountNumber, is_active: true })
      .first();
  }

  async findByIdForUpdate(
    id: number,
    trx: Knex.Transaction
  ): Promise<IAccount | undefined> {
    return trx(this.table)
      .where({ id, is_active: true })
      .forUpdate()
      .first();
  }


  async findByUserIdForUpdate(
    userId: number,
    trx: Knex.Transaction
  ): Promise<IAccount | undefined> {
    return trx(this.table)
      .where({ user_id: userId, is_active: true })
      .forUpdate()
      .first();
  }

  async updateBalance(
    id: number,
    newBalance: number,
    trx: Knex.Transaction
  ): Promise<void> {
    await trx(this.table)
      .where({ id })
      .update({
        balance: newBalance,
        updated_at: trx.fn.now(),
      });
  }
}

export default new AccountModel();
