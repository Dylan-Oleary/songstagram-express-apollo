import faker from "faker";
import * as Knex from "knex";

import { SpotifyRecordType } from "../../services";

interface IPostKnexSeed {
    userNo: number;
    spotifyId: string;
    body: string;
    spotifyRecordType: SpotifyRecordType;
}

const userNumbers: number[] = [];
const spotifyRecords: { id: string; type: SpotifyRecordType }[] = [
    {
        id: "5fhADVmqLovK2RfroelthQ",
        type: "track"
    },
    {
        id: "5oevNFQMFH9Q3IeeyMhitz",
        type: "track"
    },
    {
        id: "01181df2wJgDpUyDZ8Itbc",
        type: "track"
    },
    {
        id: "382ObEPsp2rxGrnsizN5TX",
        type: "album"
    },
    {
        id: "2noRn2Aes5aoNVsU6iWThc",
        type: "album"
    },
    {
        id: "2UBYw2qf9PkvoKQ610ocft",
        type: "album"
    }
];

/**
 * Returns a valid post record to insert into the database
 *
 * @param userNo The user number to assign to the post record
 */
const buildRecord: (userNo: number) => IPostKnexSeed = (userNo) => {
    const record = spotifyRecords[Math.floor(Math.random() * spotifyRecords.length)];

    return {
        userNo,
        spotifyId: record.id,
        body: faker.lorem.paragraph(Math.ceil(Math.random() * 3)),
        spotifyRecordType: record.type
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
