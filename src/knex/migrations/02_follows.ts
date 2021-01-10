import * as Knex from "knex";

exports.up = (knex: Knex): Promise<any> =>
    knex.schema.createTable("follows", (table) => {
        table.increments("followNo").primary();

        table.integer("userNo").notNullable().unsigned();
        table.foreign("userNo").references("users.userNo");

        table.integer("followerUserNo").notNullable().unsigned();
        table.foreign("followerUserNo").references("users.userNo");

        table.boolean("isFollowing").defaultTo(true);

        table.dateTime("followDate").notNullable().defaultTo(knex.fn.now());
        table.dateTime("unfollowDate").nullable();

        table.dateTime("createdDate").notNullable().defaultTo(knex.fn.now());
        table.dateTime("lastUpdated").notNullable().defaultTo(knex.fn.now());
    });

exports.down = (knex: Knex) => knex.schema.dropTableIfExists("follows");
