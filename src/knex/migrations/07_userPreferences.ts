import * as Knex from "knex";

exports.up = (knex: Knex): Promise<any> =>
    knex.schema.createTable("userPreferences", (table) => {
        table.increments("userPreferenceNo").primary();

        table.integer("userNo").notNullable().unsigned().unique();
        table.foreign("userNo").references("users.userNo");

        table.boolean("darkMode").defaultTo(false);
        table.boolean("isDeleted").defaultTo(false);
        table.dateTime("lastUpdated").notNullable().defaultTo(knex.fn.now());
    });

exports.down = (knex: Knex) => knex.schema.dropTableIfExists("userPreferences");
