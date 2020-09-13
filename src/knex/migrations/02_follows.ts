import * as Knex from "knex";

exports.up = (knex: Knex): Promise<any> =>
    knex.schema.createTable("follows", (table) => {
        table.increments("followNo").primary();

        table.integer("userNo").notNullable().unsigned();
        table.foreign("userNo").references("users.userNo");

        table.integer("followerUserNo").notNullable().unsigned();
        table.foreign("followerUserNo").references("users.userNo");

        table.dateTime("followDate").notNullable().defaultTo(knex.fn.now());
        table.dateTime("unfollowDate");
    });

exports.down = (knex: Knex) => knex.schema.dropTableIfExists("follows");
