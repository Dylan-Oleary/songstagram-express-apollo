import * as Knex from "knex";

const commentsSeed = [
    {
        userNo: 3,
        postNo: 1,
        body: "I love this tune!"
    },
    {
        userNo: 1,
        postNo: 1,
        parentCommentNo: 1,
        body: "Thanks!"
    }
];

exports.seed = (knex: Knex) => {
    return knex("comments")
        .del()
        .then(() => {
            return knex("comments").insert(commentsSeed);
        });
};
