import * as Knex from "knex";

exports.up = (knex: Knex): Promise<any> =>
    knex.schema.createTable("comments", (table) => {
        table.increments("commentNo").primary();

        table.integer("parentCommentNo").unsigned();
        table.foreign("parentCommentNo").references("comments.commentNo");

        table.integer("userNo").notNullable().unsigned();
        table.foreign("userNo").references("users.userNo");

        table.integer("postNo").notNullable().unsigned();
        table.foreign("postNo").references("posts.postNo");

        table.string("body", 500).notNullable().defaultTo("");

        table.boolean("isDeleted").defaultTo(false);
        table.dateTime("createdDate").notNullable().defaultTo(knex.fn.now());
    });

exports.down = (knex: Knex) => knex.schema.dropTableIfExists("comments");
