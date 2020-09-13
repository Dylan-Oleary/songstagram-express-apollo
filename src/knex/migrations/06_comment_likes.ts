import * as Knex from "knex";

exports.up = (knex: Knex): Promise<any> =>
    knex.schema.createTable("comment_likes", (table) => {
        table.increments("likeNo").primary();

        table.integer("userNo").notNullable().unsigned();
        table.foreign("userNo").references("users.userNo");

        table.integer("commentNo").notNullable().unsigned();
        table.foreign("commentNo").references("comments.commentNo");

        table.dateTime("likeDate").notNullable().defaultTo(knex.fn.now());
        table.dateTime("unlikeDate");
    });

exports.down = (knex: Knex) => knex.schema.dropTableIfExists("comment_likes");
