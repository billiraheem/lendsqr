import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('transactions', (table) => {
    table.increments('id').primary();

    table.string('reference', 50).notNullable().unique();

    table
      .integer('account_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('accounts')
      .onDelete('RESTRICT');

    table
      .enum('type', ['funding', 'transfer', 'withdrawal'])
      .notNullable();

    table.decimal('amount', 15, 2).notNullable();

    table.decimal('balance_before', 15, 2).notNullable();
    table.decimal('balance_after', 15, 2).notNullable();

    table.json('metadata').nullable();

    table
      .integer('counterparty_account_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('accounts')
      .onDelete('SET NULL'); // If counterparty account is deleted, keep the record

    table.string('description', 255).nullable();

    // Transaction status 
    table
      .enum('status', ['pending', 'completed', 'failed', 'reversed'])
      .defaultTo('pending')
      .notNullable();

    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    table.index(['account_id', 'created_at'], 'idx_account_transactions');
    table.index(['type'], 'idx_transaction_type');
    table.index(['status'], 'idx_transaction_status');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('transactions');
}
