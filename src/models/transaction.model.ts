import { Knex } from 'knex';
import db from '../database/connection';
import { ITransaction, ICreateTransactionDTO } from '../interfaces';
import { TABLE_NAMES } from '../utils';

class TransactionModel {
  private table = TABLE_NAMES.TRANSACTIONS;

  async create(
    data: ICreateTransactionDTO,
    trx: Knex.Transaction
  ): Promise<number> {
    const [id] = await trx(this.table).insert(data);
    return id;
  }

  async findByReference(reference: string): Promise<ITransaction | undefined> {
    return db(this.table)
      .where({ reference })
      .first();
  }

  async findByAccountId(
    accountId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<ITransaction[]> {
    return db(this.table)
      .where({ account_id: accountId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  async countByAccountId(accountId: number): Promise<number> {
    const result = await db(this.table)
      .where({ account_id: accountId })
      .count('id as count')
      .first();
    return (result?.count as number) || 0;
  }
}

export default new TransactionModel();