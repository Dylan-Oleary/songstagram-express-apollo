import faker from "faker";
import Redis from "ioredis";
import path from "path";

import { dbConnection } from "~knex/db";
import { AuthenticationService } from "~services/Authentication";
import { ICreateUserValues, IUpdateUserValues, IUserColumnKeys, UserService } from "~services/User";

describe("Authentication Service", () => {
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

        done();
    });

    afterAll(async (done) => {
        await dbConnection.destroy();
        done();
    });

    describe("authenticateAccessToken", () => {
        test("throws an error if no token is found in the request headers", () => {
            return (
                new AuthenticationService(dbConnection)
                    //@ts-ignore - Testing invalid request object
                    .authenticateAccessToken({ headers: {} })
                    .then(() => {
                        throw new Error("Expected an error to be thrown");
                    })
                    .catch((error) => {
                        expect(error.statusCode).toEqual(401);
                        expect(error.message).toEqual("Invalid Credentials");
                        expect(error.details).toEqual(
                            expect.arrayContaining(["No access token provided"])
                        );
                    })
            );
        });
    }); // close describe("authenticateAccessToken")

    describe("authenticateUser", () => {
        test("throws an error if the passed email fails to return a user", () => {
            const email = "kezia@gmail.com";
            const redis = new Redis();

            return new AuthenticationService(dbConnection)
                .authenticateUser(email, "", redis)
                .then(() => {
                    throw new Error("Expected an error to be thrown");
                })
                .catch((error) => {
                    expect(error.statusCode).toEqual(404);
                    expect(error.message).toEqual("Not Found");
                    expect(error.details).toEqual(
                        expect.arrayContaining([
                            `User with an Email of ${email} could not be found`
                        ])
                    );

                    redis.disconnect();
                });
        });

        test("throws an error if the user is banned", () => {
            const redis = new Redis();
            const userService = new UserService(dbConnection);
            const userSubmission = buildValidUserSubmission("Cool_Dude") as ICreateUserValues;

            return userService
                .createUser(userSubmission)
                .then((user) => userService.getUser(user.userNo))
                .then((user) => {
                    return userService
                        .banUser(user.userNo)
                        .then(() => {
                            return new AuthenticationService(dbConnection).authenticateUser(
                                user.email,
                                userSubmission.password,
                                redis
                            );
                        })
                        .then(() => {
                            throw new Error("Expected an error to be thrown");
                        });
                })
                .catch((error) => {
                    expect(error.statusCode).toEqual(403);
                    expect(error.message).toEqual("Forbidden");
                    expect(error.details).toEqual(
                        expect.arrayContaining(["User is forbidden. Reason: isBanned"])
                    );

                    redis.disconnect();
                });
        });

        test("throws an error if the user is deleted", () => {
            const redis = new Redis();
            const userService = new UserService(dbConnection);
            const userSubmission = buildValidUserSubmission("Cool_DAWG") as ICreateUserValues;

            return userService
                .createUser(userSubmission)
                .then((user) => userService.getUser(user.userNo))
                .then((user) => {
                    return userService
                        .deleteUser(user.userNo)
                        .then(() => {
                            return new AuthenticationService(dbConnection).authenticateUser(
                                user.email,
                                userSubmission.password,
                                redis
                            );
                        })
                        .then(() => {
                            throw new Error("Expected an error to be thrown");
                        });
                })
                .catch((error) => {
                    expect(error.statusCode).toEqual(403);
                    expect(error.message).toEqual("Forbidden");
                    expect(error.details).toEqual(
                        expect.arrayContaining(["User is forbidden. Reason: isDeleted"])
                    );

                    redis.disconnect();
                });
        });

        test("throws an error if passwords do not match", () => {
            const redis = new Redis();
            const userSubmission = buildValidUserSubmission(
                "Phil_The_Thrill_Collins"
            ) as ICreateUserValues;

            return new UserService(dbConnection).createUser(userSubmission).then((user) => {
                return new AuthenticationService(dbConnection)
                    .authenticateUser(user.email, "PASSW0RD!!!", redis)
                    .then(() => {
                        throw new Error("Expected an error to be thrown");
                    })
                    .catch((error) => {
                        expect(error.statusCode).toEqual(401);
                        expect(error.message).toEqual("Invalid Credentials");
                        expect(error.details).toEqual(
                            expect.arrayContaining(["Passwords do not match"])
                        );

                        redis.disconnect();
                    });
            });
        });

        test("returns an access and refresh token", () => {
            const redis = new Redis();
            const userSubmission = buildValidUserSubmission("ouch_myeyeball") as ICreateUserValues;

            return new UserService(dbConnection)
                .createUser(userSubmission)
                .then((user) => {
                    return new AuthenticationService(dbConnection).authenticateUser(
                        user.email,
                        userSubmission.password,
                        redis
                    );
                })
                .then(({ accessToken, refreshToken, user }) => {
                    expect(accessToken).not.toBeUndefined();
                    expect(refreshToken).not.toBeUndefined();
                    expect(user.userNo).not.toBeUndefined();
                    expect(user.userNo).toBeGreaterThan(0);
                    expect(user.firstName).toEqual(userSubmission.firstName);
                    expect(user.lastName).toEqual(userSubmission.lastName);
                    expect(user.email).toEqual(userSubmission.email);

                    redis.disconnect();
                });
        });
    }); // close describe("authenticateUser")

    describe("generateRedisCacheKey", () => {
        test("generates the correct cache key", () => {
            const expectedKey = "1-token";
            //@ts-ignore - Testing private method
            const generatedKey = new AuthenticationService(dbConnection).generateRedisCacheKey(1);

            expect(expectedKey).toEqual(generatedKey);
        });
    }); // close describe("generateRedisCacheKey")

    describe("getNewTokenSet", () => {
        test("throws an error if the user is banned", () => {
            const redis = new Redis();
            const userService = new UserService(dbConnection);
            const userSubmission = buildValidUserSubmission("Homer_Simpson") as ICreateUserValues;

            return userService
                .createUser(userSubmission)
                .then((user) => userService.getUser(user.userNo))
                .then((user) => {
                    return userService
                        .banUser(user.userNo)
                        .then(() => {
                            return new AuthenticationService(dbConnection).getNewTokenSet(
                                user.userNo,
                                "token!@",
                                redis
                            );
                        })
                        .then(() => {
                            throw new Error("Expected an error to be thrown");
                        });
                })
                .catch((error) => {
                    expect(error.statusCode).toEqual(403);
                    expect(error.message).toEqual("Forbidden");
                    expect(error.details).toEqual(
                        expect.arrayContaining(["User is forbidden. Reason: isBanned"])
                    );

                    redis.disconnect();
                });
        });

        test("throws an error if the user is deleted", () => {
            const redis = new Redis();
            const userService = new UserService(dbConnection);
            const userSubmission = buildValidUserSubmission("Marge_Simpson") as ICreateUserValues;

            return userService
                .createUser(userSubmission)
                .then((user) => userService.getUser(user.userNo))
                .then((user) => {
                    return userService
                        .deleteUser(user.userNo)
                        .then(() => {
                            return new AuthenticationService(dbConnection).getNewTokenSet(
                                user.userNo,
                                "token!@",
                                redis
                            );
                        })
                        .then(() => {
                            throw new Error("Expected an error to be thrown");
                        });
                })
                .catch((error) => {
                    expect(error.statusCode).toEqual(403);
                    expect(error.message).toEqual("Forbidden");
                    expect(error.details).toEqual(
                        expect.arrayContaining(["User is forbidden. Reason: isDeleted"])
                    );

                    redis.disconnect();
                });
        });

        test("returns a new token set", () => {
            const redis = new Redis();
            const authenticationService = new AuthenticationService(dbConnection);
            const userSubmission = buildValidUserSubmission("nalgenewatah") as ICreateUserValues;

            return new UserService(dbConnection).createUser(userSubmission).then((user) => {
                return authenticationService
                    .authenticateUser(user.email, userSubmission.password, redis)
                    .then(({ refreshToken }) => {
                        return authenticationService.getNewTokenSet(
                            user.userNo,
                            refreshToken,
                            redis
                        );
                    })
                    .then(({ accessToken, refreshToken }) => {
                        [accessToken, refreshToken].forEach((token) => {
                            expect(token).not.toBeUndefined();
                            expect(token.length).toBeGreaterThan(0);
                        });

                        redis.disconnect();
                    });
            });
        });
    }); // close describe("getNewTokenSet")

    describe("logoutUser", () => {
        test("logs a user out and clears the refresh token from Redis", () => {
            const redis = new Redis();
            const authenticationService = new AuthenticationService(dbConnection);
            const userSubmission = buildValidUserSubmission("hennybenny") as ICreateUserValues;

            return new UserService(dbConnection).createUser(userSubmission).then((user) => {
                //@ts-ignore - Using private method
                const redisKey = authenticationService.generateRedisCacheKey(user.userNo);

                return authenticationService
                    .authenticateUser(user.email, userSubmission.password, redis)
                    .then(({ refreshToken }) => {
                        return authenticationService.logoutUser(user.userNo, refreshToken, redis);
                    })
                    .then(() => {
                        redis.get(redisKey, (err, value) => {
                            expect(value).toBeNull();
                        });
                        redis.disconnect();
                    });
            });
        });
    }); // close describe("logoutUser")
}); // close describe("Authentication Service")
