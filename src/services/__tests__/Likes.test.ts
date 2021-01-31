import faker from "faker";
import path from "path";

import { dbConnection } from "~knex/db";
import { CommentsService, ICommentRecord } from "~services/Comments";
import {
    ICreateLikeValues,
    ILikeColumnKeys,
    ILikeColumnLabels,
    ILikeRecord,
    LikeReferenceTable,
    LikesService
} from "~services/Likes";
import { IPostRecord, PostService } from "~services/Post";
import {
    ICreateUserValues,
    IUpdateUserValues,
    IUserColumnKeys,
    IUserRecord,
    UserService
} from "~services/User";

describe("Likes Service", () => {
    const table = "likes";

    const commentService = new CommentsService(dbConnection);
    const likeService = new LikesService(dbConnection);
    const postService = new PostService(dbConnection);
    const userService = new UserService(dbConnection);

    let comments: ICommentRecord[] = [];
    let posts: IPostRecord[] = [];
    let users: IUserRecord[] = [];

    /**
     * Builds a valid like submission
     *
     * @param userNo The user number of the user liking the record
     * @param referenceNo The unique identifier of the record being liked
     * @param referenceTable The table to which the record being liked belongs to
     */
    const buildValidSubmission: (
        userNo: number,
        referenceNo: number,
        referenceTable: LikeReferenceTable
    ) => ICreateLikeValues = (userNo, referenceNo, referenceTable = LikeReferenceTable.Posts) => {
        return {
            userNo,
            referenceNo,
            referenceTable
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
        await dbConnection.seed.run({
            directory: path.join(__dirname, "../../knex/seeds"),
            loadExtensions: [".ts"],
            specific: "04_comments.ts"
        });
        await dbConnection.seed.run({
            directory: path.join(__dirname, "../../knex/seeds"),
            loadExtensions: [".ts"],
            specific: "05_referenceTables.ts"
        });

        await Promise.all([
            userService.getUserList().then(({ data }) => data),
            postService.getPostList().then(({ data }) => data),
            commentService.getCommentList().then(({ data }) => data)
        ]).then(([userList, postList, commentList]) => {
            users = [...userList];
            posts = [...postList];
            comments = [...commentList];
        });

        await done();
    });

    afterAll(async (done) => {
        await dbConnection.destroy();
        done();
    });

    describe("Column Validation", () => {
        let submission: ICreateLikeValues;

        beforeAll(() => {
            const userNo = users[Math.floor(Math.random() * users.length)].userNo;

            submission = buildValidSubmission(userNo, 1, LikeReferenceTable.Posts);
        });

        describe("Create", () => {
            describe("User Number", () => {
                test("throws a validation error (422) if its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ILikeColumnKeys.UserNo]: undefined
                    };

                    //@ts-ignore - Testing column type error
                    return likeService.createLike(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${ILikeColumnLabels.UserNo} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ILikeColumnKeys.UserNo]: null
                    };

                    //@ts-ignore - Testing column type error
                    return likeService.createLike(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${ILikeColumnLabels.UserNo} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ILikeColumnKeys.UserNo]: ""
                    };

                    //@ts-ignore - Testing column type error
                    return likeService.createLike(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${ILikeColumnLabels.UserNo} is a required field`
                            ])
                        );
                    });
                });
            }); // close describe("User Number")

            describe("Reference Number", () => {
                test("throws a validation error (422) if its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ILikeColumnKeys.ReferenceNo]: undefined
                    };

                    //@ts-ignore - Testing column type error
                    return likeService.createLike(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${ILikeColumnLabels.ReferenceNo} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ILikeColumnKeys.ReferenceNo]: null
                    };

                    //@ts-ignore - Testing column type error
                    return likeService.createLike(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${ILikeColumnLabels.ReferenceNo} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ILikeColumnKeys.ReferenceNo]: ""
                    };

                    //@ts-ignore - Testing column type error
                    return likeService.createLike(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${ILikeColumnLabels.ReferenceNo} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is less than or equal to 0", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ILikeColumnKeys.ReferenceNo]: 0
                    };

                    //@ts-ignore - Testing column type error
                    return likeService.createLike(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${ILikeColumnLabels.ReferenceNo} must be greater than 0`
                            ])
                        );
                    });
                });
            }); // close describe("Reference Number")

            describe("Reference Table", () => {
                test("throws a validation error (422) if its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ILikeColumnKeys.ReferenceTable]: undefined
                    };

                    //@ts-ignore - Testing column type error
                    return likeService.createLike(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${ILikeColumnLabels.ReferenceTable} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ILikeColumnKeys.ReferenceTable]: null
                    };

                    //@ts-ignore - Testing column type error
                    return likeService.createLike(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${ILikeColumnLabels.ReferenceTable} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ILikeColumnKeys.ReferenceTable]: ""
                    };

                    //@ts-ignore - Testing column type error
                    return likeService.createLike(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${ILikeColumnLabels.ReferenceTable} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if it is passed an invalid reference table", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ILikeColumnKeys.ReferenceTable]: "Sharks"
                    };

                    //@ts-ignore - Testing column type error
                    return likeService.createLike(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${
                                    ILikeColumnLabels.ReferenceTable
                                } must be one of [${Object.values(LikeReferenceTable).join(",")}]`
                            ])
                        );
                    });
                });
            }); // close describe("Reference Table")
        }); // close describe("Create")
    }); // close describe("Column Validation")

    describe("createLike", () => {
        test("successfully creates a post like", () => {
            let userNo = users[Math.floor(Math.random() * users.length)].userNo;
            let postNo = posts[Math.floor(Math.random() * posts.length)].postNo;
            const submission = buildValidSubmission(userNo, postNo, LikeReferenceTable.Posts);

            return likeService.createLike(submission).then((record) => {
                expect(record).toEqual(
                    expect.objectContaining({
                        [ILikeColumnKeys.LikeNo]: record[ILikeColumnKeys.LikeNo],
                        [ILikeColumnKeys.ReferenceTable]: LikeReferenceTable.Posts,
                        [ILikeColumnKeys.ReferenceNo]: postNo,
                        [ILikeColumnKeys.UserNo]: userNo,
                        [ILikeColumnKeys.IsActive]: 1
                    })
                );
            });
        });

        test("successfully creates a comment like", () => {
            let userNo = users[Math.floor(Math.random() * users.length)].userNo;
            let commentNo = comments[Math.floor(Math.random() * comments.length)].commentNo;
            const submission = buildValidSubmission(userNo, commentNo, LikeReferenceTable.Comments);

            return likeService.createLike(submission).then((record) => {
                expect(record).toEqual(
                    expect.objectContaining({
                        [ILikeColumnKeys.LikeNo]: record[ILikeColumnKeys.LikeNo],
                        [ILikeColumnKeys.ReferenceTable]: LikeReferenceTable.Comments,
                        [ILikeColumnKeys.ReferenceNo]: commentNo,
                        [ILikeColumnKeys.UserNo]: userNo,
                        [ILikeColumnKeys.IsActive]: 1
                    })
                );
            });
        });
    }); // close describe("createLike")

    describe("updateLike", () => {
        test("successfully updates a like record", () => {
            let userNo = users[Math.floor(Math.random() * users.length)].userNo;
            let postNo = posts[Math.floor(Math.random() * posts.length)].postNo;
            const submission = buildValidSubmission(userNo, postNo, LikeReferenceTable.Posts);

            let originalRecord: ILikeRecord;

            return likeService
                .createLike(submission)
                .then((record) => {
                    originalRecord = { ...record };

                    return likeService.updateLike(record[ILikeColumnKeys.LikeNo], false);
                })
                .then((updatedRecord) => {
                    expect(updatedRecord[ILikeColumnKeys.LikeNo]).toEqual(
                        originalRecord[ILikeColumnKeys.LikeNo]
                    );
                    expect(updatedRecord[ILikeColumnKeys.IsActive]).toEqual(0);
                });
        });
    }); // close describe("updateLike")

    describe("getLike", () => {
        test("successfully returns a like record", () => {
            let userNo = users[Math.floor(Math.random() * users.length)].userNo;
            let postNo = posts[Math.floor(Math.random() * posts.length)].postNo;
            const submission = buildValidSubmission(userNo, postNo, LikeReferenceTable.Posts);

            let originalRecord: ILikeRecord;

            return likeService
                .createLike(submission)
                .then((record) => {
                    originalRecord = { ...record };

                    return likeService.getLike(record[ILikeColumnKeys.LikeNo]);
                })
                .then((foundRecord) => {
                    expect(foundRecord).toEqual(originalRecord);
                });
        });

        test("throws a not found error (404) if no record is found", () => {
            const likeNo = 9000;

            return likeService.getLike(likeNo).catch((error) => {
                expect(error.statusCode).toEqual(404);
                expect(error.message).toEqual("Not Found");
                expect(error.details).toEqual(
                    expect.arrayContaining([
                        `Like with a ${ILikeColumnKeys.LikeNo} of ${likeNo} could not be found`
                    ])
                );
            });
        });
    }); // close describe("getLike")

    describe("getLikeList", () => {
        test("successfully returns a list of like records", () => {
            const userNo = users[Math.floor(Math.random() * users.length)].userNo;
            const submissionOne = buildValidSubmission(userNo, 1, LikeReferenceTable.Posts);
            const submissionTwo = buildValidSubmission(userNo, 2, LikeReferenceTable.Posts);

            return Promise.all([
                likeService.createLike(submissionOne),
                likeService.createLike(submissionTwo)
            ]).then(([likeOne, likeTwo]) => {
                return likeService.getLikeList().then(({ data, pagination }) => {
                    expect(data.length).toEqual(pagination.totalRecords);

                    [likeOne, likeTwo].forEach((record) => {
                        //@ts-ignore
                        const foundRecord = data.find(
                            (like) =>
                                like[ILikeColumnKeys.LikeNo] === record[ILikeColumnKeys.LikeNo]
                        );

                        expect(foundRecord).toBeDefined();
                    });
                });
            });
        });
    }); // close describe("getLikeList")

    describe("getLikeCount", () => {
        test("successfully returns a post's like count", () => {
            const referenceNo = 1;
            const referenceTable = LikeReferenceTable.Posts;

            return Promise.all([
                dbConnection(table).select("*").where({ isActive: 1, referenceNo, referenceTable }),
                likeService.getLikeCount(referenceNo, referenceTable)
            ]).then(([dbRecordSet, likeCount]) => {
                expect(dbRecordSet.length).toEqual(likeCount);
            });
        });

        test("successfully returns a comment's like count", () => {
            const referenceNo = 1;
            const referenceTable = LikeReferenceTable.Comments;

            return Promise.all([
                dbConnection(table).select("*").where({ isActive: 1, referenceNo, referenceTable }),
                likeService.getLikeCount(referenceNo, referenceTable)
            ]).then(([dbRecordSet, likeCount]) => {
                expect(dbRecordSet.length).toEqual(likeCount);
            });
        });
    }); // close describe("getLikeCount")

    describe("likeRequest", () => {
        test("successfully likes a post", () => {
            let userNo = users[Math.floor(Math.random() * users.length)].userNo;
            let postNo = posts[Math.floor(Math.random() * posts.length)].postNo;

            return likeService
                .likeRequest(userNo, postNo, LikeReferenceTable.Posts, true)
                .then((record) => {
                    expect(record.userNo).toEqual(userNo);
                    expect(record.referenceNo).toEqual(postNo);
                    expect(record.isActive).toEqual(1);
                });
        });

        test("successfully unlikes a post", async () => {
            const user = await userService.createUser(
                buildValidUserSubmission("derpmcderp") as ICreateUserValues
            );
            const postNo = posts[Math.floor(Math.random() * posts.length)].postNo;

            return likeService
                .likeRequest(user.userNo, postNo, LikeReferenceTable.Posts)
                .then((record) => {
                    return likeService.likeRequest(
                        record.userNo,
                        record.referenceNo,
                        record.referenceTable,
                        false
                    );
                })
                .then((record) => {
                    expect(record.userNo).toEqual(user.userNo);
                    expect(record.referenceNo).toEqual(postNo);
                    expect(record.isActive).toEqual(0);
                });
        });

        test("successfully likes a comment", () => {
            let userNo = users[Math.floor(Math.random() * users.length)].userNo;
            let commentNo = comments[Math.floor(Math.random() * comments.length)].commentNo;

            return likeService
                .likeRequest(userNo, commentNo, LikeReferenceTable.Comments, true)
                .then((record) => {
                    expect(record.userNo).toEqual(userNo);
                    expect(record.referenceNo).toEqual(commentNo);
                    expect(record.isActive).toEqual(1);
                });
        });

        test("successfully unlikes a comment", async () => {
            const user = await userService.createUser(
                buildValidUserSubmission("stoopMCnoop") as ICreateUserValues
            );
            const commentNo = comments[Math.floor(Math.random() * comments.length)].commentNo;

            return likeService
                .likeRequest(user.userNo, commentNo, LikeReferenceTable.Comments)
                .then((record) => {
                    return likeService.likeRequest(
                        record.userNo,
                        record.referenceNo,
                        record.referenceTable,
                        false
                    );
                })
                .then((record) => {
                    expect(record.userNo).toEqual(user.userNo);
                    expect(record.referenceNo).toEqual(commentNo);
                    expect(record.isActive).toEqual(0);
                });
        });

        test("throws a forbidden error (403) when the user making the like request is banned", async () => {
            const user = await userService.createUser(
                buildValidUserSubmission("IAMSUPERMEANBANME") as ICreateUserValues
            );
            const postNo = posts[Math.floor(Math.random() * posts.length)].postNo;

            await userService.banUser(user.userNo);

            return likeService
                .likeRequest(user.userNo, postNo, LikeReferenceTable.Posts)
                .catch((error) => {
                    expect(error.statusCode).toEqual(403);
                    expect(error.message).toEqual("Forbidden");
                    expect(error.details).toEqual(
                        expect.arrayContaining([
                            `User (${IUserColumnKeys.UserNo}: ${user.userNo}) has been banned`
                        ])
                    );
                });
        });

        test("throws a forbidden error (403) when the user making the like request is deleted", async () => {
            const user = await userService.createUser(
                buildValidUserSubmission("BAR_DOWN") as ICreateUserValues
            );
            const postNo = posts[Math.floor(Math.random() * posts.length)].postNo;

            await userService.deleteUser(user.userNo);

            return likeService
                .likeRequest(user.userNo, postNo, LikeReferenceTable.Posts)
                .catch((error) => {
                    expect(error.statusCode).toEqual(403);
                    expect(error.message).toEqual("Forbidden");
                    expect(error.details).toEqual(
                        expect.arrayContaining([
                            `User (${IUserColumnKeys.UserNo}: ${user.userNo}) has been deleted`
                        ])
                    );
                });
        });
    }); // close describe("likeRequest")

    describe("deleteLike", () => {
        test("successfully deletes a like record", () => {
            let userNo = users[Math.floor(Math.random() * users.length)].userNo;
            let postNo = posts[Math.floor(Math.random() * posts.length)].postNo;
            const submission = buildValidSubmission(userNo, postNo, LikeReferenceTable.Posts);

            let originalRecord: ILikeRecord;

            return likeService
                .createLike(submission)
                .then((record) => {
                    originalRecord = { ...record };

                    return likeService.deleteLike(record[ILikeColumnKeys.LikeNo]);
                })
                .then((response) => {
                    expect(response).toEqual(true);
                    return likeService.getLike(originalRecord[ILikeColumnKeys.LikeNo]);
                })
                .catch((error) => {
                    expect(error.statusCode).toEqual(404);
                    expect(error.message).toEqual("Not Found");
                    expect(error.details).toEqual(
                        expect.arrayContaining([
                            `Like with a ${ILikeColumnKeys.LikeNo} of ${
                                originalRecord[ILikeColumnKeys.LikeNo]
                            } could not be found`
                        ])
                    );
                });
        });
    }); // close describe("deleteLike")
}); // close describe("Likes Service")
