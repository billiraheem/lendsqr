import { Knex } from 'knex';
import db from '../database/connection';
import { IUser, ICreateUserDTO } from '../interfaces';
import { TABLE_NAMES } from '../utils';

class UserModel {
  private table = TABLE_NAMES.USERS;

  async create(
    userData: {
      email: string;
      first_name: string;
      last_name: string;
      password_hash: string;
    },
    trx?: Knex.Transaction
  ): Promise<number> {
    const query = trx ? trx(this.table) : db(this.table);
    const [id] = await query.insert(userData);
    return id;
  }

  async findByEmail(email: string): Promise<IUser | undefined> {
    return db(this.table)
      .where({ email })
      .first();
  }

  async findById(id: number): Promise<IUser | undefined> {
    return db(this.table)
      .where({ id })
      .first();
  }

  async existsByEmail(email: string): Promise<boolean> {
    const result = await db(this.table)
      .where({ email })
      .count('id as count')
      .first();
    return (result?.count as number) > 0;
  }
}

export default new UserModel();
