import * as Knex from "knex";
import faker from "faker";

import { ICreateUserValues, IUserColumnKeys, UserService } from "../../services";

const buildRecord: (username: string) => ICreateUserValues = (username) => {
    const submission: ICreateUserValues = {
        [IUserColumnKeys.FirstName]: faker.name.firstName(),
        [IUserColumnKeys.LastName]: faker.name.lastName(),
        [IUserColumnKeys.Username]: username,
        [IUserColumnKeys.Email]: faker.internet.email(),
        [IUserColumnKeys.Password]: "asd123ASD!",
        [IUserColumnKeys.ConfirmPassword]: "asd123ASD!"
    };

    return submission;
};

const usersSeed: ICreateUserValues[] = [
    {
        [IUserColumnKeys.FirstName]: "Dylan",
        [IUserColumnKeys.LastName]: "O'Leary",
        [IUserColumnKeys.Username]: "dylanolearydev",
        [IUserColumnKeys.Email]: "dylanolearydev@gmail.com",
        [IUserColumnKeys.Password]: "asd123ASD!",
        [IUserColumnKeys.ConfirmPassword]: "asd123ASD!"
    },
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
        .then(() => Promise.all(usersSeed.map((user) => new UserService(knex).createUser(user))));
};
