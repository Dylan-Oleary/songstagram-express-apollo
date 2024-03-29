import faker from "faker";
import path from "path";

import { dbConnection } from "~knex/db";
import {
    ICreatePostValues,
    IPostColumnKeys,
    IPostColumnLabels,
    IPostRecord,
    PostService
} from "~services/Post";
import {
    ICreateUserValues,
    IUpdateUserValues,
    IUserColumnKeys,
    IUserRecord,
    UserService
} from "~services/User";

describe("Post Service", () => {
    const pk = "postNo";
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
            [IPostColumnKeys.SpotifyID]: faker.random.uuid(),
            [IPostColumnKeys.SpotifyRecordType]: Math.random() > 0.5 ? "album" : "track",
            [IPostColumnKeys.Body]: faker.lorem.sentences(Math.floor(Math.random() * 3) + 1)
        };
    };

    /**
     * Builds a valid user submission
     *
     * @param username A valid username
     * @param deletePasswords Determines whether or not to omit `password` & `confirmPassword` from the submission. This becomes useful when building submissions for both creating a user and updating a user
     */
    const buildValidUserSubmission: (
        username: string,
        deletePasswords?: boolean
    ) => ICreateUserValues | IUpdateUserValues = (username, deletePasswords = false) => {
        const submission: ICreateUserValues = {
            [IUserColumnKeys.FirstName]: faker.name.firstName(),
            [IUserColumnKeys.LastName]: faker.name.lastName(),
            [IUserColumnKeys.Username]: username,
            [IUserColumnKeys.Email]: faker.internet.email(),
            [IUserColumnKeys.Password]: "M0N3y!",
            [IUserColumnKeys.ConfirmPassword]: "M0N3y!"
        };

        if (deletePasswords) {
            //@ts-ignore - Delete passwords to build valid submission
            delete submission[IUserColumnKeys.Password];
            //@ts-ignore - Delete passwords to build valid submission
            delete submission[IUserColumnKeys.ConfirmPassword];
        }

        return submission;
    };

    beforeAll(async (done) => {
        await dbConnection.migrate.latest();
        await Promise.all([
            dbConnection.seed.run({
                directory: path.join(__dirname, "../../knex/seeds"),
                loadExtensions: [".ts"],
                specific: "01_users.ts"
            }),
            dbConnection.seed.run({
                directory: path.join(__dirname, "../../knex/seeds"),
                loadExtensions: [".ts"],
                specific: "03_posts.ts"
            })
        ]);

        users = await userService.getUserList().then(({ data }) => data);

        await done();
    });

    afterAll(async (done) => {
        await dbConnection.destroy();
        done();
    });

    describe("Column Validation", () => {
        let user: IUserRecord;
        let submission: ICreatePostValues;

        beforeAll(() => {
            user = users[Math.floor(Math.random() * users.length)];
            submission = buildValidSubmission(user.userNo);
        });

        describe("Create", () => {
            describe("User Number", () => {
                test("throws a validation error (422) if its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IPostColumnKeys.UserNo]: undefined
                    };

                    //@ts-ignore - Testing column type error
                    return postService.createPost(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IPostColumnLabels.UserNo} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IPostColumnKeys.UserNo]: null
                    };

                    //@ts-ignore - Testing column type error
                    return postService.createPost(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IPostColumnLabels.UserNo} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IPostColumnKeys.UserNo]: ""
                    };

                    //@ts-ignore - Testing column type error
                    return postService.createPost(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IPostColumnLabels.UserNo} is a required field`
                            ])
                        );
                    });
                });
            }); // close describe("User Number")

            describe("Spotify ID", () => {
                test("throws a validation error (422) if its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IPostColumnKeys.SpotifyID]: undefined
                    };

                    //@ts-ignore - Testing column type error
                    return postService.createPost(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IPostColumnLabels.SpotifyID} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IPostColumnKeys.SpotifyID]: null
                    };

                    //@ts-ignore - Testing column type error
                    return postService.createPost(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IPostColumnLabels.SpotifyID} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IPostColumnKeys.SpotifyID]: ""
                    };

                    //@ts-ignore - Testing column type error
                    return postService.createPost(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IPostColumnLabels.SpotifyID} is a required field`
                            ])
                        );
                    });
                });
            }); // close describe("Spotify ID")

            describe("Body", () => {
                test("throws a validation error (422) if its value is too long", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IPostColumnKeys.Body]: new Array(2560).join("x")
                    };

                    return postService.createPost(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IPostColumnLabels.Body} cannot be more than 2500 characters`
                            ])
                        );
                    });
                });
            }); // close describe("Body")
        }); // close describe("Create")

        describe("Edit", () => {
            describe("Body", () => {
                test("throws a validation error (422) if its value is too long", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IPostColumnKeys.Body]: new Array(2560).join("x")
                    };

                    return postService.updatePost(1, invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IPostColumnLabels.Body} cannot be more than 2500 characters`
                            ])
                        );
                    });
                });
            }); // close describe("Body")
        }); // close describe("Edit")
    }); // close describe("Column Validation")

    describe("createPost", () => {
        let user: IUserRecord;

        beforeAll(() => {
            user = users[Math.floor(Math.random() * users.length)];
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
                expect(postRecord[IPostColumnKeys.SpotifyID]).toEqual(
                    submission[IPostColumnKeys.SpotifyID]
                );
            });
        });

        test(`successfully creates a post with trimmed columns: ${IPostColumnKeys.Body}, ${IPostColumnKeys.SpotifyID}`, () => {
            const postBody = faker.lorem.paragraph(1);
            const spotifyId = faker.random.uuid();
            const submission: ICreatePostValues = {
                userNo: user.userNo,
                body: `   ${postBody}   `,
                spotifyId: `   ${spotifyId}   `,
                spotifyRecordType: "album"
            };

            return postService.createPost(submission).then((postRecord) => {
                expect(postRecord.userNo).toEqual(submission.userNo);
                expect(postRecord.body).toEqual(postBody);
                expect(postRecord.spotifyId).toEqual(spotifyId);
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
            const userToBan = users.find((user) => !user.isBanned) as IUserRecord;

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

    describe("updatePost", () => {
        test("successfully updates a post", () => {
            return userService
                .createUser(buildValidUserSubmission("LAAAAAYLAAA") as ICreateUserValues)
                .then((user) => {
                    const postSubmission = buildValidSubmission(user.userNo);

                    return postService.createPost(postSubmission).then((post) => {
                        const updatedPost = { body: "My first post sucked" };

                        return postService.updatePost(post[pk], updatedPost).then((postRecord) => {
                            expect(postRecord).toEqual(
                                expect.objectContaining({
                                    postNo: post[pk],
                                    ...updatedPost
                                })
                            );
                        });
                    });
                });
        });

        test("throws a not found error (404) if no post is found", () => {
            return postService.updatePost(999, { body: "Yeah, right" }).catch((error) => {
                expect(error.statusCode).toEqual(404);
                expect(error.message).toEqual("Not Found");
                expect(error.details).toEqual(
                    expect.arrayContaining([`Post with a ${pk} of 999 could not be found`])
                );
            });
        });
    }); // close describe("updatePost")

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

    describe("getPostList", () => {
        test("returns a list of posts", () => {
            return postService.getPostList().then(({ data }) => {
                expect(data.length).toBeGreaterThan(0);

                data.forEach((post) => {
                    postRecordKeys.forEach((key) => {
                        expect(post).toHaveProperty(key);
                    });
                });
            });
        });

        test("returns a pagination object", () => {
            return postService.getPostList().then((response) => {
                expect(response).toHaveProperty("pagination");
            });
        });

        test("successfully returns the correct amount of items when itemsPerPage is passed", () => {
            return postService.getPostList({ itemsPerPage: 2 }).then(({ data, pagination }) => {
                expect(data.length).toEqual(2);

                data.forEach((post) => {
                    postRecordKeys.forEach((key) => {
                        expect(post).toHaveProperty(key);
                    });
                });
                expect(pagination).toHaveProperty("itemsPerPage", 2);
            });
        });

        test("successfully returns only selectable columns", () => {
            //@ts-ignore - Accessing private variable for testing
            const selectableColumns = postService.tableColumns
                .filter((column) => column.isSelectable)
                .map((column) => column.key);

            //@ts-ignore - Accessing private variable for testing
            const nonselectableColumns = postService.tableColumns
                .filter((column) => !column.isSelectable)
                .map((column) => column.key);

            return postService.getPostList().then(({ data }) => {
                data.forEach((post) => {
                    selectableColumns.forEach((column) => {
                        expect(post).toHaveProperty(column);
                    });
                    nonselectableColumns.forEach((column) => {
                        expect(post).not.toHaveProperty(column);
                    });
                });
            });
        });
    }); // close describe("getPostList")

    describe("getPostCount", () => {
        test("returns the correct count", () => {
            const user = users[Math.floor(Math.random() * users.length)];
            const options = {
                where: {
                    userNo: {
                        value: user.userNo
                    }
                }
            };

            return Promise.all([
                postService.getPostList(options),
                postService.getPostCount(options)
            ]).then(([recordSet, postCount]) => {
                expect(recordSet.data.length).toEqual(postCount);
                expect(recordSet.pagination.totalRecords).toEqual(postCount);
            });
        });
    }); // close describe("getPostCount")

    describe("deletePost", () => {
        test("successfully deletes a post", () => {
            const user = users[Math.floor(Math.random() * users.length)];
            const postSubmission = buildValidSubmission(user.userNo);

            return postService.createPost(postSubmission).then((post) => {
                return postService.deletePost(post[pk]).then((response) => {
                    return postService.getPost(post[pk]).then((postRecord) => {
                        expect(response).toEqual(true);
                        expect(postRecord[pk]).toEqual(post[pk]);
                        expect(postRecord.isDeleted).toEqual(true);
                    });
                });
            });
        });

        test("throws a not found error (404) if no post is found", () => {
            return postService.deletePost(900).catch((error) => {
                expect(error.statusCode).toEqual(404);
                expect(error.message).toEqual("Not Found");
                expect(error.details).toEqual(
                    expect.arrayContaining([`Post with a ${pk} of 900 could not be found`])
                );
            });
        });
    }); // close describe("deletePost")
}); // close describe("Post Service")
