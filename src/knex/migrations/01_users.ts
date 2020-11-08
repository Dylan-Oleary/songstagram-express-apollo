import * as Knex from "knex";

exports.up = (knex: Knex): Promise<any> =>
    knex.schema.createTable("users", (table) => {
        table.increments("userNo").primary();

        table.string("firstName", 255).notNullable().defaultTo("");
        table.string("lastName", 255).notNullable().defaultTo("");
        table.string("bio", 150).notNullable().defaultTo("");

        table.string("username", 30).notNullable().unique();
        table.string("email", 255).notNullable().unique();
        table.string("password", 255).notNullable();

        table.string("profilePicture", 255).notNullable().defaultTo("");

        table.boolean("isDeleted").defaultTo(false);
        table.boolean("isBanned").defaultTo(false);

        table.dateTime("lastLoginDate");
        table.dateTime("createdDate").notNullable().defaultTo(knex.fn.now());
        table.dateTime("lastUpdated").notNullable().defaultTo(knex.fn.now());
    });

exports.down = (knex: Knex) => knex.schema.dropTableIfExists("users");
