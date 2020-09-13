import * as Knex from "knex";

const postsSeed = [
    {
        userNo: 1,
        spotifyTrackId: "5fhADVmqLovK2RfroelthQ",
        body: "But darling, this is a great tune!"
    },
    {
        userNo: 1,
        spotifyTrackId: "5oevNFQMFH9Q3IeeyMhitz",
        body: "I love 5/4 intp 6/8"
    },
    {
        userNo: 2,
        spotifyTrackId: "01181df2wJgDpUyDZ8Itbc",
        body: "The wood type from the desk in Better Call Saul"
    },
    {
        userNo: 2,
        spotifyTrackId: "6g0XN48eYelSPzqtwZimfL",
        body: "Reminds me of Fargo!"
    },
    {
        userNo: 3,
        spotifyTrackId: "4yaZSWjsZPX47grNDQkbGs",
        body: "Love me some PTH"
    }
];

exports.seed = (knex: Knex) => {
    return knex("posts")
        .del()
        .then(() => {
            return knex("posts").insert(postsSeed);
        });
};
