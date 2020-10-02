//@ts-nocheck
import bcrypt from "bcrypt";
import faker from "faker";
import { dbConnection } from "../../knex/db";
import { ICreateUserValues, IUser, IUserFormKeys, IUserFormLabels, UserService } from "../User";

describe("User Service", () => {
    const pk = "userNo";
    const tableName = "users";
    const userRecordKeys = [
        "userNo",
        "firstName",
        "lastName",
        "bio",
        "username",
        "email",
        "profilePicture",
        "postCount",
        "followerCount",
        "followingCount",
        "isDeleted",
        "isBanned",
        "lastLoginDate",
        "createdDate",
        "lastUpdated"
    ];
    const userService = new UserService(dbConnection);
    const buildValidSubmission: (username: string) => ICreateUserValues = (username) => {
        const submission: ICreateUserValues = {
            [IUserFormKeys.FirstName]: faker.name.firstName(),
            [IUserFormKeys.LastName]: faker.name.lastName(),
            [IUserFormKeys.Username]: username,
            [IUserFormKeys.Email]: faker.internet.email(),
            [IUserFormKeys.Password]: "M0N3y!",
            [IUserFormKeys.ConfirmPassword]: "M0N3y!"
        };

        return submission;
    };

    beforeAll(async (done) => {
        await dbConnection.migrate.latest();
        done();
    });

    afterAll(async (done) => {
        await dbConnection.destroy();
        done();
    });

    describe("getUserByUserNo", () => {
        let user;
        let submission = buildValidSubmission("breakfastwithroxy");

        beforeAll(async (done) => {
            return userService.createUser(submission).then((userRecord) => {
                user = userRecord;
                done();
            });
        });

        test("returns a user record", () => {
            return userService.getUserByUserNo(user.userNo).then((userRecord) => {
                userRecordKeys.forEach((key) => {
                    expect(userRecord).toHaveProperty(key);
                });
                expect(userRecord).toEqual(user);
            });
        });

        test("does not return a user's password", () => {
            return userService.getUserByUserNo(user.userNo).then((userRecord) => {
                expect(userRecord).not.toHaveProperty("password");
            });
        });

        test("throws a not found error (404) if no user is found", () => {
            const invalidUserNo = 867;

            return userService.getUserByUserNo(invalidUserNo).catch((error) => {
                expect(error.statusCode).toEqual(404);
                expect(error.message).toEqual("Not Found");
                expect(error.details).toEqual(
                    expect.arrayContaining([
                        `User with a ${pk} of ${invalidUserNo} could not be found`
                    ])
                );
            });
        });

        test("throws a bad request error (400) if userNo is undefined", async () => {
            return userService.getUserByUserNo(undefined).catch((error) => {
                expect(error.statusCode).toEqual(400);
                expect(error.message).toEqual("Bad Request");
                expect(error.details).toEqual(
                    expect.arrayContaining(["Parameter Error: userNo must be a number"])
                );
            });
        });

        test("throws a bad request error (400) if userNo is null", async () => {
            return userService.getUserByUserNo(null).catch((error) => {
                expect(error.statusCode).toEqual(400);
                expect(error.message).toEqual("Bad Request");
                expect(error.details).toEqual(
                    expect.arrayContaining(["Parameter Error: userNo must be a number"])
                );
            });
        });

        test("throws a bad request error (400) if userNo is a string", async () => {
            return userService.getUserByUserNo("123").catch((error) => {
                expect(error.statusCode).toEqual(400);
                expect(error.message).toEqual("Bad Request");
                expect(error.details).toEqual(
                    expect.arrayContaining(["Parameter Error: userNo must be a number"])
                );
            });
        });
    }); // close describe("getUserByUserNo")

    describe("createUser", () => {
        let newUser;
        let submission = buildValidSubmission("spaghetti_strings");

        test("successfully creates a user", () => {
            return userService.createUser(submission).then((userRecord) => {
                userRecordKeys.forEach((key) => {
                    expect(userRecord).toHaveProperty(key);
                });
                [
                    IUserFormKeys.FirstName,
                    IUserFormKeys.LastName,
                    IUserFormKeys.Username,
                    IUserFormKeys.Email
                ].forEach((key) => {
                    expect(userRecord[key]).toEqual(submission[key]);
                });

                newUser = userRecord;
            });
        });

        [
            { key: "followerCount", label: "follower" },
            { key: "followingCount", label: "following" },
            { key: "postCount", label: "post" }
        ].forEach(({ key, label }) => {
            test(`successfully creates a user with the correct ${label} count`, () => {
                expect(newUser[key]).toEqual(0);
            });
        });

        describe("Submission Fields", () => {
            [
                { key: IUserFormKeys.FirstName, label: IUserFormLabels.FirstName },
                { key: IUserFormKeys.LastName, label: IUserFormLabels.LastName }
            ].forEach(({ key, label }) => {
                describe(`${label}`, () => {
                    test("throws a validation error (422) if its value is undefined", () => {
                        const invalidSubmission = { ...submission, [key]: undefined };

                        return new UserService(dbConnection)
                            .createUser(invalidSubmission)
                            .catch((error) => {
                                expect(error.statusCode).toEqual(422);
                                expect(error.message).toEqual("Validation Error");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([`${label} is a required field`])
                                );
                            });
                    });

                    test("throws a validation error (422) if its value is null", () => {
                        const invalidSubmission = { ...submission, [key]: null };
                        return new UserService(dbConnection)
                            .createUser(invalidSubmission)
                            .catch((error) => {
                                expect(error.statusCode).toEqual(422);
                                expect(error.message).toEqual("Validation Error");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([`${label} is a required field`])
                                );
                            });
                    });

                    test("throws a validation error (422) if its value is empty", () => {
                        const invalidSubmission = { ...submission, [key]: "" };

                        return new UserService(dbConnection)
                            .createUser(invalidSubmission)
                            .catch((error) => {
                                expect(error.statusCode).toEqual(422);
                                expect(error.message).toEqual("Validation Error");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([`${label} is a required field`])
                                );
                            });
                    });

                    test("throws a validation error (422) if its value is too long", () => {
                        const invalidSubmission = {
                            ...submission,
                            [key]: new Array(257).join("x")
                        };

                        return new UserService(dbConnection)
                            .createUser(invalidSubmission)
                            .catch((error) => {
                                expect(error.statusCode).toEqual(422);
                                expect(error.message).toEqual("Validation Error");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([
                                        `${label} cannot be more than 255 characters`
                                    ])
                                );
                            });
                    });
                }); // close describe("First Name / Last Name")
            }); // close forEach

            describe("Username", () => {
                test("throws a validation error (422) if its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Username]: undefined
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Username} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) if its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Username]: null
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Username} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) if its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Username]: ""
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Username} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) if its value is too long", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Username]: new Array(32).join("x")
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Username} cannot be more than 30 characters`
                                ])
                            );
                        });
                });

                [
                    "-breakfastwithroxy",
                    "jack@thedals",
                    "<script>Inject_me!</script>",
                    "follow.me",
                    "protest'the'hero",
                    "I_LOVE+44"
                ].forEach((username) => {
                    test(`throws a validation error (422) if the username is invalid. Username: ${username}`, () => {
                        let invalidSubmission = {
                            ...submission,
                            [IUserFormKeys.Username]: username
                        };

                        return new UserService(dbConnection)
                            .createUser(invalidSubmission)
                            .catch((error) => {
                                expect(error.statusCode).toEqual(422);
                                expect(error.message).toEqual("Validation Error");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([
                                        `${IUserFormLabels.Username} is invalid`
                                    ])
                                );
                            });
                    });
                }); // close forEach

                test("throws a conflict error (409) if the username is aleady in use", () => {
                    const email = faker.internet.email();
                    let newSubmission: ICreateUserValues = {
                        ...submission,
                        [IUserFormKeys.Email]: email,
                        [IUserFormKeys.Username]: "conflict"
                    };

                    return new UserService(dbConnection).createUser(newSubmission).then(() => {
                        return new UserService(dbConnection)
                            .createUser({
                                ...newSubmission,
                                [IUserFormKeys.Email]: `xyz${email}`
                            })
                            .catch((error) => {
                                expect(error.statusCode).toEqual(409);
                                expect(error.message).toEqual("Conflict Error");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([
                                        `${IUserFormLabels.Username} is already in use`
                                    ])
                                );
                            });
                    });
                });
            }); // close describe("Username")

            describe("Email Address", () => {
                test("throws a validation error (422) if its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Email]: undefined
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Email} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) if its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Email]: null
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Email} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) if its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Email]: ""
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Email} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) if its value is too long", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Email]: new Array(257).join("x")
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Email} cannot be more than 255 characters`
                                ])
                            );
                        });
                });

                [
                    "plainaddress",
                    "#@%^%#$@#$@#.com",
                    "@example.com",
                    "Joe Smith <email@example.com>",
                    "email.example.com",
                    "email@example@example.com",
                    ".email@example.com",
                    "email.@example.com",
                    "email..email@example.com",
                    "email@example.com (Joe Smith)",
                    "email@example",
                    "email@111.222.333.44444",
                    "email@example..com"
                ].forEach((invalidEmail) => {
                    test(`throws a validation error (422) if the email is invalid. Email: ${invalidEmail}`, () => {
                        const invalidSubmission = {
                            ...submission,
                            [IUserFormKeys.Email]: invalidEmail
                        };

                        return new UserService(dbConnection)
                            .createUser(invalidSubmission)
                            .catch((error) => {
                                expect(error.statusCode).toEqual(422);
                                expect(error.message).toEqual("Validation Error");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([`${IUserFormLabels.Email} is invalid`])
                                );
                            });
                    });
                });

                test("throws a conflict error (409) if the email is aleady in use", () => {
                    const email = faker.internet.email();
                    let newSubmission: ICreateUserValues = {
                        ...submission,
                        [IUserFormKeys.Email]: email,
                        [IUserFormKeys.Username]: "newuser"
                    };

                    return new UserService(dbConnection).createUser(newSubmission).then(() => {
                        return new UserService(dbConnection)
                            .createUser({
                                ...newSubmission,
                                [IUserFormKeys.Username]: "newuser1"
                            })
                            .catch((error) => {
                                expect(error.statusCode).toEqual(409);
                                expect(error.message).toEqual("Conflict Error");
                                expect(error.details).toEqual(
                                    expect.arrayContaining([
                                        `${IUserFormLabels.Email} is already in use`
                                    ])
                                );
                            });
                    });
                });
            }); // close describe("Email Address")

            describe("Password", () => {
                test("throws a validation error (422) when its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Password]: undefined
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Password} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) when its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Password]: null
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Password} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) when its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Password]: ""
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Password} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) when its value is too long", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Password]: new Array(52).join("x")
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.Password} cannot be more than 50 characters`
                                ])
                            );
                        });
                });
            }); // close describe("Password")

            describe("Confirm Password", () => {
                test("throws a validation error (422) when its value is undefined", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.ConfirmPassword]: undefined
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.ConfirmPassword} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) when its value is null", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.ConfirmPassword]: null
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.ConfirmPassword} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) when its value is empty", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.ConfirmPassword]: ""
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining([
                                    `${IUserFormLabels.ConfirmPassword} is a required field`
                                ])
                            );
                        });
                });

                test("throws a validation error (422) when its value does match the 'Password' value", () => {
                    const invalidSubmission = {
                        ...submission,
                        [IUserFormKeys.Password]: "supersecretpassword",
                        [IUserFormKeys.ConfirmPassword]: "password"
                    };

                    return new UserService(dbConnection)
                        .createUser(invalidSubmission)
                        .catch((error) => {
                            expect(error.statusCode).toEqual(422);
                            expect(error.message).toEqual("Validation Error");
                            expect(error.details).toEqual(
                                expect.arrayContaining(["Passwords must match"])
                            );
                        });
                });
            }); // close describe("Confirm Password")
        }); // close describe("Submission Fields")
    }); //close describe("createUser")

    describe("deleteUser", () => {
        let newUser;
        let submission = buildValidSubmission("gurth_mcgurth");

        beforeAll(async (done) => {
            await userService.createUser(submission).then((userRecord) => {
                newUser = userRecord;
            });
            done();
        });

        test("successfully deletes a user", () => {
            return userService.deleteUser(newUser.userNo).then((response) => {
                return userService.getUserByUserNo(newUser.userNo).then((userRecord) => {
                    expect(response).toEqual(true);
                    expect(userRecord.userNo).toEqual(newUser.userNo);
                    expect(userRecord.isDeleted).toEqual(1);
                });
            });
        });

        test("throws a bad request error (400) if userNo is undefined", () => {
            return userService.deleteUser(undefined).catch((error) => {
                expect(error.statusCode).toEqual(400);
                expect(error.message).toEqual("Bad Request");
                expect(error.details).toEqual(
                    expect.arrayContaining(["Parameter Error: userNo must be a number"])
                );
            });
        });

        test("throws a bad request error (400) if userNo is null", () => {
            return userService.deleteUser(null).catch((error) => {
                expect(error.statusCode).toEqual(400);
                expect(error.message).toEqual("Bad Request");
                expect(error.details).toEqual(
                    expect.arrayContaining(["Parameter Error: userNo must be a number"])
                );
            });
        });

        test("throws a bad request error (400) if userNo is a string", () => {
            return userService.deleteUser("thebiglebowski").catch((error) => {
                expect(error.statusCode).toEqual(400);
                expect(error.message).toEqual("Bad Request");
                expect(error.details).toEqual(
                    expect.arrayContaining(["Parameter Error: userNo must be a number"])
                );
            });
        });
    }); // close describe("deleteUser")

    describe("updatePassword", () => {
        let user: IUser;
        let submission = buildValidSubmission("thedirtynil");
        let passwordSubmission = {
            currentPassword: "M0N3y!",
            newPassword: "thedr3@mis0v3r",
            confirmNewPassword: "thedr3@mis0v3r"
        };

        beforeAll((done) => {
            return userService.createUser(submission).then((userRecord) => {
                user = userRecord;
                done();
            });
        });

        test("successfully updates a user's password", () => {
            return userService.updatePassword(user.userNo, passwordSubmission).then(() => {
                return dbConnection(tableName)
                    .first("*")
                    .where(pk, user.userNo)
                    .then((rawUser) => {
                        return bcrypt.compare(
                            passwordSubmission.newPassword,
                            rawUser.password,
                            (error, isMatch) => {
                                expect(error).toBe(undefined);
                                expect(rawUser.userNo).toEqual(user.userNo);
                                expect(isMatch).toEqual(true);
                            }
                        );
                    });
            });
        });

        test("throws a bad request error (400) if userNo is undefined", () => {
            return userService.updatePassword(undefined, passwordSubmission).catch((error) => {
                expect(error.statusCode).toEqual(400);
                expect(error.message).toEqual("Bad Request");
                expect(error.details).toEqual(
                    expect.arrayContaining(["Parameter Error: userNo must be a number"])
                );
            });
        });

        test("throws a bad request error (400) if userNo is null", () => {
            return userService.updatePassword(null, passwordSubmission).catch((error) => {
                expect(error.statusCode).toEqual(400);
                expect(error.message).toEqual("Bad Request");
                expect(error.details).toEqual(
                    expect.arrayContaining(["Parameter Error: userNo must be a number"])
                );
            });
        });

        test("throws a bad request error (400) if userNo is a string", () => {
            return userService.updatePassword("123", passwordSubmission).catch((error) => {
                expect(error.statusCode).toEqual(400);
                expect(error.message).toEqual("Bad Request");
                expect(error.details).toEqual(
                    expect.arrayContaining(["Parameter Error: userNo must be a number"])
                );
            });
        });

        test("throws a validation error (422) if 'confirmPassword' doesn't match 'newPassword'", () => {
            passwordSubmission = {
                ...passwordSubmission,
                confirmNewPassword: "theresarumblingandafiredownbelow"
            };

            return userService.updatePassword(user.userNo, passwordSubmission).catch((error) => {
                expect(error.statusCode).toEqual(422);
                expect(error.message).toEqual("Validation Error");
                expect(error.details).toEqual(expect.arrayContaining(["Passwords must match"]));
            });
        });

        test("throws a not found error (404) if no user is found", () => {
            const userNo = 9999;

            passwordSubmission = {
                ...passwordSubmission,
                newPassword: "everycentanddollar",
                confirmNewPassword: "everycentanddollar"
            };

            return userService.updatePassword(userNo, passwordSubmission).catch((error) => {
                expect(error.statusCode).toEqual(404);
                expect(error.message).toEqual("Not Found");
                expect(error.details).toEqual(
                    expect.arrayContaining([`User with a ${pk} of ${userNo} could not be found`])
                );
            });
        });
    }); // close describe("updatePassword")
}); // close describe("User Service")
