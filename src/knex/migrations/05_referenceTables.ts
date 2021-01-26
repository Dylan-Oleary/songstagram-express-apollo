import * as Knex from "knex";

exports.up = (knex: Knex): Promise<any> =>
    knex.schema.createTable("referenceTables", (table) => {
        table.string("tableName", 50).notNullable().unique();
    });

exports.down = (knex: Knex) => knex.schema.dropTableIfExists("referenceTables");
