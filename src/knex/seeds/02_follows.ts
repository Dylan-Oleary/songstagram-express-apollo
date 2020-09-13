import * as Knex from "knex";

const followsSeed = [
    {
        userNo: 1,
        followerUserNo: 2
    },
    {
        userNo: 1,
        followerUserNo: 3
    }
];

exports.seed = (knex: Knex) => {
    return knex("follows")
        .del()
        .then(() => {
            return knex("follows").insert(followsSeed);
        });
};
