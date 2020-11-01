import faker from "faker";
import path from "path";

import { dbConnection } from "../../knex/db";
import {
    ICreatePostValues,
    IPostColumnKeys,
    IPostColumnLabels,
    IPostRecord,
    PostService
} from "../Post";
import { IUserColumnKeys, IUserRecord, UserService } from "../User";

describe("Post Service", () => {
    const pk = "postNo";
    const tableName = "posts";
    const postRecordKeys = Object.values(IPostColumnKeys);
    const postService = new PostService(dbConnection);
    const userService = new UserService(dbConnection);
    let users: IUserRecord[];

    /**
     * Builds a valid post submission
     *
     * @param userNo The user number responsible for assigning ownership to the post
     */
    const buildValidSubmission: (userNo: number) => ICreatePostValues = (userNo) => {
        return {
            [IPostColumnKeys.UserNo]: userNo,
            [IPostColumnKeys.SpotifyTrackID]: faker.random.uuid(),
            [IPostColumnKeys.Body]: faker.lorem.sentences(Math.floor(Math.random() * 3) + 1)
        };
    };

    beforeAll(async (done) => {
        await dbConnection.migrate.latest();
        await dbConnection.seed.run({
            directory: path.join(__dirname, "../../knex/seeds"),
            loadExtensions: [".ts"],
            specific: "01_users.ts"
        });
        await dbConnection.seed.run({
            directory: path.join(__dirname, "../../knex/seeds"),
            loadExtensions: [".ts"],
            specific: "03_posts.ts"
        });

        users = await userService.getUserList().then(({ data }) => data);

        await done();
    });

    afterAll(async (done) => {
        await dbConnection.destroy();
        done();
    });

    describe("createPost", () => {
        let user: IUserRecord;

        beforeAll(() => {
            user = users[Math.floor(Math.random() * users.length) + 1];
        });

        test("successfully creates a post", () => {
            const submission = buildValidSubmission(user.userNo);

            return postService.createPost(submission).then((postRecord) => {
                postRecordKeys.forEach((key) => {
                    expect(postRecord).toHaveProperty(key);
                });
                expect(postRecord[IPostColumnKeys.Body]).toEqual(submission[IPostColumnKeys.Body]);
                expect(postRecord[IPostColumnKeys.UserNo]).toEqual(
                    submission[IPostColumnKeys.UserNo]
                );
                expect(postRecord[IPostColumnKeys.SpotifyTrackID]).toEqual(
                    submission[IPostColumnKeys.SpotifyTrackID]
                );
            });
        });

        [
            { key: IPostColumnKeys.CommentCount, label: "comment" },
            { key: IPostColumnKeys.LikeCount, label: "like" }
        ].forEach(({ key, label }) => {
            test(`successfully creates a post with the correct ${label} count`, () => {
                return postService
                    .createPost(buildValidSubmission(user.userNo))
                    .then((postRecord) => {
                        expect(postRecord[key]).toEqual(0);
                    });
            });
        });

        test(`successfully creates a post with trimmed columns: ${IPostColumnKeys.Body}, ${IPostColumnKeys.SpotifyTrackID}`, () => {
            const postBody = faker.lorem.paragraph(1);
            const spotifyTrackId = faker.random.uuid();
            const submission: ICreatePostValues = {
                userNo: user.userNo,
                body: `   ${postBody}   `,
                spotifyTrackId: `   ${spotifyTrackId}   `
            };

            return postService.createPost(submission).then((postRecord) => {
                expect(postRecord.userNo).toEqual(submission.userNo);
                expect(postRecord.body).toEqual(postBody);
                expect(postRecord.spotifyTrackId).toEqual(spotifyTrackId);
            });
        });

        test("throws a not found error (404) if the user trying to create a post doesn't exist", () => {
            const userNo = 8675309;

            return postService.createPost(buildValidSubmission(userNo)).catch((error) => {
                expect(error.statusCode).toEqual(404);
                expect(error.message).toEqual("Not Found");
                expect(error.details).toEqual(
                    expect.arrayContaining([`User with a userNo of ${userNo} could not be found`])
                );
            });
        });

        test("throws a forbidden error (403) if the user trying to create a post has been deleted", async () => {
            await userService.deleteUser(user.userNo);

            return postService.createPost(buildValidSubmission(user.userNo)).catch((error) => {
                expect(error.statusCode).toEqual(403);
                expect(error.message).toEqual("Forbidden");
                expect(error.details).toEqual(
                    expect.arrayContaining([
                        `User (userNo: ${user.userNo}) does not have access to create a post`
                    ])
                );
            });
        });

        test("throws a forbidden error (403) if the user trying to create a post has been banned", async () => {
            //@ts-ignore
            const userToBan = users.find((user) => user.isBanned === 0) as IUserRecord;

            await userService.banUser(userToBan.userNo);

            return postService
                .createPost(buildValidSubmission(userToBan?.userNo))
                .catch((error) => {
                    expect(error.statusCode).toEqual(403);
                    expect(error.message).toEqual("Forbidden");
                    expect(error.details).toEqual(
                        expect.arrayContaining([
                            `User (userNo: ${userToBan.userNo}) does not have access to create a post`
                        ])
                    );
                });
        });
    }); // close describe("createPost")

    describe("getPost", () => {
        let post: IPostRecord;
        let user: IUserRecord;

        beforeAll(async () => {
            user = await userService.createUser({
                [IUserColumnKeys.FirstName]: faker.name.firstName(),
                [IUserColumnKeys.LastName]: faker.name.lastName(),
                [IUserColumnKeys.Username]: "jasonv00rhees",
                [IUserColumnKeys.Email]: faker.internet.email(),
                [IUserColumnKeys.Password]: "M0N3y!",
                [IUserColumnKeys.ConfirmPassword]: "M0N3y!"
            });
            post = await postService.createPost(buildValidSubmission(user.userNo));
        });

        test("returns a post record", () => {
            return postService.getPost(post.postNo).then((postRecord) => {
                postRecordKeys.forEach((key) => {
                    expect(postRecord[key]).toEqual(post[key]);
                });
            });
        });

        test("throws a not found error (404) if no post is found", () => {
            const invalidPostNo = 920109;

            return postService.getPost(invalidPostNo).catch((error) => {
                expect(error.statusCode).toEqual(404);
                expect(error.message).toEqual("Not Found");
                expect(error.details).toEqual(
                    expect.arrayContaining([
                        `Post with a ${pk} of ${invalidPostNo} could not be found`
                    ])
                );
            });
        });
    }); // close describe("getPost")
}); // close describe("Post Service")
