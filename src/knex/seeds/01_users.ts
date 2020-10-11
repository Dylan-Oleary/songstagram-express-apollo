import * as Knex from "knex";
import faker from "faker";

import { IUserColumnKeys } from "../../services";

interface IUserKnexSeed {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
}

const buildRecord: (username: string) => IUserKnexSeed = (username) => {
    const submission: IUserKnexSeed = {
        [IUserColumnKeys.FirstName]: faker.name.firstName(),
        [IUserColumnKeys.LastName]: faker.name.lastName(),
        [IUserColumnKeys.Username]: username,
        [IUserColumnKeys.Email]: faker.internet.email(),
        [IUserColumnKeys.Password]: "M0N3y!"
    };

    return submission;
};

const usersSeed = [
    buildRecord("tommy_gunns"),
    buildRecord("themi11kman"),
    buildRecord("Havok"),
    buildRecord("Frasair417"),
    buildRecord("neonskies"),
    buildRecord("reggie_ladoo"),
    buildRecord("roxythedog"),
    buildRecord("laylathepooch"),
    buildRecord("boonebone"),
    buildRecord("peachyH")
];

exports.seed = (knex: Knex) => {
    return knex("users")
        .del()
        .then(() => {
            return knex("users").insert(usersSeed);
        });
};
