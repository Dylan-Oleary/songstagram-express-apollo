import * as Knex from "knex";

exports.up = (knex: Knex): Promise<any> =>
    knex.schema.createTable("likes", (table) => {
        table.increments("likeNo").primary();

        table.integer("userNo").notNullable().unsigned();
        table.foreign("userNo").references("users.userNo");

        table.string("referenceTable", 50).notNullable();
        table.foreign("referenceTable").references("referenceTables.tableName");

        table.integer("referenceNo").unsigned().notNullable();

        table.boolean("isActive").defaultTo(true);

        table.dateTime("createdDate").notNullable().defaultTo(knex.fn.now());
        table.dateTime("lastUpdated").notNullable().defaultTo(knex.fn.now());
    });

exports.down = (knex: Knex) => knex.schema.dropTableIfExists("likes");
