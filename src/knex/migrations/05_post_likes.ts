import * as Knex from "knex";

exports.up = (knex: Knex): Promise<any> =>
    knex.schema.createTable("post_likes", (table) => {
        table.increments("likeNo").primary();

        table.integer("userNo").notNullable().unsigned();
        table.foreign("userNo").references("users.userNo");

        table.integer("postNo").notNullable().unsigned();
        table.foreign("postNo").references("posts.postNo");

        table.dateTime("likeDate").notNullable().defaultTo(knex.fn.now());
        table.dateTime("unlikeDate");
    });

exports.down = (knex: Knex) => knex.schema.dropTableIfExists("post_likes");
