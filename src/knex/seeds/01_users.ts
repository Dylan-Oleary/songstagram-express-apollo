import * as Knex from "knex";

const usersSeed = [
    {
        firstName: "Roxy",
        lastName: "Wild",
        bio: "Black lab with the best pawrents",
        username: "breakfastwithroxy",
        email: "roxanne@gmail.com",
        password: "woof"
    },
    {
        firstName: "Layla",
        lastName: "Wild",
        bio: "Dalmatian with too much energy",
        username: "spotted_monster",
        email: "layla@gmail.com",
        password: "bark"
    },
    {
        firstName: "Boone",
        lastName: "Wild",
        bio: "JRC Pup",
        username: "the_kev",
        email: "boone@gmail.com",
        password: "nels0n"
    }
];

exports.seed = (knex: Knex) => {
    return knex("users")
        .del()
        .then(() => {
            return knex("users").insert(usersSeed);
        });
};
