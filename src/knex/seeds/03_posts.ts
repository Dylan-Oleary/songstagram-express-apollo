import faker from "faker";
import * as Knex from "knex";

interface IPostKnexSeed {
    userNo: number;
    spotifyTrackId: string;
    body: string;
}

const userNumbers: number[] = [];
const spotifyTrackIds = [
    "5fhADVmqLovK2RfroelthQ",
    "5oevNFQMFH9Q3IeeyMhitz",
    "01181df2wJgDpUyDZ8Itbc",
    "6g0XN48eYelSPzqtwZimfL",
    "4yaZSWjsZPX47grNDQkbGs"
];

/**
 * Returns a valid post record to insert into the database
 *
 * @param userNo The user number to assign to the post record
 */
const buildRecord: (userNo: number) => IPostKnexSeed = (userNo) => {
    return {
        userNo,
        spotifyTrackId: spotifyTrackIds[Math.floor(Math.random() * spotifyTrackIds.length)],
        body: faker.lorem.paragraph(Math.ceil(Math.random() * 3))
    };
};

/**
 * Returns an array of valid post records to insert into the database
 */
const buildPostsSeed: () => IPostKnexSeed[] = () => {
    for (let i = 1; i <= 10; i++) {
        userNumbers.push(i);
    }

    return userNumbers.map((userNo) => buildRecord(userNo));
};

const postsSeed = buildPostsSeed();

exports.seed = (knex: Knex) => {
    return knex("posts")
        .del()
        .then(() => {
            return knex("posts").insert(postsSeed);
        });
};
