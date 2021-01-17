import { removeObjectFields } from "graphql-tools";
import path from "path";

import { dbConnection } from "~knex/db";
import {
    CommentsService,
    ICommentColumnKeys,
    ICommentColumnLabels,
    ICreateCommentValues
} from "~services/Comments";
import { IPostRecord, PostService } from "~services/Post";
import { IUserRecord, UserService } from "~services/User";

describe("Comments Service", () => {
    const table = "comments";
    const pk = "commentNo";
    const commentService = new CommentsService(dbConnection);
    const postService = new PostService(dbConnection);
    const userService = new UserService(dbConnection);

    let posts: IPostRecord[] = [];
    let users: IUserRecord[] = [];

    /**
     * Build a valid comment submission
     */
    const buildValidSubmission: (
        userNo: number,
        postNo: number,
        parentCommentNo?: number
    ) => ICreateCommentValues = (userNo, postNo, parentCommentNo = undefined) => {
        let submission: ICreateCommentValues = {
            postNo,
            userNo,
            body: "This song really is the bee's knees, dude."
        };

        if (parentCommentNo) {
            submission = { ...submission, parentCommentNo };
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
        posts = await postService.getPostList().then(({ data }) => data);

        await done();
    });

    afterAll(async (done) => {
        await dbConnection.destroy();

        done();
    });

    describe("Column Validation", () => {
        let submission: ICreateCommentValues;

        beforeAll(() => {
            submission = buildValidSubmission(1, 1);
        });

        describe("Create", () => {
            describe("User Number", () => {
                test("throws a validation error (422) if its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ICommentColumnKeys.UserNo]: undefined
                    };

                    //@ts-ignore - Testing column type error
                    return commentService.createComment(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${ICommentColumnLabels.UserNo} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ICommentColumnKeys.UserNo]: null
                    };

                    //@ts-ignore - Testing column type error
                    return commentService.createComment(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${ICommentColumnLabels.UserNo} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ICommentColumnKeys.UserNo]: ""
                    };

                    //@ts-ignore - Testing column type error
                    return commentService.createComment(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${ICommentColumnLabels.UserNo} is a required field`
                            ])
                        );
                    });
                });
            }); //close describe("User Number")

            describe("Post Number", () => {
                test("throws a validation error (422) if its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ICommentColumnKeys.PostNo]: undefined
                    };

                    return (
                        commentService
                            //@ts-ignore - Testing column type error
                            .createComment(invalidSubmission)
                            .catch((error) => {
                                expect(error.statusCode).toEqual(422);
                                expect(error.message).toEqual("Validation Error");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([
                                        `${ICommentColumnLabels.PostNo} is a required field`
                                    ])
                                );
                            })
                    );
                });

                test("throws a validation error (422) if its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ICommentColumnKeys.PostNo]: null
                    };

                    return (
                        commentService
                            //@ts-ignore - Testing column type error
                            .createComment(invalidSubmission)
                            .catch((error) => {
                                expect(error.statusCode).toEqual(422);
                                expect(error.message).toEqual("Validation Error");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([
                                        `${ICommentColumnLabels.PostNo} is a required field`
                                    ])
                                );
                            })
                    );
                });

                test("throws a validation error (422) if its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ICommentColumnKeys.PostNo]: ""
                    };

                    return (
                        commentService
                            //@ts-ignore - Testing column type error
                            .createComment(invalidSubmission)
                            .catch((error) => {
                                expect(error.statusCode).toEqual(422);
                                expect(error.message).toEqual("Validation Error");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([
                                        `${ICommentColumnLabels.PostNo} is a required field`
                                    ])
                                );
                            })
                    );
                });
            }); // close describe("Post Number")

            describe("Body", () => {
                test("throws a validation error (422) if its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ICommentColumnKeys.Body]: undefined
                    };

                    return (
                        commentService
                            //@ts-ignore - Testing column type error
                            .createComment(invalidSubmission)
                            .catch((error) => {
                                expect(error.statusCode).toEqual(422);
                                expect(error.message).toEqual("Validation Error");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([
                                        `${ICommentColumnLabels.Body} is a required field`
                                    ])
                                );
                            })
                    );
                });

                test("throws a validation error (422) if its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ICommentColumnKeys.Body]: null
                    };

                    return (
                        commentService
                            //@ts-ignore - Testing column type error
                            .createComment(invalidSubmission)
                            .catch((error) => {
                                expect(error.statusCode).toEqual(422);
                                expect(error.message).toEqual("Validation Error");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([
                                        `${ICommentColumnLabels.Body} is a required field`
                                    ])
                                );
                            })
                    );
                });

                test("throws a validation error (422) if its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ICommentColumnKeys.Body]: ""
                    };

                    return (
                        commentService
                            //@ts-ignore - Testing column type error
                            .createComment(invalidSubmission)
                            .catch((error) => {
                                expect(error.statusCode).toEqual(422);
                                expect(error.message).toEqual("Validation Error");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([
                                        `${ICommentColumnLabels.Body} is a required field`
                                    ])
                                );
                            })
                    );
                });

                test("throws a validation error (422) if its value is too long", () => {
                    const invalidSubmission = {
                        ...submission,
                        [ICommentColumnKeys.Body]: new Array(600).join("x")
                    };

                    return (
                        commentService
                            //@ts-ignore - Testing column type error
                            .createComment(invalidSubmission)
                            .catch((error) => {
                                expect(error.statusCode).toEqual(422);
                                expect(error.message).toEqual("Validation Error");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([
                                        `${ICommentColumnLabels.Body} cannot be more than 500 characters`
                                    ])
                                );
                            })
                    );
                });
            }); // close describe("Body")
        }); // close describe("Create")
    }); // close describe("Column Validation")

    describe("createComment", () => {
        let post: IPostRecord;
        let user: IUserRecord;

        beforeAll(() => {
            user = users[0];
            post = posts[0];
        });

        test("successfully creates a comment record", () => {
            const submission = buildValidSubmission(user.userNo, post.postNo);

            return commentService.createComment(submission).then((record) => {
                expect(record).toHaveProperty(pk);
                expect(record.userNo).toEqual(submission.userNo);
                expect(record.postNo).toEqual(submission.postNo);
                expect(record.body).toEqual(submission.body);
            });
        });

        test("successfully creates a comment reply", () => {
            const originalSubmission = buildValidSubmission(user.userNo, post.postNo);

            return commentService.createComment(originalSubmission).then((originalRecord) => {
                const replySubmission = buildValidSubmission(
                    users[1].userNo,
                    post.postNo,
                    originalRecord.commentNo
                );

                return commentService.createComment(replySubmission).then((replyRecord) => {
                    expect(replyRecord.parentCommentNo).toEqual(originalRecord[pk]);
                    expect(replyRecord).toHaveProperty(pk);
                    expect(replyRecord.userNo).toEqual(replySubmission.userNo);
                    expect(replyRecord.postNo).toEqual(originalRecord.postNo);
                    expect(replyRecord.body).toEqual(replySubmission.body);
                });
            });
        });

        test("successfully allows a user to reply to their own comment", () => {
            const originalSubmission = buildValidSubmission(user.userNo, post.postNo);

            return commentService.createComment(originalSubmission).then((originalRecord) => {
                const replySubmission = buildValidSubmission(
                    user.userNo,
                    post.postNo,
                    originalRecord.commentNo
                );

                return commentService.createComment(replySubmission).then((replyRecord) => {
                    expect(replyRecord.parentCommentNo).toEqual(originalRecord[pk]);
                    expect(replyRecord).toHaveProperty(pk);
                    expect(replyRecord.userNo).toEqual(replySubmission.userNo);
                    expect(replyRecord.postNo).toEqual(replySubmission.postNo);
                    expect(replyRecord.body).toEqual(replySubmission.body);
                    expect(replyRecord.userNo).toEqual(originalRecord.userNo);
                });
            });
        });

        test("throws a not found error (404) if no parent comment could be found", () => {
            const parentCommentNo = 900;
            const submission = buildValidSubmission(user.userNo, post.postNo, parentCommentNo);

            return commentService.createComment(submission).catch((error) => {
                expect(error.statusCode).toEqual(404);
                expect(error.message).toEqual("Not Found");
                expect(error.details).toEqual(
                    expect.arrayContaining([
                        `Comment with a ${pk} of ${parentCommentNo} could not be found`
                    ])
                );
            });
        });

        test("throws a not found error (404) if no post record could be found", () => {
            const postNo = 900;
            const submission = buildValidSubmission(user.userNo, postNo);

            return commentService.createComment(submission).catch((error) => {
                expect(error.statusCode).toEqual(404);
                expect(error.message).toEqual("Not Found");
                expect(error.details).toEqual(
                    expect.arrayContaining([`Post with a postNo of ${postNo} could not be found`])
                );
            });
        });

        test("throws a forbidden error (403) when the post has been deleted", () => {
            const postNo = 2;

            return postService.deletePost(postNo).then(() => {
                const submission = buildValidSubmission(user.userNo, postNo);

                return commentService.createComment(submission).catch((error) => {
                    expect(error.statusCode).toEqual(403);
                    expect(error.message).toEqual("Forbidden");
                    expect(error.details).toEqual(
                        expect.arrayContaining([`Post with a postNo of ${postNo} has been deleted`])
                    );
                });
            });
        });
    }); // close describe("createComment")

    describe("getComment", () => {
        let post: IPostRecord;
        let user: IUserRecord;

        beforeAll(() => {
            user = users[0];
            post = posts[0];
        });

        test("successfully returns a comment record", () => {
            const submission = buildValidSubmission(user.userNo, post.postNo);

            return commentService.createComment(submission).then((record) => {
                return commentService.getComment(record[pk]).then((comment) => {
                    expect(comment).toEqual(record);
                });
            });
        });

        test("throws a not found (404) error if the comment does not exist", () => {
            const commentNo = 900;

            return commentService.getComment(commentNo).catch((error) => {
                expect(error.statusCode).toEqual(404);
                expect(error.message).toEqual("Not Found");
                expect(error.details).toEqual(
                    expect.arrayContaining([
                        `Comment with a ${pk} of ${commentNo} could not be found`
                    ])
                );
            });
        });
    }); // close describe("getComment")

    describe("getCommentList", () => {
        let post: IPostRecord;
        let user: IUserRecord;

        beforeAll(() => {
            user = users[0];
            post = posts[0];
        });

        test("successfull returns a list of comment records", () => {
            const submission = buildValidSubmission(user.userNo, post.postNo);

            return Promise.all([
                commentService.createComment(submission),
                commentService.createComment(submission)
            ]).then(([recordOne, recordTwo]) => {
                return commentService.getCommentList().then(({ data }) => {
                    expect(data.length).toBeGreaterThanOrEqual(2);

                    [recordOne, recordTwo].forEach((record) => {
                        //@ts-ignore
                        const foundRecord = data.find((comment) => comment[pk] === record[pk]);

                        expect(foundRecord).toBeDefined();
                    });
                });
            });
        });
    }); // close describe("getCommentList")

    describe("deleteComment", () => {
        let post: IPostRecord;
        let user: IUserRecord;

        beforeAll(() => {
            user = users[0];
            post = posts[0];
        });

        test("successfully deletes a comment", () => {
            const submission = buildValidSubmission(user.userNo, post.postNo);

            return commentService.createComment(submission).then((record) => {
                return commentService.deleteComment(record[pk]).then((deleteResponse) => {
                    return commentService.getComment(record[pk]).then((deletedRecord) => {
                        expect(deleteResponse).toEqual(true);
                        expect(Boolean(deletedRecord.isDeleted)).toEqual(true);
                    });
                });
            });
        });
    }); // close describe("deleteComment")
}); // close describe("Comments Service")
