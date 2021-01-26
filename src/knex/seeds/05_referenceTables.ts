import * as Knex from "knex";

exports.seed = (knex: Knex) => {
    return knex("referenceTables")
        .del()
        .then(() => {
            return knex("referenceTables").insert([
                {
                    tableName: "posts"
                },
                {
                    tableName: "comments"
                }
            ]);
        });
};
