import * as Knex from "knex";

exports.up = (knex: Knex): Promise<any> =>
    knex.schema.createTable("posts", (table) => {
        table.increments("postNo").primary();

        table.integer("userNo").notNullable().unsigned();
        table.foreign("userNo").references("users.userNo");

        table.string("body", 2500).notNullable().defaultTo("");
        table.string("spotifyTrackId").notNullable();

        table.boolean("isEdited").defaultTo(false);
        table.boolean("isDeleted").defaultTo(false);

        table.dateTime("createdDate").notNullable().defaultTo(knex.fn.now());
        table.dateTime("lastUpdated").notNullable().defaultTo(knex.fn.now());
    });

exports.down = (knex: Knex) => knex.schema.dropTableIfExists("posts");
