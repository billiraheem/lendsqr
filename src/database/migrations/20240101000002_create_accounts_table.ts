import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('accounts', (table) => {
    table.increments('id').primary();

    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .unique()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table.string('account_number', 20).notNullable().unique();
    table.decimal('balance', 15, 2).defaultTo(0.00).notNullable();

    table.boolean('is_active').defaultTo(true).notNullable();

    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('accounts');
}
