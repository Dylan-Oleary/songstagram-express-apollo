import path from "path";

import { dbConnection } from "~knex/db";
import { BaseService } from "~services/Base";
import {
    ICreateFollowValues,
    IFollowColumnKeys,
    IFollowColumnLabels,
    FollowService,
    IFollowRecord
} from "~services/Follow";
import { IUserRecord, UserService } from "~services/User";

describe("Follow Service", () => {
    const table = "follows";
    const pk = "followNo";
    const followService = new FollowService(dbConnection);
    const userService = new UserService(dbConnection);
    let users: IUserRecord[] = [];

    /**
     * Builds a valid follow submission
     *
     * @param userNo The user number of the user to be followed
     * @param followerUserNo The user number of the user who is followin another user
     */
    const buildValidSubmission: (userNo: number, followerUserNo: number) => ICreateFollowValues = (
        userNo,
        followerUserNo
    ) => {
        return {
            userNo,
            followerUserNo
        };
    };

    beforeAll(async (done) => {
        await dbConnection.migrate.latest();
        await dbConnection.seed.run({
            directory: path.join(__dirname, "../../knex/seeds"),
            loadExtensions: [".ts"],
            specific: "01_users.ts"
        });

        users = await userService.getUserList().then(({ data }) => data);

        await done();
    });

    afterAll(async (done) => {
        await dbConnection.destroy();
        done();
    });

    describe("Column Validation", () => {
        let userToFollow: IUserRecord;
        let followerUser: IUserRecord;
        let submission: ICreateFollowValues;

        beforeAll(() => {
            userToFollow = users[0];
            followerUser = users[1];
            submission = buildValidSubmission(userToFollow.userNo, followerUser.userNo);
        });

        describe("Create", () => {
            describe("User Number", () => {
                test("throws a validation error (422) if its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IFollowColumnKeys.UserNo]: undefined
                    };

                    //@ts-ignore - Testing column type error
                    return followService.createFollow(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IFollowColumnLabels.UserNo} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IFollowColumnKeys.UserNo]: null
                    };

                    //@ts-ignore - Testing column type error
                    return followService.createFollow(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IFollowColumnLabels.UserNo} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IFollowColumnKeys.UserNo]: ""
                    };

                    //@ts-ignore - Testing column type error
                    return followService.createFollow(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IFollowColumnLabels.UserNo} is a required field`
                            ])
                        );
                    });
                });
            }); // close describe("User Number")

            describe("Follower User Number", () => {
                test("throws a validation error (422) if its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IFollowColumnKeys.FollowerUserNo]: undefined
                    };

                    //@ts-ignore - Testing column type error
                    return followService.createFollow(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IFollowColumnLabels.FollowerUserNo} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IFollowColumnKeys.FollowerUserNo]: null
                    };

                    //@ts-ignore - Testing column type error
                    return followService.createFollow(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IFollowColumnLabels.FollowerUserNo} is a required field`
                            ])
                        );
                    });
                });

                test("throws a validation error (422) if its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IFollowColumnKeys.FollowerUserNo]: ""
                    };

                    //@ts-ignore - Testing column type error
                    return followService.createFollow(invalidSubmission).catch((error) => {
                        expect(error.statusCode).toEqual(422);
                        expect(error.message).toEqual("Validation Error");
                        expect(error.details).toEqual(
                            expect.arrayContaining([
                                `${IFollowColumnLabels.FollowerUserNo} is a required field`
                            ])
                        );
                    });
                });
            }); // close describe("Follower User Number")
        }); // close describe("Create")
    }); // close describe("Column Validation")

    describe("createFollow", () => {
        let userToFollow: IUserRecord;
        let followerUser: IUserRecord;
        let submission: ICreateFollowValues;

        beforeAll(() => {
            userToFollow = users[0];
            followerUser = users[1];
            submission = buildValidSubmission(userToFollow.userNo, followerUser.userNo);
        });

        test("successfully creates a follow record", () => {
            return followService.createFollow({ ...submission }).then((record) => {
                expect(record[IFollowColumnKeys.UserNo]).toEqual(userToFollow.userNo);
                expect(record[IFollowColumnKeys.FollowerUserNo]).toEqual(followerUser.userNo);
            });
        });
    }); // close describe("createFollow")

    describe("updateFollow", () => {
        let userToFollow: IUserRecord;
        let followerUser: IUserRecord;
        let submission: ICreateFollowValues;
        let followRecord: IFollowRecord;

        beforeAll(async (done) => {
            userToFollow = users[1];
            followerUser = users[0];
            submission = buildValidSubmission(userToFollow.userNo, followerUser.userNo);

            followRecord = await followService.createFollow(submission);

            done();
        });

        test("successfully updates a follow record when 'isFollowing' is set to 'false'", () => {
            return followService
                .updateFollow(followRecord.followNo, { isFollowing: false })
                .then((record) => {
                    expect(record[IFollowColumnKeys.FollowNo]).toEqual(
                        followRecord[IFollowColumnKeys.FollowNo]
                    );
                    expect(record[IFollowColumnKeys.IsFollowing]).toEqual(false);
                });
        });

        test("successfully updates a follow record when 'isFollowing' is set to 'true'", () => {
            return followService
                .updateFollow(followRecord.followNo, { isFollowing: true })
                .then((record) => {
                    expect(record[IFollowColumnKeys.FollowNo]).toEqual(
                        followRecord[IFollowColumnKeys.FollowNo]
                    );
                    expect(record[IFollowColumnKeys.IsFollowing]).toEqual(true);
                });
        });
    }); // close describe("updateFollow")

    describe("followRequest", () => {
        let userToFollow: IUserRecord;
        let followerUser: IUserRecord;
        let submission: ICreateFollowValues;

        const bannedUserNo = 3;
        const deletedUserNo = 4;

        beforeAll(async (done) => {
            userToFollow = users[1];
            followerUser = users[0];
            submission = buildValidSubmission(userToFollow.userNo, followerUser.userNo);

            await userService.banUser(bannedUserNo);
            await userService.deleteUser(deletedUserNo);

            done();
        });

        test("throws a forbidden error (403) if the user to follow is banned", () => {
            return followService.followRequest(1, bannedUserNo, true).catch((error) => {
                expect(error.statusCode).toEqual(403);
                expect(error.message).toEqual("Forbidden");
                expect(error.details).toEqual(
                    expect.arrayContaining([
                        `User (userNo: ${bannedUserNo}) has been banned and cannot be updated`
                    ])
                );
            });
        });

        test("throws a forbidden error (403) if the user making the follow request is banned", () => {
            return followService.followRequest(bannedUserNo, 1, true).catch((error) => {
                expect(error.statusCode).toEqual(403);
                expect(error.message).toEqual("Forbidden");
                expect(error.details).toEqual(
                    expect.arrayContaining([
                        `User (userNo: ${bannedUserNo}) has been banned and cannot be updated`
                    ])
                );
            });
        });

        test("throws a forbidden error (403) if the user to follow is deleted", () => {
            return followService.followRequest(1, deletedUserNo, true).catch((error) => {
                expect(error.statusCode).toEqual(403);
                expect(error.message).toEqual("Forbidden");
                expect(error.details).toEqual(
                    expect.arrayContaining([
                        `User (userNo: ${deletedUserNo}) has been deleted and cannot be updated`
                    ])
                );
            });
        });

        test("throws a forbidden error (403) if the user making the follow request is deleted", () => {
            return followService.followRequest(deletedUserNo, 1, true).catch((error) => {
                expect(error.statusCode).toEqual(403);
                expect(error.message).toEqual("Forbidden");
                expect(error.details).toEqual(
                    expect.arrayContaining([
                        `User (userNo: ${deletedUserNo}) has been deleted and cannot be updated`
                    ])
                );
            });
        });

        test("successfully updates a follow record when the follow record already exists", () => {
            return followService.getFollowList().then(({ data }) => {
                const record = data[0];

                return followService
                    .followRequest(
                        record[IFollowColumnKeys.FollowerUserNo],
                        record[IFollowColumnKeys.UserNo],
                        false
                    )
                    .then((updatedRecord) => {
                        expect(updatedRecord[IFollowColumnKeys.IsFollowing]).toEqual(false);
                        expect(updatedRecord[IFollowColumnKeys.FollowerUserNo]).toEqual(
                            record[IFollowColumnKeys.FollowerUserNo]
                        );
                        expect(updatedRecord[IFollowColumnKeys.UserNo]).toEqual(
                            record[IFollowColumnKeys.UserNo]
                        );
                    });
            });
        });

        test("successfully creates a follow record when a follow record does not exist", () => {
            return followService.followRequest(10, 1).then((updatedRecord) => {
                expect(updatedRecord[IFollowColumnKeys.IsFollowing]).toEqual(true);
                expect(updatedRecord[IFollowColumnKeys.FollowerUserNo]).toEqual(10);
                expect(updatedRecord[IFollowColumnKeys.UserNo]).toEqual(1);
            });
        });
    }); // close describe("followRequest")

    describe("getFollowerCount", () => {
        const userNo = 2;

        test("successfully returns the correct follower count", () => {
            return followService.followRequest(1, userNo).then(() => {
                return Promise.all([
                    //@ts-ignore - Using table columns (private variable)
                    new BaseService(dbConnection).getCount(table, pk, followService.tableColumns, {
                        isFollowing: {
                            value: true
                        },
                        userNo: {
                            value: userNo
                        }
                    }),
                    followService.getFollowerCount(userNo)
                ]).then(([dbResult, serviceResult]) => {
                    expect(dbResult).toEqual(serviceResult);
                });
            });
        });
    }); // close describe("getFollowingCount")

    describe("getFollowingCount", () => {
        const userNo = 2;

        test("successfully returns the correct following count", () => {
            return followService.followRequest(userNo, 1).then(() => {
                return Promise.all([
                    //@ts-ignore - Using table columns (private variable)
                    new BaseService(dbConnection).getCount(table, pk, followService.tableColumns, {
                        isFollowing: {
                            value: true
                        },
                        followerUserNo: {
                            value: userNo
                        }
                    }),
                    followService.getFollowingCount(userNo)
                ]).then(([dbResult, serviceResult]) => {
                    expect(dbResult).toEqual(serviceResult);
                });
            });
        });
    }); // close describe("getFollowingCount")

    describe("deleteFollow", () => {
        test("successfully deletes a follow record", () => {
            return followService
                .getFollowList()
                .then(({ data }) => data[0])
                .then((record) => {
                    return followService
                        .deleteFollow(record[IFollowColumnKeys.FollowNo])
                        .then((result) => {
                            expect(result).toEqual(true);
                        });
                });
        });
    }); // close describe("deleteFollow")
}); // close describe("Follow Service")
